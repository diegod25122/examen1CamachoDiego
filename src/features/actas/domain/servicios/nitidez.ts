// RF-10 / ADR-04: prueba de nitidez por varianza del Laplaciano sobre una copia reducida.
// Una foto borrosa tiene bordes suaves → Laplaciano casi plano → varianza baja.

/** Umbral calibrado con fotos de prueba de actas a 320 px de ancho. Ajustable. */
export const UMBRAL_NITIDEZ = 60;

export function rgbaAGris(rgba: Uint8Array, ancho: number, alto: number): Float32Array {
  const gris = new Float32Array(ancho * alto);
  for (let i = 0, p = 0; i < gris.length; i++, p += 4) {
    gris[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return gris;
}

/** Kernel Laplaciano 4-vecinos: [0 1 0; 1 -4 1; 0 1 0] */
export function varianzaLaplaciano(gris: Float32Array, ancho: number, alto: number): number {
  let suma = 0;
  let sumaCuadrados = 0;
  let n = 0;
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      const lap = gris[i - ancho] + gris[i + ancho] + gris[i - 1] + gris[i + 1] - 4 * gris[i];
      suma += lap;
      sumaCuadrados += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const media = suma / n;
  return sumaCuadrados / n - media * media;
}

export function evaluarNitidez(varianza: number, umbral = UMBRAL_NITIDEZ) {
  return {
    varianza,
    nitida: varianza >= umbral,
    mensaje:
      varianza >= umbral
        ? 'La foto se ve nítida.'
        : 'La foto está borrosa. Apoya los codos, acércate al acta con buena luz y vuelve a tomarla.',
  };
}
