// ADR-03 / RNF-04: la llave AES-256 vive en el almacén seguro de Android
// (expo-secure-store, que solo admite valores pequeños) y los datos
// cifrados con esa llave se guardan en SQLite.
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as aesjs from 'aes-js';

const NOMBRE_LLAVE = 'control_electoral_llave_v1';
let llaveEnMemoria: Uint8Array | null = null;

async function obtenerLlave(): Promise<Uint8Array> {
  if (llaveEnMemoria) return llaveEnMemoria;
  let hex = await SecureStore.getItemAsync(NOMBRE_LLAVE);
  if (!hex) {
    hex = aesjs.utils.hex.fromBytes(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(NOMBRE_LLAVE, hex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  const llave: Uint8Array = aesjs.utils.hex.toBytes(hex);
  llaveEnMemoria = llave;
  return llave;
}

export async function cifrar(texto: string): Promise<string> {
  const llave = await obtenerLlave();
  const iv = Crypto.getRandomBytes(16);
  const ctr = new aesjs.ModeOfOperation.ctr(llave, new aesjs.Counter(iv));
  const cifrado = ctr.encrypt(aesjs.utils.utf8.toBytes(texto));
  return `${aesjs.utils.hex.fromBytes(iv)}:${aesjs.utils.hex.fromBytes(cifrado)}`;
}

export async function descifrar(valor: string): Promise<string | null> {
  try {
    const [ivHex, datosHex] = valor.split(':');
    if (!ivHex || !datosHex) return null;
    const llave = await obtenerLlave();
    const ctr = new aesjs.ModeOfOperation.ctr(llave, new aesjs.Counter(aesjs.utils.hex.toBytes(ivHex)));
    return aesjs.utils.utf8.fromBytes(ctr.decrypt(aesjs.utils.hex.toBytes(datosHex)));
  } catch {
    return null;
  }
}
