import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimacionLottie } from './AnimacionLottie';
import { colores } from '../colores';

export function Tarjeta({ children, onPress, destacada }: { children: ReactNode; onPress?: () => void; destacada?: boolean }) {
  const clase = `bg-white rounded-3xl p-4 border ${destacada ? 'border-marca border-2' : 'border-borde'}`;
  if (!onPress) return <View className={clase}>{children}</View>;
  return (
    <Pressable onPress={onPress} className={clase} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {children}
    </Pressable>
  );
}

export function Seccion({ titulo, children, accion }: { titulo: string; children: ReactNode; accion?: ReactNode }) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-tinta text-xl font-extrabold">{titulo}</Text>
        {accion}
      </View>
      {children}
    </View>
  );
}

type TonoChip = 'gris' | 'marca' | 'exito' | 'error' | 'alerta';
const TONOS: Record<TonoChip, string> = {
  gris: 'bg-gris-claro text-gris',
  marca: 'bg-marca-claro text-marca-oscuro',
  exito: 'bg-exito-claro text-exito',
  error: 'bg-error-claro text-error',
  alerta: 'bg-alerta-claro text-alerta',
};

export function Chip({ texto, tono = 'gris', icono }: { texto: string; tono?: TonoChip; icono?: keyof typeof Ionicons.glyphMap }) {
  const [fondo, color] = TONOS[tono].split(' ');
  const colorIcono = { gris: colores.gris, marca: colores.marcaOscuro, exito: colores.exito, error: colores.error, alerta: colores.alerta }[tono];
  return (
    <View className={`${fondo} rounded-full px-3 py-1 flex-row items-center gap-1 self-start`}>
      {icono ? <Ionicons name={icono} size={14} color={colorIcono} /> : null}
      <Text className={`${color} text-sm font-bold`}>{texto}</Text>
    </View>
  );
}

export function BarraProgreso({ valor, color = colores.marca }: { valor: number; color?: string }) {
  const ancho = useDerivedValue(() => withTiming(Math.max(0, Math.min(1, valor)) * 100, { duration: 500, easing: Easing.out(Easing.cubic) }), [valor]);
  const estilo = useAnimatedStyle(() => ({ width: `${ancho.value}%` }));
  return (
    <View className="h-3 bg-gris-claro rounded-full overflow-hidden">
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: 999 }, estilo]} />
    </View>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <Animated.View entering={FadeIn}>
      <View className="items-center justify-center py-10 gap-2">
        <AnimacionLottie nombre="cargando" tamano={80} />
        <Text className="text-gris text-base">{texto}</Text>
      </View>
    </Animated.View>
  );
}

export function Vacio({ titulo, mensaje, icono = 'file-tray-outline' }: { titulo: string; mensaje?: string; icono?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Animated.View entering={FadeIn}>
      <View className="items-center py-10 gap-2 px-6">
        <View className="w-20 h-20 rounded-full bg-marca-claro items-center justify-center">
          <Ionicons name={icono} size={40} color={colores.marca} />
        </View>
        <Text className="text-tinta text-lg font-bold text-center">{titulo}</Text>
        {mensaje ? <Text className="text-gris text-base text-center">{mensaje}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="flex-row justify-between gap-3 py-1.5">
      <Text className="text-gris text-base">{etiqueta}</Text>
      <Text className="text-tinta text-base font-bold flex-shrink text-right">{valor}</Text>
    </View>
  );
}

export function SelectorOpciones<T extends string | number>({
  opciones,
  valor,
  onCambiar,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambiar: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            onPress={() => onCambiar(o.valor)}
            className={`rounded-full px-4 py-2.5 border-2 ${activo ? 'bg-marca border-marca' : 'bg-white border-borde'}`}
          >
            <Text className={`text-base font-bold ${activo ? 'text-white' : 'text-tinta'}`}>{o.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
