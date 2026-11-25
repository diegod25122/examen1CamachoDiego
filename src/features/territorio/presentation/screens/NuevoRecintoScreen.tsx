// RF-05: agregar recintos nuevos (sin duplicados)
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { SelectorOpciones } from '@/shared/presentation/components/Basicos';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { AppError } from '@/shared/domain/AppError';
import { casos } from '@/shared/di/contenedor';
import { esquemaRecinto, type DatosRecinto } from '../../domain/validaciones/esquemaRecinto';
import { useCrearRecinto, useParroquias } from '../hooks/useTerritorio';

const aNumero = (t: string) => {
  const limpio = t.replace(',', '.').trim();
  return limpio === '' || limpio === '-' ? (undefined as unknown as number) : Number(limpio);
};

export function NuevoRecintoScreen() {
  const parroquias = useParroquias();
  const crear = useCrearRecinto();
  const [ubicando, setUbicando] = useState(false);
  const [textos, setTextos] = useState({ latitud: '', longitud: '', numeroMesas: '3' });

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
  } = useForm<DatosRecinto>({
    resolver: zodResolver(esquemaRecinto),
    mode: 'onChange',
    defaultValues: { parroquiaId: 0, nombre: '', numeroMesas: 3 },
  });

  const usarMiUbicacion = async () => {
    setUbicando(true);
    try {
      const u = await casos.evidencia.ubicacion();
      setTextos((t) => ({ ...t, latitud: String(u.latitud), longitud: String(u.longitud) }));
      setValue('latitud', u.latitud, { shouldValidate: true });
      setValue('longitud', u.longitud, { shouldValidate: true });
    } catch (e) {
      avisar('error', 'Sin ubicación', AppError.desde(e).message);
    } finally {
      setUbicando(false);
    }
  };

  const guardar = handleSubmit(async (d) => {
    try {
      await crear.mutateAsync(d);
      avisar('exito', 'Recinto agregado', `${d.nombre} con ${d.numeroMesas} mesas.`);
      router.back();
    } catch {
      /* se muestra abajo */
    }
  });

  return (
    <Pantalla titulo="Nuevo recinto" atras>
      <Text className="text-tinta text-base font-bold">Parroquia</Text>
      <Controller
        control={control}
        name="parroquiaId"
        render={({ field }) => (
          <SelectorOpciones
            opciones={(parroquias.data ?? []).map((p) => ({ valor: p.id, texto: p.nombre }))}
            valor={field.value}
            onCambiar={(v) => field.onChange(v)}
          />
        )}
      />
      {errors.parroquiaId ? <Text className="text-error text-base">{errors.parroquiaId.message}</Text> : null}
      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <Campo etiqueta="Nombre del recinto" value={field.value} onChangeText={field.onChange} error={errors.nombre?.message} autoCapitalize="words" />
        )}
      />
      <View className="flex-row gap-3">
        {(['latitud', 'longitud'] as const).map((k) => (
          <View key={k} className="flex-1">
            <Controller
              control={control}
              name={k}
              render={({ field }) => (
                <Campo
                  etiqueta={k === 'latitud' ? 'Latitud' : 'Longitud'}
                  keyboardType="numbers-and-punctuation"
                  value={textos[k]}
                  onChangeText={(t) => {
                    setTextos((s) => ({ ...s, [k]: t }));
                    field.onChange(aNumero(t));
                  }}
                  error={errors[k]?.message}
                />
              )}
            />
          </View>
        ))}
      </View>
      <Boton titulo="Usar mi ubicación actual" variante="secundario" icono="locate" onPress={usarMiUbicacion} cargando={ubicando} textoCargando="Buscando GPS…" pequeno />
      <Controller
        control={control}
        name="numeroMesas"
        render={({ field }) => (
          <Campo
            etiqueta="Número de mesas (JRV)"
            keyboardType="number-pad"
            value={textos.numeroMesas}
            onChangeText={(t) => {
              setTextos((s) => ({ ...s, numeroMesas: t }));
              field.onChange(aNumero(t));
            }}
            error={errors.numeroMesas?.message}
          />
        )}
      />
      {crear.isError ? <AvisoEstado tipo="error" titulo="No se guardó el recinto" mensaje={AppError.desde(crear.error).message} /> : null}
      <Boton titulo="Guardar recinto" icono="save" onPress={guardar} cargando={crear.isPending} textoCargando="Guardando…" deshabilitado={!isValid} />
    </Pantalla>
  );
}
