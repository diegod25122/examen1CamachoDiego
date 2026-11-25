// RNF-09: Realtime invalida las consultas; al volver a primer plano se consulta de respaldo (ADR-01)
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { casos } from '@/shared/di/contenedor';
import { claves } from '@/shared/presentation/query/claves';
import type { Dignidad } from '@/features/actas/domain/entities/Acta';

export function useEscrutinioEnVivo() {
  const qc = useQueryClient();
  const [ultimoCambio, setUltimoCambio] = useState<number | null>(null);

  useEffect(() => {
    let espera: ReturnType<typeof setTimeout> | null = null;
    const refrescar = () => {
      // agrupa ráfagas de cambios en una sola recarga
      if (espera) clearTimeout(espera);
      espera = setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['escrutinio'] });
        qc.invalidateQueries({ queryKey: claves.recintos });
        setUltimoCambio(Date.now());
      }, 600);
    };
    const desuscribir = casos.escrutinio.suscribir(refrescar);
    const sub = AppState.addEventListener('change', (e) => e === 'active' && refrescar());
    return () => {
      if (espera) clearTimeout(espera);
      desuscribir();
      sub.remove();
    };
  }, [qc]);

  return ultimoCambio;
}

export const useAvance = () => useQuery({ queryKey: claves.avance, queryFn: () => casos.escrutinio.avance(), refetchInterval: 60_000 });
export const useUltimasActas = () => useQuery({ queryKey: claves.ultimasActas, queryFn: () => casos.escrutinio.ultimasActas(8) });
export const useResultados = (dignidad: Dignidad, recintoId: number | null) =>
  useQuery({ queryKey: claves.resultados(dignidad, recintoId), queryFn: () => casos.escrutinio.resultados(dignidad, recintoId), refetchInterval: 60_000 });
