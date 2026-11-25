import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { formatearFecha } from '@/shared/presentation/hooks/useFormatos';

export function EnVivo({ ultimoCambio }: { ultimoCambio: number | null }) {
  const pulso = useSharedValue(1);
  useEffect(() => {
    pulso.value = withRepeat(withSequence(withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [pulso]);
  const estilo = useAnimatedStyle(() => ({ opacity: pulso.value }));

  return (
    <View className="flex-row items-center gap-2 bg-white rounded-full px-3 py-1.5 self-start border border-borde">
      <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#C62F3B' }, estilo]} />
      <Text className="text-tinta text-sm font-bold">En vivo</Text>
      {ultimoCambio ? <Text className="text-gris text-sm">· actualizado {formatearFecha(new Date(ultimoCambio).toISOString())}</Text> : null}
    </View>
  );
}
