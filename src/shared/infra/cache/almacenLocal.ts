// Almacén clave-valor cifrado sobre SQLite. Lo usan la sesión de Supabase
// y las cachés de datos descargados antes de la jornada (RF-14).
import { baseDatos } from '../db/baseDatos';
import { cifrar, descifrar } from '../seguridad/cifrado';

export const almacenLocal = {
  async leer(clave: string): Promise<string | null> {
    const fila = await baseDatos.getFirstAsync<{ valor: string }>('SELECT valor FROM kv WHERE clave = ?', clave);
    return fila ? descifrar(fila.valor) : null;
  },

  async escribir(clave: string, valor: string): Promise<void> {
    const cifrado = await cifrar(valor);
    await baseDatos.runAsync(
      'INSERT INTO kv (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
      clave,
      cifrado,
    );
  },

  async borrar(clave: string): Promise<void> {
    await baseDatos.runAsync('DELETE FROM kv WHERE clave = ?', clave);
  },

  async leerJson<T>(clave: string): Promise<T | null> {
    const texto = await this.leer(clave);
    if (!texto) return null;
    try {
      return JSON.parse(texto) as T;
    } catch {
      return null;
    }
  },

  async escribirJson(clave: string, valor: unknown): Promise<void> {
    await this.escribir(clave, JSON.stringify(valor));
  },

  /** RNF-04: al cerrar sesión se borra todo menos la cola de actas pendientes */
  async borrarTodo(): Promise<void> {
    await baseDatos.runAsync('DELETE FROM kv');
  },
};

/** Adaptador de almacenamiento para la sesión de Supabase Auth */
export const almacenSesionCifrado = {
  getItem: (clave: string) => almacenLocal.leer(`sesion:${clave}`),
  setItem: (clave: string, valor: string) => almacenLocal.escribir(`sesion:${clave}`, valor),
  removeItem: (clave: string) => almacenLocal.borrar(`sesion:${clave}`),
};
