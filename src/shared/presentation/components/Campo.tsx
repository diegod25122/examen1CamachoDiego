// Campo de texto grande con etiqueta, error en español sencillo y opción de mostrar la contraseña (RNF-01)
import { forwardRef, useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colores } from '../colores';

type Props = TextInputProps & {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  esContrasena?: boolean;
};

export const Campo = forwardRef<TextInput, Props>(function Campo({ etiqueta, error, ayuda, esContrasena, ...resto }, ref) {
  const [visible, setVisible] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const borde = error ? 'border-error' : enfocado ? 'border-marca' : 'border-borde';

  return (
    <View className="gap-1.5">
      <Text className="text-tinta text-base font-bold">{etiqueta}</Text>
      <View className={`flex-row items-center bg-white rounded-2xl border-2 ${borde}`}>
        <TextInput
          {...resto}
          ref={ref}
          placeholderTextColor={colores.gris}
          secureTextEntry={esContrasena && !visible}
          autoCapitalize={esContrasena ? 'none' : resto.autoCapitalize}
          className="flex-1 px-4 py-3.5 text-lg text-tinta"
          onFocus={(ev) => {
            setEnfocado(true);
            resto.onFocus?.(ev);
          }}
          onBlur={(ev) => {
            setEnfocado(false);
            resto.onBlur?.(ev);
          }}
        />
        {esContrasena && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            className="px-4 py-3 flex-row items-center gap-1"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Ionicons name={visible ? 'eye-off' : 'eye'} size={22} color={colores.marca} />
            <Text className="text-marca font-bold">{visible ? 'Ocultar' : 'Mostrar'}</Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="alert-circle" size={18} color={colores.error} />
            <Text className="text-error text-base flex-1">{error}</Text>
          </View>
        </Animated.View>
      ) : ayuda ? (
        <Text className="text-gris text-sm">{ayuda}</Text>
      ) : null}
    </View>
  );
});
