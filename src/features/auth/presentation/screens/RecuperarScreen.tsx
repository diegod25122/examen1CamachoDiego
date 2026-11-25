// RF-04: recuperación autónoma, sin llamar al coordinador
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { esquemaCodigo, esquemaCorreo, type DatosCodigo, type DatosCorreo } from '../../domain/validaciones/esquemas';
import { useSesionStore } from '../store/sesionStore';
import { EncabezadoMarca } from '../components/EncabezadoMarca';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';

export function RecuperarScreen() {
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setPerfil = useSesionStore((s) => s.setPerfil);
  const setModo = useSesionStore((s) => s.setModo);

  const fCorreo = useForm<DatosCorreo>({ resolver: zodResolver(esquemaCorreo), mode: 'onChange', defaultValues: { correo: '' } });
  const fCodigo = useForm<DatosCodigo>({ resolver: zodResolver(esquemaCodigo), mode: 'onChange', defaultValues: { correo: '', codigo: '' } });

  const enviar = fCorreo.handleSubmit(async ({ correo }) => {
    setError(null);
    try {
      await casos.recuperar.enviar(correo);
      setEnviadoA(correo);
      fCodigo.setValue('correo', correo, { shouldValidate: true });
    } catch (e) {
      setError(AppError.desde(e).message);
    }
  });

  const verificar = fCodigo.handleSubmit(async (d) => {
    setError(null);
    try {
      await casos.recuperar.verificarCodigo(d.correo, d.codigo, 'recovery');
      const p = await casos.cargarSesion.ejecutar();
      if (!p) throw new AppError('PERMISO', 'Tu cuenta no está habilitada.');
      setModo('recuperacion');
      setPerfil(p);
      router.replace('/restablecer');
    } catch (e) {
      setError(AppError.desde(e).message);
    }
  });

  return (
    <ScrollView className="flex-1 bg-fondo" keyboardShouldPersistTaps="handled">
      <EncabezadoMarca titulo="Recuperar acceso" subtitulo="Sin depender de nadie" />
      <View className="p-6 gap-5">
        {!enviadoA ? (
          <>
            <Text className="text-tinta text-lg">Escribe tu correo. Te enviaremos un enlace y un código para crear una contraseña nueva.</Text>
            <Controller
              control={fCorreo.control}
              name="correo"
              render={({ field }) => (
                <Campo
                  etiqueta="Correo"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fCorreo.formState.errors.correo?.message}
                />
              )}
            />
            {error ? <AvisoEstado tipo="error" titulo="No se envió el correo" mensaje={error} /> : null}
            <Boton titulo="Enviar correo" icono="mail" onPress={enviar} cargando={fCorreo.formState.isSubmitting} textoCargando="Enviando…" />
          </>
        ) : (
          <>
            <AvisoEstado tipo="exito" titulo="Correo enviado" mensaje={`Revisa ${enviadoA} (también la carpeta de spam). Toca el enlace o escribe aquí el código.`} />
            <Controller
              control={fCodigo.control}
              name="codigo"
              render={({ field }) => (
                <Campo
                  etiqueta="Código del correo"
                  keyboardType="number-pad"
                  maxLength={8}
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fCodigo.formState.errors.codigo?.message}
                />
              )}
            />
            {error ? <AvisoEstado tipo="error" titulo="Código no válido" mensaje={error} /> : null}
            <Boton titulo="Continuar" icono="arrow-forward" onPress={verificar} cargando={fCodigo.formState.isSubmitting} textoCargando="Verificando…" />
            <Boton titulo="Enviar de nuevo" variante="fantasma" onPress={() => setEnviadoA(null)} />
          </>
        )}
        <Boton titulo="Volver a ingresar" variante="fantasma" onPress={() => router.replace('/login')} />
      </View>
    </ScrollView>
  );
}
