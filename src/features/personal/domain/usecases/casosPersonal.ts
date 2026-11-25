import { AppError } from '@/shared/domain/AppError';
import type { NuevaPersona } from '../entities/Persona';
import type { IPersonalRepository } from '../repositories/IPersonalRepository';
import { esquemaPersona } from '../validaciones/esquemaPersona';

export class CrearCuenta {
  constructor(private repo: IPersonalRepository) {}

  /** RF-02 / RF-07. Crear cuentas requiere conexión (S-11). */
  async ejecutar(datos: NuevaPersona) {
    const r = esquemaPersona.safeParse(datos);
    if (!r.success) throw new AppError('VALIDACION', r.error.issues[0]?.message ?? 'Revisa los datos');
    return this.repo.crearCuenta({ ...datos, ...r.data });
  }
}

export class ListarPersonal {
  constructor(private repo: IPersonalRepository) {}
  veedores(recintoId: number) {
    return this.repo.listarVeedores(recintoId);
  }
  coordinadores() {
    return this.repo.listarCoordinadores();
  }
}
