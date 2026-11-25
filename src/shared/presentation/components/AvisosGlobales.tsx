// Franja superior que aparece y se va sola (no bloquea la pantalla, RNF-02)
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAvisosStore } from '../store/avisosStore';
import { AnimacionLottie } from './AnimacionLottie';
import { Ionicons } from '@expo/vector-icons';

const FONDO = { exito: 'bg-exito', error: 'bg-error', info: 'bg-marca-oscuro', alerta: 'bg-alerta' } as const;

export function AvisosGlobales() {
  const { aviso, cerrar } = useAvisosStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(cerrar, aviso.tipo === 'error' ? 6000 : 3800);
    return () => clearTimeout(t);
  }, [aviso, cerrar]);

  if (!aviso) return null;

  return (
    <Animated.View
      key={aviso.id}
      entering={FadeInUp.duration(300)}
      exiting={FadeOutUp.duration(250)}
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 100 }}
      pointerEvents="box-none"
    >
      <Pressable onPress={cerrar} className={`${FONDO[aviso.tipo]} rounded-2xl px-3 py-3 flex-row items-center gap-2`} style={{ elevation: 6 }}>
        {aviso.tipo === 'exito' || aviso.tipo === 'error' ? (
          <View className="bg-white rounded-full">
            <AnimacionLottie nombre={aviso.tipo} tamano={40} />
          </View>
        ) : (
          <Ionicons name={aviso.tipo === 'alerta' ? 'warning' : 'information-circle'} size={30} color="#fff" />
        )}
        <View className="flex-1">
          <Text className="text-white text-base font-extrabold">{aviso.titulo}</Text>
          {aviso.mensaje ? <Text className="text-white text-sm">{aviso.mensaje}</Text> : null}
        </View>
        <Ionicons name="close" size={22} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}
