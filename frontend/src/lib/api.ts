import { useAuthStore } from '@/store/authStore';

// In dev the Vite proxy forwards /api → localhost:3000, so the relative path works.
// In production set VITE_API_URL=https://your-backend.railway.app in Vercel env vars.
const BASE_URL = (import.meta.env['VITE_API_URL'] as string | undefined)
  ? `${import.meta.env['VITE_API_URL'] as string}/api/v1`
  : '/api/v1';

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string; code?: string };
    throw new ApiError(body.error ?? 'Request failed', res.status, body.code);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
