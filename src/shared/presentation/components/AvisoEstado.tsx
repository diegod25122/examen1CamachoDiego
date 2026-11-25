// Retroalimentación en la misma pantalla (no modal) con Lottie + Reanimated (RNF-02)
import { Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { AnimacionLottie, type NombreAnimacion } from './AnimacionLottie';
import { Boton } from './Boton';

export type TipoEstado = 'proceso' | 'exito' | 'error' | 'alerta' | 'info' | 'sinSenal';

const CONFIG: Record<TipoEstado, { caja: string; titulo: string; animacion?: NombreAnimacion }> = {
  proceso: { caja: 'bg-marca-claro border-marca', titulo: 'text-marca-oscuro', animacion: 'cargando' },
  exito: { caja: 'bg-exito-claro border-exito', titulo: 'text-exito', animacion: 'exito' },
  error: { caja: 'bg-error-claro border-error', titulo: 'text-error', animacion: 'error' },
  alerta: { caja: 'bg-alerta-claro border-alerta', titulo: 'text-alerta' },
  info: { caja: 'bg-white border-borde', titulo: 'text-tinta' },
  sinSenal: { caja: 'bg-alerta-claro border-alerta', titulo: 'text-alerta', animacion: 'sinSenal' },
};

type Props = {
  tipo: TipoEstado;
  titulo: string;
  mensaje?: string;
  accion?: { titulo: string; onPress: () => void };
};

export function AvisoEstado({ tipo, titulo, mensaje, accion }: Props) {
  const c = CONFIG[tipo];

  return (
    <Animated.View entering={FadeIn.duration(300)} layout={LinearTransition.duration(250)}>
      <View className={`${c.caja} border-2 rounded-2xl p-4 flex-row items-center gap-3`}>
        {c.animacion ? <AnimacionLottie nombre={c.animacion} tamano={52} key={`${tipo}-${titulo}`} /> : null}
        <View className="flex-1 gap-1">
          <Text className={`${c.titulo} text-lg font-extrabold`}>{titulo}</Text>
          {mensaje ? <Text className="text-tinta text-base">{mensaje}</Text> : null}
          {accion ? (
            <View className="mt-2 self-start">
              <Boton titulo={accion.titulo} onPress={accion.onPress} variante="secundario" pequeno />
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
