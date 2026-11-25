// Ubica las fotos guardadas en el teléfono aunque la ruta tenga caracteres
// codificados (pasa en Expo Go: %40, %2F). Se busca por nombre en la carpeta actas.
import { Directory, File, Paths } from 'expo-file-system';

export function carpetaActas(): Directory {
  const dir = new Directory(Paths.document, 'actas');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function resolverArchivo(uri: string): File {
  const nombre = decodeURIComponent(uri.split('/').pop() ?? '');
  if (nombre) {
    const enCarpeta = new File(carpetaActas(), nombre);
    if (enCarpeta.exists) return enCarpeta;
  }
  return new File(uri);
}

export async function leerBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const archivo = resolverArchivo(uri);
    if (archivo.exists) return await archivo.arrayBuffer();
  } catch {
    /* se intenta abajo */
  }
  // Respaldo: leer el archivo local directamente
  const respuesta = await fetch(uri);
  return await respuesta.arrayBuffer();
}