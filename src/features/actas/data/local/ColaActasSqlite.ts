// ADR-03: outbox en SQLite. Los valores y la evidencia van cifrados (RNF-04).
import { baseDatos } from '@/shared/infra/db/baseDatos';
import { cifrar, descifrar } from '@/shared/infra/seguridad/cifrado';
import type { ActaLocal, Dignidad } from '../../domain/entities/Acta';
import type { IColaActas } from '../../domain/repositories/Puertos';

type Fila = {
  id: string;
  usuario_id: string;
  mesa_id: number;
  dignidad: Dignidad;
  operacion: 'crear' | 'corregir';
  datos_cifrados: string;
  foto_local: string | null;
  foto_path: string | null;
  foto_subida: number;
  estado: ActaLocal['estado'];
  mensaje_error: string | null;
  intentos: number;
  actualizado_en: string;
};

type Sensibles = Pick<ActaLocal, 'votos' | 'nulos' | 'blancos' | 'totalSufragantes' | 'ubicacion' | 'edicion'>;

async function aActa(f: Fila): Promise<ActaLocal> {
  const texto = await descifrar(f.datos_cifrados);
  const s: Sensibles = texto
    ? JSON.parse(texto)
    : { votos: null, nulos: null, blancos: null, totalSufragantes: null, ubicacion: null, edicion: null };
  return {
    id: f.id,
    usuarioId: f.usuario_id,
    mesaId: f.mesa_id,
    dignidad: f.dignidad,
    operacion: f.operacion,
    ...s,
    fotoLocal: f.foto_local,
    fotoPath: f.foto_path,
    fotoSubida: f.foto_subida === 1,
    estado: f.estado,
    mensajeError: f.mensaje_error,
    intentos: f.intentos,
    actualizadoEn: f.actualizado_en,
  };
}

export class ColaActasSqlite implements IColaActas {
  async buscar(usuarioId: string, mesaId: number, dignidad: Dignidad) {
    const f = await baseDatos.getFirstAsync<Fila>(
      'SELECT * FROM outbox_actas WHERE usuario_id = ? AND mesa_id = ? AND dignidad = ? ORDER BY actualizado_en DESC LIMIT 1',
      usuarioId,
      mesaId,
      dignidad,
    );
    return f ? aActa(f) : null;
  }

  async obtener(id: string) {
    const f = await baseDatos.getFirstAsync<Fila>('SELECT * FROM outbox_actas WHERE id = ?', id);
    return f ? aActa(f) : null;
  }

  async guardar(a: ActaLocal) {
    const sensibles: Sensibles = {
      votos: a.votos,
      nulos: a.nulos,
      blancos: a.blancos,
      totalSufragantes: a.totalSufragantes,
      ubicacion: a.ubicacion,
      edicion: a.edicion,
    };
    const datos = await cifrar(JSON.stringify(sensibles));
    await baseDatos.runAsync(
      `INSERT INTO outbox_actas
        (id, usuario_id, mesa_id, dignidad, operacion, datos_cifrados, foto_local, foto_path, foto_subida, estado, mensaje_error, intentos, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         operacion = excluded.operacion, datos_cifrados = excluded.datos_cifrados,
         foto_local = excluded.foto_local, foto_path = excluded.foto_path, foto_subida = excluded.foto_subida,
         estado = excluded.estado, mensaje_error = excluded.mensaje_error, intentos = excluded.intentos,
         actualizado_en = excluded.actualizado_en`,
      a.id,
      a.usuarioId,
      a.mesaId,
      a.dignidad,
      a.operacion,
      datos,
      a.fotoLocal,
      a.fotoPath,
      a.fotoSubida ? 1 : 0,
      a.estado,
      a.mensajeError,
      a.intentos,
      a.actualizadoEn,
    );
  }

  async listar(usuarioId: string) {
    const filas = await baseDatos.getAllAsync<Fila>(
      'SELECT * FROM outbox_actas WHERE usuario_id = ? ORDER BY actualizado_en DESC',
      usuarioId,
    );
    return Promise.all(filas.map(aActa));
  }

  async paraEnviar(usuarioId: string) {
    const filas = await baseDatos.getAllAsync<Fila>(
      "SELECT * FROM outbox_actas WHERE usuario_id = ? AND estado = 'pendiente' ORDER BY actualizado_en ASC",
      usuarioId,
    );
    return Promise.all(filas.map(aActa));
  }

  async actualizar(id: string, c: Partial<Pick<ActaLocal, 'estado' | 'mensajeError' | 'intentos' | 'fotoSubida'>>) {
    const sets: string[] = [];
    const valores: (string | number | null)[] = [];
    if (c.estado !== undefined) (sets.push('estado = ?'), valores.push(c.estado));
    if (c.mensajeError !== undefined) (sets.push('mensaje_error = ?'), valores.push(c.mensajeError));
    if (c.intentos !== undefined) (sets.push('intentos = ?'), valores.push(c.intentos));
    if (c.fotoSubida !== undefined) (sets.push('foto_subida = ?'), valores.push(c.fotoSubida ? 1 : 0));
    if (!sets.length) return;
    sets.push('actualizado_en = ?');
    valores.push(new Date().toISOString());
    await baseDatos.runAsync(`UPDATE outbox_actas SET ${sets.join(', ')} WHERE id = ?`, ...valores, id);
  }

  async contar(usuarioId: string) {
    const f = await baseDatos.getFirstAsync<{ pendientes: number; con_error: number }>(
      `SELECT
         SUM(CASE WHEN estado IN ('pendiente', 'enviando') THEN 1 ELSE 0 END) AS pendientes,
         SUM(CASE WHEN estado = 'error' THEN 1 ELSE 0 END) AS con_error
       FROM outbox_actas WHERE usuario_id = ?`,
      usuarioId,
    );
    return { pendientes: f?.pendientes ?? 0, conError: f?.con_error ?? 0 };
  }

  async recuperarInterrumpidas() {
    await baseDatos.runAsync("UPDATE outbox_actas SET estado = 'pendiente' WHERE estado = 'enviando'");
  }

  async eliminarEnviadas() {
    const filas = await baseDatos.getAllAsync<{ foto_local: string | null }>(
      "SELECT foto_local FROM outbox_actas WHERE estado = 'enviada'",
    );
    await baseDatos.runAsync("DELETE FROM outbox_actas WHERE estado = 'enviada'");
    return filas.map((f) => f.foto_local).filter((u): u is string => !!u);
  }

  async contarTodasPendientes() {
    const f = await baseDatos.getFirstAsync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM outbox_actas WHERE estado IN ('pendiente', 'enviando', 'error', 'borrador')",
    );
    return f?.n ?? 0;
  }
}
