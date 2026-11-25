import { supabase } from '@/shared/infra/supabase/cliente';
import { traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { AppError } from '@/shared/domain/AppError';
import type { NuevaPersona, Persona, ResultadoCreacion } from '../domain/entities/Persona';
import type { IPersonalRepository } from '../domain/repositories/IPersonalRepository';

type Fila = {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: Persona['rol'];
  recinto_id: number | null;
  contrasena_definida: boolean;
  mesas?: { numero: number }[];
};

const aPersona = (f: Fila): Persona => ({
  id: f.id,
  cedula: f.cedula,
  nombres: f.nombres,
  apellidos: f.apellidos,
  telefono: f.telefono,
  correo: f.correo,
  rol: f.rol,
  recintoId: f.recinto_id,
  verificado: f.contrasena_definida,
  mesas: (f.mesas ?? []).map((m) => m.numero).sort((a, b) => a - b),
});

export class SupabasePersonalRepository implements IPersonalRepository {
  async crearCuenta(datos: NuevaPersona): Promise<ResultadoCreacion> {
    // ADR-02: la Edge Function crea la cuenta con el rol de servicio y envía la invitación
    const { data, error } = await conTiempoLimite(
      supabase.functions.invoke('crear-usuario', {
        body: {
          cedula: datos.cedula,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          telefono: datos.telefono,
          correo: datos.correo,
          recinto_id: datos.recintoId ?? null,
          mesa_id: datos.mesaId ?? null,
        },
      }),
      20_000,
    );
    if (error) {
      // FunctionsHttpError trae la respuesta con el mensaje en español
      const respuesta = (error as any).context;
      if (respuesta && typeof respuesta.json === 'function') {
        try {
          const cuerpo = await respuesta.json();
          if (cuerpo?.error) throw new AppError(respuesta.status === 409 ? 'DUPLICADO' : 'VALIDACION', cuerpo.error);
        } catch (e) {
          if (e instanceof AppError) throw e;
        }
      }
      throw traducirError(error, 'la creación de la cuenta');
    }
    return { id: data.id, asignada: !!data.asignada, mensaje: data.mensaje ?? 'Invitación enviada.' };
  }

  async listarVeedores(recintoId: number): Promise<Persona[]> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, cedula, nombres, apellidos, telefono, correo, rol, recinto_id, contrasena_definida, mesas:mesas!mesas_veedor_id_fkey(numero)')
      .eq('rol', 'veedor')
      .eq('recinto_id', recintoId)
      .order('apellidos');
    if (error) throw traducirError(error, 'la lista de veedores');
    return (data as Fila[]).map(aPersona);
  }

  async listarCoordinadores(): Promise<Persona[]> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, cedula, nombres, apellidos, telefono, correo, rol, recinto_id, contrasena_definida')
      .eq('rol', 'coordinador_recinto')
      .order('apellidos');
    if (error) throw traducirError(error, 'la lista de coordinadores');
    return (data as Fila[]).map(aPersona);
  }
}
