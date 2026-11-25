// ADR-04: compresión, prueba de nitidez y GPS en el teléfono, sin claves de API de pago.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { decode } from 'jpeg-js';
import { AppError } from '@/shared/domain/AppError';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import type { Ubicacion } from '../../domain/entities/Acta';
import type { IEvidencia } from '../../domain/repositories/Puertos';
import { rgbaAGris, varianzaLaplaciano } from '../../domain/servicios/nitidez';

const ANCHO_ANALISIS = 320; // copia reducida para medir nitidez rápido en gama baja
const ANCHO_ENVIO = 1600; // legible y liviana para redes rurales (RNF-08)
const CALIDAD_ENVIO = 0.7;

function carpetaActas(): Directory {
  const dir = new Directory(Paths.document, 'actas');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export class EvidenciaDispositivo implements IEvidencia {
  async medirNitidez(uri: string): Promise<number> {
    const imagen = await ImageManipulator.manipulate(uri).resize({ width: ANCHO_ANALISIS }).renderAsync();
    const copia = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
    try {
      const bytes = new Uint8Array(await new File(copia.uri).arrayBuffer());
      const { data, width, height } = decode(bytes, { useTArray: true, formatAsRGBA: true });
      return varianzaLaplaciano(rgbaAGris(data as Uint8Array, width, height), width, height);
    } finally {
      try {
        new File(copia.uri).delete();
      } catch {}
    }
  }

  async prepararFoto(uri: string): Promise<string> {
    const imagen = await ImageManipulator.manipulate(uri).resize({ width: ANCHO_ENVIO }).renderAsync();
    const comprimida = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: CALIDAD_ENVIO });
    // Se copia a documentos: sobrevive al cierre de la app y al apagado (RNF-06)
    const destino = new File(carpetaActas(), `${Crypto.randomUUID()}.jpg`);
    new File(comprimida.uri).copy(destino);
    try {
      new File(comprimida.uri).delete();
    } catch {}
    return destino.uri;
  }

  async eliminar(uri: string): Promise<void> {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {}
  }

  async obtenerUbicacion(): Promise<Ubicacion> {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (permiso.status !== 'granted') {
      throw new AppError('PERMISO', 'Permite el acceso a la ubicación. Sin ubicación el acta queda como borrador y no se envía.');
    }
    if (!(await Location.hasServicesEnabledAsync())) {
      throw new AppError('VALIDACION', 'Activa el GPS (Ubicación) del teléfono para registrar el acta.');
    }
    try {
      const pos = await conTiempoLimite(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), 20_000);
      return {
        latitud: pos.coords.latitude,
        longitud: pos.coords.longitude,
        precisionM: Math.round(pos.coords.accuracy ?? 0),
        capturadoEn: new Date(pos.timestamp).toISOString(),
      };
    } catch {
      // Bajo techo el GPS tarda: se acepta la última posición reciente (máx. 2 min)
      const ultima = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
      if (!ultima) throw new AppError('VALIDACION', 'No se pudo obtener la ubicación. Acércate a una ventana o sal un momento y reintenta.');
      return {
        latitud: ultima.coords.latitude,
        longitud: ultima.coords.longitude,
        precisionM: Math.round(ultima.coords.accuracy ?? 0),
        capturadoEn: new Date().toISOString(),
      };
    }
  }
}
