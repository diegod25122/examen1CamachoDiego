// RF-01: no existe autorregistro; solo ingresa quien fue habilitado
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { esquemaLogin, type DatosLogin } from '../../domain/validaciones/esquemas';
import { useSesionStore } from '../store/sesionStore';
import { EncabezadoMarca } from '../components/EncabezadoMarca';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { BarraConexion } from '@/shared/presentation/components/BarraConexion';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';

export function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const setPerfil = useSesionStore((s) => s.setPerfil);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosLogin>({ resolver: zodResolver(esquemaLogin), mode: 'onChange', defaultValues: { correo: '', contrasena: '' } });

  const ingresar = handleSubmit(async (d) => {
    setError(null);
    try {
      const perfil = await casos.iniciarSesion.ejecutar(d.correo, d.contrasena);
      setPerfil(perfil);
      router.replace('/');
    } catch (e) {
      setError(AppError.desde(e).message);
    }
  });

  return (
    <KeyboardAvoidingView className="flex-1 bg-fondo" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }}>
        <EncabezadoMarca titulo="Control Electoral" subtitulo="Movimiento Futuro Ciudadano · Pichincha" />
        <BarraConexion />
        <View className="p-6 gap-5">
          <Text className="text-tinta text-2xl font-extrabold">Ingresar</Text>
          <Controller
            control={control}
            name="correo"
            render={({ field }) => (
              <Campo
                etiqueta="Correo electrónico"
                placeholder="tucorreo@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.correo?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="contrasena"
            render={({ field }) => (
              <Campo
                etiqueta="Contraseña"
                esContrasena
                autoComplete="password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onSubmitEditing={ingresar}
                error={errors.contrasena?.message}
              />
            )}
          />
          {error ? <AvisoEstado tipo="error" titulo="No pudiste ingresar" mensaje={error} /> : null}
          <Boton titulo="Ingresar" icono="log-in" onPress={ingresar} cargando={isSubmitting} textoCargando="Verificando…" />

          <Pressable onPress={() => router.push('/recuperar')} className="py-2">
            <Text className="text-marca text-lg font-bold text-center">Olvidé mi contraseña</Text>
          </Pressable>
          <View className="bg-white rounded-2xl border border-borde p-4 gap-2">
            <Text className="text-tinta text-base font-bold">¿Es tu primera vez?</Text>
            <Text className="text-gris text-base">Tu coordinador te creó el acceso. Abre el correo de invitación o usa el código que llegó.</Text>
            <Boton titulo="Tengo un código de invitación" variante="secundario" icono="key" pequeno onPress={() => router.push('/primer-acceso')} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
