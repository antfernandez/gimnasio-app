-- Spec 34: carga masiva de alumnos desde Excel.
-- 1) Datos nuevos del alumno (todos opcionales).
alter table alumnos
  add column sexo text check (sexo in ('femenino', 'masculino', 'otro', 'no_indica')),
  add column direccion text,
  add column comuna text,
  add column contacto_emergencia_nombre text,
  add column contacto_emergencia_telefono text,
  add column observaciones text;

-- 2) Historial de cargas: totales y errores para el reporte descargable.
create table cargas_alumnos (
  id uuid primary key default gen_random_uuid(),
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  usuario_id uuid references perfiles(id) on delete set null,
  nombre_archivo text not null,
  creados integer not null default 0,
  actualizados integer not null default 0,
  omitidos integer not null default 0,
  con_error integer not null default 0,
  errores jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index idx_cargas_alumnos_gimnasio on cargas_alumnos(gimnasio_id, created_at desc);

alter table cargas_alumnos enable row level security;

create policy "cargas_alumnos: lectura por gimnasio"
  on cargas_alumnos for select
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

-- 3) Importación transaccional del lote ya validado (todo o nada). Solo el dueño; el
-- gimnasio sale del perfil de quien llama, nunca del archivo. `p_filas` trae únicamente
-- las filas válidas; `p_errores` las filas que la validación descartó (para el reporte).
create or replace function importar_alumnos(
  p_filas jsonb,
  p_actualizar boolean,
  p_archivo text,
  p_errores jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gim uuid;
  v_f jsonb;
  v_id uuid;
  v_plan_id uuid;
  v_precio numeric;
  v_creados int := 0;
  v_actualizados int := 0;
  -- p_errores trae las filas no importadas: 'Con error' o 'Duplicada' (estas cuentan como omitidas).
  v_omitidos int := (select count(*) from jsonb_array_elements(coalesce(p_errores, '[]'::jsonb)) e
                     where e->>'estado' = 'Duplicada');
  v_con_error int := (select count(*) from jsonb_array_elements(coalesce(p_errores, '[]'::jsonb)) e
                      where e->>'estado' <> 'Duplicada');
  v_carga uuid;
  v_fecha_inicio date;
begin
  select gimnasio_id into v_gim from perfiles where id = auth.uid() and rol = 'dueño';
  if v_gim is null then
    raise exception 'solo_dueno: solo el dueño puede importar alumnos' using errcode = '42501';
  end if;
  if jsonb_array_length(p_filas) > 200 then
    raise exception 'limite_filas: máximo 200 filas por archivo';
  end if;

  for v_f in select * from jsonb_array_elements(p_filas) loop
    v_plan_id := null;
    v_precio := null;
    if v_f->>'plan_id' is not null then
      select id, precio into v_plan_id, v_precio
      from planes where id = (v_f->>'plan_id')::uuid and gimnasio_id = v_gim;
      if v_plan_id is null then
        raise exception 'plan_invalido: el plan no pertenece al gimnasio';
      end if;
    end if;

    select id into v_id from alumnos where gimnasio_id = v_gim and rut = (v_f->>'rut')::int;

    if v_id is not null then
      if not p_actualizar then
        v_omitidos := v_omitidos + 1;
        continue;
      end if;
      -- Actualiza solo lo que el archivo trae; no toca plan, fechas, avances ni pagos.
      update alumnos set
        nombres = v_f->>'nombres',
        apellidos = v_f->>'apellidos',
        email = coalesce(v_f->>'email', email),
        telefono = coalesce(v_f->>'telefono', telefono),
        fecha_nacimiento = coalesce((v_f->>'fecha_nacimiento')::date, fecha_nacimiento),
        sexo = coalesce(v_f->>'sexo', sexo),
        direccion = coalesce(v_f->>'direccion', direccion),
        comuna = coalesce(v_f->>'comuna', comuna),
        contacto_emergencia_nombre = coalesce(v_f->>'contacto_emergencia_nombre', contacto_emergencia_nombre),
        contacto_emergencia_telefono = coalesce(v_f->>'contacto_emergencia_telefono', contacto_emergencia_telefono),
        alergias = coalesce(v_f->>'alergias', alergias),
        enfermedades = coalesce(v_f->>'enfermedades', enfermedades),
        lesiones = coalesce(v_f->>'lesiones', lesiones),
        objetivos_salud = coalesce(v_f->>'objetivos_salud', objetivos_salud),
        observaciones = coalesce(v_f->>'observaciones', observaciones)
      where id = v_id;
      v_actualizados := v_actualizados + 1;
      continue;
    end if;

    v_fecha_inicio := (v_f->>'fecha_inicio')::date;
    insert into alumnos (
      gimnasio_id, rut, dig_ver, nombres, apellidos, email, telefono, plan_id,
      fecha_inicio, fecha_nacimiento, activo, estado_aprobacion,
      medicion_corporal_habilitada, plan_nutricional_habilitado,
      puede_registrar_avances, puede_registrar_bitacora,
      sexo, direccion, comuna, contacto_emergencia_nombre, contacto_emergencia_telefono,
      alergias, enfermedades, lesiones, objetivos_salud, observaciones
    ) values (
      v_gim, (v_f->>'rut')::int, v_f->>'dig_ver', v_f->>'nombres', v_f->>'apellidos',
      v_f->>'email', v_f->>'telefono', v_plan_id,
      v_fecha_inicio, (v_f->>'fecha_nacimiento')::date, coalesce((v_f->>'activo')::boolean, true), 'aprobado',
      coalesce((v_f->>'medicion_corporal')::boolean, false), coalesce((v_f->>'plan_nutricional')::boolean, false),
      coalesce((v_f->>'registrar_avances')::boolean, false), coalesce((v_f->>'registrar_bitacora')::boolean, false),
      v_f->>'sexo', v_f->>'direccion', v_f->>'comuna',
      v_f->>'contacto_emergencia_nombre', v_f->>'contacto_emergencia_telefono',
      v_f->>'alergias', v_f->>'enfermedades', v_f->>'lesiones', v_f->>'objetivos_salud',
      v_f->>'observaciones'
    ) returning id into v_id;

    if v_f->>'peso_kg' is not null or coalesce(v_f->'medidas', '{}'::jsonb) <> '{}'::jsonb then
      insert into avances (gimnasio_id, alumno_id, registrado_por, fecha, peso_kg, medidas)
      values (v_gim, v_id, auth.uid(), v_fecha_inicio, (v_f->>'peso_kg')::numeric,
              coalesce(v_f->'medidas', '{}'::jsonb));
    end if;

    -- "Vigente hasta": pago inicial en 0 como respaldo del ciclo en curso, para que
    -- cobranza no quede "sin pagos". Método 'otro'; el monto real se corrige a mano.
    if v_f->>'vigente_hasta' is not null then
      insert into pagos (gimnasio_id, alumno_id, monto, fecha_pago, metodo, periodo_desde, periodo_hasta)
      values (v_gim, v_id, coalesce(v_precio, 0), v_fecha_inicio, 'otro',
              v_fecha_inicio, (v_f->>'vigente_hasta')::date);
    end if;

    v_creados := v_creados + 1;
  end loop;

  insert into cargas_alumnos (gimnasio_id, usuario_id, nombre_archivo, creados, actualizados, omitidos, con_error, errores)
  values (v_gim, auth.uid(), left(p_archivo, 200), v_creados, v_actualizados, v_omitidos, v_con_error, coalesce(p_errores, '[]'::jsonb))
  returning id into v_carga;

  return jsonb_build_object(
    'carga_id', v_carga, 'creados', v_creados, 'actualizados', v_actualizados,
    'omitidos', v_omitidos, 'con_error', v_con_error
  );
end;
$$;

revoke all on function importar_alumnos(jsonb, boolean, text, jsonb) from public;
grant execute on function importar_alumnos(jsonb, boolean, text, jsonb) to authenticated;
