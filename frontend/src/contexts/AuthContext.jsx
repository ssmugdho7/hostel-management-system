import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/client';
import { AuthContext } from './authContextObject';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await refresh();
      return data;
    },
    [refresh]
  );

  const register = useCallback(async (payload) => {
    const { data } = await apiClient.post('/auth/register', payload);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout', {});
    } catch {
      // ignore – we clear local state regardless
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
