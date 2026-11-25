import { AppError } from '@/shared/domain/AppError';
import type { GeneradorId } from '@/shared/domain/IGeneradorId';
import type { ActaLocal, ActaRemota, Dignidad, Ubicacion, ValoresActa } from '../entities/Acta';
import type { IColaActas } from '../repositories/Puertos';
import { validarReglasActa } from '../validaciones/reglasActa';

export type EntradaGuardar = {
  usuarioId: string;
  mesaId: number;
  dignidad: Dignidad;
  organizaciones: { id: number; sigla: string }[];
  /** null si el formulario aún no está completo (borrador) */
  valores: Partial<ValoresActa> | null;
  fotoLocal: string | null;
  ubicacion: Ubicacion | null;
  /** acta ya recibida por el servidor → esto es una corrección (RF-12) */
  existente: ActaRemota | null;
  edicion?: { latitud: number; longitud: number } | null;
  soloBorrador?: boolean;
};

export type ResultadoGuardar = { acta: ActaLocal; faltantes: string[] };

const completos = (v: Partial<ValoresActa> | null, n: number): v is ValoresActa =>
  !!v &&
  Array.isArray(v.votos) &&
  v.votos.length === n &&
  v.votos.every((x) => Number.isInteger(x) && x >= 0) &&
  [v.nulos, v.blancos, v.totalSufragantes].every((x) => Number.isInteger(x) && (x as number) >= 0);

/**
 * Guarda el acta en el teléfono (RF-14). Si está completa queda "pendiente de
 * envío" y la sincronización la sube sola; si no, queda como borrador (S-08).
 */
export class GuardarActa {
  constructor(private cola: IColaActas, private generarId: GeneradorId) {}

  async ejecutar(e: EntradaGuardar): Promise<ResultadoGuardar> {
    const previa = await this.cola.buscar(e.usuarioId, e.mesaId, e.dignidad);
    if (previa?.estado === 'enviando') {
      throw new AppError('VALIDACION', 'Esta acta se está enviando en este momento. Espera unos segundos.');
    }

    // Si el servidor ya la tiene (o se envió desde este teléfono), es una corrección (RF-12)
    const yaEnServidor = !!e.existente || previa?.estado === 'enviada' || previa?.operacion === 'corregir';
    const operacion: ActaLocal['operacion'] = yaEnServidor ? 'corregir' : 'crear';
    const id = e.existente?.id ?? previa?.id ?? this.generarId(); // un solo UUID por acta (RNF-05)

       // Solo se reutiliza la foto local de un borrador o de un envío aún pendiente.
    // Si el intento anterior falló o ya se envió, se parte de la foto del servidor.
    const previaVigente = previa && (previa.estado === 'borrador' || previa.estado === 'pendiente') ? previa : null;
    let fotoLocal = previaVigente?.fotoLocal ?? null;
    let fotoPath = previaVigente?.fotoPath ?? e.existente?.fotoPath ?? previa?.fotoPath ?? null;
    let fotoSubida = previaVigente ? previaVigente.fotoSubida : e.existente ? true : previa?.fotoSubida ?? false;
    if (e.fotoLocal && e.fotoLocal !== previa?.fotoLocal) {
      fotoLocal = e.fotoLocal;
      fotoPath = `${e.mesaId}/${id}/${this.generarId()}.jpg`;
      fotoSubida = false;
    }

    // La ubicación original no cambia al corregir (RNF-07)
    const ubicacion = operacion === 'crear' ? e.ubicacion ?? previa?.ubicacion ?? null : null;

    const faltantes: string[] = [];
    const n = e.organizaciones.length;
    let votos: Record<string, number> | null = null;
    if (completos(e.valores, n)) {
      const errores = validarReglasActa(e.valores, e.organizaciones.map((o) => o.sigla));
      if (errores.length) faltantes.push(errores[0].mensaje);
    } else {
      faltantes.push('Completa todos los valores del acta');
    }
    if (e.valores?.votos) {
      votos = {};
      e.organizaciones.forEach((o, i) => {
        const valor = e.valores!.votos![i];
        if (Number.isInteger(valor)) votos![String(o.id)] = valor as number;
      });
    }
    if (!fotoPath) faltantes.push('Toma la fotografía del acta');
    if (operacion === 'crear' && !ubicacion) faltantes.push('Falta la ubicación GPS (activa el GPS y permite el acceso)');

    const acta: ActaLocal = {
      id,
      usuarioId: e.usuarioId,
      mesaId: e.mesaId,
      dignidad: e.dignidad,
      operacion,
      votos,
      nulos: e.valores?.nulos ?? null,
      blancos: e.valores?.blancos ?? null,
      totalSufragantes: e.valores?.totalSufragantes ?? null,
      ubicacion,
      edicion: operacion === 'corregir' ? e.edicion ?? previa?.edicion ?? null : null,
      fotoLocal,
      fotoPath,
      fotoSubida,
      estado: e.soloBorrador || faltantes.length ? 'borrador' : 'pendiente',
      mensajeError: null,
      intentos: 0,
      actualizadoEn: new Date().toISOString(),
    };

    await this.cola.guardar(acta);
    return { acta, faltantes };
  }
}
