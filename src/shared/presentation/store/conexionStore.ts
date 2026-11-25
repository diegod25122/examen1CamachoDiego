import { create } from 'zustand';

type EstadoConexion = {
  enLinea: boolean;
  pendientes: number; // actas guardadas en el teléfono que faltan por enviar
  conError: number;
  sincronizando: boolean;
  setEnLinea: (v: boolean) => void;
  setCola: (pendientes: number, conError: number) => void;
  setSincronizando: (v: boolean) => void;
};

export const useConexionStore = create<EstadoConexion>((set) => ({
  enLinea: true,
  pendientes: 0,
  conError: 0,
  sincronizando: false,
  setEnLinea: (enLinea) => set({ enLinea }),
  setCola: (pendientes, conError) => set({ pendientes, conError }),
  setSincronizando: (sincronizando) => set({ sincronizando }),
}));
