// Inicio del veedor (RF-19): solo sus mesas, con el estado de cada acta (RF-13)
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Chip, Tarjeta, Vacio } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { colores } from '@/shared/presentation/colores';
import { formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { claves } from '@/shared/presentation/query/claves';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { nombreCompleto } from '@/features/auth/domain/entities/Perfil';
import { DIGNIDADES, NOMBRE_DIGNIDAD } from '@/features/actas/domain/entities/Acta';
import { ChipEstadoActa, estadoVisible } from '@/features/actas/presentation/components/EstadoActa';
import { useCatalogo, useColaLocal } from '@/features/actas/presentation/hooks/useActas';
import { useMisMesas } from '../hooks/useTerritorio';

export function MisMesasScreen() {
  const perfil = usePerfil();
  const qc = useQueryClient();
  const mesas = useMisMesas();
  const cola = useColaLocal();
  const catalogo = useCatalogo(); // se descarga para trabajar sin señal (RF-14)

  const refrescar = () => {
    mesas.refetch();
    cola.refetch();
    qc.invalidateQueries({ queryKey: claves.catalogo });
  };

  const listoSinSenal = !!mesas.data && !!catalogo.data;

  return (
    <Pantalla titulo="Mis mesas" subtitulo={perfil ? nombreCompleto(perfil) : undefined} alRefrescar={refrescar} refrescando={mesas.isRefetching}>
      {listoSinSenal ? (
        <View className="flex-row items-center gap-2 bg-exito-claro rounded-2xl px-4 py-3">
          <Ionicons name="download" size={20} color={colores.exito} />
          <Text className="text-exito text-base font-bold flex-1">
            {mesas.data!.desdeCache || catalogo.data!.desdeCache ? 'Usando datos descargados (sin señal)' : 'Datos descargados: puedes trabajar sin señal'}
          </Text>
        </View>
      ) : null}
      {mesas.isLoading ? <Cargando texto="Descargando tus mesas…" /> : null}
      {mesas.error ? (
        <AvisoEstado tipo="error" titulo="No se pudieron cargar tus mesas" mensaje={AppError.desde(mesas.error).message} accion={{ titulo: 'Reintentar', onPress: refrescar }} />
      ) : null}
      {mesas.data && mesas.data.mesas.length === 0 ? (
        <Vacio titulo="Aún no tienes mesas asignadas" mensaje="Tu coordinador de recinto te asignará una o varias mesas." icono="clipboard-outline" />
      ) : null}

      {mesas.data?.mesas.map((m) => (
        <Tarjeta key={m.id}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="text-tinta text-2xl font-extrabold">{formatearMesa(m.numero)}</Text>
              <Text className="text-gris text-base">
                {m.recinto.nombre} · {m.recinto.parroquia}
              </Text>
            </View>
            <Chip texto={new Set(m.actas.map((a) => a.dignidad)).size === 2 ? 'Reportada' : 'Pendiente'} tono={new Set(m.actas.map((a) => a.dignidad)).size === 2 ? 'exito' : 'gris'} />
          </View>
          <View className="gap-3 mt-4">
            {DIGNIDADES.map((d) => {
              const local = cola.data?.find((a) => a.mesaId === m.id && a.dignidad === d);
              const enServidor = m.actas.some((a) => a.dignidad === d);
              const estado = estadoVisible(local, enServidor);
              return (
                <View key={d} className="bg-fondo rounded-2xl p-3 gap-2">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-tinta text-lg font-bold">Acta de {NOMBRE_DIGNIDAD[d]}</Text>
                    <ChipEstadoActa estado={estado} />
                  </View>
                  {local?.mensajeError && local.estado !== 'enviada' ? <Text className="text-alerta text-sm">{local.mensajeError}</Text> : null}
                  <Boton
                    titulo={estado === 'sin_registrar' ? 'Registrar acta' : estado === 'borrador' ? 'Continuar registro' : 'Ver o corregir'}
                    variante={estado === 'sin_registrar' || estado === 'borrador' ? 'primario' : 'secundario'}
                    icono={estado === 'sin_registrar' ? 'camera' : 'create'}
                    pequeno
                    onPress={() => router.push({ pathname: '/registrar/[mesaId]/[dignidad]', params: { mesaId: String(m.id), dignidad: d } })}
                  />
                </View>
              );
            })}
          </View>
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
