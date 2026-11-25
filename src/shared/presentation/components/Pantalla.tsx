import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarraConexion } from './BarraConexion';

type Props = {
  titulo: string;
  subtitulo?: string;
  atras?: boolean;
  accion?: ReactNode;
  children: ReactNode;
  desplazable?: boolean;
  alRefrescar?: () => void;
  refrescando?: boolean;
  pie?: ReactNode;
};

export function Pantalla({ titulo, subtitulo, atras, accion, children, desplazable = true, alRefrescar, refrescando = false, pie }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-fondo">
      <View className="bg-marca" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center px-4 pt-3 pb-4 gap-3">
          {atras && (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              accessibilityLabel="Volver"
              className="w-11 h-11 rounded-full bg-marca-oscuro items-center justify-center"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          )}
          <View className="flex-1">
            <Text className="text-white text-2xl font-extrabold" numberOfLines={2}>
              {titulo}
            </Text>
            {subtitulo ? <Text className="text-marca-claro text-base mt-0.5">{subtitulo}</Text> : null}
          </View>
          {accion}
        </View>
        {/* franja de acento: identidad visual de la organización */}
        <View className="h-1.5 bg-acento" />
      </View>
      <BarraConexion />
      {desplazable ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={alRefrescar ? <RefreshControl refreshing={refrescando} onRefresh={alRefrescar} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View className="flex-1">{children}</View>
      )}
      {pie ? <View style={{ paddingBottom: insets.bottom }} className="bg-white border-t border-borde px-4 pt-3 pb-3">{pie}</View> : null}
    </View>
  );
}
