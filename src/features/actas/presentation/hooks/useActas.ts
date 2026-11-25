import { useQuery } from '@tanstack/react-query';
import { casos } from '@/shared/di/contenedor';
import { claves } from '@/shared/presentation/query/claves';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import type { Dignidad } from '../../domain/entities/Acta';

/** Cola local del usuario (RF-13) */
export function useColaLocal() {
  const perfil = usePerfil();
  return useQuery({
    queryKey: claves.cola,
    queryFn: () => casos.consultarActas.listarCola(perfil!.id),
    enabled: !!perfil,
    staleTime: 0,
  });
}

export const useActaRemota = (id: string | undefined) =>
  useQuery({ queryKey: claves.acta(id ?? ''), queryFn: () => casos.consultarActas.remota(id!), enabled: !!id });

export const useUrlFoto = (ruta: string | null | undefined) =>
  useQuery({
    queryKey: ['foto', ruta],
    queryFn: () => casos.consultarActas.urlFoto(ruta!),
    enabled: !!ruta,
    staleTime: 50 * 60_000,
  });

export const useCatalogo = () =>
  useQuery({ queryKey: claves.catalogo, queryFn: () => casos.catalogo.ejecutar(), staleTime: 10 * 60_000 });

/** Para corregir: el acta que ya tiene el servidor (si hay señal) */
export const useActaDeMesa = (mesaId: number, dignidad: Dignidad) =>
  useQuery({
    queryKey: claves.actaMesa(mesaId, dignidad),
    queryFn: async () => {
      try {
        return await casos.consultarActas.remotaPorMesa(mesaId, dignidad);
      } catch {
        return null; // sin señal: se trabaja con lo local
      }
    },
    retry: 0,
  });
