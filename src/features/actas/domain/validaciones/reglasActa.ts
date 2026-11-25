// RF-09 / S-09: reglas puras del acta. Las mismas viven en la base (validar_votos_acta).
import type { ValoresActa } from '../entities/Acta';

export const MAXIMO_POR_CAMPO = 99_999;

export interface ErrorRegla {
  ruta: (string | number)[];
  mensaje: string;
}

export const sumaActa = (v: Pick<ValoresActa, 'votos' | 'nulos' | 'blancos'>) =>
  v.votos.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0) + (v.nulos || 0) + (v.blancos || 0);

export function validarReglasActa(v: ValoresActa, siglas: string[] = []): ErrorRegla[] {
  const errores: ErrorRegla[] = [];
  const total = v.totalSufragantes;

  v.votos.forEach((n, i) => {
    if (n > total) {
      errores.push({
        ruta: ['votos', i],
        mensaje: `${siglas[i] ?? 'Esta organización'} tiene más votos (${n}) que el total de sufragantes (${total})`,
      });
    }
  });
  if (v.nulos > total) errores.push({ ruta: ['nulos'], mensaje: `Los nulos (${v.nulos}) superan el total (${total})` });
  if (v.blancos > total) errores.push({ ruta: ['blancos'], mensaje: `Los blancos (${v.blancos}) superan el total (${total})` });

  const suma = sumaActa(v);
  if (suma !== total) {
    errores.push({
      ruta: ['totalSufragantes'],
      mensaje:
        suma > total
          ? `La suma da ${suma}: sobran ${suma - total} votos respecto al total (${total})`
          : `La suma da ${suma}: faltan ${total - suma} votos para llegar al total (${total})`,
    });
  }
  return errores;
}
