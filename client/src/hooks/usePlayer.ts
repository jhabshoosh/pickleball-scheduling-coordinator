import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { Player } from 'shared/types';

const STORAGE_KEY = 'pickleball_player';

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const p = await api.createPlayer(name);
      setPlayer(p);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      return p;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setPlayer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const switchPlayer = useCallback(async (name: string) => {
    return login(name);
  }, [login]);

  return { player, login, logout, switchPlayer, loading };
}
