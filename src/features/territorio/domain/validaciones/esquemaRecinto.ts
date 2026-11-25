import { z } from 'zod';

const numero = (msg: string) => z.number({ message: msg }).refine((n) => Number.isFinite(n), { message: msg });

export const esquemaRecinto = z.object({
  parroquiaId: z.number({ message: 'Elige la parroquia' }).int().positive({ message: 'Elige la parroquia' }),
  nombre: z.string().trim().min(3, { message: 'Escribe el nombre del recinto' }),
  latitud: numero('Escribe la latitud').refine((n) => n >= -90 && n <= 90, { message: 'Latitud fuera de rango' }),
  longitud: numero('Escribe la longitud').refine((n) => n >= -180 && n <= 180, { message: 'Longitud fuera de rango' }),
  numeroMesas: z
    .number({ message: 'Escribe el número de mesas' })
    .int({ message: 'Solo números enteros' })
    .min(1, { message: 'Al menos 1 mesa' })
    .max(200, { message: 'Máximo 200 mesas' }),
});

export type DatosRecinto = z.infer<typeof esquemaRecinto>;
