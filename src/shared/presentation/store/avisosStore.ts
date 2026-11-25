// Mensajes breves en una franja superior animada (RNF-02: sin modales genéricos)
import { create } from 'zustand';

export type TipoAviso = 'exito' | 'error' | 'info' | 'alerta';
export type Aviso = { id: number; tipo: TipoAviso; titulo: string; mensaje?: string };

type EstadoAvisos = {
  aviso: Aviso | null;
  avisar: (tipo: TipoAviso, titulo: string, mensaje?: string) => void;
  cerrar: () => void;
};

let contador = 0;

export const useAvisosStore = create<EstadoAvisos>((set) => ({
  aviso: null,
  avisar: (tipo, titulo, mensaje) => set({ aviso: { id: ++contador, tipo, titulo, mensaje } }),
  cerrar: () => set({ aviso: null }),
}));

export const avisar = (tipo: TipoAviso, titulo: string, mensaje?: string) =>
  useAvisosStore.getState().avisar(tipo, titulo, mensaje);
