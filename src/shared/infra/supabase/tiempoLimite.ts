import { AppError } from '@/shared/domain/AppError';

/** Evita que la pantalla se quede "quieta" con señal débil (RF-13) */
export function conTiempoLimite<T>(promesa: PromiseLike<T>, ms = 12_000): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const t = setTimeout(
      () => rechazar(new AppError('RED', 'La señal es muy débil. Se intentará de nuevo.', true)),
      ms,
    );
    Promise.resolve(promesa).then(
      (v) => {
        clearTimeout(t);
        resolver(v);
      },
      (e) => {
        clearTimeout(t);
        rechazar(e);
      },
    );
  });
}
