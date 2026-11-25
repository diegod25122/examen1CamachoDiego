import { QueryClient } from '@tanstack/react-query';

export const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // los repositorios responden desde la caché local cuando no hay señal
      networkMode: 'offlineFirst',
    },
    mutations: { networkMode: 'online', retry: 0 },
  },
});
