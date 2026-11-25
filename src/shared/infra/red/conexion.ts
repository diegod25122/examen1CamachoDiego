// RF-13: estado de conexión visible en todas las pantallas.
import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';

let iniciado = false;

export function iniciarMonitorConexion(alRecuperarSenal: () => void): () => void {
  if (iniciado) return () => {};
  iniciado = true;

  // TanStack Query pausa/reanuda consultas según la red
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((estado) => setOnline(!!estado.isConnected)),
  );

  const desuscribir = NetInfo.addEventListener((estado) => {
    const enLinea = !!estado.isConnected && estado.isInternetReachable !== false;
    const antes = useConexionStore.getState().enLinea;
    useConexionStore.getState().setEnLinea(enLinea);
    if (enLinea && !antes) alRecuperarSenal();
  });

  return () => {
    iniciado = false;
    desuscribir();
  };
}

export async function hayConexion(): Promise<boolean> {
  const estado = await NetInfo.fetch();
  return !!estado.isConnected && estado.isInternetReachable !== false;
}
