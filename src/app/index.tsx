// RF-19: cada rol entra a su propia pantalla de inicio
import { Redirect } from 'expo-router';
import { necesitaContrasena, useSesionStore } from '@/features/auth/presentation/store/sesionStore';

export default function Inicio() {
  const { estado, perfil, modo } = useSesionStore();
  if (estado === 'cargando') return null;
  if (!perfil) return <Redirect href="/login" />;
  if (necesitaContrasena({ perfil, modo })) return <Redirect href={modo === 'recuperacion' ? '/restablecer' : '/primer-acceso'} />;
  if (perfil.rol === 'coordinador_provincial') return <Redirect href="/panel" />;
  if (perfil.rol === 'coordinador_recinto') return <Redirect href="/mesas" />;
  return <Redirect href="/mis-mesas" />;
}
