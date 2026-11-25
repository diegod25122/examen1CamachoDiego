// RF-16 / S-06: resultados preliminares por candidato, por recinto y en total
import { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { Pantalla } from '@/shared/presentation/components/Pantalla';
import { Cargando, SelectorOpciones, Tarjeta } from '@/shared/presentation/components/Basicos';
import { AvisoEstado } from '@/shared/presentation/components/AvisoEstado';
import { AppError } from '@/shared/domain/AppError';
import type { Dignidad } from '@/features/actas/domain/entities/Acta';
import { ordenarPorVotos } from '../../domain/Escrutinio';
import { useAvance, useEscrutinioEnVivo, useResultados } from '../hooks/useEscrutinio';
import { EnVivo } from '../components/EnVivo';
import { BarraCandidato } from '../components/BarraCandidato';

export function ResultadosScreen() {
  const ultimoCambio = useEscrutinioEnVivo();
  const [dignidad, setDignidad] = useState<Dignidad>('alcaldia');
  const [recintoId, setRecintoId] = useState<number | null>(null);
  const avance = useAvance();
  const res = useResultados(dignidad, recintoId);
  const d = res.data;
  const candidatos = d ? ordenarPorVotos(d.candidatos) : [];
  const maximo = candidatos[0]?.votos ?? 0;
  const recintos = avance.data?.recintos ?? [];

  return (
    <Pantalla titulo="Resultados" subtitulo="Preliminares · no oficiales" alRefrescar={() => res.refetch()} refrescando={res.isRefetching}>
      <View className="bg-acento-claro border-2 border-acento rounded-2xl px-4 py-3">
        <Text className="text-tinta text-base font-bold">Conteo preliminar con las actas recibidas. No es un resultado oficial ni reemplaza al CNE.</Text>
      </View>
      <EnVivo ultimoCambio={ultimoCambio} />
      <SelectorOpciones
        opciones={[
          { valor: 'alcaldia', texto: 'Alcaldía de Quito' },
          { valor: 'prefectura', texto: 'Prefectura de Pichincha' },
        ]}
        valor={dignidad}
        onCambiar={setDignidad}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null as number | null, nombre: 'Total' }, ...recintos.map((r) => ({ id: r.id as number | null, nombre: r.nombre }))].map((r) => {
          const activo = r.id === recintoId;
          return (
            <Pressable
              key={String(r.id)}
              onPress={() => setRecintoId(r.id)}
              className={`rounded-full px-4 py-2 border-2 ${activo ? 'bg-marca-oscuro border-marca-oscuro' : 'bg-white border-borde'}`}
            >
              <Text className={`text-sm font-bold ${activo ? 'text-white' : 'text-tinta'}`} numberOfLines={1}>
                {r.nombre.length > 28 ? `${r.nombre.slice(0, 28)}…` : r.nombre}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {res.isLoading ? <Cargando texto="Calculando resultados…" /> : null}
      {res.error ? <AvisoEstado tipo="error" titulo="No se cargaron los resultados" mensaje={AppError.desde(res.error).message} /> : null}
      {d ? (
        <>
          <Text className="text-gris text-base">
            {d.actas} acta(s) · {d.validos.toLocaleString('es-EC')} votos válidos
          </Text>
          {candidatos.map((c, i) => (
            <BarraCandidato key={c.organizacionId} c={c} posicion={i} maximo={maximo} />
          ))}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Tarjeta>
                <Text className="text-gris text-sm">Nulos</Text>
                <Text className="text-tinta text-2xl font-extrabold">{d.nulos.toLocaleString('es-EC')}</Text>
              </Tarjeta>
            </View>
            <View className="flex-1">
              <Tarjeta>
                <Text className="text-gris text-sm">Blancos</Text>
                <Text className="text-tinta text-2xl font-extrabold">{d.blancos.toLocaleString('es-EC')}</Text>
              </Tarjeta>
            </View>
            <View className="flex-1">
              <Tarjeta>
                <Text className="text-gris text-sm">Sufragantes</Text>
                <Text className="text-tinta text-2xl font-extrabold">{d.sufragantes.toLocaleString('es-EC')}</Text>
              </Tarjeta>
            </View>
          </View>
        </>
      ) : null}
    </Pantalla>
  );
}
