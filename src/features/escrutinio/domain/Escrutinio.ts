import type { Dignidad } from '@/features/actas/domain/entities/Acta';
import type { Recinto } from '@/features/territorio/domain/entities/Territorio';

export interface ResultadoCandidato {
  organizacionId: number;
  sigla: string;
  organizacion: string;
  color: string;
  orden: number;
  candidato: string;
  votos: number;
  porcentaje: number; // sobre votos válidos (RF-16)
}

export interface ResultadosDignidad {
  dignidad: Dignidad;
  recintoId: number | null; // null = total
  candidatos: ResultadoCandidato[];
  validos: number;
  nulos: number;
  blancos: number;
  sufragantes: number;
  actas: number;
}

export interface ActaReciente {
  id: string;
  dignidad: Dignidad;
  mesaNumero: number;
  recinto: string;
  recibidoEn: string;
  fueraDeMargen: boolean;
  version: number;
}

export interface ResumenAvance {
  totalMesas: number;
  mesasReportadas: number;
  porcentaje: number;
  recintosCompletos: number;
  actasFueraMargen: number;
}

export interface IEscrutinioRepository {
  avance(): Promise<Recinto[]>;
  resultados(dignidad: Dignidad, recintoId: number | null): Promise<ResultadosDignidad>;
  ultimasActas(limite: number): Promise<ActaReciente[]>;
  /** RNF-09: avisa cuando llega o cambia un acta */
  suscribirCambios(alCambiar: () => void): () => void;
}

/** Reglas puras del panel */
export function resumirAvance(recintos: Recinto[]): ResumenAvance {
  const totalMesas = recintos.reduce((a, r) => a + r.totalMesas, 0);
  const mesasReportadas = recintos.reduce((a, r) => a + r.mesasReportadas, 0);
  return {
    totalMesas,
    mesasReportadas,
    porcentaje: totalMesas ? mesasReportadas / totalMesas : 0,
    recintosCompletos: recintos.filter((r) => r.totalMesas > 0 && r.mesasReportadas === r.totalMesas).length,
    actasFueraMargen: recintos.reduce((a, r) => a + r.actasFueraMargen, 0),
  };
}

export function ordenarPorVotos(c: ResultadoCandidato[]) {
  return [...c].sort((a, b) => b.votos - a.votos || a.orden - b.orden);
}

export class ConsultarEscrutinio {
  constructor(private repo: IEscrutinioRepository) {}
  async avance() {
    const recintos = await this.repo.avance();
    return { recintos, resumen: resumirAvance(recintos) };
  }
  resultados(dignidad: Dignidad, recintoId: number | null) {
    return this.repo.resultados(dignidad, recintoId);
  }
  ultimasActas(limite = 8) {
    return this.repo.ultimasActas(limite);
  }
  suscribir(cb: () => void) {
    return this.repo.suscribirCambios(cb);
  }
}
