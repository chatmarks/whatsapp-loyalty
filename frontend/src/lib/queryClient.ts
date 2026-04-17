import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          // Token expired — clear auth and redirect to login
          window.location.href = '/login';
        }
      },
    },
  },
});
