import { leerBytes } from '@/shared/infra/archivos/archivoLocal';
import { supabase } from '@/shared/infra/supabase/cliente';
import { traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { AppError } from '@/shared/domain/AppError';
import type { ActaLocal, ActaRemota, Dignidad } from '../../domain/entities/Acta';
import type { IActasRemotas } from '../../domain/repositories/Puertos';

const BUCKET = 'actas';

const SELECT_ACTA = `
  id, mesa_id, dignidad, votos, nulos, blancos, total_sufragantes, foto_path,
  latitud, longitud, precision_m, capturado_en, recibido_en, distancia_m, fuera_de_margen,
  version, actualizado_en,
  registrado:perfiles!actas_registrado_por_fkey(nombres, apellidos, cedula),
  mesa:mesas(numero, recinto:recintos(id, nombre, latitud, longitud)),
  versiones:acta_versiones(version, operacion, cedula, realizado_por, realizado_en, latitud, longitud, valores_anteriores, valores_nuevos, foto_anterior, foto_nueva)
`;

function aActaRemota(f: any): ActaRemota {
  return {
    id: f.id,
    mesaId: f.mesa_id,
    mesaNumero: f.mesa?.numero ?? 0,
    recinto: f.mesa?.recinto ?? { id: 0, nombre: '', latitud: 0, longitud: 0 },
    dignidad: f.dignidad,
    votos: f.votos,
    nulos: f.nulos,
    blancos: f.blancos,
    totalSufragantes: f.total_sufragantes,
    fotoPath: f.foto_path,
    latitud: f.latitud,
    longitud: f.longitud,
    precisionM: f.precision_m,
    capturadoEn: f.capturado_en,
    recibidoEn: f.recibido_en,
    distanciaM: f.distancia_m,
    fueraDeMargen: f.fuera_de_margen,
    version: f.version,
    actualizadoEn: f.actualizado_en,
    registradoPor: f.registrado ?? null,
    versiones: ((f.versiones ?? []) as any[])
      .map((v) => ({
        version: v.version,
        operacion: v.operacion,
        cedula: v.cedula,
        realizadoPor: v.realizado_por,
        realizadoEn: v.realizado_en,
        latitud: v.latitud,
        longitud: v.longitud,
        anteriores: v.valores_anteriores,
        nuevos: v.valores_nuevos,
        fotoAnterior: v.foto_anterior,
        fotoNueva: v.foto_nueva,
      }))
      .sort((a, b) => b.version - a.version),
  };
}

export class SupabaseActasRepository implements IActasRemotas {
    async subirFoto(ruta: string, uriLocal: string): Promise<void> {
    let bytes: ArrayBuffer;
    try {
      bytes = await leerBytes(uriLocal);
    } catch {
      throw new AppError('VALIDACION', 'La foto ya no está en el teléfono. Vuelve a tomarla.');
    }
    if (!bytes || bytes.byteLength === 0) {
      throw new AppError('VALIDACION', 'La foto ya no está en el teléfono. Vuelve a tomarla.');
    }
    const { error } = await conTiempoLimite(
      supabase.storage.from(BUCKET).upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false }),
      45_000,
    );
    // Si ya existe, un intyento anterior la subió: es el mismo archivo (ruta única), no se duplica
    if (error && !/exists|duplicate|409/i.test(`${error.message} ${(error as any).statusCode ?? ''}`)) {
      throw traducirError(error, 'la subida de la foto');
    }
  }

  async crear(a: ActaLocal): Promise<void> {
    if (!a.ubicacion || !a.votos || a.fotoPath == null) throw new AppError('VALIDACION', 'El acta está incompleta.');
    const fila = {
      id: a.id,
      mesa_id: a.mesaId,
      dignidad: a.dignidad,
      votos: a.votos,
      nulos: a.nulos,
      blancos: a.blancos,
      total_sufragantes: a.totalSufragantes,
      foto_path: a.fotoPath,
      latitud: a.ubicacion.latitud,
      longitud: a.ubicacion.longitud,
      precision_m: a.ubicacion.precisionM,
      capturado_en: a.ubicacion.capturadoEn,
    };
    const { error } = await conTiempoLimite(supabase.from('actas').insert(fila));
    if (!error) return;
    // Reintento de un envío que sí llegó (se cortó la respuesta): mismo UUID → no se duplica
    if (error.code === '23505' && error.message.includes('actas_pkey')) {
      await this.corregir({ ...a, operacion: 'corregir' });
      return;
    }
    throw traducirError(error, 'el envío del acta');
  }

  async corregir(a: ActaLocal): Promise<void> {
    if (!a.votos) throw new AppError('VALIDACION', 'El acta está incompleta.');
    const { data, error } = await conTiempoLimite(
      supabase
        .from('actas')
        .update({
          votos: a.votos,
          nulos: a.nulos,
          blancos: a.blancos,
          total_sufragantes: a.totalSufragantes,
          foto_path: a.fotoPath,
          editado_latitud: a.edicion?.latitud ?? null,
          editado_longitud: a.edicion?.longitud ?? null,
        })
        .eq('id', a.id)
        .select('id'),
    );
    if (error) throw traducirError(error, 'la corrección del acta');
    if (!data?.length) throw new AppError('PERMISO', 'No puedes corregir esta acta. Puede que ya no estés asignado a la mesa.');
  }

  async obtener(id: string): Promise<ActaRemota | null> {
    const { data, error } = await conTiempoLimite(supabase.from('actas').select(SELECT_ACTA).eq('id', id).maybeSingle());
    if (error) throw traducirError(error, 'el acta');
    return data ? aActaRemota(data) : null;
  }

  async buscarPorMesa(mesaId: number, dignidad: Dignidad): Promise<ActaRemota | null> {
    const { data, error } = await conTiempoLimite(
      supabase.from('actas').select(SELECT_ACTA).eq('mesa_id', mesaId).eq('dignidad', dignidad).maybeSingle(),
      8000,
    );
    if (error) throw traducirError(error, 'el acta');
    return data ? aActaRemota(data) : null;
  }

  async urlFoto(ruta: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(ruta, 60 * 60);
    if (error || !data) throw traducirError(error, 'la foto');
    return data.signedUrl;
  }
}
