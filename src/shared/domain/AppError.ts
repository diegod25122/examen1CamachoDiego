// Error de la aplicación con un mensaje en español sencillo para la persona (RNF-01)
export type CodigoError =
  | 'RED'
  | 'VALIDACION'
  | 'PERMISO'
  | 'DUPLICADO'
  | 'SESION'
  | 'NO_ENCONTRADO'
  | 'LIMITE'
  | 'DESCONOCIDO';

export class AppError extends Error {
  constructor(
    public readonly codigo: CodigoError,
    mensaje: string,
    /** true = el envío se puede reintentar solo (sin señal, servidor caído) */
    public readonly reintentable = false,
    public readonly causa?: unknown,
  ) {
    super(mensaje);
    this.name = 'AppError';
  }

  static desde(e: unknown, porDefecto = 'Ocurrió un problema. Intenta de nuevo.'): AppError {
    if (e instanceof AppError) return e;
    return new AppError('DESCONOCIDO', porDefecto, false, e);
  }
}
