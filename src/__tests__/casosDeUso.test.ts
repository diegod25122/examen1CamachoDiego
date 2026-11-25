/// <reference types="jest" />
// Pruebas de los casos de uso con dobles de prueba (sin SQLite ni Supabase): ADR-03 / RNF-05
import { GuardarActa } from '../features/actas/domain/usecases/GuardarActa';
import { SincronizarActas } from '../features/actas/domain/usecases/SincronizarActas';
import { AppError } from '../shared/domain/AppError';
import type { ActaLocal } from '../features/actas/domain/entities/Acta';
import type { IActasRemotas, IColaActas } from '../features/actas/domain/repositories/Puertos';
import type { IReporteErrores } from '../shared/domain/IReporteErrores';

class ColaEnMemoria implements IColaActas {
  datos = new Map<string, ActaLocal>();
  async buscar(u: string, m: number, d: string) {
    return [...this.datos.values()].find((a) => a.usuarioId === u && a.mesaId === m && a.dignidad === d) ?? null;
  }
  async obtener(id: string) {
    return this.datos.get(id) ?? null;
  }
  async guardar(a: ActaLocal) {
    this.datos.set(a.id, { ...a });
  }
  async listar(u: string) {
    return [...this.datos.values()].filter((a) => a.usuarioId === u);
  }
  async paraEnviar(u: string) {
    return (await this.listar(u)).filter((a) => a.estado === 'pendiente');
  }
  async actualizar(id: string, c: Partial<ActaLocal>) {
    this.datos.set(id, { ...this.datos.get(id)!, ...c });
  }
  async contar(u: string) {
    const l = await this.listar(u);
    return { pendientes: l.filter((a) => a.estado === 'pendiente' || a.estado === 'enviando').length, conError: l.filter((a) => a.estado === 'error').length };
  }
  async recuperarInterrumpidas() {}
  async eliminarEnviadas() {
    return [];
  }
  async contarTodasPendientes() {
    return 0;
  }
}

const orgs = [1, 2, 3, 4, 5].map((id) => ({ id, sigla: `O${id}` }));
const valores = { votos: [10, 10, 10, 10, 10], nulos: 5, blancos: 5, totalSufragantes: 60 };
const ubicacion = { latitud: -0.17, longitud: -78.48, precisionM: 8, capturadoEn: '2026-11-23T10:00:00Z' };
let n = 0;
const generarId = () => `id-${++n}`;
const reporte: IReporteErrores & { reportados: string[] } = {
  reportados: [],
  reportar(_e, c) {
    this.reportados.push(c.operacion);
  },
  identificar() {},
  pantalla() {},
};

describe('GuardarActa', () => {
  it('sin foto ni ubicación queda como borrador (S-08)', async () => {
    const cola = new ColaEnMemoria();
    const r = await new GuardarActa(cola, generarId).ejecutar({
      usuarioId: 'u1', mesaId: 1, dignidad: 'alcaldia', organizaciones: orgs, valores, fotoLocal: null, ubicacion: null, existente: null,
    });
    expect(r.acta.estado).toBe('borrador');
    expect(r.faltantes.join(' ')).toMatch(/foto/);
    expect(r.faltantes.join(' ')).toMatch(/ubicación/);
  });

  it('completa queda pendiente de envío y reutiliza el mismo UUID al editar (RNF-05)', async () => {
    const cola = new ColaEnMemoria();
    const caso = new GuardarActa(cola, generarId);
    const a = await caso.ejecutar({ usuarioId: 'u1', mesaId: 1, dignidad: 'alcaldia', organizaciones: orgs, valores, fotoLocal: 'file:///f1.jpg', ubicacion, existente: null });
    expect(a.acta.estado).toBe('pendiente');
    expect(a.acta.votos).toEqual({ '1': 10, '2': 10, '3': 10, '4': 10, '5': 10 });
    const b = await caso.ejecutar({ usuarioId: 'u1', mesaId: 1, dignidad: 'alcaldia', organizaciones: orgs, valores, fotoLocal: 'file:///f1.jpg', ubicacion, existente: null });
    expect(b.acta.id).toBe(a.acta.id);
    expect(b.acta.fotoPath).toBe(a.acta.fotoPath); // misma foto → misma ruta
    expect(cola.datos.size).toBe(1);
  });

  it('una foto nueva usa una ruta nueva (RNF-07)', async () => {
    const cola = new ColaEnMemoria();
    const caso = new GuardarActa(cola, generarId);
    const a = await caso.ejecutar({ usuarioId: 'u1', mesaId: 2, dignidad: 'prefectura', organizaciones: orgs, valores, fotoLocal: 'file:///a.jpg', ubicacion, existente: null });
    const b = await caso.ejecutar({ usuarioId: 'u1', mesaId: 2, dignidad: 'prefectura', organizaciones: orgs, valores, fotoLocal: 'file:///b.jpg', ubicacion, existente: null });
    expect(b.acta.fotoPath).not.toBe(a.acta.fotoPath);
    expect(b.acta.fotoPath!.startsWith(`2/${a.acta.id}/`)).toBe(true);
  });

  it('valores que no cuadran no se envían', async () => {
    const r = await new GuardarActa(new ColaEnMemoria(), generarId).ejecutar({
      usuarioId: 'u1', mesaId: 1, dignidad: 'alcaldia', organizaciones: orgs, valores: { ...valores, totalSufragantes: 99 }, fotoLocal: 'f', ubicacion, existente: null,
    });
    expect(r.acta.estado).toBe('borrador');
  });

  it('si ya se envió, el siguiente guardado es una corrección sin tocar la ubicación original', async () => {
    const cola = new ColaEnMemoria();
    const caso = new GuardarActa(cola, generarId);
    const a = await caso.ejecutar({ usuarioId: 'u1', mesaId: 3, dignidad: 'alcaldia', organizaciones: orgs, valores, fotoLocal: 'f', ubicacion, existente: null });
    await cola.actualizar(a.acta.id, { estado: 'enviada', fotoSubida: true });
    const b = await caso.ejecutar({ usuarioId: 'u1', mesaId: 3, dignidad: 'alcaldia', organizaciones: orgs, valores: { ...valores, votos: [12, 8, 10, 10, 10] }, fotoLocal: null, ubicacion: null, existente: null, edicion: { latitud: 1, longitud: 2 } });
    expect(b.acta.operacion).toBe('corregir');
    expect(b.acta.estado).toBe('pendiente');
    expect(b.acta.ubicacion).toBeNull();
    expect(b.acta.edicion).toEqual({ latitud: 1, longitud: 2 });
    expect(b.acta.fotoSubida).toBe(true);
  });
});

