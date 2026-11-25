// Puerto de monitoreo (ADR-07). El dominio no conoce a Sentry.
export interface IReporteErrores {
  /** Error que no cierra la app pero impide completar una tarea (RF-17) */
  reportar(error: unknown, contexto: { operacion: string; datos?: Record<string, unknown> }): void;
  identificar(usuario: { id: string; rol: string } | null): void;
  pantalla(ruta: string): void;
}
