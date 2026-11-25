export type Dignidad = 'alcaldia' | 'prefectura';
export const DIGNIDADES: Dignidad[] = ['alcaldia', 'prefectura'];
export const NOMBRE_DIGNIDAD: Record<Dignidad, string> = { alcaldia: 'Alcaldía', prefectura: 'Prefectura' };

/** RF-13: estado visible de cada acta en el teléfono */
export type EstadoEnvio = 'borrador' | 'pendiente' | 'enviando' | 'enviada' | 'error';

export const TEXTO_ESTADO: Record<EstadoEnvio, { titulo: string; ayuda: string }> = {
  borrador: { titulo: 'Borrador', ayuda: 'Falta completar datos, foto o ubicación. No se enviará hasta completarla.' },
  pendiente: { titulo: 'Guardada en el teléfono', ayuda: 'Se enviará sola cuando haya señal.' },
  enviando: { titulo: 'Enviando…', ayuda: 'No cierres la app; si se corta, se reintentará.' },
  enviada: { titulo: 'Enviada', ayuda: 'El servidor la recibió.' },
  error: { titulo: 'Con error', ayuda: 'Revisa el mensaje y vuelve a intentar.' },
};

/** Valores en el mismo orden del acta física (RF-08) */
export interface ValoresActa {
  votos: number[]; // índice = posición de la organización (orden 1..5)
  nulos: number;
  blancos: number;
  totalSufragantes: number;
}

export interface Ubicacion {
  latitud: number;
  longitud: number;
  precisionM: number;
  capturadoEn: string; // hora del teléfono (S-12)
}

/** Acta en la cola local (outbox) */
export interface ActaLocal {
  id: string; // UUID generado en el teléfono (RNF-05)
  usuarioId: string;
  mesaId: number;
  dignidad: Dignidad;
  operacion: 'crear' | 'corregir';
  /** votos por organizacion_id, listos para el servidor */
  votos: Record<string, number> | null;
  nulos: number | null;
  blancos: number | null;
  totalSufragantes: number | null;
  ubicacion: Ubicacion | null; // evidencia original (solo al crear)
  edicion: { latitud: number; longitud: number } | null; // desde dónde se corrigió
  fotoLocal: string | null;
  fotoPath: string | null;
  fotoSubida: boolean;
  estado: EstadoEnvio;
  mensajeError: string | null;
  intentos: number;
  actualizadoEn: string;
}

export interface VersionActa {
  version: number;
  operacion: 'creacion' | 'correccion';
  cedula: string;
  realizadoPor: string;
  realizadoEn: string;
  latitud: number | null;
  longitud: number | null;
  anteriores: { votos: Record<string, number>; nulos: number; blancos: number; total_sufragantes: number } | null;
  nuevos: { votos: Record<string, number>; nulos: number; blancos: number; total_sufragantes: number };
  fotoAnterior: string | null;
  fotoNueva: string | null;
}

/** Acta tal como la tiene el servidor */
export interface ActaRemota {
  id: string;
  mesaId: number;
  mesaNumero: number;
  recinto: { id: number; nombre: string; latitud: number; longitud: number };
  dignidad: Dignidad;
  votos: Record<string, number>;
  nulos: number;
  blancos: number;
  totalSufragantes: number;
  fotoPath: string;
  latitud: number;
  longitud: number;
  precisionM: number;
  capturadoEn: string;
  recibidoEn: string;
  distanciaM: number | null;
  fueraDeMargen: boolean;
  version: number;
  actualizadoEn: string | null;
  registradoPor: { nombres: string; apellidos: string; cedula: string } | null;
  versiones: VersionActa[];
}
