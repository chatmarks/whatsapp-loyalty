import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BusinessProfile {
  id: string;
  businessName: string;
  plan: string;
  waPhoneId: string | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  business: BusinessProfile | null;
  setTokens: (access: string, refresh: string) => void;
  setBusiness: (b: BusinessProfile) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      business: null,

      setTokens: (access, refresh) => set({ token: access, refreshToken: refresh }),
      setBusiness: (b) => set({ business: b }),

      logout: () => set({ token: null, refreshToken: null, business: null }),

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        business: state.business,
      }),
    },
  ),
);
