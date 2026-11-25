// RF-15: detalle del acta: resultados, foto ampliable, mapa con distancia,
// hora de captura y de recepción, veedor e historial (RF-12)
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Chip, Dato, Seccion, Tarjeta } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { formatearDistancia, formatearFecha, formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { NOMBRE_DIGNIDAD, type VersionActa } from '../../domain/entities/Acta';
import { useActaRemota, useCatalogo, useUrlFoto } from '../hooks/useActas';
import { MapaActa } from '../components/MapaActa';
import { MiniaturaFoto, VisorFoto } from '../components/FotoAmpliable';

export function ActaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const perfil = usePerfil();
  const acta = useActaRemota(id);
  const catalogo = useCatalogo();
  const foto = useUrlFoto(acta.data?.fotoPath);
  const [ampliada, setAmpliada] = useState<string | null>(null);

  const a = acta.data;
  const orgs = catalogo.data?.catalogo.organizaciones ?? [];
  const margen = catalogo.data?.catalogo.margenMetros ?? 200;
  const sigla = (orgId: string) => orgs.find((o) => String(o.id) === orgId)?.sigla ?? orgId;

  return (
    <View style={{ flex: 1 }}>
      <Pantalla
        titulo={a ? `Acta de ${NOMBRE_DIGNIDAD[a.dignidad]}` : 'Acta'}
        subtitulo={a ? `${formatearMesa(a.mesaNumero)} · ${a.recinto.nombre}` : undefined}
        atras
        alRefrescar={() => acta.refetch()}
        refrescando={acta.isRefetching}
      >
        {acta.isLoading ? <Cargando texto="Cargando acta…" /> : null}
        {acta.error ? <AvisoEstado tipo="error" titulo="No se cargó el acta" mensaje={AppError.desde(acta.error).message} /> : null}
        {a ? (
          <>
            <View className="flex-row flex-wrap gap-2">
              <Chip texto={`Versión ${a.version}`} tono="marca" icono="git-branch" />
              {a.fueraDeMargen ? (
                <Chip texto={`Fuera del margen · ${formatearDistancia(a.distanciaM)}`} tono="alerta" icono="location" />
              ) : (
                <Chip texto={`En el recinto · ${formatearDistancia(a.distanciaM)}`} tono="exito" icono="location" />
              )}
            </View>

            <Seccion titulo="Resultados">
              <Tarjeta>
                {orgs.map((o) => (
                  <View key={o.id} className="flex-row items-center py-2 border-b border-gris-claro gap-3">
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: o.color }} />
                    <View className="flex-1">
                      <Text className="text-tinta text-base font-bold">{o.sigla}</Text>
                      <Text className="text-gris text-sm">{o.candidatos[a.dignidad]}</Text>
                    </View>
                    <Text className="text-tinta text-xl font-extrabold">{a.votos[String(o.id)] ?? 0}</Text>
                  </View>
                ))}
                <Dato etiqueta="Nulos" valor={String(a.nulos)} />
                <Dato etiqueta="Blancos" valor={String(a.blancos)} />
                <Dato etiqueta="Total de sufragantes" valor={String(a.totalSufragantes)} />
              </Tarjeta>
            </Seccion>

            <Seccion titulo="Fotografía">
              <MiniaturaFoto uri={foto.data} cargando={foto.isLoading} onAmpliar={() => foto.data && setAmpliada(foto.data)} />
            </Seccion>

            <Seccion titulo="Ubicación del registro">
              <MapaActa
                recinto={a.recinto}
                acta={{ latitud: a.latitud, longitud: a.longitud }}
                margenMetros={margen}
                distanciaM={a.distanciaM}
                fueraDeMargen={a.fueraDeMargen}
              />
              <Tarjeta>
                <Dato etiqueta="Distancia al recinto" valor={formatearDistancia(a.distanciaM)} />
                <Dato etiqueta="Precisión GPS" valor={`±${Math.round(a.precisionM)} m`} />
                <Dato etiqueta="Coordenadas" valor={`${a.latitud.toFixed(5)}, ${a.longitud.toFixed(5)}`} />
              </Tarjeta>
            </Seccion>

            <Seccion titulo="Registro">
              <Tarjeta>
                <Dato etiqueta="Veedor" valor={a.registradoPor ? `${a.registradoPor.nombres} ${a.registradoPor.apellidos}` : '—'} />
                <Dato etiqueta="Cédula" valor={a.registradoPor?.cedula ?? '—'} />
                <Dato etiqueta="Hora de captura (teléfono)" valor={formatearFecha(a.capturadoEn)} />
                <Dato etiqueta="Hora de recepción (servidor)" valor={formatearFecha(a.recibidoEn)} />
                {a.actualizadoEn ? <Dato etiqueta="Última corrección" valor={formatearFecha(a.actualizadoEn)} /> : null}
              </Tarjeta>
            </Seccion>

            <Seccion titulo="Historial">
              {a.versiones.map((v) => (
                <TarjetaVersion key={v.version} v={v} sigla={sigla} />
              ))}
            </Seccion>

            {perfil?.rol === 'coordinador_recinto' ? (
              <Boton
                titulo="Corregir esta acta"
                icono="create"
                onPress={() => router.push({ pathname: '/registrar/[mesaId]/[dignidad]', params: { mesaId: String(a.mesaId), dignidad: a.dignidad } })}
              />
            ) : null}
          </>
        ) : null}
      </Pantalla>
      {ampliada ? <VisorFoto uri={ampliada} onCerrar={() => setAmpliada(null)} /> : null}
    </View>
  );
}

function TarjetaVersion({ v, sigla }: { v: VersionActa; sigla: (id: string) => string }) {
  const cambios: string[] = [];
  if (v.anteriores) {
    for (const [org, n] of Object.entries(v.nuevos.votos)) {
      const antes = v.anteriores.votos[org];
      if (antes !== n) cambios.push(`${sigla(org)}: ${antes} → ${n}`);
    }
    if (v.anteriores.nulos !== v.nuevos.nulos) cambios.push(`Nulos: ${v.anteriores.nulos} → ${v.nuevos.nulos}`);
    if (v.anteriores.blancos !== v.nuevos.blancos) cambios.push(`Blancos: ${v.anteriores.blancos} → ${v.nuevos.blancos}`);
    if (v.anteriores.total_sufragantes !== v.nuevos.total_sufragantes)
      cambios.push(`Total: ${v.anteriores.total_sufragantes} → ${v.nuevos.total_sufragantes}`);
  }
  if (v.fotoAnterior) cambios.push('Foto reemplazada (la anterior se conserva)');

  return (
    <Tarjeta>
      <View className="flex-row items-center justify-between">
        <Text className="text-tinta text-base font-extrabold">
          v{v.version} · {v.operacion === 'creacion' ? 'Registro' : 'Corrección'}
        </Text>
        <Text className="text-gris text-sm">{formatearFecha(v.realizadoEn)}</Text>
      </View>
      <Text className="text-gris text-sm">
        Por CI {v.cedula}
        {v.latitud != null && v.longitud != null ? ` · desde ${v.latitud.toFixed(4)}, ${v.longitud.toFixed(4)}` : ' · sin ubicación'}
      </Text>
      {cambios.map((c) => (
        <Text key={c} className="text-tinta text-base mt-1">
          • {c}
        </Text>
      ))}
    </Tarjeta>
  );
}
