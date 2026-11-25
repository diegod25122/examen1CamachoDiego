import { Tabs } from 'expo-router';
import { icono, opcionesPestanas } from '@/shared/presentation/components/opcionesPestanas';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';

export default function PestanasVeedor() {
  const pendientes = useConexionStore((s) => s.pendientes + s.conError);
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="mis-mesas" options={{ title: 'Mis mesas', tabBarIcon: icono('clipboard') }} />
      <Tabs.Screen
        name="envios"
        options={{ title: 'Envíos', tabBarIcon: icono('cloud-upload'), tabBarBadge: pendientes > 0 ? pendientes : undefined }}
      />
      <Tabs.Screen name="cuenta-veedor" options={{ title: 'Mi cuenta', tabBarIcon: icono('person-circle') }} />
    </Tabs>
  );
}
