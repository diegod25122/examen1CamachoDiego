// ADR-05: Zustand guarda la sesión, el rol y el modo de la interfaz
import { create } from 'zustand';
import type { Perfil } from '../../domain/entities/Perfil';

type Estado = 'cargando' | 'invitado' | 'autenticado';
type Modo = 'normal' | 'recuperacion';

type EstadoSesion = {
  estado: Estado;
  perfil: Perfil | null;
  modo: Modo;
  setPerfil: (p: Perfil | null) => void;
  setModo: (m: Modo) => void;
  marcarContrasenaDefinida: () => void;
};

export const useSesionStore = create<EstadoSesion>((set) => ({
  estado: 'cargando',
  perfil: null,
  modo: 'normal',
  setPerfil: (perfil) => set({ perfil, estado: perfil ? 'autenticado' : 'invitado', ...(perfil ? {} : { modo: 'normal' as Modo }) }),
  setModo: (modo) => set({ modo }),
  marcarContrasenaDefinida: () =>
    set((s) => ({ modo: 'normal', perfil: s.perfil ? { ...s.perfil, contrasenaDefinida: true } : null })),
}));

/** El titular aún no define su clave (invitación) o viene de recuperar (RF-03, RF-04) */
export const necesitaContrasena = (s: Pick<EstadoSesion, 'perfil' | 'modo'>) =>
  !!s.perfil && (!s.perfil.contrasenaDefinida || s.modo === 'recuperacion');

export const usePerfil = () => useSesionStore((s) => s.perfil);
