import { AppError } from '@/shared/domain/AppError';
import type { IReporteErrores } from '@/shared/domain/IReporteErrores';
import type { ActaLocal } from '../entities/Acta';
import type { IActasRemotas, IColaActas } from '../repositories/Puertos';

export type ResumenSincronizacion = { enviadas: number; fallidas: number; pendientes: number; sinSenal: boolean };

/**
 * ADR-03: envía la cola cuando hay señal. Es idempotente: el UUID del acta y la
 * ruta de la foto no cambian entre reintentos, así nunca se duplica (RNF-05).
 */
export class SincronizarActas {
  private enCurso: Promise<ResumenSincronizacion> | null = null;

  constructor(private cola: IColaActas, private remoto: IActasRemotas, private reporte: IReporteErrores) {}

  ejecutar(usuarioId: string): Promise<ResumenSincronizacion> {
    // Evita dos envíos simultáneos de la misma acta (varios toques, NetInfo + temporizador)
    if (!this.enCurso) {
      this.enCurso = this.procesar(usuarioId).finally(() => {
        this.enCurso = null;
      });
    }
    return this.enCurso;
  }

  async reintentar(id: string) {
    await this.cola.actualizar(id, { estado: 'pendiente', mensajeError: null });
  }

  private async procesar(usuarioId: string): Promise<ResumenSincronizacion> {
    const lista = await this.cola.paraEnviar(usuarioId);
    let enviadas = 0;
    let fallidas = 0;
    let sinSenal = false;

    for (const acta of lista) {
      const paso = await this.enviarUna(acta);
      if (paso === 'ok') enviadas++;
      else {
        fallidas++;
        if (paso === 'sin_senal') {
          sinSenal = true;
          break; // sin señal no tiene sentido seguir intentando las demás
        }
      }
    }
    const { pendientes } = await this.cola.contar(usuarioId);
    return { enviadas, fallidas, pendientes, sinSenal };
  }

  private async enviarUna(acta: ActaLocal): Promise<'ok' | 'sin_senal' | 'error'> {
    let paso = 'inicio';
    await this.cola.actualizar(acta.id, { estado: 'enviando', mensajeError: null });
    try {
      if (acta.fotoPath && !acta.fotoSubida) {
        if (!acta.fotoLocal) throw new AppError('VALIDACION', 'Se perdió la foto en el teléfono. Vuelve a tomarla.');
        paso = 'subir_foto';
        await this.remoto.subirFoto(acta.fotoPath, acta.fotoLocal);
        await this.cola.actualizar(acta.id, { fotoSubida: true });
      }
      paso = acta.operacion === 'crear' ? 'registrar_acta' : 'corregir_acta';
      if (acta.operacion === 'crear') await this.remoto.crear(acta);
      else await this.remoto.corregir(acta);

      await this.cola.actualizar(acta.id, { estado: 'enviada', mensajeError: null });
      return 'ok';
    } catch (e) {
      const error = AppError.desde(e);
      const intentos = acta.intentos + 1;
      if (error.reintentable) {
        await this.cola.actualizar(acta.id, { estado: 'pendiente', mensajeError: error.message, intentos });
        // RF-17: un envío que falla repetidamente también se reporta
        if (intentos === 3) this.reporte.reportar(e, { operacion: paso, datos: { actaId: acta.id, mesaId: acta.mesaId, intentos } });
        return 'sin_senal';
      }
      await this.cola.actualizar(acta.id, { estado: 'error', mensajeError: error.message, intentos });
      this.reporte.reportar(e, { operacion: paso, datos: { actaId: acta.id, mesaId: acta.mesaId, dignidad: acta.dignidad } });
      return 'error';
    }
  }
}
