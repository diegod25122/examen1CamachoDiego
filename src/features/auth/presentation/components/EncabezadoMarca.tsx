import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '@/shared/presentation/colores';

export function EncabezadoMarca({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-marca rounded-b-[40px] overflow-hidden" style={{ paddingTop: insets.top + 24 }}>
      {/* franjas diagonales decorativas con los colores de la organización */}
      <View className="absolute -right-16 top-6 w-72 h-10 bg-marca-oscuro" style={{ transform: [{ rotate: '-18deg' }] }} />
      <View className="absolute -right-10 top-20 w-72 h-4 bg-acento" style={{ transform: [{ rotate: '-18deg' }] }} />
      <Animated.View entering={FadeInDown.duration(600)} className="px-6 pb-10 gap-3">
        <View className="w-16 h-16 rounded-2xl bg-white items-center justify-center">
          <Ionicons name="checkbox" size={40} color={colores.marca} />
        </View>
        <Text className="text-white text-3xl font-extrabold">{titulo}</Text>
        <Text className="text-marca-claro text-lg">{subtitulo}</Text>
      </Animated.View>
    </View>
  );
}
