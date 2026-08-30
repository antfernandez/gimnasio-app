-- Sprint 8: sistema de turnos y reservas, con calendario visual (mes/semana/día) y la
-- política de cancelación/reprogramación real de Valinor (24 h). Ver
-- .claude/sprints/sprint-8-turnos-reservas.md.
--
-- Modelo: `horarios_disponibles` es la plantilla semanal configurable por gimnasio
-- (qué días/horas atiende y cuántos cupos por turno); `reservas` son las instancias
-- concretas (un alumno, una fecha, un horario). No hay tabla `turnos` separada: una
-- "sesión disponible" en una fecha es simplemente un `horario_disponible` sin (o con
-- cupo libre en) `reservas` para esa fecha.

-- Nota de zona horaria: `fecha`/`hora_inicio` se guardan como hora local del estudio
-- (naive, sin zona). Todo el negocio (Valinor) opera en Chile continental, así que la
-- ventana de 24 h se calcula interpretando esa hora local como 'America/Santiago' vía
-- `at time zone` (ver `reservas_before_update` más abajo) — evita el corrimiento de
-- unas horas que se produciría comparando directo contra `now()` en UTC.

create type estado_reserva as enum ('reservada', 'realizada', 'cancelada');
create type origen_cambio as enum ('dueño', 'alumno');

-- Plantilla semanal de horarios disponibles, configurable por el dueño.
create table horarios_disponibles (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  -- 0 = domingo … 6 = sábado, igual a extract(dow from fecha) y a Date#getUTCDay() en JS.
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  duracion_min smallint not null default 90 check (duracion_min > 0),
  cupos smallint not null default 2 check (cupos > 0),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (gimnasio_id, dia_semana, hora_inicio)
);
create index idx_horarios_gimnasio on horarios_disponibles(gimnasio_id);