describe('SincronizarActas', () => {
  function preparar(remoto: Partial<IActasRemotas>) {
    const cola = new ColaEnMemoria();
    const r: IActasRemotas = {
      subirFoto: async () => {},
      crear: async () => {},
      corregir: async () => {},
      obtener: async () => null,
      buscarPorMesa: async () => null,
      urlFoto: async () => '',
      ...remoto,
    };
    return { cola, sync: new SincronizarActas(cola, r, reporte) };
  }
  const pendiente = (id: string): ActaLocal => ({
    id, usuarioId: 'u1', mesaId: 1, dignidad: 'alcaldia', operacion: 'crear', votos: { '1': 60 }, nulos: 0, blancos: 0, totalSufragantes: 60,
    ubicacion, edicion: null, fotoLocal: 'f', fotoPath: `1/${id}/x.jpg`, fotoSubida: false, estado: 'pendiente', mensajeError: null, intentos: 0, actualizadoEn: '',
  });

  it('sube foto y acta y la marca como enviada', async () => {
    const subidas: string[] = [];
    const { cola, sync } = preparar({ subirFoto: async (ruta) => void subidas.push(ruta) });
    await cola.guardar(pendiente('a1'));
    const r = await sync.ejecutar('u1');
    expect(r.enviadas).toBe(1);
    expect((await cola.obtener('a1'))!.estado).toBe('enviada');
    expect(subidas).toEqual(['1/a1/x.jpg']);
  });

  it('sin señal queda pendiente y no reporta en cada intento', async () => {
    const { cola, sync } = preparar({ crear: async () => { throw new AppError('RED', 'Sin conexión', true); } });
    await cola.guardar(pendiente('a2'));
    const r = await sync.ejecutar('u1');
    const a = (await cola.obtener('a2'))!;
    expect(r.sinSenal).toBe(true);
    expect(a.estado).toBe('pendiente');
    expect(a.fotoSubida).toBe(true); // la foto ya subida no se vuelve a subir
    expect(a.intentos).toBe(1);
  });

  it('un rechazo del servidor queda con error y se reporta a monitoreo (RF-17)', async () => {
    reporte.reportados = [];
    const { cola, sync } = preparar({ subirFoto: async () => { throw new AppError('PERMISO', 'Sin permiso'); } });
    await cola.guardar(pendiente('a3'));
    await sync.ejecutar('u1');
    expect((await cola.obtener('a3'))!.estado).toBe('error');
    expect(reporte.reportados).toContain('subir_foto');
  });

  it('dos sincronizaciones simultáneas no envían dos veces (RNF-05)', async () => {
    let envios = 0;
    const { cola, sync } = preparar({ crear: async () => { envios++; await new Promise((r) => setTimeout(r, 20)); } });
    await cola.guardar(pendiente('a4'));
    await Promise.all([sync.ejecutar('u1'), sync.ejecutar('u1'), sync.ejecutar('u1')]);
    expect(envios).toBe(1);
  });
});
describe('GuardarActa · corrección después de un envío fallido', () => {
  it('no reutiliza la foto local de un intento con error: usa la del servidor', async () => {
    const cola = new ColaEnMemoria();
    await cola.guardar({
      id: 'r1', usuarioId: 'c1', mesaId: 1, dignidad: 'alcaldia', operacion: 'corregir', votos: { '1': 60 }, nulos: 0, blancos: 0, totalSufragantes: 60,
      ubicacion: null, edicion: null, fotoLocal: 'file:///perdida.jpg', fotoPath: '1/r1/rota.jpg', fotoSubida: false, estado: 'error', mensajeError: 'x', intentos: 1, actualizadoEn: '',
    });
    const existente = { id: 'r1', fotoPath: '1/r1/original.jpg' } as any;
    const r = await new GuardarActa(cola, generarId).ejecutar({
      usuarioId: 'c1', mesaId: 1, dignidad: 'alcaldia', organizaciones: orgs, valores, fotoLocal: null, ubicacion: null, existente,
    });
    expect(r.acta.estado).toBe('pendiente');
    expect(r.acta.fotoPath).toBe('1/r1/original.jpg');
    expect(r.acta.fotoSubida).toBe(true);
    expect(r.acta.fotoLocal).toBeNull();
  });
});