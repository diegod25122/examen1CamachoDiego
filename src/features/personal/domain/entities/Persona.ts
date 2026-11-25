import type { Rol } from '@/features/auth/domain/entities/Perfil';

export interface Persona {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: Rol;
  recintoId: number | null;
  verificado: boolean; // definió su contraseña desde la invitación (RF-03)
  mesas: number[]; // números de mesa que cubre (veedores)
}

export interface NuevaPersona {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  recintoId?: number | null; // provincial: recinto a coordinar
  mesaId?: number | null; // coordinador: asignar a esta mesa (reemplazo, RF-07)
}

export interface ResultadoCreacion {
  id: string;
  asignada: boolean;
  mensaje: string;
}
