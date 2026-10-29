-- Spec 43: el alumno ve todos los planes de su gimnasio (no solo el propio) para poder
-- comparar y solicitar un cambio. Solo lectura; la vigencia se filtra en la consulta.
create policy "planes: alumno ve los de su gimnasio"
  on planes for select
  using (gimnasio_id in (select gimnasio_id from alumnos where user_id = auth.uid()));
