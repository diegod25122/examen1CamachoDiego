-- =====================================================================
-- 02_funciones_triggers.sql  ·  Reglas que se cumplen aunque la app sea
-- modificada (RNF-03), historial inmutable (RF-12) y hora del servidor.
-- =====================================================================

-- ---------- Ayudantes de permisos (se usan en RLS) ----------
create or replace function public.mi_rol()
returns public.rol_usuario
language sql stable security definer set search_path = ''
as $$ select rol from public.perfiles where id = auth.uid() $$;

create or replace function public.mi_recinto()
returns int
language sql stable security definer set search_path = ''
as $$ select recinto_id from public.perfiles where id = auth.uid() $$;

create or replace function public.es_provincial()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select rol = 'coordinador_provincial' from public.perfiles where id = auth.uid()), false) $$;

-- Correo verificado (RF-03): la invitación aceptada confirma el correo.
create or replace function public.correo_verificado()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select email_confirmed_at is not null from auth.users where id = auth.uid()), false) $$;

-- Puede VER la mesa: provincial, coordinador de su recinto o veedor asignado.
create or replace function public.puede_ver_mesa(p_mesa int)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.mesas m
    join public.perfiles yo on yo.id = auth.uid()
    where m.id = p_mesa
      and (
        yo.rol = 'coordinador_provincial'
        or (yo.rol = 'coordinador_recinto' and m.recinto_id = yo.recinto_id)
        or (yo.rol = 'veedor' and m.veedor_id = yo.id)
      )
  )
$$;

-- Puede EDITAR actas de la mesa: coordinador de su recinto o veedor asignado (RF-12).
create or replace function public.puede_editar_mesa(p_mesa int)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.mesas m
    join public.perfiles yo on yo.id = auth.uid()
    where m.id = p_mesa
      and (
        (yo.rol = 'coordinador_recinto' and m.recinto_id = yo.recinto_id)
        or (yo.rol = 'veedor' and m.veedor_id = yo.id)
      )
  )
$$;

-- ---------- Distancia Haversine en metros (RF-11, S-08) ----------
create or replace function public.distancia_metros(lat1 float8, lon1 float8, lat2 float8, lon2 float8)
returns float8
language sql immutable set search_path = ''
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ))
$$;

-- ---------- Validación del acta (RF-09, S-09) ----------
-- Segunda barrera: la misma regla vive en el dominio de la app (ADR-08).
create or replace function public.validar_votos_acta(
  p_votos jsonb, p_nulos int, p_blancos int, p_total int
) returns void
language plpgsql stable set search_path = ''
as $$
declare
  org record;
  valor int;
  suma int := 0;
begin
  if jsonb_typeof(p_votos) <> 'object' then
    raise exception 'ACTA_INVALIDA: los votos deben ser un objeto' using errcode = 'P0001';
  end if;
  -- exactamente las organizaciones precargadas
  if (select count(*) from jsonb_object_keys(p_votos)) <> (select count(*) from public.organizaciones) then
    raise exception 'ACTA_INVALIDA: faltan o sobran organizaciones' using errcode = 'P0001';
  end if;
  for org in select id from public.organizaciones loop
    if not (p_votos ? org.id::text) or jsonb_typeof(p_votos -> org.id::text) <> 'number' then
      raise exception 'ACTA_INVALIDA: falta la organización %', org.id using errcode = 'P0001';
    end if;
    valor := (p_votos ->> org.id::text)::numeric;
    if valor::numeric <> (p_votos ->> org.id::text)::numeric or valor < 0 then
      raise exception 'ACTA_INVALIDA: solo números enteros mayores o iguales a cero' using errcode = 'P0001';
    end if;
    if valor > p_total then
      raise exception 'ACTA_INVALIDA: una organización tiene más votos que el total de sufragantes' using errcode = 'P0001';
    end if;
    suma := suma + valor;
  end loop;
  if p_nulos > p_total or p_blancos > p_total then
    raise exception 'ACTA_INVALIDA: nulos o blancos mayores que el total de sufragantes' using errcode = 'P0001';
  end if;
  if suma + p_nulos + p_blancos <> p_total then
    raise exception 'ACTA_INVALIDA: la suma (%) no cuadra con el total de sufragantes (%)',
      suma + p_nulos + p_blancos, p_total using errcode = 'P0001';
  end if;
