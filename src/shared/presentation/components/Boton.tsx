// Botones grandes (RNF-01) que se bloquean mientras se envía (RNF-02)
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimacionLottie } from './AnimacionLottie';

type Variante = 'primario' | 'secundario' | 'peligro' | 'acento' | 'fantasma';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  cargando?: boolean;
  textoCargando?: string;
  deshabilitado?: boolean;
  icono?: keyof typeof Ionicons.glyphMap;
  pequeno?: boolean;
};

const ESTILOS: Record<Variante, { caja: string; texto: string; icono: string }> = {
  primario: { caja: 'bg-marca', texto: 'text-white', icono: '#fff' },
  secundario: { caja: 'bg-white border-2 border-marca', texto: 'text-marca', icono: '#1769AA' },
  peligro: { caja: 'bg-error', texto: 'text-white', icono: '#fff' },
  acento: { caja: 'bg-acento', texto: 'text-tinta', icono: '#13212E' },
  fantasma: { caja: 'bg-transparent', texto: 'text-marca', icono: '#1769AA' },
};

export function Boton({ titulo, onPress, variante = 'primario', cargando, textoCargando, deshabilitado, icono, pequeno }: Props) {
  const escala = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const inactivo = deshabilitado || cargando;
  const e = ESTILOS[variante];

  return (
    <Animated.View style={estilo}>
      <Pressable
        onPress={onPress}
        disabled={inactivo}
        onPressIn={() => (escala.value = withTiming(0.98, { duration: 120 }))}
        onPressOut={() => (escala.value = withTiming(1, { duration: 120 }))}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
        className={`${e.caja} rounded-2xl flex-row items-center justify-center gap-2 ${pequeno ? 'px-4 py-2.5' : 'px-5 py-4'} ${
          deshabilitado && !cargando ? 'opacity-40' : ''
        }`}
      >
        {cargando ? (
          <View className="-my-3">
            <AnimacionLottie nombre="cargando" tamano={pequeno ? 32 : 44} />
          </View>
        ) : icono ? (
          <Ionicons name={icono} size={pequeno ? 18 : 22} color={e.icono} />
        ) : null}
        <Text className={`${e.texto} ${pequeno ? 'text-base' : 'text-lg'} font-bold`}>
          {cargando ? textoCargando ?? 'Procesando…' : titulo}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
