import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { casos } from '@/shared/di/contenedor';
import { claves } from '@/shared/presentation/query/claves';
import type { NuevaPersona } from '../../domain/entities/Persona';

export const useVeedores = (recintoId: number | null | undefined) =>
  useQuery({
    queryKey: claves.veedores(recintoId ?? 0),
    queryFn: () => casos.personal.veedores(recintoId!),
    enabled: !!recintoId,
  });

export const useCoordinadores = () => useQuery({ queryKey: claves.coordinadores, queryFn: () => casos.personal.coordinadores() });

export function useCrearCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: NuevaPersona) => casos.crearCuenta.ejecutar(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personal'] });
      qc.invalidateQueries({ queryKey: ['mesas'] });
      qc.invalidateQueries({ queryKey: claves.recintos });
    },
  });
}
