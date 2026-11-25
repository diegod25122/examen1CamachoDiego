// RF-02 (creación jerárquica) y RF-07 (veedor nuevo creado en el momento)
import { Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Campo } from '@/shared/presentation/components/Campo';
import { Boton } from '@/shared/presentation/components/Boton';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { Tarjeta } from '@/shared/presentation/components/Basicos';
import { useConexionStore } from '@/shared/presentation/store/conexionStore';
import { avisar } from '@/shared/presentation/store/avisosStore';
import { AppError } from '@/shared/domain/AppError';
import { usePerfil } from '@/features/auth/presentation/store/sesionStore';
import { esquemaPersona, type DatosPersona } from '../../domain/validaciones/esquemaPersona';
import { useCrearCuenta } from '../hooks/usePersonal';

export function NuevaCuentaScreen() {
  const perfil = usePerfil();
  const { recintoId, mesaId, mesaNumero, recintoNombre } = useLocalSearchParams<{
    recintoId?: string;
    mesaId?: string;
    mesaNumero?: string;
    recintoNombre?: string;
  }>();
  const enLinea = useConexionStore((s) => s.enLinea);
  const crear = useCrearCuenta();
  const esVeedor = perfil?.rol === 'coordinador_recinto';

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<DatosPersona>({
    resolver: zodResolver(esquemaPersona),
    mode: 'onChange',
    defaultValues: { cedula: '', nombres: '', apellidos: '', telefono: '', correo: '' },
  });

  const enviar = handleSubmit(async (d) => {
    try {
      const r = await crear.mutateAsync({
        ...d,
        recintoId: recintoId ? Number(recintoId) : null,
        mesaId: mesaId ? Number(mesaId) : null,
      });
      avisar('exito', 'Cuenta creada', r.mensaje);
      reset();
      if (mesaId || recintoId) router.back();
    } catch {
      /* el error se muestra abajo */
    }
  });

  const titulo = esVeedor ? (mesaId ? 'Veedor nuevo para la mesa' : 'Nuevo veedor') : 'Nuevo coordinador de recinto';
  const subtitulo = mesaNumero ? `Mesa ${String(mesaNumero).padStart(3, '0')}` : recintoNombre ?? undefined;

  const campos: { nombre: keyof DatosPersona; etiqueta: string; teclado?: 'number-pad' | 'phone-pad' | 'email-address'; ayuda?: string; max?: number }[] = [
    { nombre: 'cedula', etiqueta: 'Cédula', teclado: 'number-pad', ayuda: '10 dígitos, sin guion', max: 10 },
    { nombre: 'nombres', etiqueta: 'Nombres completos' },
    { nombre: 'apellidos', etiqueta: 'Apellidos completos' },
    { nombre: 'telefono', etiqueta: 'Teléfono', teclado: 'phone-pad', ayuda: 'Ej: 0991234567', max: 10 },
    { nombre: 'correo', etiqueta: 'Correo electrónico', teclado: 'email-address', ayuda: 'Debe ser un correo real: llegará la invitación' },
  ];

  return (
    <Pantalla titulo={titulo} subtitulo={subtitulo} atras>
      <Tarjeta>
        <Text className="text-gris text-base">
          La persona recibirá un correo para verificarlo y crear su propia contraseña. Tú no la conocerás.
          {esVeedor ? ' Hasta verificar el correo no podrá registrar actas (S-05).' : ''}
        </Text>
      </Tarjeta>
      {campos.map((c) => (
        <Controller
          key={c.nombre}
          control={control}
          name={c.nombre}
          render={({ field }) => (
            <Campo
              etiqueta={c.etiqueta}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType={c.teclado}
              autoCapitalize={c.nombre === 'correo' ? 'none' : 'words'}
              maxLength={c.max}
              ayuda={c.ayuda}
              error={errors[c.nombre]?.message}
            />
          )}
        />
      ))}
      {!enLinea ? <AvisoEstado tipo="sinSenal" titulo="Necesitas conexión" mensaje="Crear cuentas requiere internet (S-11)." /> : null}
      {crear.isPending ? <AvisoEstado tipo="proceso" titulo="Creando la cuenta y enviando la invitación…" /> : null}
      {crear.isError ? <AvisoEstado tipo="error" titulo="No se creó la cuenta" mensaje={AppError.desde(crear.error).message} /> : null}
      {crear.isSuccess && !mesaId && !recintoId ? (
        <AvisoEstado tipo="exito" titulo="Invitación enviada" mensaje={crear.data.mensaje} />
      ) : null}
      <View className="mt-1">
        <Boton
          titulo={mesaId ? 'Crear y asignar a la mesa' : 'Crear cuenta y enviar invitación'}
          icono="person-add"
          onPress={enviar}
          cargando={crear.isPending}
          textoCargando="Creando…"
          deshabilitado={!isValid || !enLinea}
        />
      </View>
    </Pantalla>
  );
}
