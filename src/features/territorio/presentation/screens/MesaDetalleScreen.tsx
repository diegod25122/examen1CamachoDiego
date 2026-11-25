// RF-06 / RF-07: asignar o reemplazar en el momento al veedor de una mesa; RF-12: corregir sus actas
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Chip, Seccion, Tarjeta } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { colores } from '@/shared/presentation/colores';
import { formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { useVeedores } from '@/features/personal/presentation/hooks/usePersonal';
import { DIGNIDADES, NOMBRE_DIGNIDAD } from '@/features/actas/domain/entities/Acta';
import { ChipEstadoActa } from '@/features/actas/presentation/components/EstadoActa';
import { useAsignarVeedor, useMesasRecinto } from '../hooks/useTerritorio';

export function MesaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mesaId = Number(id);
  const perfil = usePerfil();
  const mesas = useMesasRecinto(perfil?.recintoId);
  const veedores = useVeedores(perfil?.recintoId);
  const asignar = useAsignarVeedor();
  const [elegido, setElegido] = useState<string | null>(null);

  const mesa = mesas.data?.find((m) => m.id === mesaId);
  if (mesas.isLoading) return <Pantalla titulo="Mesa" atras><Cargando /></Pantalla>;
  if (!mesa) return <Pantalla titulo="Mesa" atras><AvisoEstado tipo="error" titulo="Mesa no encontrada" /></Pantalla>;

  const candidatos = (veedores.data ?? []).filter((v) => v.id !== mesa.veedorId);

  const confirmar = async () => {
    if (!elegido) return;
    const v = veedores.data?.find((x) => x.id === elegido);
    try {
      await asignar.mutateAsync({ mesaId, veedorId: elegido });
      avisar('exito', mesa.veedor ? 'Veedor reemplazado' : 'Veedor asignado', `${v?.nombres} ${v?.apellidos} cubre ahora la ${formatearMesa(mesa.numero)}.`);
      setElegido(null);
    } catch {
      /* se muestra abajo */
    }
  };

  return (
    <Pantalla titulo={formatearMesa(mesa.numero)} subtitulo="Veedor y actas" atras>
      <Seccion titulo="Veedor actual">
        <Tarjeta destacada={!!mesa.veedor}>
          {mesa.veedor ? (
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-circle" size={40} color={colores.marca} />
              <View className="flex-1">
                <Text className="text-tinta text-lg font-extrabold">
                  {mesa.veedor.nombres} {mesa.veedor.apellidos}
                </Text>
                <Text className="text-gris text-base">CI {mesa.veedor.cedula}</Text>
              </View>
            </View>
          ) : (
            <AvisoEstado tipo="alerta" titulo="Esta mesa no tiene veedor" mensaje="Elige uno de la lista o crea uno nuevo." />
          )}
        </Tarjeta>
      </Seccion>

      <Seccion titulo={mesa.veedor ? 'Reemplazar por' : 'Asignar a'}>
        {mesa.veedor ? (
          <Text className="text-gris text-base">El veedor saliente pierde el acceso a esta mesa; sus actas conservan su autoría y el cambio queda registrado.</Text>
        ) : null}
        {veedores.isLoading ? <Cargando /> : null}
        {candidatos.map((v) => {
          const activo = elegido === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => setElegido(activo ? null : v.id)}
              className={`flex-row items-center gap-3 rounded-2xl p-4 border-2 ${activo ? 'bg-marca-claro border-marca' : 'bg-white border-borde'}`}
            >
              <Ionicons name={activo ? 'radio-button-on' : 'radio-button-off'} size={24} color={colores.marca} />
              <View className="flex-1">
                <Text className="text-tinta text-base font-bold">
                  {v.nombres} {v.apellidos}
                </Text>
                <Text className="text-gris text-sm">{v.mesas.length ? `Ya cubre ${v.mesas.length} mesa(s)` : 'De reserva'}</Text>
              </View>
              {!v.verificado ? <Chip texto="Sin verificar" tono="alerta" /> : null}
            </Pressable>
          );
        })}
        {elegido ? (
          <Animated.View entering={FadeInDown}>
            <Boton titulo={mesa.veedor ? 'Confirmar reemplazo' : 'Confirmar asignación'} icono="checkmark" onPress={confirmar} cargando={asignar.isPending} textoCargando="Asignando…" />
          </Animated.View>
        ) : null}
        {asignar.isError ? <AvisoEstado tipo="error" titulo="No se asignó" mensaje={AppError.desde(asignar.error).message} /> : null}
        <Boton
          titulo="Persona nueva: crear y asignar"
          variante="secundario"
          icono="person-add"
          onPress={() => router.push({ pathname: '/veedor-nuevo', params: { mesaId: String(mesa.id), mesaNumero: String(mesa.numero) } })}
        />
      </Seccion>

      <Seccion titulo="Actas de la mesa">
        {DIGNIDADES.map((d) => {
          const acta = mesa.actas.find((a) => a.dignidad === d);
          return (
            <Tarjeta key={d}>
              <View className="flex-row items-center justify-between">
                <Text className="text-tinta text-lg font-extrabold">{NOMBRE_DIGNIDAD[d]}</Text>
                <ChipEstadoActa estado={acta ? 'enviada' : 'sin_registrar'} />
              </View>
              {acta ? (
                <View className="flex-row gap-2 mt-3">
                  <View className="flex-1">
                    <Boton titulo="Ver" variante="secundario" icono="eye" pequeno onPress={() => router.push({ pathname: '/acta/[id]', params: { id: acta.id } })} />
                  </View>
                  <View className="flex-1">
                    <Boton
                      titulo="Corregir"
                      icono="create"
                      pequeno
                      onPress={() => router.push({ pathname: '/registrar/[mesaId]/[dignidad]', params: { mesaId: String(mesa.id), dignidad: d } })}
                    />
                  </View>
                </View>
              ) : (
                <Text className="text-gris text-base mt-2">El veedor aún no la registra.</Text>
              )}
            </Tarjeta>
          );
        })}
      </Seccion>
    </Pantalla>
  );
}
