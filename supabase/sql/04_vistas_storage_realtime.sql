-- =====================================================================
-- 04_vistas_storage_realtime.sql  ·  Panel provincial (RF-15, RF-16, S-06, S-07),
-- fotos privadas (RF-10) y tiempo real (RNF-09)
-- =====================================================================

-- ---------- Avance por recinto (S-07: mesa reportada = sus dos actas recibidas) ----------
create or replace view public.v_avance_recintos
with (security_invoker = true) as
select
  r.id as recinto_id,
  r.nombre as recinto,
  p.id as parroquia_id,
  p.nombre as parroquia,
  p.tipo as parroquia_tipo,
  r.latitud,
  r.longitud,
  (select count(*) from public.mesas m where m.recinto_id = r.id)::int as total_mesas,
  (select count(*) from public.mesas m
    where m.recinto_id = r.id
      and (select count(distinct a.dignidad) from public.actas a where a.mesa_id = m.id) = 2
  )::int as mesas_reportadas,
  (select count(*) from public.actas a join public.mesas m on m.id = a.mesa_id
    where m.recinto_id = r.id)::int as actas_recibidas,
  (select count(*) from public.actas a join public.mesas m on m.id = a.mesa_id
    where m.recinto_id = r.id and a.fuera_de_margen)::int as actas_fuera_margen,
  c.id as coordinador_id,
  case when c.id is null then null else c.nombres || ' ' || c.apellidos end as coordinador
from public.recintos r
join public.parroquias p on p.id = r.parroquia_id
left join public.perfiles c on c.recinto_id = r.id and c.rol = 'coordinador_recinto';

-- ---------- Resultados preliminares por candidato (RF-16) ----------
-- recinto_id NULL = total del cantón. Porcentaje sobre votos válidos.
create or replace view public.v_resultados
with (security_invoker = true) as
with votos as (
  select a.dignidad, m.recinto_id, (v.key)::smallint as organizacion_id, (v.value)::int as votos
  from public.actas a
  join public.mesas m on m.id = a.mesa_id
  cross join lateral jsonb_each_text(a.votos) as v(key, value)
),
sumas as (
  select dignidad, recinto_id, organizacion_id, sum(votos)::int as votos
  from votos
  group by grouping sets ((dignidad, recinto_id, organizacion_id), (dignidad, organizacion_id))
)
select
  s.dignidad,
  s.recinto_id,
  s.organizacion_id,
  o.sigla,
  o.nombre as organizacion,
  o.color,
  o.orden,
  c.nombre as candidato,
  s.votos,
  round(100.0 * s.votos / nullif(sum(s.votos) over (partition by s.dignidad, s.recinto_id), 0), 2) as porcentaje
from sumas s
join public.organizaciones o on o.id = s.organizacion_id
left join public.candidatos c on c.organizacion_id = s.organizacion_id and c.dignidad = s.dignidad;

-- Nulos y blancos por separado (RF-16)
create or replace view public.v_nulos_blancos
with (security_invoker = true) as
select
  a.dignidad,
  m.recinto_id,
  sum(a.nulos)::int as nulos,
  sum(a.blancos)::int as blancos,
  sum(a.total_sufragantes)::int as sufragantes,
  count(*)::int as actas
from public.actas a
join public.mesas m on m.id = a.mesa_id
group by grouping sets ((a.dignidad, m.recinto_id), (a.dignidad));

grant select on public.v_avance_recintos, public.v_resultados, public.v_nulos_blancos to authenticated;

-- ---------- Storage: bucket privado para las fotos de las actas ----------
-- Ruta: {mesa_id}/{acta_id}/{foto_id}.jpg  → cada foto reemplazada usa una ruta nueva (RNF-07)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('actas', 'actas', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg'];

drop policy if exists "fotos actas subir" on storage.objects;
drop policy if exists "fotos actas ver" on storage.objects;

create policy "fotos actas subir" on storage.objects for insert to authenticated with check (
  bucket_id = 'actas'
  and (storage.foldername(name))[1] ~ '^\d+$'
  and public.puede_editar_mesa(((storage.foldername(name))[1])::int)
);

create policy "fotos actas ver" on storage.objects for select to authenticated using (
  bucket_id = 'actas'
  and (storage.foldername(name))[1] ~ '^\d+$'
  and public.puede_ver_mesa(((storage.foldername(name))[1])::int)
);
-- Sin UPDATE ni DELETE: las fotos no se sobrescriben ni se borran.

-- ---------- Realtime: el panel se actualiza solo (RNF-09) ----------
do $$ begin
  alter publication supabase_realtime add table public.actas;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.mesas;
exception when duplicate_object then null; end $$;
