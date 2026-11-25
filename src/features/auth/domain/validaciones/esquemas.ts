// ADR-08: reglas puras del dominio (Zod, sin React Native)
import { z } from 'zod';

export const esquemaLogin = z.object({
  correo: z.string().trim().min(1, { message: 'Escribe tu correo' }).email({ message: 'El correo no es válido' }),
  contrasena: z.string().min(1, { message: 'Escribe tu contraseña' }),
});
export type DatosLogin = z.infer<typeof esquemaLogin>;

export const esquemaCorreo = z.object({
  correo: z.string().trim().min(1, { message: 'Escribe tu correo' }).email({ message: 'El correo no es válido' }),
});
export type DatosCorreo = z.infer<typeof esquemaCorreo>;

export const esquemaCodigo = z.object({
  correo: z.string().trim().email({ message: 'El correo no es válido' }),
    codigo: z.string().trim().regex(/^\d{6,8}$/, { message: 'Escribe el código completo del correo (6 a 8 números)' }),
});
export type DatosCodigo = z.infer<typeof esquemaCodigo>;

export const esquemaContrasena = z
  .object({
    contrasena: z
      .string()
      .min(8, { message: 'Debe tener al menos 8 caracteres' })
      .regex(/[A-Za-z]/, { message: 'Debe tener al menos una letra' })
      .regex(/\d/, { message: 'Debe tener al menos un número' }),
    confirmacion: z.string().min(1, { message: 'Repite la contraseña' }),
  })
  .refine((d) => d.contrasena === d.confirmacion, { message: 'Las contraseñas no coinciden', path: ['confirmacion'] });
export type DatosContrasena = z.infer<typeof esquemaContrasena>;
