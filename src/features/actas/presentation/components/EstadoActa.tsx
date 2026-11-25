// RF-13: chip con el estado del acta en todo momento
import { Chip } from '@/shared/presentation/components/Basicos';
import { TEXTO_ESTADO, type EstadoEnvio } from '../../domain/entities/Acta';

export type EstadoVisible = EstadoEnvio | 'sin_registrar';

const TONO = {
  sin_registrar: 'gris',
  borrador: 'alerta',
  pendiente: 'marca',
  enviando: 'marca',
  enviada: 'exito',
  error: 'error',
} as const;

const ICONO = {
  sin_registrar: 'ellipse-outline',
  borrador: 'create',
  pendiente: 'phone-portrait',
  enviando: 'cloud-upload',
  enviada: 'checkmark-circle',
  error: 'alert-circle',
} as const;

export function ChipEstadoActa({ estado }: { estado: EstadoVisible }) {
  const texto = estado === 'sin_registrar' ? 'Sin registrar' : TEXTO_ESTADO[estado].titulo;
  return <Chip texto={texto} tono={TONO[estado]} icono={ICONO[estado]} />;
}

/** Combina lo que hay en el teléfono con lo que ya recibió el servidor */
export function estadoVisible(local: { estado: EstadoEnvio } | undefined, enServidor: boolean): EstadoVisible {
  if (local && local.estado !== 'enviada') return local.estado;
  if (enServidor || local?.estado === 'enviada') return 'enviada';
  return 'sin_registrar';
}
