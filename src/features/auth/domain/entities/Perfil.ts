export type Rol = 'coordinador_provincial' | 'coordinador_recinto' | 'veedor';

export interface Perfil {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: Rol;
  recintoId: number | null;
  contrasenaDefinida: boolean;
}

export const NOMBRE_ROL: Record<Rol, string> = {
  coordinador_provincial: 'Coordinador provincial',
  coordinador_recinto: 'Coordinador de recinto',
  veedor: 'Veedor',
};

export const nombreCompleto = (p: Pick<Perfil, 'nombres' | 'apellidos'>) => `${p.nombres} ${p.apellidos}`.trim();
