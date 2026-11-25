// RF-15: foto del acta ampliable con pellizco (gesture-handler + Reanimated).
// El visor se dibuja sobre toda la pantalla, no es un modal genérico.
import { Image, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Cargando } from '@/shared/presentation/components/Basicos';

export function MiniaturaFoto({ uri, cargando, onAmpliar }: { uri: string | null | undefined; cargando?: boolean; onAmpliar: () => void }) {
  if (cargando) return <Cargando texto="Cargando foto…" />;
  if (!uri) return <Text className="text-gris text-base">Foto no disponible sin conexión.</Text>;
  return (
    <Pressable onPress={onAmpliar} className="rounded-3xl overflow-hidden border border-borde">
      <Image source={{ uri }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
      <View className="absolute bottom-3 right-3 bg-black/60 rounded-full px-3 py-1.5 flex-row items-center gap-1">
        <Ionicons name="expand" size={16} color="#fff" />
        <Text className="text-white text-sm font-bold">Ampliar</Text>
      </View>
    </Pressable>
  );
}

export function VisorFoto({ uri, onCerrar }: { uri: string; onCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const escala = useSharedValue(1);
  const escalaBase = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xBase = useSharedValue(0);
  const yBase = useSharedValue(0);

  const pellizco = Gesture.Pinch()
    .onUpdate((e) => {
      escala.value = Math.max(1, Math.min(6, escalaBase.value * e.scale));
    })
    .onEnd(() => {
      escalaBase.value = escala.value;
    });

  const arrastre = Gesture.Pan()
    .onUpdate((e) => {
      x.value = xBase.value + e.translationX;
      y.value = yBase.value + e.translationY;
    })
    .onEnd(() => {
      xBase.value = x.value;
      yBase.value = y.value;
    });

  const dobleToque = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const nueva = escala.value > 1 ? 1 : 2.5;
      escala.value = withTiming(nueva);
      escalaBase.value = nueva;
      x.value = withTiming(0);
      y.value = withTiming(0);
      xBase.value = 0;
      yBase.value = 0;
    });

  const gesto = Gesture.Simultaneous(pellizco, arrastre, dobleToque);
  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: escala.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90, backgroundColor: '#000' }}
    >
      <GestureDetector gesture={gesto}>
        <Animated.View style={[{ flex: 1 }, estilo]}>
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </Animated.View>
      </GestureDetector>
      <Pressable
        onPress={onCerrar}
        style={{ position: 'absolute', top: insets.top + 12, right: 16 }}
        className="bg-white rounded-full px-4 py-2.5 flex-row items-center gap-1"
      >
        <Ionicons name="close" size={22} color="#13212E" />
        <Text className="text-tinta text-base font-bold">Cerrar</Text>
      </Pressable>
      <Text style={{ position: 'absolute', bottom: insets.bottom + 28, alignSelf: 'center' }} className="text-white text-sm">
        Pellizca para ampliar · doble toque para acercar
      </Text>
    </Animated.View>
  );
}
