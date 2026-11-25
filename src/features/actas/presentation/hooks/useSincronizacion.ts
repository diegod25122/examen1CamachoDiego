// ADR-03: reintentos automáticos al volver la señal, al abrir la app y cada 30 s
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { casos } from '@/shared/di/contenedor';
import { iniciarMonitorConexion } from '@/shared/infra/red/conexion';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';
import { clienteQuery } from '@/shared/presentation/query/clienteQuery';
import { claves } from '@/shared/presentation/query/claves';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { useSesionStore } from '@/features/auth/presentation/store/sesionStore';

export async function actualizarContadores() {
  const id = useSesionStore.getState().perfil?.id;
  if (!id) return useConexionStore.getState().setCola(0, 0);
  const { pendientes, conError } = await casos.consultarActas.contar(id);
  useConexionStore.getState().setCola(pendientes, conError);
}

export async function sincronizarAhora(silencioso = true) {
  const id = useSesionStore.getState().perfil?.id;
  if (!id) return;
  const { pendientes } = await casos.consultarActas.contar(id);
  if (pendientes === 0) return actualizarContadores();

  useConexionStore.getState().setSincronizando(true);
  try {
    const r = await casos.sincronizar.ejecutar(id);
    if (r.enviadas > 0) {
      clienteQuery.invalidateQueries({ queryKey: ['mesas'] });
      clienteQuery.invalidateQueries({ queryKey: ['actas'] });
      avisar('exito', r.enviadas === 1 ? 'Acta enviada' : `${r.enviadas} actas enviadas`, 'El servidor ya las recibió.');
    } else if (!silencioso && r.sinSenal) {
      avisar('alerta', 'Aún sin señal', 'Las actas siguen guardadas y se enviarán solas.');
    }
    if (r.fallidas > 0 && !r.sinSenal) avisar('error', 'Un acta no se pudo enviar', 'Revisa la pestaña Envíos.');
  } finally {
    useConexionStore.getState().setSincronizando(false);
    clienteQuery.invalidateQueries({ queryKey: claves.cola });
    await actualizarContadores();
  }
}

/** Se monta una sola vez en el diseño raíz */
export function useSincronizacionGlobal() {
  const perfilId = useSesionStore((s) => s.perfil?.id);

  const ejecutar = useCallback(() => {
    sincronizarAhora().catch(() => {});
  }, []);

  useEffect(() => {
    const detener = iniciarMonitorConexion(ejecutar);
    return detener;
  }, [ejecutar]);

  useEffect(() => {
    if (!perfilId) return;
    actualizarContadores();
    ejecutar();
    const intervalo = setInterval(ejecutar, 30_000);
    const sub = AppState.addEventListener('change', (e) => e === 'active' && ejecutar());
    return () => {
      clearInterval(intervalo);
      sub.remove();
    };
  }, [perfilId, ejecutar]);
}
