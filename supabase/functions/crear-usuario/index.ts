// =====================================================================
// Edge Function: crear-usuario  (ADR-02 · RF-02, RF-03, RF-07, S-03, S-04)
//
// - Coordinador provincial  → crea coordinadores de recinto
// - Coordinador de recinto  → crea veedores de su recinto (y opcionalmente
//   los asigna a una mesa en el mismo paso, para el reemplazo de RF-07)
//
// Nadie conoce la contraseña: se envía una invitación por correo (Gmail SMTP
// configurado en Supabase Auth) y el titular define su propia clave.
// La clave service_role SOLO vive aquí, en el servidor.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Cuerpo = {
  cedula?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  recinto_id?: number | null; // provincial: recinto que coordinará (opcional)
  mesa_id?: number | null; // coordinador: mesa a la que se asigna (opcional)
};

function responder(estado: number, cuerpo: Record<string, unknown>) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// Misma regla que el dominio de la app y que public.cedula_valida (RNF-03)
function cedulaValida(c: string): boolean {
  if (!/^\d{10}$/.test(c)) return false;
  const provincia = Number(c.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(c[2]) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(c[i]) * (i % 2 === 0 ? 2 : 1);
    if (v > 9) v -= 9;
    suma += v;
  }
  return (10 - (suma % 10)) % 10 === Number(c[9]);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return responder(405, { error: 'Método no permitido' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const claveServicio = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const clavePublica = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
  const redireccion = Deno.env.get('APP_REDIRECT_URL') ?? 'controlelectoral://primer-acceso';

  const autorizacion = req.headers.get('Authorization');
  if (!autorizacion) return responder(401, { error: 'Inicia sesión nuevamente.' });

  // Cliente con el JWT de quien llama: respeta RLS y auth.uid()
  const comoUsuario = createClient(url, clavePublica, {
    global: { headers: { Authorization: autorizacion } },
    auth: { persistSession: false },
  });
  // Cliente administrador: solo para crear la cuenta
  const admin = createClient(url, claveServicio, { auth: { persistSession: false } });

  const token = autorizacion.replace('Bearer ', '');
  const { data: quien, error: errQuien } = await admin.auth.getUser(token);
  if (errQuien || !quien.user) return responder(401, { error: 'Tu sesión expiró. Vuelve a ingresar.' });

  const { data: creador } = await admin
    .from('perfiles')
    .select('id, rol, recinto_id')
    .eq('id', quien.user.id)
    .single();
  if (!creador) return responder(403, { error: 'Tu cuenta no tiene un perfil asignado.' });

  let cuerpo: Cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return responder(400, { error: 'Datos inválidos.' });
  }

  const cedula = (cuerpo.cedula ?? '').trim();
  const nombres = (cuerpo.nombres ?? '').trim();
  const apellidos = (cuerpo.apellidos ?? '').trim();
  const telefono = (cuerpo.telefono ?? '').trim();
  const correo = (cuerpo.correo ?? '').trim().toLowerCase();

  // Jerarquía (RF-02)
  let rolNuevo: 'coordinador_recinto' | 'veedor';
  let recintoNuevo: number | null = null;
  if (creador.rol === 'coordinador_provincial') {
    rolNuevo = 'coordinador_recinto';
    recintoNuevo = cuerpo.recinto_id ?? null;
  } else if (creador.rol === 'coordinador_recinto') {
    if (!creador.recinto_id) return responder(403, { error: 'Aún no tienes un recinto asignado.' });
    rolNuevo = 'veedor';
    recintoNuevo = creador.recinto_id;
  } else {
    return responder(403, { error: 'Tu rol no puede crear cuentas.' });
  }

  // Validaciones (mismas reglas que el formulario)
  if (!cedulaValida(cedula)) return responder(422, { error: 'La cédula no es válida. Revisa los 10 dígitos.' });
  if (nombres.length < 2) return responder(422, { error: 'Escribe los nombres completos.' });
  if (apellidos.length < 2) return responder(422, { error: 'Escribe los apellidos completos.' });
  if (!/^0\d{8,9}$/.test(telefono)) return responder(422, { error: 'El teléfono debe tener 9 o 10 dígitos y empezar con 0.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return responder(422, { error: 'El correo no es válido.' });

  // Duplicados (RF-02, S-04)
  const { data: repetidos } = await admin
    .from('perfiles')
    .select('cedula, correo')
    .or(`cedula.eq.${cedula},correo.eq.${correo}`);
  if (repetidos?.some((p) => p.cedula === cedula)) return responder(409, { error: 'Ya existe una persona con esa cédula.' });
  if (repetidos?.some((p) => p.correo === correo)) return responder(409, { error: 'Ya existe una persona con ese correo.' });

  // Si el provincial elige recinto: no debe tener coordinador (uno solo por recinto)
  if (rolNuevo === 'coordinador_recinto' && recintoNuevo) {
    const { data: ocupado } = await admin
      .from('perfiles')
      .select('id')
      .eq('rol', 'coordinador_recinto')
      .eq('recinto_id', recintoNuevo)
      .maybeSingle();
    if (ocupado) return responder(409, { error: 'Ese recinto ya tiene coordinador.' });
  }

  // Invitación por correo: verifica el correo y el titular define su clave (RF-03)
  const { data: invitado, error: errInvitar } = await admin.auth.admin.inviteUserByEmail(correo, {
    redirectTo: redireccion,
    data: { nombres, apellidos, rol: rolNuevo },
  });
  if (errInvitar || !invitado.user) {
    const msg = errInvitar?.message ?? '';
    if (/already|registered|exists/i.test(msg)) return responder(409, { error: 'Ese correo ya tiene una cuenta.' });
    if (/rate limit/i.test(msg)) return responder(429, { error: 'Se alcanzó el límite de correos por hora. Intenta en unos minutos.' });
    return responder(502, { error: 'No se pudo enviar la invitación por correo. Intenta de nuevo.', detalle: msg });
  }

  const { error: errPerfil } = await admin.from('perfiles').insert({
    id: invitado.user.id,
    cedula,
    nombres,
    apellidos,
    telefono,
    correo,
    rol: rolNuevo,
    recinto_id: recintoNuevo,
    creado_por: creador.id,
  });
  if (errPerfil) {
    await admin.auth.admin.deleteUser(invitado.user.id); // no dejar cuentas a medias
    return responder(409, { error: 'No se pudo guardar la persona.', detalle: errPerfil.message });
  }

  // Reemplazo inmediato (RF-07): se asigna con el JWT del coordinador para que
  // RLS lo valide y el historial registre quién hizo el cambio.
  let asignada = false;
  if (rolNuevo === 'veedor' && cuerpo.mesa_id) {
    const { data, error } = await comoUsuario
      .from('mesas')
      .update({ veedor_id: invitado.user.id })
      .eq('id', cuerpo.mesa_id)
      .select('id');
    asignada = !error && (data?.length ?? 0) > 0;
  }

  return responder(201, {
    id: invitado.user.id,
    rol: rolNuevo,
    asignada,
    mensaje: `Se envió la invitación a ${correo}.`,
  });
});
