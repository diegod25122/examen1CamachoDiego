import type { Dignidad } from '../entities/Acta';
import type { IActasRemotas, IColaActas, IEvidencia } from '../repositories/Puertos';
import { evaluarNitidez, UMBRAL_NITIDEZ } from '../servicios/nitidez';

export class ConsultarActas {
  constructor(private cola: IColaActas, private remoto: IActasRemotas) {}

  local(usuarioId: string, mesaId: number, dignidad: Dignidad) {
    return this.cola.buscar(usuarioId, mesaId, dignidad);
  }
  listarCola(usuarioId: string) {
    return this.cola.listar(usuarioId);
  }
  contar(usuarioId: string) {
    return this.cola.contar(usuarioId);
  }
  remota(id: string) {
    return this.remoto.obtener(id);
  }
  remotaPorMesa(mesaId: number, dignidad: Dignidad) {
    return this.remoto.buscarPorMesa(mesaId, dignidad);
  }
  urlFoto(ruta: string) {
    return this.remoto.urlFoto(ruta);
  }
}

/** RF-10 / RF-11: foto nítida + ubicación */
export class CapturarEvidencia {
  constructor(private evidencia: IEvidencia) {}

  async evaluarFoto(uri: string, umbral = UMBRAL_NITIDEZ) {
    const varianza = await this.evidencia.medirNitidez(uri);
    return evaluarNitidez(varianza, umbral);
  }
  prepararFoto(uri: string) {
    return this.evidencia.prepararFoto(uri);
  }
  descartar(uri: string) {
    return this.evidencia.eliminar(uri);
  }
  ubicacion() {
    return this.evidencia.obtenerUbicacion();
  }
}
