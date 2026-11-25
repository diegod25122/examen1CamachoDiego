// RF-09: muestra en vivo si la suma cuadra con el total de sufragantes
import { Text, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '@/shared/presentation/colores';

export function ResumenSuma({ suma, total }: { suma: number; total: number | undefined }) {
  const hayTotal = total !== undefined && total > 0;
  const cuadra = hayTotal && suma === total;
  const excede = hayTotal && suma > total!;
  const proporcion = hayTotal ? Math.min(suma / total!, 1) : 0;

  const ancho = useDerivedValue(() => withTiming(proporcion * 100, { duration: 400, easing: Easing.out(Easing.cubic) }), [proporcion]);
  const tono = useDerivedValue(() => withTiming(cuadra ? 1 : excede ? -1 : 0, { duration: 300 }), [cuadra, excede]);
  const estiloBarra = useAnimatedStyle(() => ({
    width: `${ancho.value}%`,
    backgroundColor: interpolateColor(tono.value, [-1, 0, 1], [colores.error, colores.marca, colores.exito]),
  }));

  const mensaje = !hayTotal
    ? 'Escribe el total de sufragantes'
    : cuadra
      ? '¡La suma cuadra!'
      : excede
        ? `Sobran ${suma - total!} votos`
        : `Faltan ${total! - suma} votos`;

  return (
    <View className="bg-white rounded-2xl border-2 border-borde p-4 gap-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-tinta text-base font-bold flex-shrink">Organizaciones + nulos + blancos</Text>
        <Text className="text-tinta text-xl font-extrabold text-right" numberOfLines={1}>
          {suma}
          <Text className="text-gris text-base font-normal"> / {hayTotal ? total : '—'}</Text>
        </Text>
      </View>
      <View className="h-3 bg-gris-claro rounded-full overflow-hidden">
        <Animated.View style={[{ height: '100%', borderRadius: 999 }, estiloBarra]} />
      </View>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={cuadra ? 'checkmark-circle' : excede ? 'close-circle' : 'information-circle'} size={20} color={cuadra ? colores.exito : excede ? colores.error : colores.gris} />
        <Text className={`text-base font-bold ${cuadra ? 'text-exito' : excede ? 'text-error' : 'text-gris'}`}>{mensaje}</Text>
      </View>
    </View>
  );
}
