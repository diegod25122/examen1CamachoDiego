import type { MesaAsignada, Mesa, NuevoRecinto, Parroquia, Recinto } from '../entities/Territorio';

export interface ITerritorioRepository {
  listarParroquias(): Promise<Parroquia[]>;
  listarRecintos(): Promise<Recinto[]>;
  obtenerRecinto(id: number): Promise<Recinto | null>;
  crearRecinto(datos: NuevoRecinto): Promise<number>;
  asignarCoordinador(recintoId: number, coordinadorId: string): Promise<void>;
  listarMesasRecinto(recintoId: number): Promise<Mesa[]>;
  asignarVeedor(mesaId: number, veedorId: string): Promise<void>;
  /** Mesas del veedor; sin señal responde con lo descargado (RF-14) */
  listarMisMesas(): Promise<{ mesas: MesaAsignada[]; desdeCache: boolean }>;
}
