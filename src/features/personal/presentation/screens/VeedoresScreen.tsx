// Veedores del recinto, incluidos los de reserva verificados antes de la jornada (S-05)
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Chip, Tarjeta, Vacio } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { useVeedores } from '../hooks/usePersonal';

export function VeedoresScreen() {
  const perfil = usePerfil();
  const { data, isLoading, error, refetch, isRefetching } = useVeedores(perfil?.recintoId);

  return (
    <Pantalla titulo="Veedores" subtitulo="De tu recinto" alRefrescar={refetch} refrescando={isRefetching}>
      <Boton titulo="Crear veedor (reserva)" icono="person-add" onPress={() => router.push('/veedor-nuevo')} />
      {isLoading ? <Cargando /> : null}
      {error ? <AvisoEstado tipo="error" titulo="No se cargaron los veedores" mensaje={AppError.desde(error).message} accion={{ titulo: 'Reintentar', onPress: () => refetch() }} /> : null}
      {data && data.length === 0 ? <Vacio titulo="Aún no tienes veedores" mensaje="Crea veedores y luego asígnalos a cada mesa." icono="people-outline" /> : null}
      {data?.map((v) => (
        <Tarjeta key={v.id}>
          <View className="flex-row justify-between items-start gap-2">
            <View className="flex-1">
              <Text className="text-tinta text-lg font-extrabold">
                {v.nombres} {v.apellidos}
              </Text>
              <Text className="text-gris text-base">CI {v.cedula} · {v.telefono}</Text>
            </View>
            <Chip texto={v.verificado ? 'Correo verificado' : 'Invitación pendiente'} tono={v.verificado ? 'exito' : 'alerta'} icono={v.verificado ? 'checkmark-circle' : 'time'} />
          </View>
          <Text className="text-tinta text-base mt-2">
            {v.mesas.length ? `Cubre: ${v.mesas.map((n) => String(n).padStart(3, '0')).join(', ')}` : 'De reserva (sin mesa)'}
          </Text>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
