// RF-03 / RF-04: el titular escribe su propia contraseña (nadie más la conoce)
import { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { esquemaContrasena, type DatosContrasena } from '../../domain/validaciones/esquemas';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';

export function FormContrasena({ textoBoton, alTerminar }: { textoBoton: string; alTerminar: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<DatosContrasena>({
    resolver: zodResolver(esquemaContrasena),
    mode: 'onChange',
    defaultValues: { contrasena: '', confirmacion: '' },
  });

  const enviar = handleSubmit(async (d) => {
    setError(null);
    try {
      await casos.definirContrasena.ejecutar(d.contrasena);
      alTerminar();
    } catch (e) {
      setError(AppError.desde(e).message);
    }
  });

  return (
    <View className="gap-4">
      <Controller
        control={control}
        name="contrasena"
        render={({ field }) => (
          <Campo
            etiqueta="Nueva contraseña"
            esContrasena
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.contrasena?.message}
            ayuda="Mínimo 8 caracteres, con letras y números."
            autoComplete="new-password"
          />
        )}
      />
      <Controller
        control={control}
        name="confirmacion"
        render={({ field }) => (
          <Campo
            etiqueta="Repite la contraseña"
            esContrasena
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.confirmacion?.message}
          />
        )}
      />
      {error ? <AvisoEstado tipo="error" titulo="No se guardó la contraseña" mensaje={error} /> : null}
      {isSubmitting ? <AvisoEstado tipo="proceso" titulo="Guardando tu contraseña…" /> : null}
      <Boton titulo={textoBoton} icono="lock-closed" onPress={enviar} cargando={isSubmitting} textoCargando="Guardando…" deshabilitado={!isValid} />
    </View>
  );
}
