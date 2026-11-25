// RF-06: el coordinador ve qué mesas tienen veedor y cuáles faltan
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { BarraProgreso, Cargando, Tarjeta } from '@/shared/presentation/components/Basicos';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { mesaReportada } from '../../domain/entities/Territorio';
import { useMesasRecinto, useRecinto } from '../hooks/useTerritorio';
import { TarjetaMesa } from '../components/TarjetaMesa';

export function MesasRecintoScreen() {
  const perfil = usePerfil();
  const recintoId = perfil?.recintoId ?? 0;
  const recinto = useRecinto(recintoId);
  const { data, isLoading, error, refetch, isRefetching } = useMesasRecinto(recintoId);

  if (!perfil?.recintoId) {
    return (
      <Pantalla titulo="Mesas">
        <AvisoEstado tipo="alerta" titulo="Aún no tienes recinto asignado" mensaje="El coordinador provincial debe asignarte un recinto." />
      </Pantalla>
    );
  }

  const mesas = data ?? [];
  const conVeedor = mesas.filter((m) => m.veedorId).length;
  const reportadas = mesas.filter(mesaReportada).length;

  return (
    <Pantalla titulo={recinto.data?.nombre ?? 'Mi recinto'} subtitulo={recinto.data?.parroquia} alRefrescar={refetch} refrescando={isRefetching}>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Tarjeta>
            <Text className="text-gris text-sm">Con veedor</Text>
            <Text className={`text-3xl font-extrabold ${conVeedor < mesas.length ? 'text-alerta' : 'text-exito'}`}>
              {conVeedor}/{mesas.length}
            </Text>
          </Tarjeta>
        </View>
        <View className="flex-1">
          <Tarjeta>
            <Text className="text-gris text-sm">Reportadas</Text>
            <Text className="text-3xl font-extrabold text-marca">
              {reportadas}/{mesas.length}
            </Text>
          </Tarjeta>
        </View>
      </View>
      <BarraProgreso valor={mesas.length ? reportadas / mesas.length : 0} />
      {conVeedor < mesas.length ? (
        <AvisoEstado tipo="alerta" titulo={`Faltan ${mesas.length - conVeedor} veedor(es)`} mensaje="Toca la mesa para asignar o reemplazar al veedor." />
      ) : null}
      {isLoading ? <Cargando texto="Cargando mesas…" /> : null}
      {error ? <AvisoEstado tipo="error" titulo="No se cargaron las mesas" mensaje={AppError.desde(error).message} accion={{ titulo: 'Reintentar', onPress: () => refetch() }} /> : null}
      {mesas.map((m) => (
        <TarjetaMesa key={m.id} mesa={m} onPress={() => router.push({ pathname: '/mesa/[id]', params: { id: String(m.id) } })} />
      ))}
    </Pantalla>
  );
}
