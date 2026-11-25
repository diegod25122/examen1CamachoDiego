import { supabase } from '@/shared/infra/supabase/cliente';
import { esErrorDeRed, traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { almacenLocal } from '@/shared/infra/cache/almacenLocal';
import { AppError } from '@/shared/domain/AppError';
import type { Mesa, MesaAsignada, NuevoRecinto, Parroquia, Recinto } from '../domain/entities/Territorio';
import type { ITerritorioRepository } from '../domain/repositories/ITerritorioRepository';

const CLAVE_MIS_MESAS = 'cache:mis_mesas';

type FilaAvance = {
  recinto_id: number;
  recinto: string;
  parroquia_id: number;
  parroquia: string;
  parroquia_tipo: 'urbana' | 'rural';
  latitud: number;
  longitud: number;
  total_mesas: number;
  mesas_reportadas: number;
  actas_recibidas: number;
  actas_fuera_margen: number;
  coordinador_id: string | null;
  coordinador: string | null;
};

type FilaMesa = {
  id: number;
  numero: number;
  recinto_id: number;
  veedor_id: string | null;
  veedor: { nombres: string; apellidos: string; cedula: string } | null;
  actas: { id: string; dignidad: 'alcaldia' | 'prefectura'; version: number; recibido_en: string; fuera_de_margen: boolean }[];
  recintos?: { id: number; nombre: string; latitud: number; longitud: number; parroquias: { nombre: string } | null } | null;
};

const SELECT_MESA =
  'id, numero, recinto_id, veedor_id, veedor:perfiles!mesas_veedor_id_fkey(nombres, apellidos, cedula), actas(id, dignidad, version, recibido_en, fuera_de_margen)';

export const aRecinto = (f: FilaAvance): Recinto => ({
  id: f.recinto_id,
  nombre: f.recinto,
  parroquiaId: f.parroquia_id,
  parroquia: f.parroquia,
  parroquiaTipo: f.parroquia_tipo,
  latitud: f.latitud,
  longitud: f.longitud,
  totalMesas: f.total_mesas,
  mesasReportadas: f.mesas_reportadas,
  actasRecibidas: f.actas_recibidas,
  actasFueraMargen: f.actas_fuera_margen,
  coordinadorId: f.coordinador_id,
  coordinador: f.coordinador,
});

const aMesa = (f: FilaMesa): Mesa => ({
  id: f.id,
  numero: f.numero,
  recintoId: f.recinto_id,
  veedorId: f.veedor_id,
  veedor: f.veedor,
  actas: (f.actas ?? []).map((a) => ({
    id: a.id,
    dignidad: a.dignidad,
    version: a.version,
    recibidoEn: a.recibido_en,
    fueraDeMargen: a.fuera_de_margen,
  })),
});

export class SupabaseTerritorioRepository implements ITerritorioRepository {
  async listarParroquias(): Promise<Parroquia[]> {
    const { data, error } = await supabase.from('parroquias').select('id, nombre, tipo').order('nombre');
    if (error) throw traducirError(error, 'la lista de parroquias');
    return data as Parroquia[];
  }

  async listarRecintos(): Promise<Recinto[]> {
    const { data, error } = await conTiempoLimite(supabase.from('v_avance_recintos').select('*').order('parroquia').order('recinto'));
    if (error) throw traducirError(error, 'la lista de recintos');
    return (data as FilaAvance[]).map(aRecinto);
  }

  async obtenerRecinto(id: number): Promise<Recinto | null> {
    const { data, error } = await supabase.from('v_avance_recintos').select('*').eq('recinto_id', id).maybeSingle<FilaAvance>();
    if (error) throw traducirError(error, 'el recinto');
    return data ? aRecinto(data) : null;
  }

  async crearRecinto(d: NuevoRecinto): Promise<number> {
    const { data, error } = await conTiempoLimite(
      supabase.rpc('crear_recinto', {
        p_parroquia: d.parroquiaId,
        p_nombre: d.nombre,
        p_latitud: d.latitud,
        p_longitud: d.longitud,
        p_mesas: d.numeroMesas,
      }),
    );
    if (error) throw traducirError(error, 'la creación del recinto');
    return data as number;
  }

  async asignarCoordinador(recintoId: number, coordinadorId: string): Promise<void> {
    const { error } = await conTiempoLimite(supabase.rpc('asignar_coordinador', { p_recinto: recintoId, p_coordinador: coordinadorId }));
    if (error) throw traducirError(error, 'la asignación del coordinador');
  }

  async listarMesasRecinto(recintoId: number): Promise<Mesa[]> {
    const { data, error } = await conTiempoLimite(supabase.from('mesas').select(SELECT_MESA).eq('recinto_id', recintoId).order('numero'));
    if (error) throw traducirError(error, 'las mesas');
    return (data as unknown as FilaMesa[]).map(aMesa);
  }

  async asignarVeedor(mesaId: number, veedorId: string): Promise<void> {
    const { data, error } = await conTiempoLimite(supabase.from('mesas').update({ veedor_id: veedorId }).eq('id', mesaId).select('id'));
    if (error) throw traducirError(error, 'la asignación del veedor');
    if (!data?.length) throw new AppError('PERMISO', 'No puedes asignar veedores en esta mesa.');
  }

  async listarMisMesas(): Promise<{ mesas: MesaAsignada[]; desdeCache: boolean }> {
    const { data: sesion } = await supabase.auth.getSession();
    const id = sesion.session?.user.id;
    if (!id) return { mesas: [], desdeCache: true };
    try {
      const { data, error } = await conTiempoLimite(
        supabase
          .from('mesas')
          .select(`${SELECT_MESA}, recintos(id, nombre, latitud, longitud, parroquias(nombre))`)
          .eq('veedor_id', id)
          .order('recinto_id')
          .order('numero'),
        10_000,
      );
      if (error) throw error;
      const mesas: MesaAsignada[] = (data as unknown as FilaMesa[]).map((f) => ({
        ...aMesa(f),
        recinto: {
          id: f.recintos!.id,
          nombre: f.recintos!.nombre,
          parroquia: f.recintos!.parroquias?.nombre ?? '',
          latitud: f.recintos!.latitud,
          longitud: f.recintos!.longitud,
        },
      }));
      await almacenLocal.escribirJson(CLAVE_MIS_MESAS, { usuario: id, mesas, guardadoEn: new Date().toISOString() });
      return { mesas, desdeCache: false };
    } catch (e) {
      const cache = await almacenLocal.leerJson<{ usuario: string; mesas: MesaAsignada[] }>(CLAVE_MIS_MESAS);
      if (cache && cache.usuario === id) return { mesas: cache.mesas, desdeCache: true };
      if (esErrorDeRed(e)) throw new AppError('RED', 'Sin conexión y aún no se descargaron tus mesas. Conéctate una vez para descargarlas.', true);
      throw traducirError(e, 'tus mesas');
    }
  }
}
