// RF-10: la foto solo se toma con la cámara de la app (no desde la galería)
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { Boton } from '@/shared/presentation/components/Boton';
import { AnimacionLottie } from '@/shared/presentation/components/AnimacionLottie';

type Props = { onCapturada: (uri: string) => void; onCancelar: () => void };

export function CamaraActa({ onCapturada, onCancelar }: Props) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [tomando, setTomando] = useState(false);
  const [lista, setLista] = useState(false);
  const insets = useSafeAreaInsets();

  const tomar = async () => {
    if (!camara.current || tomando) return;
    setTomando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.9 });
      if (foto?.uri) onCapturada(foto.uri);
    } finally {
      setTomando(false);
    }
  };

  return (
    <Animated.View entering={FadeIn} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: '#000' }}>
      {!permiso ? null : !permiso.granted ? (
        <View className="flex-1 bg-fondo justify-center p-6 gap-4" style={{ paddingTop: insets.top }}>
          <AvisoEstado tipo="alerta" titulo="Necesitamos la cámara" mensaje="Cada acta debe tener una foto tomada desde esta aplicación." />
          <Boton titulo="Permitir cámara" icono="camera" onPress={pedirPermiso} />
          <Boton titulo="Cancelar" variante="fantasma" onPress={onCancelar} />
        </View>
      ) : (
        <>
          <CameraView ref={camara} style={{ flex: 1 }} facing="back" autofocus="on" onCameraReady={() => setLista(true)} />
          {/* guía de encuadre */}
          <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 70, bottom: 170, left: 20, right: 20 }} className="border-4 border-acento rounded-3xl" />
          <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16 }} className="flex-row items-center justify-between">
            <Pressable onPress={onCancelar} className="bg-black/60 rounded-full px-4 py-2.5 flex-row items-center gap-1">
              <Ionicons name="close" size={22} color="#fff" />
              <Text className="text-white text-base font-bold">Cancelar</Text>
            </Pressable>
          </View>
          <View style={{ position: 'absolute', bottom: insets.bottom + 24, left: 0, right: 0 }} className="items-center gap-3">
            <Text className="text-white text-base font-bold bg-black/60 rounded-full px-4 py-1.5">Encuadra el acta completa, con buena luz</Text>
            <Pressable
              onPress={tomar}
              disabled={!lista || tomando}
              accessibilityLabel="Tomar foto"
              className="w-20 h-20 rounded-full bg-white items-center justify-center border-4 border-acento"
              style={{ opacity: lista ? 1 : 0.5 }}
            >
              {tomando ? <AnimacionLottie nombre="cargando" tamano={56} /> : <Ionicons name="camera" size={36} color="#13212E" />}
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}
