// RNF-04: al cerrar sesión se borran tokens y cachés; se conservan las actas pendientes.
import { almacenLocal } from '@/shared/infra/cache/almacenLocal';
import type { ILimpiezaLocal } from '@/features/auth/domain/usecases/casosAuth';
import type { IColaActas, IEvidencia } from '../../domain/repositories/Puertos';

export class LimpiezaLocal implements ILimpiezaLocal {
  constructor(private cola: IColaActas, private evidencia: IEvidencia) {}

  async contarPendientes() {
    return this.cola.contarTodasPendientes();
  }

  async limpiar() {
    const fotos = await this.cola.eliminarEnviadas();
    await Promise.all(fotos.map((f) => this.evidencia.eliminar(f)));
    await almacenLocal.borrarTodo();
    return this.cola.contarTodasPendientes();
  }
}
