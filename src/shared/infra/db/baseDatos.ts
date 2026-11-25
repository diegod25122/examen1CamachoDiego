// ADR-03: SQLite local. Tabla kv (sesión y cachés cifrados) y outbox de actas.
import * as SQLite from 'expo-sqlite';

export const baseDatos = SQLite.openDatabaseSync('control-electoral.db');

baseDatos.execSync(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS kv (
    clave TEXT PRIMARY KEY NOT NULL,
    valor TEXT NOT NULL
  );

  -- Patrón outbox: cada acta nace con su UUID y se envía sola cuando hay señal (RF-14, RNF-05, RNF-06)
  CREATE TABLE IF NOT EXISTS outbox_actas (
    id TEXT PRIMARY KEY NOT NULL,
    usuario_id TEXT NOT NULL,
    mesa_id INTEGER NOT NULL,
    dignidad TEXT NOT NULL,
    operacion TEXT NOT NULL,              -- crear | corregir
    datos_cifrados TEXT NOT NULL,         -- valores, evidencia y edición (cifrados, RNF-04)
    foto_local TEXT,                      -- ruta del archivo en el teléfono
    foto_path TEXT,                       -- ruta destino en Storage
    foto_subida INTEGER NOT NULL DEFAULT 0,
    estado TEXT NOT NULL,                 -- borrador | pendiente | enviando | enviada | error
    mensaje_error TEXT,
    intentos INTEGER NOT NULL DEFAULT 0,
    actualizado_en TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS outbox_usuario_estado ON outbox_actas (usuario_id, estado);
  CREATE INDEX IF NOT EXISTS outbox_mesa ON outbox_actas (usuario_id, mesa_id, dignidad);
`);
