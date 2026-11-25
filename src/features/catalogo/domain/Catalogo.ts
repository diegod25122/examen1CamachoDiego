import type { Dignidad } from '@/features/actas/domain/entities/Acta';

export interface Organizacion {
  id: number;
  sigla: string;
  nombre: string;
  color: string;
  orden: number;
  candidatos: Record<Dignidad, string>;
}

export interface Catalogo {
  organizaciones: Organizacion[]; // ordenadas como el acta física (RF-08)
  margenMetros: number; // S-08
}

export interface ICatalogoRepository {
  /** RF-14 / RF-18: se descarga antes de la jornada y queda en el teléfono */
  obtener(): Promise<{ catalogo: Catalogo; desdeCache: boolean }>;
}

export class ObtenerCatalogo {
  constructor(private repo: ICatalogoRepository) {}
  ejecutar() {
    return this.repo.obtener();
  }
}
