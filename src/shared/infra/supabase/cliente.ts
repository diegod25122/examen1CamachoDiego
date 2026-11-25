import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { almacenSesionCifrado } from '../cache/almacenLocal';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const clave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !clave) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. Crea el archivo .env (mira .env.example) y reinicia con: npx expo start -c',
  );
}

export const supabase = createClient(url, clave, {
  auth: {
    storage: almacenSesionCifrado, // sesión cifrada (RNF-04)
    autoRefreshToken: true,
    persistSession: true, // la sesión sigue abierta hasta cerrar sesión (RF-01)
    detectSessionInUrl: false,
  },
});

// Renueva el token solo con la app en primer plano
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
