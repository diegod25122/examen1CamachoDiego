// RF-05 (coordinador único) y RF-15 (avance y actas del recinto)
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { BarraProgreso, Cargando, Chip, Seccion, Tarjeta } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { colores } from '@/shared/presentation/colores';
import { AppError } from '@/shared/domain/AppError';
import { useCoordinadores } from '@/features/personal/presentation/hooks/usePersonal';
import { NOMBRE_DIGNIDAD } from '@/features/actas/domain/entities/Acta';
import { formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { useAsignarCoordinador, useMesasRecinto, useRecinto } from '../hooks/useTerritorio';
import { TarjetaMesa } from '../components/TarjetaMesa';

export function RecintoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recintoId = Number(id);
  const recinto = useRecinto(recintoId);
  const mesas = useMesasRecinto(recintoId);
  const coordinadores = useCoordinadores();
  const asignar = useAsignarCoordinador();
  const [cambiando, setCambiando] = useState(false);

  const r = recinto.data;
  const libres = (coordinadores.data ?? []).filter((c) => !c.recintoId);

  const elegir = async (coordinadorId: string, nombre: string) => {
    try {
      await asignar.mutateAsync({ recintoId, coordinadorId });
      avisar('exito', 'Coordinador asignado', nombre);
      setCambiando(false);
      recinto.refetch();
    } catch (e) {
      avisar('error', 'No se asignó', AppError.desde(e).message);
    }
  };

  return (
    <Pantalla
      titulo={r?.nombre ?? 'Recinto'}
      subtitulo={r ? `${r.parroquia} · ${r.totalMesas} mesas` : undefined}
      atras
      alRefrescar={() => {
        recinto.refetch();
        mesas.refetch();
      }}
      refrescando={recinto.isRefetching || mesas.isRefetching}
    >
      {recinto.isLoading ? <Cargando /> : null}
      {r ? (
        <Tarjeta>
          <Text className="text-gris text-base">Avance</Text>
          <Text className="text-tinta text-3xl font-extrabold">
            {r.mesasReportadas}/{r.totalMesas} <Text className="text-lg text-gris">mesas reportadas</Text>
          </Text>
          <View className="mt-2">
            <BarraProgreso valor={r.totalMesas ? r.mesasReportadas / r.totalMesas : 0} />
          </View>
          {r.actasFueraMargen > 0 ? (
            <View className="mt-3">
              <Chip texto={`${r.actasFueraMargen} acta(s) fuera del margen`} tono="alerta" icono="location" />
            </View>
          ) : null}
        </Tarjeta>
      ) : null}

      <Seccion titulo="Coordinador de recinto">
        <Tarjeta>
          {r?.coordinador ? (
            <View className="flex-row items-center gap-2">
              <Ionicons name="person-circle" size={32} color={colores.marca} />
              <Text className="text-tinta text-lg font-bold flex-1">{r.coordinador}</Text>
            </View>
          ) : (
            <Chip texto="Sin coordinador" tono="alerta" icono="alert-circle" />
          )}
          <View className="mt-3 gap-2">
            {!cambiando ? (
              <Boton titulo={r?.coordinador ? 'Cambiar coordinador' : 'Asignar coordinador'} variante="secundario" icono="swap-horizontal" pequeno onPress={() => setCambiando(true)} />
            ) : (
              <>
                <Text className="text-tinta text-base font-bold">Coordinadores sin recinto</Text>
                {libres.length === 0 ? <Text className="text-gris text-base">No hay coordinadores libres. Crea uno nuevo.</Text> : null}
                {libres.map((c) => (
                  <Pressable key={c.id} onPress={() => elegir(c.id, `${c.nombres} ${c.apellidos}`)} className="flex-row items-center gap-2 bg-marca-claro rounded-xl p-3">
                    <Ionicons name="person-add" size={20} color={colores.marca} />
                    <Text className="text-tinta text-base font-bold flex-1">
                      {c.nombres} {c.apellidos}
                    </Text>
                    {!c.verificado ? <Chip texto="Sin verificar" tono="alerta" /> : null}
                  </Pressable>
                ))}
                <Boton
                  titulo="Crear coordinador nuevo"
                  icono="person-add"
                  pequeno
                  onPress={() =>
                    router.push({
                      pathname: '/coordinador-nuevo',
                      params: { recintoId: String(recintoId), recintoNombre: r?.nombre ?? '' },
                    })
                  }
                  deshabilitado={!!r?.coordinador}
                />
                {r?.coordinador ? <Text className="text-gris text-sm">Para crear uno nuevo, primero el recinto debe quedar libre.</Text> : null}
                <Boton titulo="Cancelar" variante="fantasma" pequeno onPress={() => setCambiando(false)} />
              </>
            )}
          </View>
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Mesas y actas">
        {mesas.error ? <AvisoEstado tipo="error" titulo="No se cargaron las mesas" mensaje={AppError.desde(mesas.error).message} /> : null}
        {mesas.data?.map((m) => (
          <View key={m.id} className="gap-2">
            <TarjetaMesa mesa={m} />
            <View className="flex-row gap-2 flex-wrap">
              {m.actas.map((a) => (
                <Boton
                  key={a.id}
                  titulo={`Ver ${NOMBRE_DIGNIDAD[a.dignidad]} · ${formatearMesa(m.numero)}`}
                  variante="fantasma"
                  icono="document-text"
                  pequeno
                  onPress={() => router.push({ pathname: '/acta/[id]', params: { id: a.id } })}
                />
              ))}
            </View>
          </View>
        ))}
      </Seccion>
    </Pantalla>
  );
}
