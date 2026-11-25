import { forwardRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colores } from '@/shared/presentation/colores';

type Props = {
  etiqueta: string;
  detalle?: string;
  color?: string;
  valor: number | undefined;
  onCambiar: (v: number | undefined) => void;
  onSiguiente?: () => void;
  error?: string;
  destacado?: boolean;
  editable?: boolean;
};

/** Campo numérico grande: solo admite dígitos (RF-09, RNF-01) */
export const CampoNumero = forwardRef<TextInput, Props>(function CampoNumero(
  { etiqueta, detalle, color, valor, onCambiar, onSiguiente, error, destacado, editable = true },
  ref,
) {
  return (
    <View className="gap-1">
      <View className={`flex-row items-center bg-white rounded-2xl border-2 overflow-hidden ${error ? 'border-error' : destacado ? 'border-marca' : 'border-borde'}`}>
        <View style={{ width: 8, alignSelf: 'stretch', backgroundColor: color ?? (destacado ? colores.marca : colores.borde) }} />
        <View className="flex-1 px-3 py-2">
          <Text className="text-tinta text-base font-extrabold">{etiqueta}</Text>
          {detalle ? <Text className="text-gris text-sm">{detalle}</Text> : null}
        </View>
        <TextInput
          ref={ref}
          value={valor === undefined ? '' : String(valor)}
          onChangeText={(t) => {
            const limpio = t.replace(/\D/g, '').slice(0, 5);
            onCambiar(limpio === '' ? undefined : parseInt(limpio, 10));
          }}
          keyboardType="number-pad"
          returnKeyType={onSiguiente ? 'next' : 'done'}
          onSubmitEditing={onSiguiente}
          blurOnSubmit={!onSiguiente}
          editable={editable}
          placeholder="0"
          placeholderTextColor={colores.borde}
          className="w-28 text-right pr-4 py-3 text-3xl font-extrabold text-tinta"
          accessibilityLabel={etiqueta}
        />
      </View>
      {error ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text className="text-error text-base">{error}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
});
