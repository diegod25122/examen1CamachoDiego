import { supabase } from '@/shared/infra/supabase/cliente';
import { traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { aRecinto } from '@/features/territorio/data/SupabaseTerritorioRepository';
import type { Dignidad } from '@/features/actas/domain/entities/Acta';
import type { ActaReciente, IEscrutinioRepository, ResultadosDignidad } from '../domain/Escrutinio';

export class SupabaseEscrutinioRepository implements IEscrutinioRepository {
  async avance() {
    const { data, error } = await conTiempoLimite(supabase.from('v_avance_recintos').select('*').order('parroquia').order('recinto'));
    if (error) throw traducirError(error, 'el avance');
    return (data as any[]).map(aRecinto);
  }

  async resultados(dignidad: Dignidad, recintoId: number | null): Promise<ResultadosDignidad> {
    let q1 = supabase.from('v_resultados').select('*').eq('dignidad', dignidad);
    let q2 = supabase.from('v_nulos_blancos').select('*').eq('dignidad', dignidad);
    q1 = recintoId == null ? q1.is('recinto_id', null) : q1.eq('recinto_id', recintoId);
    q2 = recintoId == null ? q2.is('recinto_id', null) : q2.eq('recinto_id', recintoId);

    const [r1, r2, orgs] = await conTiempoLimite(
      Promise.all([q1, q2.maybeSingle(), supabase.from('organizaciones').select('id, sigla, nombre, color, orden, candidatos(dignidad, nombre)').order('orden')]),
    );
    if (r1.error) throw traducirError(r1.error, 'los resultados');
    if (r2.error) throw traducirError(r2.error, 'los resultados');
    if (orgs.error) throw traducirError(orgs.error, 'los resultados');

    // Se listan las 5 organizaciones aunque aún no tengan votos
    const porOrg = new Map((r1.data as any[]).map((f) => [f.organizacion_id as number, f]));
    const candidatos = (orgs.data as any[]).map((o) => {
      const f = porOrg.get(o.id);
      return {
        organizacionId: o.id,
        sigla: o.sigla,
        organizacion: o.nombre,
        color: o.color,
        orden: o.orden,
        candidato: (o.candidatos as any[]).find((c) => c.dignidad === dignidad)?.nombre ?? '—',
        votos: f?.votos ?? 0,
        porcentaje: Number(f?.porcentaje ?? 0),
      };
    });
    const nb = r2.data as any;
    return {
      dignidad,
      recintoId,
      candidatos,
      validos: candidatos.reduce((a, c) => a + c.votos, 0),
      nulos: nb?.nulos ?? 0,
      blancos: nb?.blancos ?? 0,
      sufragantes: nb?.sufragantes ?? 0,
      actas: nb?.actas ?? 0,
    };
  }

  async ultimasActas(limite: number): Promise<ActaReciente[]> {
    const { data, error } = await supabase
      .from('actas')
      .select('id, dignidad, recibido_en, fuera_de_margen, version, mesa:mesas(numero, recinto:recintos(nombre))')
      .order('recibido_en', { ascending: false })
      .limit(limite);
    if (error) throw traducirError(error, 'las últimas actas');
    return (data as any[]).map((f) => ({
      id: f.id,
      dignidad: f.dignidad,
      mesaNumero: f.mesa?.numero ?? 0,
      recinto: f.mesa?.recinto?.nombre ?? '',
      recibidoEn: f.recibido_en,
      fueraDeMargen: f.fuera_de_margen,
      version: f.version,
    }));
  }

  suscribirCambios(alCambiar: () => void): () => void {
    const canal = supabase
      .channel(`panel-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas' }, () => alCambiar())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mesas' }, () => alCambiar())
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }
}
