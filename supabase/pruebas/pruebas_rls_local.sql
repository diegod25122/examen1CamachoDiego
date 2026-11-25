-- Pruebas de RLS por rol (ADR-01). Se ejecutaron en un PostgreSQL local que simula auth/storage de Supabase.
-- NO ejecutar en el proyecto real: inserta usuarios de prueba.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$; do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth; create schema storage;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated; grant select, insert on storage.objects to authenticated;
create publication supabase_realtime;

\set ON_ERROR_STOP 0
-- usuarios
insert into auth.users (id,email,email_confirmed_at) values
 ('00000000-0000-0000-0000-000000000001','prov@x.com',now()),
 ('00000000-0000-0000-0000-000000000002','coord1@x.com',now()),
 ('00000000-0000-0000-0000-000000000003','veedor1@x.com',now()),
 ('00000000-0000-0000-0000-000000000004','veedor2@x.com',now()),
 ('00000000-0000-0000-0000-000000000005','coord2@x.com',now()),
 ('00000000-0000-0000-0000-000000000006','sinverificar@x.com',null);
insert into public.perfiles (id,cedula,nombres,apellidos,telefono,correo,rol,recinto_id,contrasena_definida) values
 ('00000000-0000-0000-0000-000000000001','1712345675','Diego','Camacho','0991234567','prov@x.com','coordinador_provincial',null,true),
 ('00000000-0000-0000-0000-000000000002','1723456784','Ana','Coord','0991234567','coord1@x.com','coordinador_recinto',1,true),
 ('00000000-0000-0000-0000-000000000003','1709876542','Luis','Veedor','0991234567','veedor1@x.com','veedor',1,true),
 ('00000000-0000-0000-0000-000000000004','1711111110','Eva','Veedor','0991234567','veedor2@x.com','veedor',1,true),
 ('00000000-0000-0000-0000-000000000005','1722222229','Pedro','Coord','0991234567','coord2@x.com','coordinador_recinto',2,true);
\echo '--- cedula invalida (debe fallar)'
insert into public.perfiles (id,cedula,nombres,apellidos,telefono,correo,rol,recinto_id) values ('00000000-0000-0000-0000-000000000006','1712345678','X','Yy','0991234567','sinverificar@x.com','veedor',1);
\echo '--- segundo coordinador mismo recinto (debe fallar)'
update public.perfiles set recinto_id=1 where id='00000000-0000-0000-0000-000000000005';
insert into public.perfiles (id,cedula,nombres,apellidos,telefono,correo,rol,recinto_id) values ('00000000-0000-0000-0000-000000000006','1733333338','Sin','Verif','0991234567','sinverificar@x.com','veedor',1);

-- ===== COORDINADOR RECINTO 1 =====
set role authenticated; set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo '--- coord1 ve recintos (espera 1):'
select count(*) from recintos;
\echo '--- coord1 ve mesas (espera 3):'
select count(*) from mesas;
\echo '--- coord1 asigna veedor1 a mesas 1 y 2, veedor sin verificar a mesa 3'
update mesas set veedor_id='00000000-0000-0000-0000-000000000003' where id in (1,2);
update mesas set veedor_id='00000000-0000-0000-0000-000000000006' where id=3;
\echo '--- coord1 intenta asignar en otro recinto (0 filas):'
update mesas set veedor_id='00000000-0000-0000-0000-000000000003' where id=4;
\echo '--- coord1 intenta cambiar numero de mesa (permiso denegado):'
update mesas set numero=9 where id=1;
\echo '--- coord1 ve perfiles (espera 4: el, 2 veedores, sinverif):'
select count(*) from perfiles;

