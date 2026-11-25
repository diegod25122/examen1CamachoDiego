import type { Dignidad } from '@/features/actas/domain/entities/Acta';

export interface Parroquia {
  id: number;
  nombre: string;
  tipo: 'urbana' | 'rural';
}

/** Recinto con su avance (RF-05, RF-15) */
export interface Recinto {
  id: number;
  nombre: string;
  parroquiaId: number;
  parroquia: string;
  parroquiaTipo: 'urbana' | 'rural';
  latitud: number;
  longitud: number;
  totalMesas: number;
  mesasReportadas: number;
  actasRecibidas: number;
  actasFueraMargen: number;
  coordinadorId: string | null;
  coordinador: string | null; // null → "Sin coordinador"
}

export interface ResumenActa {
  id: string;
  dignidad: Dignidad;
  version: number;
  recibidoEn: string;
  fueraDeMargen: boolean;
}

export interface Mesa {
  id: number;
  numero: number;
  recintoId: number;
  veedorId: string | null;
  veedor: { nombres: string; apellidos: string; cedula: string } | null;
  actas: ResumenActa[];
}

/** Lo que el veedor descarga antes de la jornada (RF-14) */
export interface MesaAsignada extends Mesa {
  recinto: { id: number; nombre: string; parroquia: string; latitud: number; longitud: number };
}

export interface NuevoRecinto {
  parroquiaId: number;
  nombre: string;
  latitud: number;
  longitud: number;
  numeroMesas: number;
}

/** S-07: mesa reportada = sus dos actas recibidas */
export const mesaReportada = (m: Pick<Mesa, 'actas'>) => new Set(m.actas.map((a) => a.dignidad)).size === 2;
