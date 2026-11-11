-- Spec 81: los alimentos base (globales) se pueden editar/eliminar por gimnasio
-- mediante copia propia y ocultación, sin afectar a otros gimnasios.

alter table alimentos
  add column alimento_base_id uuid references alimentos(id) on delete set null;

create table alimentos_ocultos (
  gimnasio_id uuid not null references gimnasios(id) on delete cascade,
  alimento_id uuid not null references alimentos(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gimnasio_id, alimento_id)
);
alter table alimentos_ocultos enable row level security;

create policy "alimentos_ocultos: lectura"
  on alimentos_ocultos for select
  using (
    gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid())
    or gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
  );
create policy "alimentos_ocultos: alta staff"
  on alimentos_ocultos for insert
  with check (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));
create policy "alimentos_ocultos: baja staff"
  on alimentos_ocultos for delete
  using (gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid()));

drop policy "alimentos: lectura" on alimentos;
create policy "alimentos: lectura"
  on alimentos for select
  using (
    (
      gimnasio_id is null and auth.uid() is not null
      and not exists (
        select 1 from alimentos_ocultos o
        where o.alimento_id = alimentos.id
          and (
            o.gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid())
            or o.gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
          )
      )
    )
    or gimnasio_id in (select gimnasio_id from perfiles where id = auth.uid())
    or gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid())
  );