end;
$$;

-- ---------- Trigger BEFORE: valida, fija campos del servidor y protege la evidencia ----------
create or replace function public.tg_actas_antes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  r record;
  margen int;
begin
  perform public.validar_votos_acta(new.votos, new.nulos, new.blancos, new.total_sufragantes);

  if tg_op = 'INSERT' then
    select re.latitud, re.longitud into r
    from public.mesas m join public.recintos re on re.id = m.recinto_id
    where m.id = new.mesa_id;
    select margen_metros into margen from public.configuracion where id;

    new.registrado_por := auth.uid();
    new.recibido_en := now();             -- hora confiable (S-12)
    new.version := 1;
    new.actualizado_por := null;
    new.actualizado_en := null;
    new.distancia_m := public.distancia_metros(new.latitud, new.longitud, r.latitud, r.longitud);
    new.fuera_de_margen := new.distancia_m > coalesce(margen, 200);
    return new;
  end if;

  -- UPDATE: la evidencia original y la autoría no cambian (RNF-07, RF-07)
  new.id := old.id;
  new.mesa_id := old.mesa_id;
  new.dignidad := old.dignidad;
  new.latitud := old.latitud;
  new.longitud := old.longitud;
  new.precision_m := old.precision_m;
  new.capturado_en := old.capturado_en;
  new.distancia_m := old.distancia_m;
  new.fuera_de_margen := old.fuera_de_margen;
  new.registrado_por := old.registrado_por;
  new.recibido_en := old.recibido_en;

  -- Reintento idéntico (sin cambios): no genera versión nueva (RNF-05)
  if (new.votos, new.nulos, new.blancos, new.total_sufragantes, new.foto_path)
     is not distinct from
     (old.votos, old.nulos, old.blancos, old.total_sufragantes, old.foto_path) then
    new.version := old.version;
    new.actualizado_por := old.actualizado_por;
    new.actualizado_en := old.actualizado_en;
    new.editado_latitud := old.editado_latitud;
    new.editado_longitud := old.editado_longitud;
    return new;
  end if;

  new.version := old.version + 1;
  new.actualizado_por := auth.uid();
  new.actualizado_en := now();             -- la versión vigente la define el servidor (S-10)
  return new;
end;
$$;

-- ---------- Trigger AFTER: escribe el historial (solo inserción) ----------
create or replace function public.tg_actas_despues()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  ced char(10);
begin
  if tg_op = 'UPDATE' and new.version = old.version then
    return new;   -- reintento sin cambios
  end if;

  select cedula into ced from public.perfiles where id = auth.uid();

  insert into public.acta_versiones (
    acta_id, version, operacion, realizado_por, cedula, latitud, longitud,
    valores_anteriores, valores_nuevos, foto_anterior, foto_nueva
  ) values (
    new.id,
    new.version,
    case when tg_op = 'INSERT' then 'creacion' else 'correccion' end,
    auth.uid(),
    ced,
    case when tg_op = 'INSERT' then new.latitud else new.editado_latitud end,
    case when tg_op = 'INSERT' then new.longitud else new.editado_longitud end,
    case when tg_op = 'UPDATE' then jsonb_build_object(
      'votos', old.votos, 'nulos', old.nulos, 'blancos', old.blancos, 'total_sufragantes', old.total_sufragantes)
    end,
    jsonb_build_object(
      'votos', new.votos, 'nulos', new.nulos, 'blancos', new.blancos, 'total_sufragantes', new.total_sufragantes),
    case when tg_op = 'UPDATE' and old.foto_path <> new.foto_path then old.foto_path end,
    case when tg_op = 'INSERT' or old.foto_path <> new.foto_path then new.foto_path end
  );
  return new;