-- Reservas: instancia concreta de un alumno en un turno de una fecha.
create table reservas (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alumno_id uuid not null references alumnos(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  duracion_min smallint not null,
  estado estado_reserva not null default 'reservada',
  -- Quién la creó originalmente (una reprogramación crea una reserva nueva que
  -- hereda este valor del actor que reprogramó, no necesariamente de la original).
  creado_por origen_cambio not null default 'dueño',
  -- Quién ejecutó la cancelación (null mientras sigue 'reservada'). Lo calcula
  -- siempre el trigger `reservas_before_update`, nunca el cliente.
  cancelado_por origen_cambio,
  cancelado_dentro_ventana boolean,
  -- false cuando un alumno cancela/reprograma su propia reserva: alimenta la cola de
  -- "Alertas de reprogramación" del dashboard (Sprint 10). El dueño la marca en true
  -- ("visto") sin que eso cambie el resto de la fila.
  atendido_por_dueno boolean not null default true,
  -- Si esta reserva nació de reprogramar otra, apunta a la original (auditoría).
  reserva_previa_id uuid references reservas(id) on delete set null,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_reservas_gimnasio_fecha on reservas(gimnasio_id, fecha, hora_inicio);
create index idx_reservas_alumno on reservas(alumno_id, fecha);
create index idx_reservas_alertas_pendientes
  on reservas(gimnasio_id, updated_at)
  where atendido_por_dueno = false;
-- Un alumno no puede tener dos reservas vigentes en el mismo turno exacto.
create unique index idx_reservas_no_duplicado
  on reservas(alumno_id, fecha, hora_inicio)
  where estado in ('reservada', 'realizada');

create trigger trg_reservas_updated_at
  before update on reservas
  for each row execute function set_updated_at();

-- Cupos: se valida solo en INSERT porque el único UPDATE de estado permitido
-- (reservada -> cancelada/realizada, ver `reservas_before_update`) nunca aumenta la
-- ocupación de un turno; reprogramar es "cancelar" + un INSERT nuevo aparte
-- (`reprogramar_reserva`), nunca mover fecha/hora en la fila existente.
create or replace function reservas_check_cupo()
returns trigger
language plpgsql
as $$
declare
  v_dia_semana smallint;
  v_cupos smallint;
  v_ocupados smallint;
begin
  v_dia_semana := extract(dow from new.fecha);

  select cupos into v_cupos
  from horarios_disponibles
  where gimnasio_id = new.gimnasio_id
    and dia_semana = v_dia_semana
    and hora_inicio = new.hora_inicio
    and activo = true;

  if v_cupos is null then
    raise exception 'Ese horario no está disponible para reservar';
  end if;

  select count(*) into v_ocupados
  from reservas
  where gimnasio_id = new.gimnasio_id
    and fecha = new.fecha
    and hora_inicio = new.hora_inicio
    and estado in ('reservada', 'realizada');

  if v_ocupados >= v_cupos then
    raise exception 'No quedan cupos disponibles para ese turno';
  end if;

  return new;
end;
$$;

create trigger trg_reservas_check_cupo
  before insert on reservas
  for each row execute function reservas_check_cupo();

-- Única transición de UPDATE permitida sobre una reserva: cancelarla (reservada ->
-- cancelada/realizada, decidido acá según la ventana de 24 h — nunca por lo que
-- mande el cliente en `estado`), o que el dueño marque una alerta ya resuelta como
-- vista (`atendido_por_dueno`). Cualquier otro intento de UPDATE se rechaza: no se
-- edita fecha/hora/alumno de una reserva existente, se cancela y se crea una nueva
-- (`reprogramar_reserva`).
create or replace function reservas_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  es_dueno boolean;
  dentro_ventana boolean;
begin
  select exists(select 1 from perfiles where id = auth.uid()) into es_dueno;

  -- El dueño/entrenador ya tiene acceso total a las filas de su propio gimnasio vía
  -- "reservas: acceso por gimnasio" — este trigger no le agrega restricciones de
  -- columna (marcar una alerta como vista, anotar, o cancelar son todas ediciones
  -- legítimas para él). Solo calculamos la política de 24 h cuando efectivamente
  -- cancela una reserva vigente; el resto de sus ediciones pasan tal cual.
  if es_dueno then
    if old.estado = 'reservada' and new.estado = 'cancelada' then
      dentro_ventana := (old.fecha + old.hora_inicio) at time zone 'America/Santiago'
        >= now() + interval '24 hours';
      new.cancelado_dentro_ventana := dentro_ventana;
      new.estado := case when dentro_ventana then 'cancelada' else 'realizada' end;
      new.cancelado_por := 'dueño';
    end if;
    return new;
  end if;

  -- A partir de aquí, quien actualiza NO tiene fila en `perfiles`: por la política
  -- RLS "reservas: alumno cancela las propias" solo puede ser un alumno editando su
  -- propia reserva, y solo puede cancelarla — nada más. `estado`/`cancelado_*` los
  -- calcula este trigger, nunca lo que mande el cliente.
  if old.estado <> 'reservada' then
    raise exception 'Esta reserva ya no está vigente';
  end if;
  if new.gimnasio_id is distinct from old.gimnasio_id
    or new.alumno_id is distinct from old.alumno_id
    or new.fecha is distinct from old.fecha
    or new.hora_inicio is distinct from old.hora_inicio
    or new.duracion_min is distinct from old.duracion_min
    or new.creado_por is distinct from old.creado_por
    or new.reserva_previa_id is distinct from old.reserva_previa_id
    or new.notas is distinct from old.notas
  then
    raise exception 'Un alumno solo puede cancelar su propia reserva, no modificarla';
  end if;
  if new.estado <> 'cancelada' then
    raise exception 'Un alumno solo puede cambiar el estado de su reserva a cancelada';
  end if;

  dentro_ventana := (old.fecha + old.hora_inicio) at time zone 'America/Santiago'
    >= now() + interval '24 hours';
  new.cancelado_dentro_ventana := dentro_ventana;
  new.estado := case when dentro_ventana then 'cancelada' else 'realizada' end;
  new.cancelado_por := 'alumno';
  new.atendido_por_dueno := false;

  return new;
end;
$$;

create trigger trg_reservas_before_update
  before update on reservas
  for each row execute function reservas_before_update();

-- Reprogramar = cancelar la reserva vigente (aplica la misma política de 24 h que una
-- cancelación normal, vía el trigger de arriba) + crear una reserva nueva en el
-- horario elegido, enlazada a la original para auditoría. SECURITY INVOKER (por
-- omisión): corre con los permisos y la sesión de quien llama, así que hereda RLS tal
-- cual — si `p_reserva_id` no es del propio alumno/gimnasio, el SELECT no encuentra
-- nada y falla con "no existe", sin necesidad de repetir los chequeos de pertenencia.
create or replace function reprogramar_reserva(
  p_reserva_id uuid,
  p_nueva_fecha date,
  p_nueva_hora time
)
returns reservas
language plpgsql
as $$
declare
  v_original reservas;
  v_nueva reservas;
begin
  select * into v_original from reservas where id = p_reserva_id;
  if not found then
    raise exception 'La reserva no existe o no tienes acceso a ella';
  end if;

  update reservas set estado = 'cancelada' where id = p_reserva_id;

  insert into reservas (
    gimnasio_id, alumno_id, fecha, hora_inicio, duracion_min, creado_por, reserva_previa_id
  )
  values (
    v_original.gimnasio_id,
    v_original.alumno_id,
    p_nueva_fecha,
    p_nueva_hora,
    v_original.duracion_min,
    case when exists(select 1 from perfiles where id = auth.uid())
      then 'dueño' else 'alumno' end,
    v_original.id
  )
  returning * into v_nueva;

  return v_nueva;
end;
$$;

grant execute on function reprogramar_reserva(uuid, date, time) to authenticated;

-- Disponibilidad agregada por turno (SECURITY DEFINER): expone cuántos cupos hay y
-- cuántos están ocupados por fecha/hora, sin revelar qué alumno ocupa cada uno — es
-- lo que necesita el alumno para ver su calendario (RLS directo sobre `reservas` no
-- le deja ver las reservas de otros alumnos, ni debería). Acotado por RLS "a mano"
-- dentro de la función: solo gimnasios a los que el usuario pertenece, como dueño o
-- como alumno.
create or replace function turnos_disponibilidad(
  p_gimnasio_id uuid,
  p_desde date,
  p_hasta date
)
returns table (
  fecha date,
  hora_inicio time,
  duracion_min smallint,
  cupos smallint,
  cupos_ocupados bigint
)
language sql
security definer
set search_path = public
stable
as $$
  select
    d.fecha,
    h.hora_inicio,
    h.duracion_min,
    h.cupos,
    count(r.id) filter (where r.estado in ('reservada', 'realizada')) as cupos_ocupados
  from generate_series(p_desde, p_hasta, interval '1 day') as d(fecha)
  join horarios_disponibles h
    on h.gimnasio_id = p_gimnasio_id
   and h.activo = true
   and h.dia_semana = extract(dow from d.fecha)
  left join reservas r
    on r.gimnasio_id = p_gimnasio_id
   and r.fecha = d.fecha::date
   and r.hora_inicio = h.hora_inicio
  where p_gimnasio_id in (
    select gimnasio_id from perfiles where id = auth.uid()
    union
    select gimnasio_id from alumnos where user_id = auth.uid()
  )
  group by d.fecha, h.hora_inicio, h.duracion_min, h.cupos
  order by d.fecha, h.hora_inicio;
$$;

grant execute on function turnos_disponibilidad(uuid, date, date) to authenticated;

-- Row Level Security
alter table horarios_disponibles enable row level security;
alter table reservas enable row level security;

create policy "horarios: acceso por gimnasio"
  on horarios_disponibles for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- El horario en sí (qué días/horas atiende) no es sensible; el alumno lo necesita
-- para saber qué slots existen antes de reservar.
create policy "horarios: alumno ve el propio gimnasio"
  on horarios_disponibles for select
  using (gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid()));

create policy "reservas: acceso por gimnasio"
  on reservas for all
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()))
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

create policy "reservas: alumno ve las propias"
  on reservas for select
  using (alumno_id in (select id from alumnos where user_id = auth.uid()));

create policy "reservas: alumno crea las propias"
  on reservas for insert
  with check (
    creado_por = 'alumno'
    and alumno_id in (select id from alumnos where user_id = auth.uid())
    and gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
  );

-- Solo puede tocar su propia fila; QUÉ puede cambiar en ella lo restringe el trigger
-- `reservas_before_update` (solo cancelar), no esta política.
create policy "reservas: alumno cancela las propias"
  on reservas for update
  using (alumno_id in (select id from alumnos where user_id = auth.uid()))
  with check (alumno_id in (select id from alumnos where user_id = auth.uid()));
