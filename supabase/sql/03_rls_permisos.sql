-- =====================================================================
-- 03_rls_permisos.sql  ·  Confidencialidad por rol y territorio (RNF-03, RF-19)
-- =====================================================================

alter table public.provincias enable row level security;
alter table public.cantones enable row level security;
alter table public.parroquias enable row level security;
alter table public.recintos enable row level security;
alter table public.perfiles enable row level security;
alter table public.mesas enable row level security;
alter table public.historial_asignaciones enable row level security;
alter table public.organizaciones enable row level security;
alter table public.candidatos enable row level security;
alter table public.configuracion enable row level security;
alter table public.actas enable row level security;
alter table public.acta_versiones enable row level security;

-- Limpieza para poder volver a ejecutar el script
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ---------- Catálogos: lectura para cualquier usuario autenticado ----------
create policy "catalogo provincias" on public.provincias for select to authenticated using (true);
create policy "catalogo cantones" on public.cantones for select to authenticated using (true);
create policy "catalogo parroquias" on public.parroquias for select to authenticated using (true);
create policy "catalogo organizaciones" on public.organizaciones for select to authenticated using (true);
create policy "catalogo candidatos" on public.candidatos for select to authenticated using (true);
create policy "catalogo configuracion" on public.configuracion for select to authenticated using (true);

-- ---------- Recintos ----------
create policy "recintos ver" on public.recintos for select to authenticated using (
  public.es_provincial()
  or id = public.mi_recinto()
  or exists (select 1 from public.mesas m where m.recinto_id = recintos.id and m.veedor_id = auth.uid())
);
create policy "recintos crear (provincial)" on public.recintos for insert to authenticated
  with check (public.es_provincial());

-- ---------- Perfiles ----------
create policy "perfiles ver" on public.perfiles for select to authenticated using (
  id = auth.uid()
  or public.es_provincial()
  or (public.mi_rol() = 'coordinador_recinto' and recinto_id = public.mi_recinto())
);
-- Sin INSERT/UPDATE/DELETE desde la app: las cuentas se crean en la Edge Function (ADR-02).

-- ---------- Mesas ----------
create policy "mesas ver" on public.mesas for select to authenticated using (public.puede_ver_mesa(id));
create policy "mesas crear (provincial)" on public.mesas for insert to authenticated
  with check (public.es_provincial());
create policy "mesas asignar veedor (coordinador del recinto)" on public.mesas for update to authenticated
  using (public.mi_rol() = 'coordinador_recinto' and recinto_id = public.mi_recinto())
  with check (public.mi_rol() = 'coordinador_recinto' and recinto_id = public.mi_recinto());

create policy "historial asignaciones ver" on public.historial_asignaciones for select to authenticated using (
  public.es_provincial()
  or exists (select 1 from public.mesas m where m.id = mesa_id and m.recinto_id = public.mi_recinto()
             and public.mi_rol() = 'coordinador_recinto')
);

-- ---------- Actas ----------
create policy "actas ver" on public.actas for select to authenticated using (public.puede_ver_mesa(mesa_id));

-- Registrar: solo el veedor asignado y con el correo verificado (RF-03, RF-08)
create policy "actas registrar (veedor asignado)" on public.actas for insert to authenticated with check (
  public.correo_verificado()
  and exists (select 1 from public.mesas m where m.id = mesa_id and m.veedor_id = auth.uid())
);

-- Corregir: veedor de la mesa o coordinador del recinto (RF-12)
create policy "actas corregir" on public.actas for update to authenticated
  using (public.correo_verificado() and public.puede_editar_mesa(mesa_id))
  with check (public.correo_verificado() and public.puede_editar_mesa(mesa_id));
-- Sin política DELETE: ningún acta se elimina (RF-12).

create policy "versiones ver" on public.acta_versiones for select to authenticated using (
  exists (select 1 from public.actas a where a.id = acta_id and public.puede_ver_mesa(a.mesa_id))
);
-- Sin INSERT/UPDATE/DELETE: solo el trigger escribe el historial.

-- ---------- Privilegios (GRANT). RLS filtra filas; GRANT define operaciones ----------
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to authenticated;
grant select on public.provincias, public.cantones, public.parroquias, public.organizaciones,
  public.candidatos, public.configuracion, public.historial_asignaciones, public.acta_versiones
  to authenticated;
grant select, insert on public.recintos to authenticated;
grant select on public.perfiles to authenticated;
grant select, insert on public.mesas to authenticated;
grant update (veedor_id) on public.mesas to authenticated;
grant select, insert on public.actas to authenticated;
grant update (votos, nulos, blancos, total_sufragantes, foto_path, editado_latitud, editado_longitud)
  on public.actas to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.crear_recinto(int, text, float8, float8, int) to authenticated;
grant execute on function public.asignar_coordinador(int, uuid) to authenticated;
grant execute on function public.marcar_contrasena_definida() to authenticated;
revoke execute on function public.crear_recinto(int, text, float8, float8, int) from anon;
revoke execute on function public.asignar_coordinador(int, uuid) from anon;
revoke execute on function public.marcar_contrasena_definida() from anon;
