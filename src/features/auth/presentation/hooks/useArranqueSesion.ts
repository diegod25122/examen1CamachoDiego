// Carga la sesión guardada, escucha cambios y abre los enlaces del correo (ADR-09)
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { casos } from '@/shared/di/contenedor';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { AppError } from '@/shared/domain/AppError';
import { useSesionStore } from '../store/sesionStore';

async function recargarPerfil() {
  try {
    const perfil = await casos.cargarSesion.ejecutar();
    useSesionStore.getState().setPerfil(perfil);
    return perfil;
  } catch {
    useSesionStore.getState().setPerfil(null);
    return null;
  }
}

async function procesarEnlace(url: string | null) {
  if (!url || !/(access_token|code=|error_description)/.test(url)) return;
  try {
    const tipo = await casos.recuperar.abrirEnlace(url);
    if (!tipo) return;
    const perfil = await recargarPerfil();
    if (!perfil) {
      avisar('error', 'Tu cuenta no está habilitada', 'Pide a tu coordinador que revise tu acceso.');
      return;
    }
    if (tipo === 'recovery') {
      useSesionStore.getState().setModo('recuperacion');
      router.replace('/restablecer');
    } else {
      router.replace('/primer-acceso');
    }
  } catch (e) {
    avisar('error', 'El enlace no funcionó', AppError.desde(e).message + ' También puedes usar el código del correo.');
  }
}

export function useArranqueSesion() {
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let activo = true;

    (async () => {
      await casos.recuperarInterrumpidas(); // RNF-06
      await recargarPerfil();
      await procesarEnlace(await Linking.getInitialURL());
      if (activo) setListo(true);
    })();

    const subEnlaces = Linking.addEventListener('url', ({ url }) => procesarEnlace(url));
    const desuscribir = casos.alCambiarSesion((evento) => {
      if (evento === 'SIGNED_OUT') useSesionStore.getState().setPerfil(null);
      if (evento === 'PASSWORD_RECOVERY') useSesionStore.getState().setModo('recuperacion');
    });

    return () => {
      activo = false;
      subEnlaces.remove();
      desuscribir();
    };
  }, []);

  return listo;
}
