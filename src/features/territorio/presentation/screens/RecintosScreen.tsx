// RF-05: recintos de la jurisdicción con su coordinador o "Sin coordinador"
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { BarraProgreso, Cargando, Chip, SelectorOpciones, Tarjeta } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { colores } from '@/shared/presentation/colores';
import { AppError } from '@/shared/domain/AppError';
import { useRecintos } from '../hooks/useTerritorio';

export function RecintosScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useRecintos();
  const [parroquia, setParroquia] = useState<number>(0);

  const opciones = useMemo(() => {
    const unicas = new Map<number, string>();
    data?.forEach((r) => unicas.set(r.parroquiaId, r.parroquia));
    return [{ valor: 0, texto: 'Todas' }, ...[...unicas].map(([valor, texto]) => ({ valor, texto }))];
  }, [data]);

  const lista = (data ?? []).filter((r) => !parroquia || r.parroquiaId === parroquia);
  const sinCoordinador = (data ?? []).filter((r) => !r.coordinador).length;

  return (
    <Pantalla titulo="Recintos" subtitulo="Pichincha · Quito" alRefrescar={refetch} refrescando={isRefetching}>
      <Boton titulo="Agregar recinto" icono="add-circle" onPress={() => router.push('/recinto-nuevo')} />
      {sinCoordinador > 0 ? (
        <AvisoEstado tipo="alerta" titulo={`${sinCoordinador} recinto(s) sin coordinador`} mensaje="Asigna uno desde el detalle del recinto." />
      ) : null}
      <SelectorOpciones opciones={opciones} valor={parroquia} onCambiar={setParroquia} />
      {isLoading ? <Cargando texto="Cargando recintos…" /> : null}
      {error ? <AvisoEstado tipo="error" titulo="No se cargaron los recintos" mensaje={AppError.desde(error).message} accion={{ titulo: 'Reintentar', onPress: () => refetch() }} /> : null}
      {lista.map((r) => (
        <Tarjeta key={r.id} onPress={() => router.push({ pathname: '/recinto/[id]', params: { id: String(r.id) } })}>
          <View className="flex-row items-start gap-2">
            <View className="flex-1">
              <Text className="text-tinta text-lg font-extrabold">{r.nombre}</Text>
              <Text className="text-gris text-base">
                {r.parroquia} ({r.parroquiaTipo}) · {r.totalMesas} mesas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colores.gris} />
          </View>
          <View className="mt-2">
            {r.coordinador ? (
              <Chip texto={r.coordinador} tono="marca" icono="person" />
            ) : (
              <Chip texto="Sin coordinador" tono="alerta" icono="alert-circle" />
            )}
          </View>
          <View className="mt-3 gap-1">
            <BarraProgreso valor={r.totalMesas ? r.mesasReportadas / r.totalMesas : 0} />
            <Text className="text-gris text-sm">
              {r.mesasReportadas} de {r.totalMesas} mesas reportadas
            </Text>
          </View>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
