import * as Linking from 'expo-linking';
import { supabase } from '@/shared/infra/supabase/cliente';
import { traducirError } from '@/shared/infra/supabase/errores';
import { conTiempoLimite } from '@/shared/infra/supabase/tiempoLimite';
import { almacenLocal } from '@/shared/infra/cache/almacenLocal';
import type { Perfil, Rol } from '../domain/entities/Perfil';
import type { IAuthRepository, TipoEnlace } from '../domain/repositories/IAuthRepository';

type FilaPerfil = {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  rol: Rol;
  recinto_id: number | null;
  contrasena_definida: boolean;
};

const CLAVE_PERFIL = 'cache:perfil';

// Mapeador datos → entidad (ADR-05)
const aPerfil = (f: FilaPerfil): Perfil => ({
  id: f.id,
  cedula: f.cedula,
  nombres: f.nombres,
  apellidos: f.apellidos,
  telefono: f.telefono,
  correo: f.correo,
  rol: f.rol,
  recintoId: f.recinto_id,
  contrasenaDefinida: f.contrasena_definida,
});

function leerParametros(url: string): Record<string, string> {
  const resultado: Record<string, string> = {};
  const partes = [url.split('?')[1]?.split('#')[0], url.split('#')[1]].filter(Boolean) as string[];
  for (const parte of partes) {
    for (const par of parte.split('&')) {
      const [k, v] = par.split('=');
      if (k) resultado[decodeURIComponent(k)] = decodeURIComponent((v ?? '').replace(/\+/g, ' '));
    }
  }
  return resultado;
}

export class SupabaseAuthRepository implements IAuthRepository {
  async iniciarSesion(correo: string, contrasena: string): Promise<void> {
    const { error } = await conTiempoLimite(supabase.auth.signInWithPassword({ email: correo, password: contrasena }));
    if (error) throw traducirError(error, 'el inicio de sesión');
  }

  async cerrarSesion(): Promise<void> {
    // scope local: funciona aunque no haya señal
    await supabase.auth.signOut({ scope: 'local' });
  }

  async haySesion(): Promise<boolean> {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  }

  async obtenerPerfilActual(): Promise<Perfil | null> {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user.id;
    if (!id) return null;

    try {
      const { data: fila, error } = await conTiempoLimite(
        supabase.from('perfiles').select('*').eq('id', id).maybeSingle<FilaPerfil>(),
        8000,
      );
      if (error) throw error;
      if (!fila) return null;
      const perfil = aPerfil(fila);
      await almacenLocal.escribirJson(CLAVE_PERFIL, perfil);
      return perfil;
    } catch (e) {
      // Sin señal: la sesión ya iniciada sigue funcionando (RF-14)
      const guardado = await almacenLocal.leerJson<Perfil>(CLAVE_PERFIL);
      if (guardado?.id === id) return guardado;
      throw traducirError(e, 'la carga de tu cuenta');
    }
  }

  async definirContrasena(contrasena: string): Promise<void> {
    const { error } = await conTiempoLimite(supabase.auth.updateUser({ password: contrasena }));
    if (error) throw traducirError(error, 'el cambio de contraseña');
    const { error: errMarca } = await supabase.rpc('marcar_contrasena_definida');
    if (errMarca) throw traducirError(errMarca, 'el cambio de contraseña');
    const guardado = await almacenLocal.leerJson<Perfil>(CLAVE_PERFIL);
    if (guardado) await almacenLocal.escribirJson(CLAVE_PERFIL, { ...guardado, contrasenaDefinida: true });
  }

  async enviarRecuperacion(correo: string): Promise<void> {
    const { error } = await conTiempoLimite(
      supabase.auth.resetPasswordForEmail(correo, { redirectTo: Linking.createURL('restablecer') }),
    );
    if (error) throw traducirError(error, 'el envío del correo');
  }

  async verificarCodigo(correo: string, codigo: string, tipo: TipoEnlace): Promise<void> {
    const { error } = await conTiempoLimite(supabase.auth.verifyOtp({ email: correo, token: codigo, type: tipo }));
    if (error) throw traducirError(error, 'la verificación del código');
  }

  async abrirSesionDesdeEnlace(url: string): Promise<TipoEnlace | null> {
    const p = leerParametros(url);
    if (p.error_description) throw traducirError({ message: p.error_description }, 'el enlace');
    const tipo: TipoEnlace | null = p.type === 'invite' || p.type === 'recovery' ? p.type : url.includes('restablecer') ? 'recovery' : url.includes('primer-acceso') ? 'invite' : null;

    if (p.access_token && p.refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
      if (error) throw traducirError(error, 'el enlace');
      return tipo ?? 'invite';
    }
    if (p.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(p.code);
      if (error) throw traducirError(error, 'el enlace');
      return tipo ?? 'recovery';
    }
    return null;
  }

  alCambiarSesion(cb: (evento: string, haySesion: boolean) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => cb(evento, !!sesion));
    return () => data.subscription.unsubscribe();
  }
}
