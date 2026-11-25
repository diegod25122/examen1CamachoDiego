// RF-15 / RNF-09: avance por recinto en tiempo real (inicio del coordinador provincial)
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { BarraProgreso, Cargando, Chip, Seccion, Tarjeta, Vacio } from '@/shared/presentation/components/Basicos';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { colores } from '@/shared/presentation/colores';
import { formatearFecha, formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { AppError } from '@/shared/domain/AppError';
import { NOMBRE_DIGNIDAD } from '@/features/actas/domain/entities/Acta';
import { useAvance, useEscrutinioEnVivo, useUltimasActas } from '../hooks/useEscrutinio';
import { EnVivo } from '../components/EnVivo';

export function PanelScreen() {
  const ultimoCambio = useEscrutinioEnVivo();
  const avance = useAvance();
  const ultimas = useUltimasActas();
  const r = avance.data?.resumen;

  return (
    <Pantalla
      titulo="Avance del escrutinio"
      subtitulo="Pichincha · Quito"
      alRefrescar={() => {
        avance.refetch();
        ultimas.refetch();
      }}
      refrescando={avance.isRefetching}
    >
      <EnVivo ultimoCambio={ultimoCambio} />
      {avance.isLoading ? <Cargando texto="Cargando avance…" /> : null}
      {avance.error ? <AvisoEstado tipo="error" titulo="No se cargó el avance" mensaje={AppError.desde(avance.error).message} accion={{ titulo: 'Reintentar', onPress: () => avance.refetch() }} /> : null}

      {r ? (
        <View className="bg-marca rounded-3xl p-5 gap-3">
          <Text className="text-marca-claro text-base font-bold">Mesas reportadas</Text>
          <Text className="text-white text-4xl font-extrabold">
            {r.mesasReportadas}
            <Text className="text-2xl text-marca-claro"> / {r.totalMesas}</Text>
          </Text>
          <BarraProgreso valor={r.porcentaje} color={colores.acento} />
          <View className="flex-row justify-between">
            <Text className="text-white text-base">{(r.porcentaje * 100).toFixed(1)}% del cantón</Text>
            <Text className="text-white text-base">Faltan {r.totalMesas - r.mesasReportadas}</Text>
          </View>
          <View className="flex-row gap-2 flex-wrap">
            <View className="bg-marca-oscuro rounded-full px-3 py-1">
              <Text className="text-white text-sm font-bold">{r.recintosCompletos} recintos completos</Text>
            </View>
            {r.actasFueraMargen > 0 ? (
              <View className="bg-acento rounded-full px-3 py-1">
                <Text className="text-tinta text-sm font-bold">{r.actasFueraMargen} actas fuera del margen</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <Seccion titulo="Últimas actas recibidas">
        {ultimas.data?.length === 0 ? <Vacio titulo="Aún no llegan actas" icono="time-outline" /> : null}
        {ultimas.data?.map((a) => (
          <Tarjeta key={a.id} onPress={() => router.push({ pathname: '/acta/[id]', params: { id: a.id } })}>
            <View className="flex-row items-center gap-3">
              <Ionicons name="document-text" size={26} color={colores.marca} />
              <View className="flex-1">
                <Text className="text-tinta text-base font-extrabold">
                  {NOMBRE_DIGNIDAD[a.dignidad]} · {formatearMesa(a.mesaNumero)}
                </Text>
                <Text className="text-gris text-sm" numberOfLines={1}>
                  {a.recinto} · {formatearFecha(a.recibidoEn)}
                </Text>
              </View>
              {a.fueraDeMargen ? <Chip texto="Revisar" tono="alerta" icono="location" /> : null}
              {a.version > 1 ? <Chip texto={`v${a.version}`} tono="marca" /> : null}
            </View>
          </Tarjeta>
        ))}
      </Seccion>

      <Seccion titulo="Por recinto">
        {avance.data?.recintos.map((rec) => {
          const p = rec.totalMesas ? rec.mesasReportadas / rec.totalMesas : 0;
          return (
            <Tarjeta key={rec.id} onPress={() => router.push({ pathname: '/recinto/[id]', params: { id: String(rec.id) } })}>
              <View className="flex-row items-center justify-between gap-2">
                <Text className="text-tinta text-base font-extrabold flex-1" numberOfLines={2}>
                  {rec.nombre}
                </Text>
                <Text className={`text-lg font-extrabold ${p === 1 ? 'text-exito' : 'text-tinta'}`}>
                  {rec.mesasReportadas}/{rec.totalMesas}
                </Text>
              </View>
              <Text className="text-gris text-sm mb-2">
                {rec.parroquia} · {rec.totalMesas - rec.mesasReportadas} pendientes
              </Text>
              <BarraProgreso valor={p} color={p === 1 ? colores.exito : colores.marca} />
            </Tarjeta>
          );
        })}
      </Seccion>
    </Pantalla>
  );
}
