// RF-03: verificar el correo y definir la contraseña propia en el primer acceso
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { esquemaCodigo, type DatosCodigo } from '../../domain/validaciones/esquemas';
import { useSesionStore } from '../store/sesionStore';
import { EncabezadoMarca } from '../components/EncabezadoMarca';
import { FormContrasena } from '../components/FormContrasena';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';
import { nombreCompleto } from '../../domain/entities/Perfil';

export function PrimerAccesoScreen() {
  const perfil = useSesionStore((s) => s.perfil);
  const setPerfil = useSesionStore((s) => s.setPerfil);
  const marcar = useSesionStore((s) => s.marcarContrasenaDefinida);
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DatosCodigo>({ resolver: zodResolver(esquemaCodigo), mode: 'onChange', defaultValues: { correo: '', codigo: '' } });

  const verificar = handleSubmit(async (d) => {
    setError(null);
    try {
      await casos.recuperar.verificarCodigo(d.correo, d.codigo, 'invite');
      const p = await casos.cargarSesion.ejecutar();
      if (!p) throw new AppError('PERMISO', 'Tu cuenta no está habilitada.');
      setPerfil(p);
    } catch (e) {
      setError(AppError.desde(e).message);
    }
  });

  return (
    <ScrollView className="flex-1 bg-fondo" keyboardShouldPersistTaps="handled">
      <EncabezadoMarca titulo="Primer acceso" subtitulo={perfil ? `Hola, ${nombreCompleto(perfil)}` : 'Activa tu cuenta'} />
      <View className="p-6 gap-5">
        {perfil ? (
          <>
            <AvisoEstado tipo="exito" titulo="Correo verificado" mensaje="Ahora crea tu contraseña. Solo tú la conocerás; ni quien creó tu cuenta la sabe." />
            <FormContrasena
              textoBoton="Guardar y entrar"
              alTerminar={() => {
                marcar();
                router.replace('/');
              }}
            />
          </>
        ) : (
          <>
            <Text className="text-tinta text-lg">Escribe tu correo y el código de 6 números que llegó en la invitación.</Text>
            <Controller
              control={control}
              name="correo"
              render={({ field }) => (
                <Campo etiqueta="Correo" keyboardType="email-address" autoCapitalize="none" value={field.value} onChangeText={field.onChange} error={errors.correo?.message} />
              )}
            />
            <Controller
              control={control}
              name="codigo"
              render={({ field }) => (
                <Campo
                  etiqueta="Código de invitación"
                  keyboardType="number-pad"
                  maxLength={8}
                  placeholder="12345678"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.codigo?.message}
                />
              )}
            />
            {error ? <AvisoEstado tipo="error" titulo="No se pudo verificar" mensaje={error} /> : null}
            <Boton titulo="Verificar correo" icono="shield-checkmark" onPress={verificar} cargando={isSubmitting} textoCargando="Verificando…" />
            <Boton titulo="Volver" variante="fantasma" onPress={() => router.replace('/login')} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
