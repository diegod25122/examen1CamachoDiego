// ADR-07 / RF-17: Sentry captura cierres y errores no fatales con dispositivo,
// versión de Android, versión de la app y pantalla. Si no hay red, el SDK
// guarda los eventos en el teléfono y los envía al recuperarla.
import * as Sentry from '@sentry/react-native';
import type { IReporteErrores } from '@/shared/domain/IReporteErrores';

export function iniciarSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  Sentry.init({
    dsn,
    enabled: !!dsn,
    environment: __DEV__ ? 'desarrollo' : 'produccion',
    sendDefaultPii: false,
    enableNativeCrashHandling: true,
    enableAutoSessionTracking: true, // cuántas personas usan la app y cuántas tuvieron fallos
    attachScreenshot: false,
    maxCacheItems: 50, // eventos guardados sin conexión
    tracesSampleRate: 0.2,
  });
}

export const reporteSentry: IReporteErrores = {
  reportar(error, contexto) {
    Sentry.withScope((scope) => {
      scope.setTag('operacion', contexto.operacion);
      scope.setLevel('error');
      if (contexto.datos) scope.setContext('detalle', contexto.datos);
      Sentry.captureException(error instanceof Error ? error : new Error(String((error as any)?.message ?? error)));
    });
  },
  identificar(usuario) {
    Sentry.setUser(usuario ? { id: usuario.id } : null);
    Sentry.setTag('rol', usuario?.rol ?? 'sin_sesion');
  },
  pantalla(ruta) {
    Sentry.setTag('pantalla', ruta);
    Sentry.addBreadcrumb({ category: 'navegacion', message: ruta, level: 'info' });
  },
};

export { Sentry };
