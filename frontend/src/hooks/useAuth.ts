import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiSuccess } from '@/types';

interface LoginInput { email: string; password: string }
interface RegisterInput { email: string; password: string; businessName: string; slug: string }
interface TokenResponse { accessToken: string; refreshToken: string }

export function useLogin() {
  const { setTokens } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (input: LoginInput) =>
      api.post<ApiSuccess<TokenResponse>>('/auth/login', input),
    onSuccess: (res) => {
      setTokens(res.data.accessToken, res.data.refreshToken);
      navigate('/');
    },
  });
}

export function useRegister() {
  const { setTokens } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<ApiSuccess<TokenResponse>>('/auth/register', input),
    onSuccess: (res) => {
      setTokens(res.data.accessToken, res.data.refreshToken);
      navigate('/setup');
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    logout();
    navigate('/login');
  };
}
