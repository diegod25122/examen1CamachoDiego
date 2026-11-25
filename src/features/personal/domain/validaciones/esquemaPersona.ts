import { z } from 'zod';
import { validarCedula } from './cedula';

export const esquemaPersona = z.object({
  cedula: z
    .string()
    .trim()
    .superRefine((v, ctx) => {
      const error = validarCedula(v);
      if (error) ctx.addIssue({ code: 'custom', message: error });
    }),
  nombres: z.string().trim().min(2, { message: 'Escribe los nombres completos' }),
  apellidos: z.string().trim().min(2, { message: 'Escribe los apellidos completos' }),
  telefono: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, { message: 'Debe empezar con 0 y tener 9 o 10 dígitos. Ej: 0991234567' }),
  correo: z.string().trim().toLowerCase().email({ message: 'El correo no es válido' }),
});

export type DatosPersona = z.infer<typeof esquemaPersona>;
