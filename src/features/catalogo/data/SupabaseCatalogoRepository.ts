import { supabase } from '@/shared/infra/supabase/cliente';
import { traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { almacenLocal } from '@/shared/infra/cache/almacenLocal';
import { AppError } from '@/shared/domain/AppError';
import type { Catalogo, ICatalogoRepository, Organizacion } from '../domain/Catalogo';

const CLAVE = 'cache:catalogo';

type FilaOrg = {
  id: number;
  sigla: string;
  nombre: string;
  color: string;
  orden: number;
  candidatos: { dignidad: 'alcaldia' | 'prefectura'; nombre: string }[];
};

export class SupabaseCatalogoRepository implements ICatalogoRepository {
  async obtener(): Promise<{ catalogo: Catalogo; desdeCache: boolean }> {
    try {
      const [orgs, conf] = await conTiempoLimite(
        Promise.all([
          supabase.from('organizaciones').select('id, sigla, nombre, color, orden, candidatos(dignidad, nombre)').order('orden'),
          supabase.from('configuracion').select('margen_metros').maybeSingle(),
        ]),
        10_000,
      );
      if (orgs.error) throw orgs.error;
      const organizaciones: Organizacion[] = (orgs.data as FilaOrg[]).map((o) => ({
        id: o.id,
        sigla: o.sigla,
        nombre: o.nombre,
        color: o.color,
        orden: o.orden,
        candidatos: {
          alcaldia: o.candidatos.find((c) => c.dignidad === 'alcaldia')?.nombre ?? '—',
          prefectura: o.candidatos.find((c) => c.dignidad === 'prefectura')?.nombre ?? '—',
        },
      }));
      const catalogo: Catalogo = { organizaciones, margenMetros: conf.data?.margen_metros ?? 200 };
      await almacenLocal.escribirJson(CLAVE, catalogo);
      return { catalogo, desdeCache: false };
    } catch (e) {
      const cache = await almacenLocal.leerJson<Catalogo>(CLAVE);
      if (cache) return { catalogo: cache, desdeCache: true };
      if (e instanceof AppError) throw e;
      throw traducirError(e, 'la descarga de organizaciones y candidatos');
    }
  }
}
