// ADR-08: esquema del formulario del acta (Zod) construido sobre las reglas puras
import { z } from 'zod';
import { MAXIMO_POR_CAMPO, validarReglasActa } from './reglasActa';

const numeroActa = z
  .number({ message: 'Escribe un número (0 si no hay)' })
  .int({ message: 'Solo números enteros' })
  .min(0, { message: 'No puede ser negativo' })
  .max(MAXIMO_POR_CAMPO, { message: 'El número es demasiado grande' });

export function crearEsquemaActa(siglas: string[]) {
  return z
    .object({
      votos: z.array(numeroActa).length(siglas.length),
      nulos: numeroActa,
      blancos: numeroActa,
      totalSufragantes: numeroActa,
    })
    .superRefine((v, ctx) => {
      for (const e of validarReglasActa(v, siglas)) {
        ctx.addIssue({ code: 'custom', message: e.mensaje, path: e.ruta });
      }
    });
}

export type DatosActa = z.infer<ReturnType<typeof crearEsquemaActa>>;
