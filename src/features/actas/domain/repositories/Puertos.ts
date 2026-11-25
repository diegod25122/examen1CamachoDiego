import type { ActaLocal, ActaRemota, Dignidad, EstadoEnvio, Ubicacion } from '../entities/Acta';

/** Cola local de actas (outbox en SQLite, ADR-03) */
export interface IColaActas {
  buscar(usuarioId: string, mesaId: number, dignidad: Dignidad): Promise<ActaLocal | null>;
  obtener(id: string): Promise<ActaLocal | null>;
  guardar(acta: ActaLocal): Promise<void>;
  listar(usuarioId: string): Promise<ActaLocal[]>;
  paraEnviar(usuarioId: string): Promise<ActaLocal[]>;
  actualizar(
    id: string,
    cambios: Partial<Pick<ActaLocal, 'estado' | 'mensajeError' | 'intentos' | 'fotoSubida'>>,
  ): Promise<void>;
  contar(usuarioId: string): Promise<{ pendientes: number; conError: number }>;
  /** Tras un cierre forzado, lo que quedó "enviando" vuelve a pendiente (RNF-06) */
  recuperarInterrumpidas(): Promise<void>;
  /** Borra las ya enviadas y devuelve sus fotos locales para eliminarlas */
  eliminarEnviadas(): Promise<string[]>;
  contarTodasPendientes(): Promise<number>;
}

/** Servidor (Supabase) */
export interface IActasRemotas {
  subirFoto(ruta: string, uriLocal: string): Promise<void>;
  crear(acta: ActaLocal): Promise<void>;
  corregir(acta: ActaLocal): Promise<void>;
  obtener(id: string): Promise<ActaRemota | null>;
  buscarPorMesa(mesaId: number, dignidad: Dignidad): Promise<ActaRemota | null>;
  urlFoto(ruta: string): Promise<string>;
}

/** Cámara, archivos y GPS del teléfono (ADR-04) */
export interface IEvidencia {
  /** Varianza del Laplaciano sobre una copia reducida */
  medirNitidez(uri: string): Promise<number>;
  /** Comprime (RNF-08) y copia a una carpeta que sobrevive al cierre de la app (RNF-06) */
  prepararFoto(uri: string): Promise<string>;
  eliminar(uri: string): Promise<void>;
  obtenerUbicacion(): Promise<Ubicacion>;
}

export type { EstadoEnvio };
