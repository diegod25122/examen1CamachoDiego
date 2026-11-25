import { Ionicons } from '@expo/vector-icons';
import { colores } from '../colores';

export const opcionesPestanas = {
  headerShown: false,
  tabBarActiveTintColor: colores.marca,
  tabBarInactiveTintColor: colores.gris,
  tabBarLabelStyle: { fontSize: 13, fontWeight: '700' as const },
  tabBarStyle: { height: 68, paddingTop: 6, borderTopColor: colores.borde },
};

export const icono =
  (nombre: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) => <Ionicons name={nombre} size={size + 2} color={color} />;
