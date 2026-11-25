/// <reference types="jest" />
// Pruebas del dominio (ADR-08): reglas puras, sin React Native ni Supabase.
// Ejecutar: npx jest   (o: bun test)
import { validarCedula } from '../features/personal/domain/validaciones/cedula';
import { sumaActa, validarReglasActa } from '../features/actas/domain/validaciones/reglasActa';
import { distanciaMetros, evaluarUbicacion } from '../features/actas/domain/servicios/distancia';
import { evaluarNitidez, varianzaLaplaciano } from '../features/actas/domain/servicios/nitidez';
import { resumirAvance } from '../features/escrutinio/domain/Escrutinio';

describe('Cédula ecuatoriana (módulo 10)', () => {
  it.each(['1712345675', '1723456784', '1709876542', '0102030400'])('acepta %s', (c) => {
    expect(validarCedula(c)).toBeNull();
  });
  it('rechaza dígito verificador incorrecto', () => {
    expect(validarCedula('1712345678')).toMatch(/no es válida/);
  });
  it('rechaza longitud distinta de 10', () => {
    expect(validarCedula('171234567')).toMatch(/10 dígitos/);
  });
  it('rechaza provincia inexistente', () => {
    expect(validarCedula('9912345675')).toMatch(/provincia/);
  });
  it('rechaza tercer dígito mayor o igual a 6', () => {
    expect(validarCedula('1772345675')).toMatch(/tercer dígito/);
  });
  it('rechaza letras', () => {
    expect(validarCedula('17123A5675')).toMatch(/solo lleva números/);
  });
});

describe('Reglas del acta (RF-09)', () => {
  const base = { votos: [10, 10, 10, 10, 10], nulos: 5, blancos: 5, totalSufragantes: 60 };

  it('acepta un acta que cuadra', () => {
    expect(validarReglasActa(base)).toEqual([]);
    expect(sumaActa(base)).toBe(60);
  });
  it('detecta suma que no cuadra (faltan votos)', () => {
    const e = validarReglasActa({ ...base, totalSufragantes: 70 });
    expect(e).toHaveLength(1);
    expect(e[0].ruta).toEqual(['totalSufragantes']);
    expect(e[0].mensaje).toMatch(/faltan 10/);
  });
  it('detecta suma que no cuadra (sobran votos)', () => {
    expect(validarReglasActa({ ...base, totalSufragantes: 50 })[0].mensaje).toMatch(/sobran 10/);
  });
  it('detecta organización con más votos que el total', () => {
    const e = validarReglasActa({ votos: [100, 0, 0, 0, 0], nulos: 0, blancos: 0, totalSufragantes: 50 }, ['MFC', 'ARP', 'MUC', 'FDP', 'MNE']);
    expect(e.some((x) => x.ruta[0] === 'votos' && x.ruta[1] === 0 && x.mensaje.includes('MFC'))).toBe(true);
  });
  it('detecta nulos o blancos mayores que el total', () => {
    const e = validarReglasActa({ votos: [0, 0, 0, 0, 0], nulos: 20, blancos: 0, totalSufragantes: 10 });
    expect(e.some((x) => x.ruta[0] === 'nulos')).toBe(true);
  });
});

describe('Distancia y margen (RF-11, S-08)', () => {
  const recinto = { latitud: -0.17261842559297133, longitud: -78.4829615893297 }; // Colegio La Condamine
  it('distancia cero al mismo punto', () => {
    expect(distanciaMetros(recinto.latitud, recinto.longitud, recinto.latitud, recinto.longitud)).toBeCloseTo(0, 5);
  });
  it('un acta a ~110 m está dentro del margen de 200 m', () => {
    const r = evaluarUbicacion({ latitud: recinto.latitud + 0.001, longitud: recinto.longitud }, recinto, 200);
    expect(r.distanciaM).toBeGreaterThan(100);
    expect(r.distanciaM).toBeLessThan(120);
    expect(r.fueraDeMargen).toBe(false);
  });
  it('un acta a ~1.1 km queda fuera del margen', () => {
    expect(evaluarUbicacion({ latitud: recinto.latitud + 0.01, longitud: recinto.longitud }, recinto, 200).fueraDeMargen).toBe(true);
  });
});

describe('Nitidez por varianza del Laplaciano (RF-10)', () => {
  const ancho = 64;
  const alto = 64;
  const nitida = new Float32Array(ancho * alto);
  const borrosa = new Float32Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      nitida[y * ancho + x] = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? 255 : 0; // tablero: bordes duros
      borrosa[y * ancho + x] = 128 + 20 * Math.sin(x / 10); // degradado suave
    }
  }
  it('una imagen con bordes marcados supera el umbral', () => {
    expect(evaluarNitidez(varianzaLaplaciano(nitida, ancho, alto)).nitida).toBe(true);
  });
  it('una imagen suave (borrosa) no supera el umbral', () => {
    expect(evaluarNitidez(varianzaLaplaciano(borrosa, ancho, alto)).nitida).toBe(false);
  });
});

describe('Avance del escrutinio (S-07)', () => {
  it('suma mesas reportadas y calcula el porcentaje', () => {
    const r = resumirAvance([
      { totalMesas: 3, mesasReportadas: 3, actasFueraMargen: 1 },
      { totalMesas: 3, mesasReportadas: 0, actasFueraMargen: 0 },
    ] as any);
    expect(r).toMatchObject({ totalMesas: 6, mesasReportadas: 3, porcentaje: 0.5, recintosCompletos: 1, actasFueraMargen: 1 });
  });
});
