// RF-08 a RF-14: registro y corrección del acta con validación inmediata,
// foto nítida, ubicación GPS, guardado sin conexión y estado visible.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Text, View, type TextInput } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, Chip, Seccion, Tarjeta } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado, type TipoEstado } from '@/shared/presentation/components/AvisoEstado';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';
import { colores } from '@/shared/presentation/colores';
import { formatearDistancia, formatearFecha, formatearMesa } from '@/shared/presentation/hooks/useFormatos';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import type { Perfil } from '@/features/auth/domain/entities/Perfil';
import type { Catalogo } from '@/features/catalogo/domain/Catalogo';
import { useMesasRecinto, useMisMesas, useRecinto } from '@/features/territorio/presentation/hooks/useTerritorio';
import { NOMBRE_DIGNIDAD, type ActaLocal, type ActaRemota, type Dignidad, type Ubicacion } from '../../domain/entities/Acta';
import { sumaActa } from '../../domain/validaciones/reglasActa';
import { crearEsquemaActa, type DatosActa } from '../../domain/validaciones/esquemaActa';
import { evaluarUbicacion } from '../../domain/servicios/distancia';
import { useActaDeMesa, useCatalogo, useUrlFoto } from '../hooks/useActas';
import { actualizarContadores, sincronizarAhora } from '../hooks/useSincronizacion';
import { CamaraActa } from '../components/CamaraActa';
import { CampoNumero } from '../components/CampoNumero';
import { ResumenSuma } from '../components/ResumenSuma';
import { ChipEstadoActa } from '../components/EstadoActa';

type Geo = { nombre: string; latitud: number; longitud: number };

export function RegistroActaScreen() {
  const params = useLocalSearchParams<{ mesaId: string; dignidad: string }>();
  const mesaId = Number(params.mesaId);
  const dignidad: Dignidad = params.dignidad === 'prefectura' ? 'prefectura' : 'alcaldia';
  const perfil = usePerfil();
  const esVeedor = perfil?.rol === 'veedor';

  const catalogo = useCatalogo();
  const misMesas = useMisMesas(esVeedor);
  const mesasRecinto = useMesasRecinto(esVeedor ? null : perfil?.recintoId);
  const recinto = useRecinto(esVeedor ? null : perfil?.recintoId);
  const remota = useActaDeMesa(mesaId, dignidad);
  const local = useQuery({
    queryKey: ['actas', 'local', mesaId, dignidad],
    queryFn: () => casos.consultarActas.local(perfil!.id, mesaId, dignidad),
    enabled: !!perfil,
    staleTime: 0,
    gcTime: 0,
  });

  const mesaV = misMesas.data?.mesas.find((x) => x.id === mesaId);
  const mesaC = mesasRecinto.data?.find((x) => x.id === mesaId);
  const mesaNumero = mesaV?.numero ?? mesaC?.numero ?? 0;
  const geo: Geo | null = mesaV
    ? mesaV.recinto
    : recinto.data
      ? { nombre: recinto.data.nombre, latitud: recinto.data.latitud, longitud: recinto.data.longitud }
      : null;
  const enServidor = !!(mesaV ?? mesaC)?.actas.some((a) => a.dignidad === dignidad);

  const titulo = `Acta de ${NOMBRE_DIGNIDAD[dignidad]}`;
  const subtitulo = mesaNumero ? `${formatearMesa(mesaNumero)}${geo ? ` · ${geo.nombre}` : ''}` : undefined;

  const cargando = catalogo.isLoading || local.isLoading || remota.isLoading || (esVeedor ? misMesas.isLoading : mesasRecinto.isLoading || recinto.isLoading);
  if (!perfil || cargando) {
    return (
      <Pantalla titulo={titulo} atras>
        <Cargando texto="Preparando el acta…" />
      </Pantalla>
    );
  }
  if (!catalogo.data || !geo) {
    return (
      <Pantalla titulo={titulo} subtitulo={subtitulo} atras>
        <AvisoEstado tipo="sinSenal" titulo="Faltan datos descargados" mensaje="Conéctate una vez para descargar tus mesas, organizaciones y candidatos." />
      </Pantalla>
    );
  }
  if (!esVeedor && !remota.data) {
    return (
      <Pantalla titulo={titulo} subtitulo={subtitulo} atras>
        <AvisoEstado tipo="info" titulo="El veedor aún no registra esta acta" mensaje="Cuando llegue podrás revisarla y corregirla." />
      </Pantalla>
    );
  }
  if (enServidor && !remota.data && !local.data) {
    return (
      <Pantalla titulo={titulo} subtitulo={subtitulo} atras>
        <AvisoEstado tipo="sinSenal" titulo="Esta acta ya fue enviada" mensaje="Para corregirla necesitas conexión, así se cargan los valores registrados." />
      </Pantalla>
    );
  }

  return (
    <EditorActa
      perfil={perfil}
      mesaId={mesaId}
      mesaNumero={mesaNumero}
      dignidad={dignidad}
      geo={geo}
      catalogo={catalogo.data.catalogo}
      local={local.data ?? null}
      remota={remota.data ?? null}
      titulo={titulo}
      subtitulo={subtitulo}
    />
  );
}

