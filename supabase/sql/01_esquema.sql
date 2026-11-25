-- =====================================================================
-- 01_esquema.sql  ·  Control Electoral (ADR-01)
-- Tablas, tipos y restricciones. Ejecutar PRIMERO en el SQL Editor.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
do $$ begin
  create type public.rol_usuario as enum ('coordinador_provincial', 'coordinador_recinto', 'veedor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.dignidad as enum ('alcaldia', 'prefectura');
exception when duplicate_object then null; end $$;

-- ---------- Validación de cédula ecuatoriana (RF-02, RNF-03) ----------
-- 10 dígitos, provincia 01-24 o 30, tercer dígito < 6 y dígito verificador módulo 10.
create or replace function public.cedula_valida(p text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  suma int := 0;
  v int;
  provincia int;
begin
  if p is null or p !~ '^\d{10}$' then return false; end if;
  provincia := substr(p, 1, 2)::int;
  if not (provincia between 1 and 24 or provincia = 30) then return false; end if;
  if substr(p, 3, 1)::int >= 6 then return false; end if;
  for i in 1..9 loop
    v := substr(p, i, 1)::int * (case when i % 2 = 1 then 2 else 1 end);
    if v > 9 then v := v - 9; end if;
    suma := suma + v;
  end loop;
  return (10 - (suma % 10)) % 10 = substr(p, 10, 1)::int;
end;
$$;

-- ---------- Territorio (RF-05, RF-18, S-01) ----------
create table if not exists public.provincias (
  id smallint primary key,
  nombre text not null unique
);

create table if not exists public.cantones (
  id smallint primary key,
  provincia_id smallint not null references public.provincias (id),
  nombre text not null,
  unique (provincia_id, nombre)
);

create table if not exists public.parroquias (
  id serial primary key,
  canton_id smallint not null references public.cantones (id),
  nombre text not null,
  tipo text not null check (tipo in ('urbana', 'rural')),
  unique (canton_id, nombre)
);

create table if not exists public.recintos (
  id serial primary key,
  parroquia_id int not null references public.parroquias (id),
  nombre text not null check (length(trim(nombre)) >= 3),
  latitud double precision not null check (latitud between -90 and 90),
  longitud double precision not null check (longitud between -180 and 180),
  creado_en timestamptz not null default now()
);
-- Sin duplicados: mismo nombre (sin importar mayúsculas/espacios) en la misma parroquia.
create unique index if not exists recintos_nombre_unico
  on public.recintos (parroquia_id, lower(trim(nombre)));

-- ---------- Personas (RF-02, RF-03, S-03, S-04) ----------
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  cedula char(10) not null unique check (public.cedula_valida(cedula)),
  nombres text not null check (length(trim(nombres)) >= 2),
  apellidos text not null check (length(trim(apellidos)) >= 2),
  telefono text not null check (telefono ~ '^0\d{8,9}$'),
  correo text not null unique check (correo = lower(correo)),
  rol public.rol_usuario not null,
  -- coordinador_recinto: su recinto (único). veedor: recinto del coordinador que lo creó.
  recinto_id int references public.recintos (id),
  creado_por uuid references public.perfiles (id),
  contrasena_definida boolean not null default false,
  creado_en timestamptz not null default now(),
  check (rol <> 'veedor' or recinto_id is not null)
);
-- Un único coordinador por recinto (RF-05).
create unique index if not exists un_coordinador_por_recinto
  on public.perfiles (recinto_id) where rol = 'coordinador_recinto';
-- Un único coordinador provincial (S-03).
create unique index if not exists un_solo_provincial
  on public.perfiles (rol) where rol = 'coordinador_provincial';

create table if not exists public.mesas (
  id serial primary key,
  recinto_id int not null references public.recintos (id) on delete cascade,
  numero smallint not null check (numero > 0),
  veedor_id uuid references public.perfiles (id),
  unique (recinto_id, numero)
);

-- RF-07: cada cambio de veedor queda registrado.
create table if not exists public.historial_asignaciones (
  id bigserial primary key,
  mesa_id int not null references public.mesas (id) on delete cascade,
  veedor_anterior uuid references public.perfiles (id),
  veedor_nuevo uuid references public.perfiles (id),
  cambiado_por uuid references public.perfiles (id),
  cambiado_en timestamptz not null default now()
);

-- ---------- Organizaciones y candidatos (RF-18, S-02) ----------
create table if not exists public.organizaciones (
  id smallint primary key,
  sigla text not null unique,
  nombre text not null unique,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  orden smallint not null unique
);

create table if not exists public.candidatos (
  id serial primary key,
  organizacion_id smallint not null references public.organizaciones (id),
  dignidad public.dignidad not null,
  nombre text not null,
  unique (organizacion_id, dignidad)
);

-- ---------- Configuración (S-08) ----------
create table if not exists public.configuracion (
  id boolean primary key default true check (id),
  margen_metros int not null default 200 check (margen_metros > 0)
);

-- ---------- Actas (RF-08 a RF-12, RNF-05, RNF-07, S-07, S-10, S-12) ----------
create table if not exists public.actas (
  id uuid primary key,                       -- generado en el teléfono (RNF-05)
  mesa_id int not null references public.mesas (id),
  dignidad public.dignidad not null,
  votos jsonb not null,                      -- {"1": 120, "2": 80, ...} por organizacion_id
  nulos int not null check (nulos >= 0),
  blancos int not null check (blancos >= 0),
  total_sufragantes int not null check (total_sufragantes >= 0),
  foto_path text not null,
  -- Evidencia original e inmutable (RNF-07)
  latitud double precision not null,
  longitud double precision not null,
  precision_m real not null,
  capturado_en timestamptz not null,         -- hora del teléfono
  distancia_m real,                          -- calculada en el servidor
  fuera_de_margen boolean not null default false,
  registrado_por uuid not null references public.perfiles (id),
  recibido_en timestamptz not null default now(),   -- hora confiable del servidor (S-12)
  -- Última corrección
  version int not null default 1,
  actualizado_por uuid references public.perfiles (id),
  actualizado_en timestamptz,
  editado_latitud double precision,
  editado_longitud double precision,
  unique (mesa_id, dignidad)                 -- una sola acta por mesa y dignidad (RF-08)
);

-- Historial de solo inserción (RF-12, ADR-01 punto 2)
create table if not exists public.acta_versiones (
  id bigserial primary key,
  acta_id uuid not null references public.actas (id),
  version int not null,
  operacion text not null check (operacion in ('creacion', 'correccion')),
  realizado_por uuid not null references public.perfiles (id),
  cedula char(10) not null,
  realizado_en timestamptz not null default now(),
  latitud double precision,
  longitud double precision,
  valores_anteriores jsonb,
  valores_nuevos jsonb not null,
  foto_anterior text,
  foto_nueva text,
  unique (acta_id, version)
);

create index if not exists actas_recibido_idx on public.actas (recibido_en desc);
create index if not exists mesas_veedor_idx on public.mesas (veedor_id);
create index if not exists perfiles_recinto_idx on public.perfiles (recinto_id);
