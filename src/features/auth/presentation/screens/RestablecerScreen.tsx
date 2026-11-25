import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSesionStore } from '../store/sesionStore';
import { EncabezadoMarca } from '../components/EncabezadoMarca';
import { FormContrasena } from '../components/FormContrasena';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { Boton } from '@/shared/presentation/components/Boton';
import { avisar } from '@/shared/presentation/store/avisosStore';

export function RestablecerScreen() {
  const perfil = useSesionStore((s) => s.perfil);
  const marcar = useSesionStore((s) => s.marcarContrasenaDefinida);

  return (
    <ScrollView className="flex-1 bg-fondo" keyboardShouldPersistTaps="handled">
      <EncabezadoMarca titulo="Nueva contraseña" subtitulo="Recuperación de acceso" />
      <View className="p-6 gap-5">
        {perfil ? (
          <FormContrasena
            textoBoton="Guardar nueva contraseña"
            alTerminar={() => {
              marcar();
              avisar('exito', 'Contraseña actualizada', 'Ya puedes usar la aplicación.');
              router.replace('/');
            }}
          />
        ) : (
          <>
            <AvisoEstado tipo="alerta" titulo="El enlace no se abrió" mensaje="Pide el correo de recuperación y usa el código de 6 números." />
            <Boton titulo="Recuperar acceso" onPress={() => router.replace('/recuperar')} />
          </>
        )}
      </View>
    </ScrollView>
  );
}
