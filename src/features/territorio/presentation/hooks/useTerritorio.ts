import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { casos } from '@/shared/di/contenedor';
import { claves } from '@/shared/presentation/query/claves';
import type { NuevoRecinto } from '../../domain/entities/Territorio';

export const useRecintos = () => useQuery({ queryKey: claves.recintos, queryFn: () => casos.recintos.listar() });
export const useRecinto = (id: number | null | undefined) =>
  useQuery({ queryKey: claves.recinto(id ?? 0), queryFn: () => casos.recintos.obtener(id!), enabled: !!id });
export const useParroquias = () => useQuery({ queryKey: claves.parroquias, queryFn: () => casos.recintos.parroquias(), staleTime: Infinity });
export const useMesasRecinto = (recintoId: number | null | undefined) =>
  useQuery({ queryKey: claves.mesasRecinto(recintoId ?? 0), queryFn: () => casos.mesas.delRecinto(recintoId!), enabled: !!recintoId });
export const useMisMesas = (habilitado = true) =>
  useQuery({ queryKey: claves.misMesas, queryFn: () => casos.mesas.misMesas(), enabled: habilitado });

export function useCrearRecinto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: NuevoRecinto) => casos.recintos.crear(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.recintos }),
  });
}

export function useAsignarCoordinador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { recintoId: number; coordinadorId: string }) => casos.recintos.asignarCoordinador(v.recintoId, v.coordinadorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: claves.recintos });
      qc.invalidateQueries({ queryKey: ['personal'] });
    },
  });
}

export function useAsignarVeedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { mesaId: number; veedorId: string }) => casos.mesas.asignarVeedor(v.mesaId, v.veedorId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesas'] });
      qc.invalidateQueries({ queryKey: ['personal'] });
    },
  });
}
