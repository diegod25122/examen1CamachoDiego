import { Tabs } from 'expo-router';
import { icono, opcionesPestanas } from '@/shared/presentation/components/opcionesPestanas';

export default function PestanasProvincial() {
  return (
    <Tabs screenOptions={opcionesPestanas}>
      <Tabs.Screen name="panel" options={{ title: 'Avance', tabBarIcon: icono('pulse') }} />
      <Tabs.Screen name="resultados" options={{ title: 'Resultados', tabBarIcon: icono('stats-chart') }} />
      <Tabs.Screen name="recintos" options={{ title: 'Recintos', tabBarIcon: icono('business') }} />
      <Tabs.Screen name="cuenta" options={{ title: 'Mi cuenta', tabBarIcon: icono('person-circle') }} />
    </Tabs>
  );
}
