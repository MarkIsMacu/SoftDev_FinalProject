import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('auth_token')); // rehydrating?

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    authAPI.getMe()
      .then((me) => setUser(me))
      .catch(() => {
        localStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token: newToken, user: newUser } = await authAPI.login(email, password);

    localStorage.setItem('auth_token', newToken);
    setToken(newToken);
    setUser(newUser);
    return true;
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore — token already invalid */ }
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};