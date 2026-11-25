import { AppError } from '@/shared/domain/AppError';
import type { NuevoRecinto } from '../entities/Territorio';
import type { ITerritorioRepository } from '../repositories/ITerritorioRepository';
import { esquemaRecinto } from '../validaciones/esquemaRecinto';

export class GestionarRecintos {
  constructor(private repo: ITerritorioRepository) {}

  listar() {
    return this.repo.listarRecintos();
  }
  obtener(id: number) {
    return this.repo.obtenerRecinto(id);
  }
  parroquias() {
    return this.repo.listarParroquias();
  }

  /** RF-05: agrega recintos sin duplicados (UNIQUE en la base) */
  async crear(datos: NuevoRecinto) {
    const r = esquemaRecinto.safeParse(datos);
    if (!r.success) throw new AppError('VALIDACION', r.error.issues[0]?.message ?? 'Revisa los datos');
    return this.repo.crearRecinto(r.data);
  }

  /** RF-05: un único coordinador por recinto */
  asignarCoordinador(recintoId: number, coordinadorId: string) {
    return this.repo.asignarCoordinador(recintoId, coordinadorId);
  }
}

export class GestionarMesas {
  constructor(private repo: ITerritorioRepository) {}

  delRecinto(recintoId: number) {
    return this.repo.listarMesasRecinto(recintoId);
  }

  /** RF-06 / RF-07: asignar o reemplazar el veedor de una mesa (queda historial) */
  asignarVeedor(mesaId: number, veedorId: string) {
    return this.repo.asignarVeedor(mesaId, veedorId);
  }

  misMesas() {
    return this.repo.listarMisMesas();
  }
}
