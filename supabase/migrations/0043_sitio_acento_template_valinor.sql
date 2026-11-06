-- Spec 71: el sitio público usa el template Valinor. El acento deja de ser un hex y pasa a
-- ser un nombre (turquesa, dorado, verde, morado, rosado). `sitios.tema` queda en la tabla
-- sin uso (no se elimina para no romper el historial ni `obtener_sitio_publico`).
-- La firma de `obtener_sitio_publico` no cambia: devuelve `color_acento` con los nuevos valores.

alter table sitios drop constraint if exists sitios_color_acento_check;

update sitios set color_acento = case lower(color_acento)
  when '#c9a24d' then 'dorado'
  when '#4d9f6c' then 'verde'
  when '#8b5cf6' then 'morado'
  when '#ec4899' then 'rosado'
  else 'turquesa'
end
where color_acento not in ('turquesa', 'dorado', 'verde', 'morado', 'rosado');

update sitio_versiones set color_acento = case lower(color_acento)
  when '#c9a24d' then 'dorado'
  when '#4d9f6c' then 'verde'
  when '#8b5cf6' then 'morado'
  when '#ec4899' then 'rosado'
  else 'turquesa'
end
where color_acento not in ('turquesa', 'dorado', 'verde', 'morado', 'rosado');

alter table sitios alter column color_acento set default 'turquesa';
alter table sitios add constraint sitios_color_acento_check
  check (color_acento in ('turquesa', 'dorado', 'verde', 'morado', 'rosado'));