type PropsEditor = {
  perfil: Perfil;
  mesaId: number;
  mesaNumero: number;
  dignidad: Dignidad;
  geo: Geo;
  catalogo: Catalogo;
  local: ActaLocal | null;
  remota: ActaRemota | null;
  titulo: string;
  subtitulo?: string;
};

type Resultado = { tipo: TipoEstado; titulo: string; mensaje?: string; final?: boolean };

function EditorActa({ perfil, mesaId, mesaNumero, dignidad, geo, catalogo, local, remota, titulo, subtitulo }: PropsEditor) {
  const qc = useQueryClient();
  const enLinea = useConexionStore((s) => s.enLinea);
  const orgs = catalogo.organizaciones;
  const siglas = orgs.map((o) => o.sigla);
  const esquema = useMemo(() => crearEsquemaActa(siglas), [siglas.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  const esCorreccion = !!remota || local?.estado === 'enviada' || local?.operacion === 'corregir';

  // Valores iniciales: primero lo del teléfono (borrador/pendiente), luego lo del servidor
  const valoresIniciales = useMemo(() => {
    const desdeLocal = local?.votos ? local : null;
    const votos = (id: number) => (desdeLocal ? desdeLocal.votos?.[String(id)] : remota?.votos[String(id)]);
    return {
      votos: orgs.map((o) => votos(o.id)),
      nulos: desdeLocal ? desdeLocal.nulos ?? undefined : remota?.nulos,
      blancos: desdeLocal ? desdeLocal.blancos ?? undefined : remota?.blancos,
      totalSufragantes: desdeLocal ? desdeLocal.totalSufragantes ?? undefined : remota?.totalSufragantes,
    } as unknown as DatosActa;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    control,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<DatosActa>({ resolver: zodResolver(esquema), mode: 'onChange', defaultValues: valoresIniciales });
  const valores = useWatch({ control }) as Partial<DatosActa>;
  const suma = sumaActa({ votos: (valores.votos ?? []).map((v) => v ?? 0), nulos: valores.nulos ?? 0, blancos: valores.blancos ?? 0 });

  // Evidencia
  const [camara, setCamara] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [revision, setRevision] = useState<{ uri: string; nitida: boolean; mensaje: string; varianza: number } | null>(null);
  const [fotoNueva, setFotoNueva] = useState<string | null>(null);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(esCorreccion ? null : local?.ubicacion ?? null);
  const [ubicando, setUbicando] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
  const fotoLocalVigente = local && (local.estado === 'borrador' || local.estado === 'pendiente') ? local.fotoLocal : null;
  const urlRemota = useUrlFoto(!fotoNueva && !fotoLocalVigente ? remota?.fotoPath : null);
  const fotoActual = fotoNueva ?? fotoLocalVigente ?? urlRemota.data ?? null;
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false);
  const [autoguardado, setAutoguardado] = useState<string | null>(null);
  const campos = useRef<(TextInput | null)[]>([]);

  const ubicacionEvaluada = ubicacion ? evaluarUbicacion(ubicacion, geo, catalogo.margenMetros) : null;

  const obtenerUbicacion = async () => {
    setUbicando(true);
    setErrorUbicacion(null);
    try {
      setUbicacion(await casos.evidencia.ubicacion());
    } catch (e) {
      setErrorUbicacion(AppError.desde(e).message);
    } finally {
      setUbicando(false);
    }
  };

  const alCapturar = async (uri: string) => {
    setCamara(false);
    setAnalizando(true);
    try {
      const r = await casos.evidencia.evaluarFoto(uri);
      setRevision({ uri, ...r });
    } catch (e) {
      setResultado({ tipo: 'error', titulo: 'No se pudo revisar la foto', mensaje: AppError.desde(e).message });
    } finally {
      setAnalizando(false);
    }
  };

  const aceptarFoto = async () => {
    if (!revision) return;
    setAnalizando(true);
    try {
      const final = await casos.evidencia.prepararFoto(revision.uri);
      setFotoNueva(final);
      setRevision(null);
      if (!esCorreccion && !ubicacion) obtenerUbicacion();
    } catch (e) {
      setResultado({ tipo: 'error', titulo: 'No se guardó la foto', mensaje: AppError.desde(e).message });
    } finally {
      setAnalizando(false);
    }
  };

  const repetirFoto = () => {
    if (revision) casos.evidencia.descartar(revision.uri);
    setRevision(null);
    setCamara(true);
  };

  // Primera captura: pide la ubicación en cuanto se abre un acta nueva
  useEffect(() => {
    if (!esCorreccion && !ubicacion) obtenerUbicacion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // RNF-06: autoguardado del borrador; una captura interrumpida se puede retomar
  const puedeAutoguardar = !esCorreccion && (!local || local.estado === 'borrador') && !resultado?.final;
  useEffect(() => {
    if (!puedeAutoguardar || (!isDirty && !fotoNueva && !ubicacion)) return;
    const t = setTimeout(async () => {
      if (guardandoRef.current) return;
      try {
        await casos.guardarActa.ejecutar({
          usuarioId: perfil.id,
          mesaId,
          dignidad,
          organizaciones: orgs,
          valores: valores as DatosActa,
          fotoLocal: fotoNueva,
          ubicacion,
          existente: null,
          soloBorrador: true,
        });
        setAutoguardado(new Date().toISOString());
      } catch {
        /* el autoguardado nunca interrumpe a la persona */
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [JSON.stringify(valores), fotoNueva, ubicacion, puedeAutoguardar]); // eslint-disable-line react-hooks/exhaustive-deps

  const enviar = handleSubmit(async (v) => {
    if (guardandoRef.current) return; // RNF-05: varios toques no duplican
    guardandoRef.current = true;
    setGuardando(true);
    setResultado({ tipo: 'proceso', titulo: 'Guardando en el teléfono…' });
    try {
      let edicion: { latitud: number; longitud: number } | null = null;
      if (esCorreccion) {
        try {
          const u = await casos.evidencia.ubicacion();
          edicion = { latitud: u.latitud, longitud: u.longitud };
        } catch {
          /* se registra la corrección aunque no haya GPS */
        }
      }
      const r = await casos.guardarActa.ejecutar({
        usuarioId: perfil.id,
        mesaId,
        dignidad,
        organizaciones: orgs,
        valores: v,
        fotoLocal: fotoNueva,
        ubicacion,
        existente: remota,
        edicion,
      });
      await actualizarContadores();
      if (r.acta.estado === 'borrador') {
        setResultado({ tipo: 'alerta', titulo: 'Guardada como borrador', mensaje: `${r.faltantes.join('. ')}. No se enviará hasta completarla.` });
        return;
      }
      if (!useConexionStore.getState().enLinea) {
        setResultado({ tipo: 'sinSenal', titulo: 'Guardada en el teléfono', mensaje: 'No hay señal. Se enviará sola cuando vuelva; puedes cerrar la app.', final: true });
        return;
      }
      setResultado({ tipo: 'proceso', titulo: 'Enviando al servidor…', mensaje: 'Subiendo la foto y los resultados.' });
      await sincronizarAhora();
      let final = await casos.consultarActas.local(perfil.id, mesaId, dignidad);
      if (final?.estado === 'pendiente') {
        await sincronizarAhora();
        final = await casos.consultarActas.local(perfil.id, mesaId, dignidad);
      }
      if (final?.estado === 'enviada') {
        setResultado({
          tipo: 'exito',
          titulo: esCorreccion ? 'Corrección enviada' : 'Acta enviada',
          mensaje: esCorreccion ? 'Quedó registrada en el historial con tu cédula, fecha y ubicación.' : 'El servidor la recibió.',
          final: true,
        });
      } else if (final?.estado === 'error') {
        setResultado({ tipo: 'error', titulo: 'El servidor no aceptó el acta', mensaje: final.mensajeError ?? 'Revisa los valores.' });
      } else {
        setResultado({ tipo: 'sinSenal', titulo: 'Guardada en el teléfono', mensaje: final?.mensajeError ?? 'Se enviará sola cuando mejore la señal.', final: true });
      }
    } catch (e) {
      setResultado({ tipo: 'error', titulo: 'No se pudo guardar', mensaje: AppError.desde(e).message });
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
      qc.invalidateQueries({ queryKey: ['actas'] });
      qc.invalidateQueries({ queryKey: ['mesas'] });
    }
  });

    const tieneFoto = !!fotoActual || !!remota?.fotoPath || !!local?.fotoPath;
  const listoParaEnviar = isValid && tieneFoto && (esCorreccion || !!ubicacion);
  const estadoLocal = local?.estado;

  return (
    <View style={{ flex: 1 }}>
      <Pantalla
        titulo={esCorreccion ? `Corregir ${titulo.toLowerCase()}` : titulo}
        subtitulo={subtitulo}
        atras
        pie={
          resultado?.final ? (
            <Boton titulo="Volver" icono="arrow-back" onPress={() => router.back()} />
          ) : (
            <Boton
              titulo={esCorreccion ? 'Guardar corrección' : 'Guardar y enviar'}
              icono="cloud-upload"
              onPress={enviar}
              cargando={guardando}
              textoCargando={enLinea ? 'Enviando…' : 'Guardando…'}
              deshabilitado={!listoParaEnviar}
            />
          )
        }
      >
        {estadoLocal && estadoLocal !== 'enviada' ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-gris text-base">Estado en el teléfono:</Text>
            <ChipEstadoActa estado={estadoLocal} />
          </View>
        ) : null}
        {local?.estado === 'error' && local.mensajeError ? <AvisoEstado tipo="error" titulo="El último envío falló" mensaje={local.mensajeError} /> : null}
        {esCorreccion ? (
          <AvisoEstado tipo="info" titulo="Estás corrigiendo un acta" mensaje="Los valores anteriores, tu cédula, la hora y tu ubicación quedarán en el historial. La foto y ubicación originales no cambian." />
        ) : null}

        <Seccion titulo="1. Votos por organización">
          <Text className="text-gris text-base -mt-1">Copia los números en el mismo orden del acta física.</Text>
          {orgs.map((o, i) => (
            <Controller
              key={o.id}
              control={control}
              name={`votos.${i}` as const}
              render={({ field }) => (
                <CampoNumero
                  ref={(r) => {
                    campos.current[i] = r;
                  }}
                  etiqueta={`${o.sigla} · ${o.candidatos[dignidad]}`}
                  detalle={o.nombre}
                  color={o.color}
                  valor={field.value}
                  onCambiar={field.onChange}
                  onSiguiente={() => campos.current[i + 1]?.focus()}
                  error={errors.votos?.[i]?.message}
                />
              )}
            />
          ))}
          {(['nulos', 'blancos'] as const).map((k, j) => (
            <Controller
              key={k}
              control={control}
              name={k}
              render={({ field }) => (
                <CampoNumero
                  ref={(r) => {
                    campos.current[orgs.length + j] = r;
                  }}
                  etiqueta={k === 'nulos' ? 'Votos nulos' : 'Votos en blanco'}
                  color={colores.gris}
                  valor={field.value}
                  onCambiar={field.onChange}
                  onSiguiente={() => campos.current[orgs.length + j + 1]?.focus()}
                  error={errors[k]?.message}
                />
              )}
            />
          ))}
          <Controller
            control={control}
            name="totalSufragantes"
            render={({ field }) => (
              <CampoNumero
                ref={(r) => {
                  campos.current[orgs.length + 2] = r;
                }}
                etiqueta="Total de sufragantes"
                detalle="Personas que votaron en la mesa"
                destacado
                valor={field.value}
                onCambiar={field.onChange}
                error={errors.totalSufragantes?.message}
              />
            )}
          />
          <ResumenSuma suma={suma} total={valores.totalSufragantes} />
        </Seccion>

        <Seccion titulo="2. Fotografía del acta">
          {analizando ? <AvisoEstado tipo="proceso" titulo="Revisando la nitidez de la foto…" /> : null}
          {revision ? (
            <View className="gap-3">
              <Image source={{ uri: revision.uri }} style={{ width: '100%', height: 280, borderRadius: 24 }} resizeMode="cover" />
              <AvisoEstado
                tipo={revision.nitida ? 'exito' : 'error'}
                titulo={revision.nitida ? 'Foto nítida' : 'Foto borrosa: no se puede usar'}
                mensaje={revision.mensaje}
              />
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Boton titulo="Repetir" variante="secundario" icono="refresh" onPress={repetirFoto} />
                </View>
                {revision.nitida ? (
                  <View className="flex-1">
                    <Boton titulo="Usar foto" icono="checkmark" onPress={aceptarFoto} cargando={analizando} textoCargando="Guardando…" />
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <>
              {fotoActual ? (
                <View className="gap-2">
                  <Image source={{ uri: fotoActual }} style={{ width: '100%', height: 220, borderRadius: 24 }} resizeMode="cover" />
                  <Chip texto={fotoNueva ? 'Foto nueva lista' : 'Foto registrada'} tono="exito" icono="checkmark-circle" />
                </View>
              ) : null}
              <Boton
                titulo={fotoActual ? (esCorreccion ? 'Reemplazar foto' : 'Tomar otra foto') : 'Tomar foto del acta'}
                variante={fotoActual ? 'secundario' : 'acento'}
                icono="camera"
                onPress={() => setCamara(true)}
              />
              {esCorreccion && fotoNueva ? <Text className="text-gris text-sm">La foto anterior se conserva en el historial.</Text> : null}
            </>
          )}
        </Seccion>

        {!esCorreccion ? (
          <Seccion titulo="3. Ubicación">
            {ubicando ? <AvisoEstado tipo="proceso" titulo="Buscando tu ubicación GPS…" mensaje="Bajo techo puede tardar unos segundos." /> : null}
            {errorUbicacion ? (
              <AvisoEstado tipo="error" titulo="Sin ubicación" mensaje={errorUbicacion} accion={{ titulo: 'Reintentar', onPress: obtenerUbicacion }} />
            ) : null}
            {ubicacion && ubicacionEvaluada ? (
              <Tarjeta>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="location" size={24} color={ubicacionEvaluada.fueraDeMargen ? colores.alerta : colores.exito} />
                  <Text className="text-tinta text-lg font-bold flex-1">
                    A {formatearDistancia(ubicacionEvaluada.distanciaM)} del recinto
                  </Text>
                </View>
                <Text className="text-gris text-sm mt-1">
                  Precisión ±{ubicacion.precisionM} m · {formatearFecha(ubicacion.capturadoEn)}
                </Text>
                {ubicacionEvaluada.fueraDeMargen ? (
                  <View className="mt-2">
                    <AvisoEstado
                      tipo="alerta"
                      titulo="Fuera del margen del recinto"
                      mensaje={`El margen es de ${catalogo.margenMetros} m. El acta se enviará marcada para revisión.`}
                    />
                  </View>
                ) : (
                  <View className="mt-2">
                    <Chip texto="Dentro del margen del recinto" tono="exito" icono="checkmark-circle" />
                  </View>
                )}
                <View className="mt-2 self-start">
                  <Boton titulo="Actualizar ubicación" variante="fantasma" icono="locate" pequeno onPress={obtenerUbicacion} />
                </View>
              </Tarjeta>
            ) : null}
          </Seccion>
        ) : null}

        {!listoParaEnviar && !resultado ? (
          <Tarjeta>
            <Text className="text-tinta text-base font-bold mb-1">Para enviar falta:</Text>
            {!isValid ? <Text className="text-gris text-base">• Que los valores estén completos y cuadren</Text> : null}
            {!tieneFoto ? <Text className="text-gris text-base">• La foto nítida del acta</Text> : null}
            {!esCorreccion && !ubicacion ? <Text className="text-gris text-base">• La ubicación GPS (sin ella queda como borrador)</Text> : null}
          </Tarjeta>
        ) : null}
        {autoguardado && !resultado ? <Text className="text-gris text-sm text-center">Borrador guardado en el teléfono · {formatearFecha(autoguardado)}</Text> : null}
        {resultado ? <AvisoEstado tipo={resultado.tipo} titulo={resultado.titulo} mensaje={resultado.mensaje} /> : null}
      </Pantalla>

      {camara ? <CamaraActa onCapturada={alCapturar} onCancelar={() => setCamara(false)} /> : null}
    </View>
  );
}
