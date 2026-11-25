import { Text, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import type { ResultadoCandidato } from '../../domain/Escrutinio';

export function BarraCandidato({ c, posicion, maximo }: { c: ResultadoCandidato; posicion: number; maximo: number }) {
  const ancho = useDerivedValue(() => withTiming(maximo ? (c.votos / maximo) * 100 : 0, { duration: 500, easing: Easing.out(Easing.cubic) }), [c.votos, maximo]);
  const estilo = useAnimatedStyle(() => ({ width: `${Math.max(ancho.value, 1.5)}%` }));

  return (
    <Animated.View entering={FadeIn.duration(300)} layout={LinearTransition.duration(250)}>
      <View className="bg-white rounded-2xl border border-borde p-3 gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-gris text-lg font-extrabold w-6">{posicion + 1}</Text>
        <View className="flex-1">
          <Text className="text-tinta text-base font-extrabold">{c.candidato}</Text>
          <Text className="text-gris text-sm">
            {c.sigla} · {c.organizacion}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-tinta text-xl font-extrabold">{c.porcentaje.toFixed(2)}%</Text>
          <Text className="text-gris text-sm">{c.votos.toLocaleString('es-EC')} votos</Text>
        </View>
      </View>
      <View className="h-3.5 bg-gris-claro rounded-full overflow-hidden">
        <Animated.View style={[{ height: '100%', backgroundColor: c.color, borderRadius: 999 }, estilo]} />
      </View>
      </View>
    </Animated.View>
  );
}
