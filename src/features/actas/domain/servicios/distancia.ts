// RF-11 / S-08: Haversine, se calcula también sin conexión (y se recalcula en el servidor)
const RADIO_TIERRA_M = 6_371_000;
const rad = (g: number) => (g * Math.PI) / 180;

export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(a));
}

export function evaluarUbicacion(
  ubicacion: { latitud: number; longitud: number },
  recinto: { latitud: number; longitud: number },
  margenMetros: number,
) {
  const distancia = distanciaMetros(ubicacion.latitud, ubicacion.longitud, recinto.latitud, recinto.longitud);
  return { distanciaM: distancia, fueraDeMargen: distancia > margenMetros };
}
