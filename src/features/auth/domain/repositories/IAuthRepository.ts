import type { Perfil } from '../entities/Perfil';

export type TipoEnlace = 'invite' | 'recovery';

export interface IAuthRepository {
  iniciarSesion(correo: string, contrasena: string): Promise<void>;
  cerrarSesion(): Promise<void>;
  haySesion(): Promise<boolean>;
  /** Perfil del servidor; si no hay señal, el último guardado en el teléfono (RF-14) */
  obtenerPerfilActual(): Promise<Perfil | null>;
  definirContrasena(contrasena: string): Promise<void>;
  enviarRecuperacion(correo: string): Promise<void>;
  verificarCodigo(correo: string, codigo: string, tipo: TipoEnlace): Promise<void>;
  /** Abre la sesión que llega en el enlace del correo (invitación o recuperación) */
  abrirSesionDesdeEnlace(url: string): Promise<TipoEnlace | null>;
  alCambiarSesion(cb: (evento: string, haySesion: boolean) => void): () => void;
}
