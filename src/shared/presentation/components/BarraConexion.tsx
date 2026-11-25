// RF-13: todas las pantallas muestran si hay conexión y cuántas actas faltan por enviar
import { Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useConexionStore } from '../store/conexionStore';
import { colores } from '../colores';

export function BarraConexion() {
  const { enLinea, pendientes, conError, sincronizando } = useConexionStore();
  const progreso = useDerivedValue(() => withTiming(enLinea ? 1 : 0, { duration: 450 }), [enLinea]);

  const estilo = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progreso.value, [0, 1], [colores.alerta, colores.exito]),
  }));

  let texto: string;
  if (!enLinea) texto = pendientes > 0 ? `Sin conexión · ${pendientes} acta${pendientes === 1 ? '' : 's'} por enviar` : 'Sin conexión';
  else if (sincronizando) texto = `Enviando ${pendientes} acta${pendientes === 1 ? '' : 's'}…`;
  else if (pendientes > 0) texto = `En línea · ${pendientes} por enviar`;
  else texto = 'En línea · Todo enviado';

  return (
    <Animated.View style={[{ paddingVertical: 6, paddingHorizontal: 16 }, estilo]}>
      <View className="flex-row items-center justify-center gap-2">
        <Ionicons name={enLinea ? 'cloud-done' : 'cloud-offline'} size={16} color="#fff" />
        <Text className="text-white text-sm font-bold">{texto}</Text>
        {conError > 0 && (
          <View className="bg-white rounded-full px-2 ml-1">
            <Text className="text-error text-xs font-bold">{conError} con error</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
