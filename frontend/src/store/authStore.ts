import { create } from 'zustand';

import { api, tokenStore } from '@/api/client';
import type { AuthUser } from '@/types';

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,

  login: async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password });
    tokenStore.set(data.access, data.refresh);
    const me = await api.get<AuthUser>('/auth/me/');
    set({ user: me.data });
  },

  register: async (username, email, password) => {
    await api.post('/auth/register/', { username, email, password });
    const { data } = await api.post('/auth/login/', { username, password });
    tokenStore.set(data.access, data.refresh);
    const me = await api.get<AuthUser>('/auth/me/');
    set({ user: me.data });
  },

  loadUser: async () => {
    if (!tokenStore.access) {
      set({ initialized: true });
      return;
    }
    try {
      const me = await api.get<AuthUser>('/auth/me/');
      set({ user: me.data, initialized: true });
    } catch {
      tokenStore.clear();
      set({ user: null, initialized: true });
    }
  },

  logout: () => {
    tokenStore.clear();
    set({ user: null });
  },
}));
