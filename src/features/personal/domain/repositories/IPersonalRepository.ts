import type { NuevaPersona, Persona, ResultadoCreacion } from '../entities/Persona';

export interface IPersonalRepository {
  crearCuenta(datos: NuevaPersona): Promise<ResultadoCreacion>;
  listarVeedores(recintoId: number): Promise<Persona[]>;
  listarCoordinadores(): Promise<Persona[]>;
}
