// Traduce errores de Supabase/red a mensajes claros (RNF-01, RF-13)
import { AppError } from '@/shared/domain/AppError';

type ErrorLike = { message?: string; code?: string; status?: number; name?: string };

export function esErrorDeRed(e: unknown): boolean {
  const m = String((e as ErrorLike)?.message ?? e ?? '').toLowerCase();
  return (
    m.includes('network request failed') ||
    m.includes('failed to fetch') ||
    m.includes('network error') ||
    m.includes('timeout') ||
    m.includes('aborted') ||
    (e as ErrorLike)?.name === 'AuthRetryableFetchError'
  );
}

export function traducirError(e: unknown, contexto = 'la operación'): AppError {
  if (e instanceof AppError) return e;
  const err = (e ?? {}) as ErrorLike;
  const msg = err.message ?? '';

  if (esErrorDeRed(e)) return new AppError('RED', 'Sin conexión. Se intentará de nuevo automáticamente.', true, e);
  if (err.status && err.status >= 500) return new AppError('RED', 'El servidor no respondió. Se reintentará solo.', true, e);

  if (msg.includes('ACTA_INVALIDA')) return new AppError('VALIDACION', msg.replace(/^.*ACTA_INVALIDA:\s*/, 'El acta no cuadra: '), false, e);
  if (msg.includes('ASIGNACION_INVALIDA')) return new AppError('VALIDACION', msg.replace(/^.*ASIGNACION_INVALIDA:\s*/, ''), false, e);
  if (msg.includes('RECINTO_INVALIDO')) return new AppError('VALIDACION', msg.replace(/^.*RECINTO_INVALIDO:\s*/, ''), false, e);
  if (msg.includes('SIN_PERMISO')) return new AppError('PERMISO', msg.replace(/^.*SIN_PERMISO:\s*/, ''), false, e);
  if (msg.includes('actas_mesa_id_dignidad_key'))
    return new AppError('DUPLICADO', 'Esta mesa ya tiene registrada esa acta. Ábrela desde "Mis mesas" para corregirla.', false, e);
  if (msg.includes('recintos_nombre_unico')) return new AppError('DUPLICADO', 'Ya existe un recinto con ese nombre en la parroquia.', false, e);
  if (err.code === '23505') return new AppError('DUPLICADO', 'Ese registro ya existe.', false, e);
  if (err.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied'))
    return new AppError('PERMISO', 'No tienes permiso para esto. Puede que ya no estés asignado a esta mesa.', false, e);
  if (msg.includes('Invalid login credentials')) return new AppError('SESION', 'Correo o contraseña incorrectos.', false, e);
  if (msg.includes('Email not confirmed')) return new AppError('SESION', 'Tu correo aún no está verificado. Revisa la invitación.', false, e);
  if (/token.*(expired|invalid)|otp/i.test(msg)) return new AppError('SESION', 'El código o el enlace venció. Pide uno nuevo.', false, e);
  if (/rate limit/i.test(msg)) return new AppError('LIMITE', 'Demasiados intentos. Espera unos minutos.', false, e);
  if (err.status === 401 || /jwt/i.test(msg)) return new AppError('SESION', 'Tu sesión expiró. Vuelve a ingresar.', false, e);

  return new AppError('DESCONOCIDO', `No se pudo completar ${contexto}. Intenta de nuevo.`, false, e);
}
