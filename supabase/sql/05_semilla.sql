-- =====================================================================
-- 05_semilla.sql  ·  Precarga obligatoria (RF-18, S-01, S-02)
-- Pichincha · Quito · 6 parroquias · 12 recintos · 3 mesas por recinto
-- =====================================================================

insert into public.provincias (id, nombre) values (17, 'Pichincha')
on conflict (id) do nothing;

insert into public.cantones (id, provincia_id, nombre) values (1701, 17, 'Quito')
on conflict (id) do nothing;

insert into public.parroquias (canton_id, nombre, tipo) values
  (1701, 'Iñaquito', 'urbana'),
  (1701, 'Quitumbe', 'urbana'),
  (1701, 'La Magdalena', 'urbana'),
  (1701, 'Calderón', 'rural'),
  (1701, 'Tumbaco', 'rural'),
  (1701, 'Pifo', 'rural')
on conflict (canton_id, nombre) do nothing;

-- Recintos con coordenadas (S-01)
with datos (parroquia, nombre, lat, lng) as (values
  ('Iñaquito', 'Colegio La Condamine', -0.17261842559297133, -78.4829615893297),
  ('Iñaquito', 'Unidad Educativa Fiscal República de Bolivia', -0.18291876659431192, -78.48831391999724),
  ('Quitumbe', 'Unidad Educativa Municipal Quitumbe', -0.28092058299361927, -78.54875903535986),
  ('Quitumbe', 'U.E. Aurelio Bayas', -0.29650345455062216, -78.53182313350888),
  ('La Magdalena', 'Colegio Amazonas', -0.24557049627022853, -78.5267646200163),
  ('La Magdalena', 'Unidad Educativa Particular Fernández Salvador Villavicencio Ponce', -0.2432486595075582, -78.51896865060093),
  ('Calderón', 'Unidad Educativa Nicolás Jiménez', -0.08342352204887239, -78.42269598997954),
  ('Calderón', 'Unidad Educativa Luxemburgo', -0.09444252347955778, -78.45143258933005),
  ('Tumbaco', 'Unidad Educativa Tumbaco', -0.22461233844658068, -78.37609062001694),
  ('Tumbaco', 'Escuela Roberto Espinoza', -0.2113119957674417, -78.40451540652408),
  ('Pifo', 'C.F. Eduardo Salazar Gómez', -0.22732224972003667, -78.34325005070353),
  ('Pifo', 'Institución Educativa Fiscal Ricardo Rodríguez', -0.2245982397192964, -78.33664057583717)
)
insert into public.recintos (parroquia_id, nombre, latitud, longitud)
select p.id, d.nombre, d.lat, d.lng
from datos d join public.parroquias p on p.nombre = d.parroquia and p.canton_id = 1701
order by p.id, d.nombre
on conflict do nothing;

-- Tres mesas de demostración por recinto: 001, 002, 003
insert into public.mesas (recinto_id, numero)
select r.id, n from public.recintos r cross join generate_series(1, 3) n
order by r.id, n
on conflict (recinto_id, numero) do nothing;

-- Organizaciones ficticias (S-02) en el mismo orden del acta
insert into public.organizaciones (id, sigla, nombre, color, orden) values
  (1, 'MFC', 'Movimiento Futuro Ciudadano', '#1769AA', 1),
  (2, 'ARP', 'Alianza Renovación Popular', '#169B62', 2),
  (3, 'MUC', 'Movimiento Unidos por el Cambio', '#E87932', 3),
  (4, 'FDP', 'Frente Democrático Progreso', '#8054B8', 4),
  (5, 'MNE', 'Movimiento Nueva Esperanza', '#D84A52', 5)
on conflict (id) do nothing;

insert into public.candidatos (organizacion_id, dignidad, nombre) values
  (1, 'alcaldia', 'Daniel Andrade'),    (1, 'prefectura', 'Gabriela Torres'),
  (2, 'alcaldia', 'Valeria Cárdenas'),  (2, 'prefectura', 'Mauricio Salazar'),
  (3, 'alcaldia', 'Sebastián Molina'),  (3, 'prefectura', 'Carolina Herrera'),
  (4, 'alcaldia', 'Natalia Espinosa'),  (4, 'prefectura', 'Andrés Villacís'),
  (5, 'alcaldia', 'Ricardo Paredes'),   (5, 'prefectura', 'Daniela Morales')
on conflict (organizacion_id, dignidad) do nothing;

insert into public.configuracion (id, margen_metros) values (true, 200)
on conflict (id) do nothing;

-- Comprobación rápida: debe mostrar 6 · 12 · 36 · 5 · 10
select
  (select count(*) from public.parroquias) as parroquias,
  (select count(*) from public.recintos) as recintos,
  (select count(*) from public.mesas) as mesas,
  (select count(*) from public.organizaciones) as organizaciones,
  (select count(*) from public.candidatos) as candidatos;
