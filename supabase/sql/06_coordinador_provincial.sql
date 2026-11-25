-- =====================================================================
-- 06_coordinador_provincial.sql  ·  Primer usuario del sistema (S-03)
--
-- ANTES de ejecutar:
--   Supabase → Authentication → Users → Add user → Create new user
--   · Email: el correo del coordinador provincial
--   · Password: la elige el propio coordinador (solo él la conoce)
--   · Marca "Auto Confirm User"
--
-- Luego cambia los 4 datos de abajo y ejecuta.
-- La cédula debe ser válida (módulo 10). Ejemplo válido: 1712345675
-- =====================================================================

insert into public.perfiles (id, cedula, nombres, apellidos, telefono, correo, rol, contrasena_definida)
select
  u.id,
  '1712345675',                 -- ← cédula
  'Diego David',                -- ← nombres
  'Camacho Molina',             -- ← apellidos
  '0991234567',                 -- ← teléfono
  lower(u.email),
  'coordinador_provincial',
  true
from auth.users u
where lower(u.email) = lower('CORREO_DEL_PROVINCIAL@gmail.com')   -- ← correo creado arriba
on conflict (id) do nothing;

select id, cedula, nombres, apellidos, correo, rol from public.perfiles;
