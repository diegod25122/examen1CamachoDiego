import { Tabs } from 'expo-router';
import { icono, opcionesPestanas } from '@/shared/presentation/components/opcionesPestanas';

export default function PestanasRecinto() {
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="mesas" options={{ title: 'Mesas', tabBarIcon: icono('grid') }} />
      <Tabs.Screen name="veedores" options={{ title: 'Veedores', tabBarIcon: icono('people') }} />
      <Tabs.Screen name="cuenta-recinto" options={{ title: 'Mi cuenta', tabBarIcon: icono('person-circle') }} />
    </Tabs>
  );
}
