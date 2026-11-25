// ADR-06: animaciones Lottie para en proceso, éxito, error y sin señal (RNF-02)
import LottieView from 'lottie-react-native';

const ANIMACIONES = {
  cargando: require('../../../../assets/lottie/cargando.json'),
  exito: require('../../../../assets/lottie/exito.json'),
  error: require('../../../../assets/lottie/error.json'),
  sinSenal: require('../../../../assets/lottie/sin-senal.json'),
} as const;

export type NombreAnimacion = keyof typeof ANIMACIONES;

type Props = { nombre: NombreAnimacion; tamano?: number; repetir?: boolean };

export function AnimacionLottie({ nombre, tamano = 56, repetir }: Props) {
  const enBucle = repetir ?? (nombre === 'cargando' || nombre === 'sinSenal');
  return (
    <LottieView
      source={ANIMACIONES[nombre]}
      autoPlay
      loop={enBucle}
      style={{ width: tamano, height: tamano }}
    />
  );
}
