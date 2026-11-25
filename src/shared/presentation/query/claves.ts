// Claves de consulta centralizadas (ADR-05) para invalidarlas con Realtime
export const claves = {
  catalogo: ['catalogo'] as const,
  parroquias: ['parroquias'] as const,
  recintos: ['recintos'] as const,
  recinto: (id: number) => ['recintos', id] as const,
  mesasRecinto: (recintoId: number) => ['mesas', 'recinto', recintoId] as const,
  misMesas: ['mesas', 'mias'] as const,
  veedores: (recintoId: number) => ['personal', 'veedores', recintoId] as const,
  coordinadores: ['personal', 'coordinadores'] as const,
  acta: (id: string) => ['actas', id] as const,
  actaMesa: (mesaId: number, dignidad: string) => ['actas', 'mesa', mesaId, dignidad] as const,
  cola: ['actas', 'cola'] as const,
  avance: ['escrutinio', 'avance'] as const,
  ultimasActas: ['escrutinio', 'ultimas'] as const,
  resultados: (dignidad: string, recintoId: number | null) => ['escrutinio', 'resultados', dignidad, recintoId] as const,
};
