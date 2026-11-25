// ADR-05: inyección de dependencias. Aquí se decide qué implementación usa cada
// caso de uso; la presentación solo conoce los casos de uso.
import * as Crypto from 'expo-crypto';
import { reporteSentry } from '@/shared/infra/monitoreo/sentry';

import { SupabaseAuthRepository } from '@/features/auth/data/SupabaseAuthRepository';
import { CargarSesion, CerrarSesion, DefinirContrasena, IniciarSesion, RecuperarContrasena } from '@/features/auth/domain/usecases/casosAuth';

import { SupabasePersonalRepository } from '@/features/personal/data/SupabasePersonalRepository';
import { CrearCuenta, ListarPersonal } from '@/features/personal/domain/usecases/casosPersonal';

import { SupabaseTerritorioRepository } from '@/features/territorio/data/SupabaseTerritorioRepository';
import { GestionarMesas, GestionarRecintos } from '@/features/territorio/domain/usecases/casosTerritorio';

import { SupabaseCatalogoRepository } from '@/features/catalogo/data/SupabaseCatalogoRepository';
import { ObtenerCatalogo } from '@/features/catalogo/domain/Catalogo';

import { ColaActasSqlite } from '@/features/actas/data/local/ColaActasSqlite';
import { LimpiezaLocal } from '@/features/actas/data/local/LimpiezaLocal';
import { SupabaseActasRepository } from '@/features/actas/data/remote/SupabaseActasRepository';
import { EvidenciaDispositivo } from '@/features/actas/data/dispositivo/EvidenciaDispositivo';
import { GuardarActa } from '@/features/actas/domain/usecases/GuardarActa';
import { SincronizarActas } from '@/features/actas/domain/usecases/SincronizarActas';
import { CapturarEvidencia, ConsultarActas } from '@/features/actas/domain/usecases/ConsultarActas';

import { SupabaseEscrutinioRepository } from '@/features/escrutinio/data/SupabaseEscrutinioRepository';
import { ConsultarEscrutinio } from '@/features/escrutinio/domain/Escrutinio';

// Repositorios (capa data)
const authRepo = new SupabaseAuthRepository();
const personalRepo = new SupabasePersonalRepository();
const territorioRepo = new SupabaseTerritorioRepository();
const catalogoRepo = new SupabaseCatalogoRepository();
const cola = new ColaActasSqlite();
const actasRemotas = new SupabaseActasRepository();
const evidencia = new EvidenciaDispositivo();
const escrutinioRepo = new SupabaseEscrutinioRepository();
const generarId = () => Crypto.randomUUID();

// Casos de uso (capa domain)
export const casos = {
  iniciarSesion: new IniciarSesion(authRepo, reporteSentry),
  cargarSesion: new CargarSesion(authRepo, reporteSentry),
  cerrarSesion: new CerrarSesion(authRepo, new LimpiezaLocal(cola, evidencia), reporteSentry),
  definirContrasena: new DefinirContrasena(authRepo),
  recuperar: new RecuperarContrasena(authRepo),
  alCambiarSesion: (cb: (evento: string, hay: boolean) => void) => authRepo.alCambiarSesion(cb),

  crearCuenta: new CrearCuenta(personalRepo),
  personal: new ListarPersonal(personalRepo),

  recintos: new GestionarRecintos(territorioRepo),
  mesas: new GestionarMesas(territorioRepo),

  catalogo: new ObtenerCatalogo(catalogoRepo),

  guardarActa: new GuardarActa(cola, generarId),
  sincronizar: new SincronizarActas(cola, actasRemotas, reporteSentry),
  consultarActas: new ConsultarActas(cola, actasRemotas),
  evidencia: new CapturarEvidencia(evidencia),
  recuperarInterrumpidas: () => cola.recuperarInterrumpidas(),

  escrutinio: new ConsultarEscrutinio(escrutinioRepo),
};

export const reporte = reporteSentry;