end;
$$;

drop trigger if exists actas_antes on public.actas;
create trigger actas_antes before insert or update on public.actas
  for each row execute function public.tg_actas_antes();

drop trigger if exists actas_despues on public.actas;
create trigger actas_despues after insert or update on public.actas
  for each row execute function public.tg_actas_despues();

-- ---------- Mesas: el veedor debe ser del mismo recinto y queda historial (RF-06, RF-07) ----------
create or replace function public.tg_mesas_antes()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.veedor_id is not null and not exists (
    select 1 from public.perfiles p
    where p.id = new.veedor_id and p.rol = 'veedor' and p.recinto_id = new.recinto_id
  ) then
    raise exception 'ASIGNACION_INVALIDA: el veedor no pertenece a este recinto' using errcode = 'P0001';
  end if;
  if tg_op = 'UPDATE' then
    new.recinto_id := old.recinto_id;
    new.numero := old.numero;
  end if;
  return new;
end;
$$;

create or replace function public.tg_mesas_historial()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.veedor_id is distinct from old.veedor_id then
    insert into public.historial_asignaciones (mesa_id, veedor_anterior, veedor_nuevo, cambiado_por)
    values (new.id, old.veedor_id, new.veedor_id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists mesas_antes on public.mesas;
create trigger mesas_antes before insert or update on public.mesas
  for each row execute function public.tg_mesas_antes();

drop trigger if exists mesas_historial on public.mesas;
create trigger mesas_historial after update of veedor_id on public.mesas
  for each row execute function public.tg_mesas_historial();

-- ---------- RPC: crear recinto con sus mesas en una sola transacción (RF-05) ----------
-- security invoker: RLS decide si quien llama puede insertar.
create or replace function public.crear_recinto(
  p_parroquia int, p_nombre text, p_latitud float8, p_longitud float8, p_mesas int
) returns int
language plpgsql security invoker set search_path = ''
as $$
declare
  nuevo int;
begin
  if p_mesas is null or p_mesas < 1 or p_mesas > 200 then
    raise exception 'RECINTO_INVALIDO: el número de mesas debe estar entre 1 y 200' using errcode = 'P0001';
  end if;
  insert into public.recintos (parroquia_id, nombre, latitud, longitud)
  values (p_parroquia, trim(p_nombre), p_latitud, p_longitud)
  returning id into nuevo;
  insert into public.mesas (recinto_id, numero)
  select nuevo, g from generate_series(1, p_mesas) g;
  return nuevo;
end;
$$;

-- ---------- RPC: asignar (o cambiar) el coordinador de un recinto (RF-05) ----------
create or replace function public.asignar_coordinador(p_recinto int, p_coordinador uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.es_provincial() then
    raise exception 'SIN_PERMISO: solo el coordinador provincial asigna coordinadores' using errcode = '42501';
  end if;
  if not exists (select 1 from public.perfiles where id = p_coordinador and rol = 'coordinador_recinto') then
    raise exception 'ASIGNACION_INVALIDA: la persona no es coordinador de recinto' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.perfiles where id = p_coordinador and recinto_id is not null and recinto_id <> p_recinto) then
    raise exception 'ASIGNACION_INVALIDA: esa persona ya coordina otro recinto' using errcode = 'P0001';
  end if;
  -- libera al coordinador anterior y asigna al nuevo (uno solo por recinto)
  update public.perfiles set recinto_id = null
   where rol = 'coordinador_recinto' and recinto_id = p_recinto and id <> p_coordinador;
  update public.perfiles set recinto_id = p_recinto where id = p_coordinador;
end;
$$;

-- ---------- RPC: el titular marca que ya definió su contraseña (RF-03) ----------
create or replace function public.marcar_contrasena_definida()
returns void
language sql security definer set search_path = ''
as $$ update public.perfiles set contrasena_definida = true where id = auth.uid() $$;
