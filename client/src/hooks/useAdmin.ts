import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

const ADMIN_KEY = 'adminCode';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem(ADMIN_KEY));

  const login = useCallback(async (code: string) => {
    await api.verifyAdmin(code);
    localStorage.setItem(ADMIN_KEY, code);
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setIsAdmin(false);
  }, []);

  return { isAdmin, login, logout };
}
