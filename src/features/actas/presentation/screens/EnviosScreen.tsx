// RF-13: cada persona sabe si lo que hizo está en proceso, guardado o falló
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Tarjeta, Vacio } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';
import { formatearFecha, formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { casos } from '@/shared/di/contenedor';
import { useMisMesas } from '@/features/territorio/presentation/hooks/useTerritorio';
import { NOMBRE_DIGNIDAD, TEXTO_ESTADO } from '../../domain/entities/Acta';
import { useColaLocal } from '../hooks/useActas';
import { sincronizarAhora } from '../hooks/useSincronizacion';
import { ChipEstadoActa } from '../components/EstadoActa';

export function EnviosScreen() {
  const cola = useColaLocal();
  const mesas = useMisMesas();
  const { enLinea, pendientes, conError, sincronizando } = useConexionStore();
  const numero = (mesaId: number) => mesas.data?.mesas.find((m) => m.id === mesaId)?.numero ?? 0;

  const reintentar = async (id: string) => {
    await casos.sincronizar.reintentar(id);
    await sincronizarAhora(false);
    cola.refetch();
  };

  return (
    <Pantalla titulo="Envíos" subtitulo="Actas guardadas en este teléfono" alRefrescar={() => cola.refetch()} refrescando={cola.isRefetching}>
      {!enLinea && pendientes > 0 ? (
        <AvisoEstado tipo="sinSenal" titulo={`${pendientes} acta(s) esperando señal`} mensaje="Están guardadas en el teléfono. Se enviarán solas al recuperar la conexión." />
      ) : null}
      {enLinea && pendientes === 0 && conError === 0 ? <AvisoEstado tipo="exito" titulo="Todo enviado" mensaje="No hay actas pendientes." /> : null}
      <Boton
        titulo="Enviar ahora"
        icono="cloud-upload"
        onPress={async () => {
          await sincronizarAhora(false);
          cola.refetch();
        }}
        cargando={sincronizando}
        textoCargando="Enviando…"
        deshabilitado={!enLinea || pendientes === 0}
      />
      {cola.isLoading ? <Cargando /> : null}
      {cola.data?.length === 0 ? <Vacio titulo="Aún no registras actas" icono="cloud-outline" /> : null}
      {cola.data?.map((a) => (
        <Tarjeta key={a.id}>
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1">
              <Text className="text-tinta text-lg font-extrabold">
                {formatearMesa(numero(a.mesaId))} · {NOMBRE_DIGNIDAD[a.dignidad]}
              </Text>
              <Text className="text-gris text-sm">
                {a.operacion === 'corregir' ? 'Corrección' : 'Registro'} · {formatearFecha(a.actualizadoEn)}
                {a.intentos > 0 ? ` · ${a.intentos} intento(s)` : ''}
              </Text>
            </View>
            <ChipEstadoActa estado={a.estado} />
          </View>
          <Text className="text-tinta text-base mt-2">{a.mensajeError ?? TEXTO_ESTADO[a.estado].ayuda}</Text>
          {a.estado === 'error' ? (
            <View className="mt-3 flex-row gap-2">
              <View className="flex-1">
                <Boton titulo="Revisar" variante="secundario" icono="create" pequeno onPress={() => router.push({ pathname: '/registrar/[mesaId]/[dignidad]', params: { mesaId: String(a.mesaId), dignidad: a.dignidad } })} />
              </View>
              <View className="flex-1">
                <Boton titulo="Reintentar" icono="refresh" pequeno onPress={() => reintentar(a.id)} deshabilitado={!enLinea} />
              </View>
            </View>
          ) : null}
          {a.estado === 'borrador' ? (
            <View className="mt-3">
              <Boton titulo="Continuar registro" icono="create" pequeno onPress={() => router.push({ pathname: '/registrar/[mesaId]/[dignidad]', params: { mesaId: String(a.mesaId), dignidad: a.dignidad } })} />
            </View>
          ) : null}
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
