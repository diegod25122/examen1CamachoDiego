// Datos de la persona, cierre de sesión seguro (RNF-04) y prueba de monitoreo (RF-17)
import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Tarjeta, Dato, Seccion } from '@/shared/presentation/components/Basicos';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { casos, reporte } from '@/shared/di/contenedor';
import { Sentry } from '@/shared/infra/monitoreo/sentry';
import { NOMBRE_ROL, nombreCompleto } from '../../domain/entities/Perfil';
import { useSesionStore } from '../store/sesionStore';
import { clienteQuery } from '@/shared/presentation/query/clienteQuery';

export function CuentaScreen() {
  const perfil = useSesionStore((s) => s.perfil);
  const setPerfil = useSesionStore((s) => s.setPerfil);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [lanzarError, setLanzarError] = useState(false);

  if (lanzarError) {
    // Error de renderizado real: lo captura Sentry.wrap y queda la pantalla en el reporte
    throw new Error('Prueba de monitoreo: fallo provocado en la pantalla Mi cuenta');
  }
  if (!perfil) return null;

  const pedirCierre = async () => {
    const pendientes = await casos.cerrarSesion.pendientes();
    setConfirmar(pendientes);
  };

  const cerrar = async () => {
    setCerrando(true);
    try {
      await casos.cerrarSesion.ejecutar();
      clienteQuery.clear();
      setPerfil(null);
      router.replace('/login');
    } finally {
      setCerrando(false);
    }
  };

  return (
    <Pantalla titulo="Mi cuenta" subtitulo={NOMBRE_ROL[perfil.rol]}>
      <Tarjeta>
        <Text className="text-tinta text-xl font-extrabold mb-2">{nombreCompleto(perfil)}</Text>
        <Dato etiqueta="Cédula" valor={perfil.cedula} />
        <Dato etiqueta="Correo" valor={perfil.correo} />
        <Dato etiqueta="Teléfono" valor={perfil.telefono} />
        <Dato etiqueta="Rol" valor={NOMBRE_ROL[perfil.rol]} />
      </Tarjeta>

      <Seccion titulo="Sesión">
        {confirmar === null ? (
          <Boton titulo="Cerrar sesión" variante="secundario" icono="log-out" onPress={pedirCierre} />
        ) : (
          <View className="gap-3">
            <AvisoEstado
              tipo={confirmar > 0 ? 'alerta' : 'info'}
              titulo={confirmar > 0 ? `Tienes ${confirmar} acta(s) sin enviar` : '¿Cerrar sesión?'}
              mensaje={
                confirmar > 0
                  ? 'Se conservarán en el teléfono y se enviarán cuando vuelvas a ingresar. Se borrarán tus datos descargados.'
                  : 'Se borrarán del teléfono tu sesión y los datos descargados.'
              }
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Boton titulo="Cancelar" variante="secundario" onPress={() => setConfirmar(null)} />
              </View>
              <View className="flex-1">
                <Boton titulo="Sí, cerrar" variante="peligro" onPress={cerrar} cargando={cerrando} textoCargando="Cerrando…" />
              </View>
            </View>
          </View>
        )}
      </Seccion>

      <Seccion titulo="Monitoreo de errores">
        <Tarjeta>
          <Text className="text-gris text-base mb-3">
            Para la demostración: genera un reporte en Sentry con dispositivo, versión de Android, versión de la app y pantalla.
          </Text>
          <View className="gap-2">
            <Boton
              titulo="Enviar error no fatal"
              variante="secundario"
              icono="bug"
              pequeno
              onPress={() => {
                reporte.reportar(new Error('Prueba: la foto no se pudo subir (simulado)'), { operacion: 'subir_foto', datos: { prueba: true } });
                avisar('info', 'Reporte enviado a Sentry', 'Si no hay señal, se enviará al recuperarla.');
              }}
            />
            <Boton titulo="Provocar error en pantalla" variante="secundario" icono="warning" pequeno onPress={() => setLanzarError(true)} />
            <Boton titulo="Provocar cierre nativo" variante="peligro" icono="flash" pequeno onPress={() => Sentry.nativeCrash()} />
          </View>
        </Tarjeta>
      </Seccion>
    </Pantalla>
  );
}