-- ===== VEEDOR 1 =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
\echo '--- veedor1 ve mesas (espera 2):'
select id from mesas order by id;
\echo '--- veedor1 acta invalida (suma no cuadra, debe fallar)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000001',1,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,99,'1/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- veedor1 acta con org de mas votos que total (debe fallar)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000001',1,'alcaldia','{"1":100,"2":0,"3":0,"4":0,"5":0}',0,0,50,'1/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- veedor1 acta decimal (debe fallar)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000001',1,'alcaldia','{"1":10.5,"2":9.5,"3":10,"4":10,"5":10}',5,5,60,'1/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- veedor1 acta valida alcaldia mesa 1 (ok)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000001',1,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,60,'1/a/f.jpg',-0.1726,-78.4829,10,now()-interval '1 hour');
\echo '--- reintento mismo id (duplicate pkey esperado):'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000001',1,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,60,'1/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- otro id misma mesa/dignidad (duplicate mesa_dignidad esperado):'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000009',1,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,60,'1/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- prefectura mesa 1 lejos del recinto (fuera de margen):'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000002',1,'prefectura','{"1":20,"2":10,"3":5,"4":5,"5":10}',3,2,55,'1/b/f.jpg',-0.2000,-78.5000,10,now());
\echo '--- veedor1 en mesa 4 de otro recinto (RLS debe fallar)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000003',4,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,60,'4/a/f.jpg',-0.1726,-78.4829,10,now());
\echo '--- reintento identico por update (version sigue 1):'
update actas set votos='{"1":10,"2":10,"3":10,"4":10,"5":10}', nulos=5, blancos=5, total_sufragantes=60, foto_path='1/a/f.jpg' where id='aaaaaaaa-0000-0000-0000-000000000001';
select version, round(distancia_m) dist, fuera_de_margen from actas order by dignidad;
\echo '--- veedor1 intenta cambiar latitud (permiso denegado):'
update actas set latitud=0 where id='aaaaaaaa-0000-0000-0000-000000000001';
\echo '--- veedor1 intenta borrar (permiso denegado):'
delete from actas;
\echo '--- storage subir mesa 1 ok / mesa 4 rechazado'
insert into storage.objects (bucket_id,name) values ('actas','1/aaaa/f1.jpg');
insert into storage.objects (bucket_id,name) values ('actas','4/aaaa/f1.jpg');

-- ===== VEEDOR SIN VERIFICAR =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000006';
\echo '--- sin verificar registra mesa 3 (RLS debe fallar)'
insert into actas (id,mesa_id,dignidad,votos,nulos,blancos,total_sufragantes,foto_path,latitud,longitud,precision_m,capturado_en)
values ('aaaaaaaa-0000-0000-0000-000000000005',3,'alcaldia','{"1":10,"2":10,"3":10,"4":10,"5":10}',5,5,60,'3/a/f.jpg',-0.1726,-78.4829,10,now());

-- ===== COORDINADOR CORRIGE =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
\echo '--- coord1 corrige alcaldia y cambia foto (version 2):'
update actas set votos='{"1":12,"2":8,"3":10,"4":10,"5":10}', foto_path='1/a/f2.jpg', editado_latitud=-0.17, editado_longitud=-78.48 where id='aaaaaaaa-0000-0000-0000-000000000001';
\echo '--- coord1 reemplaza veedor1 por veedor2 en mesa 1:'
update mesas set veedor_id='00000000-0000-0000-0000-000000000004' where id=1;
\echo '--- coord1 asigna veedor de otro recinto (debe fallar) -> usa perfil coord2? no es veedor'
update mesas set veedor_id='00000000-0000-0000-0000-000000000005' where id=2;

-- ===== VEEDOR 1 ya reemplazado en mesa 1 =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
\echo '--- veedor1 ya no ve mesa 1 (espera solo 2):'
select id from mesas;
\echo '--- veedor1 ya no ve actas de mesa 1 (0):'
select count(*) from actas;

-- ===== COORDINADOR 2 =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
\echo '--- coord2 no ve actas recinto 1 (0):'
select count(*) from actas;
\echo '--- coord2 no puede crear recinto:'
select crear_recinto(1,'Nuevo X',-0.1,-78.4,3);

-- ===== PROVINCIAL =====
set request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
\echo '--- provincial: historial versiones'
select version, operacion, cedula, valores_anteriores->'votos'->>'1' antes, valores_nuevos->'votos'->>'1' despues, foto_anterior, foto_nueva from acta_versiones order by realizado_en, version;
\echo '--- historial asignaciones'
select mesa_id, veedor_anterior is null as sin_anterior, cambiado_por from historial_asignaciones order by id;
\echo '--- avance'
select recinto, total_mesas, mesas_reportadas, actas_recibidas, actas_fuera_margen, coordinador from v_avance_recintos where recinto_id in (1,2);
\echo '--- resultados alcaldia total'
select recinto_id, sigla, candidato, votos, porcentaje from v_resultados where dignidad='alcaldia' order by recinto_id nulls first, orden;
select * from v_nulos_blancos order by dignidad, recinto_id nulls first;
\echo '--- provincial crea recinto con 4 mesas (ok) y duplicado (falla)'
select crear_recinto(1,'Colegio Nuevo',-0.17,-78.48,4);
select crear_recinto(1,'  colegio nuevo ',-0.17,-78.48,4);
\echo '--- provincial asigna coord2 al recinto 1 (reemplaza a coord1):'
select asignar_coordinador(1,'00000000-0000-0000-0000-000000000005');
select nombres, recinto_id from perfiles where rol='coordinador_recinto' order by nombres;
\echo '--- provincial no puede corregir actas (0 filas):'
update actas set nulos=6 where id='aaaaaaaa-0000-0000-0000-000000000001';
reset role;
