// Diseño raíz (ADR-09): lee la sesión y el rol desde Zustand y protege cada grupo de rutas.
import '../global.css';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { iniciarSentry, reporteSentry, Sentry } from '@/shared/infra/monitoreo/sentry';
import { clienteQuery } from '@/shared/presentation/query/clienteQuery';
import { AvisosGlobales } from '@/shared/presentation/components/AvisosGlobales';
import { useArranqueSesion } from '@/features/auth/presentation/hooks/useArranqueSesion';
import { necesitaContrasena, useSesionStore } from '@/features/auth/presentation/store/sesionStore';
import { useSincronizacionGlobal } from '@/features/actas/presentation/hooks/useSincronizacion';

iniciarSentry();
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
  const listo = useArranqueSesion();
  useSincronizacionGlobal();
  const pathname = usePathname();
  const perfil = useSesionStore((s) => s.perfil);
  const modo = useSesionStore((s) => s.modo);

  const rol = perfil?.rol;
  const pideClave = necesitaContrasena({ perfil, modo });
  const dentro = !!perfil && !pideClave;

  // RF-17: cada reporte de Sentry indica en qué pantalla ocurrió
  useEffect(() => {
    reporteSentry.pantalla(pathname);
  }, [pathname]);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => {});
  }, [listo]);

  // El Stack se monta siempre (Expo Router lo exige); la pantalla de inicio
  // sigue visible hasta que la sesión termina de cargarse.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={clienteQuery}>
        <StatusBar style="light" />
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Protected guard={!perfil || pideClave}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={dentro && rol === 'coordinador_provincial'}>
              <Stack.Screen name="(provincial)" />
            </Stack.Protected>
            <Stack.Protected guard={dentro && rol === 'coordinador_recinto'}>
              <Stack.Screen name="(recinto)" />
            </Stack.Protected>
            <Stack.Protected guard={dentro && rol === 'veedor'}>
              <Stack.Screen name="(veedor)" />
            </Stack.Protected>
            {/* Pantallas compartidas; los datos los filtra RLS en el servidor */}
            <Stack.Protected guard={dentro}>
              <Stack.Screen name="acta/[id]" />
              <Stack.Screen name="registrar/[mesaId]/[dignidad]" />
            </Stack.Protected>
          </Stack>
          <AvisosGlobales />
        </View>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
