import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tarjeta } from '@/shared/presentation/components/Basicos';
import { colores } from '@/shared/presentation/colores';
import { formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { ChipEstadoActa } from '@/features/actas/presentation/components/EstadoActa';
import { DIGNIDADES, NOMBRE_DIGNIDAD } from '@/features/actas/domain/entities/Acta';
import type { Mesa } from '../../domain/entities/Territorio';

export function TarjetaMesa({ mesa, onPress }: { mesa: Mesa; onPress?: () => void }) {
  return (
    <Tarjeta onPress={onPress}>
      <View className="flex-row items-center justify-between">
        <Text className="text-tinta text-xl font-extrabold">{formatearMesa(mesa.numero)}</Text>
        {onPress ? <Ionicons name="chevron-forward" size={22} color={colores.gris} /> : null}
      </View>
      <View className="flex-row items-center gap-2 mt-1">
        <Ionicons name={mesa.veedor ? 'person' : 'person-remove'} size={18} color={mesa.veedor ? colores.marca : colores.error} />
        <Text className={`text-base ${mesa.veedor ? 'text-tinta' : 'text-error font-bold'}`}>
          {mesa.veedor ? `${mesa.veedor.nombres} ${mesa.veedor.apellidos}` : 'Falta veedor'}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2 mt-3">
        {DIGNIDADES.map((d) => {
          const acta = mesa.actas.find((a) => a.dignidad === d);
          return (
            <View key={d} className="flex-row items-center gap-1.5">
              <Text className="text-gris text-sm font-bold">{NOMBRE_DIGNIDAD[d]}:</Text>
              <ChipEstadoActa estado={acta ? 'enviada' : 'sin_registrar'} />
              {acta?.fueraDeMargen ? <Ionicons name="location" size={16} color={colores.alerta} /> : null}
            </View>
          );
        })}
      </View>
    </Tarjeta>
  );
}
