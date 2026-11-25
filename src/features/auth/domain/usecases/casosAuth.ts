import { AppError } from '@/shared/domain/AppError';
import type { IReporteErrores } from '@/shared/domain/IReporteErrores';
import type { Perfil } from '../entities/Perfil';
import type { IAuthRepository, TipoEnlace } from '../repositories/IAuthRepository';

export class IniciarSesion {
  constructor(private repo: IAuthRepository, private reporte: IReporteErrores) {}

  async ejecutar(correo: string, contrasena: string): Promise<Perfil> {
    await this.repo.iniciarSesion(correo.trim().toLowerCase(), contrasena);
    const perfil = await this.repo.obtenerPerfilActual();
    if (!perfil) {
      await this.repo.cerrarSesion();
      // RF-01: solo ingresa quien fue habilitado por la organización
      throw new AppError('PERMISO', 'Tu cuenta no está habilitada. Pide a tu coordinador que te cree el acceso.');
    }
    this.reporte.identificar({ id: perfil.id, rol: perfil.rol });
    return perfil;
  }
}

export class CargarSesion {
  constructor(private repo: IAuthRepository, private reporte: IReporteErrores) {}

  async ejecutar(): Promise<Perfil | null> {
    if (!(await this.repo.haySesion())) return null;
    const perfil = await this.repo.obtenerPerfilActual();
    this.reporte.identificar(perfil ? { id: perfil.id, rol: perfil.rol } : null);
    return perfil;
  }
}

export class DefinirContrasena {
  constructor(private repo: IAuthRepository) {}
  /** RF-03: desde aquí solo el titular conoce su clave */
  ejecutar(contrasena: string) {
    return this.repo.definirContrasena(contrasena);
  }
}

export class RecuperarContrasena {
  constructor(private repo: IAuthRepository) {}
  /** RF-04: sin intervención de ningún coordinador */
  enviar(correo: string) {
    return this.repo.enviarRecuperacion(correo.trim().toLowerCase());
  }
  verificarCodigo(correo: string, codigo: string, tipo: TipoEnlace) {
    return this.repo.verificarCodigo(correo.trim().toLowerCase(), codigo.trim(), tipo);
  }
  abrirEnlace(url: string) {
    return this.repo.abrirSesionDesdeEnlace(url);
  }
}

/** Puerto para limpiar lo guardado en el teléfono al cerrar sesión (RNF-04) */
export interface ILimpiezaLocal {
  /** Borra tokens y cachés; conserva solo las actas pendientes. Devuelve cuántas quedan. */
  limpiar(): Promise<number>;
  contarPendientes(): Promise<number>;
}

export class CerrarSesion {
  constructor(private repo: IAuthRepository, private limpieza: ILimpiezaLocal, private reporte: IReporteErrores) {}

  pendientes() {
    return this.limpieza.contarPendientes();
  }

  async ejecutar(): Promise<void> {
    await this.repo.cerrarSesion();
    await this.limpieza.limpiar();
    this.reporte.identificar(null);
  }
}
