import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { authAPI } from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(!!sessionStorage.getItem('auth_token'));

  useEffect(() => {
    const storedToken = sessionStorage.getItem('auth_token');
    if (!storedToken) {
      setTimeout(() => setLoading(false), 0);
      return;
    }

    authAPI.getMe()
      .then((me) => {
        setUser(me);
        setLoading(false);
      })
      .catch(() => {
        sessionStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
        setLoading(false);
      });
  }, [token]);

  const login = useCallback(async (email, password) => {
    try {
      const { token: newToken, user: newUser } = await authAPI.login(email, password);
      sessionStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(newUser);
      return true;
    } catch (err) {
      console.error('[AuthContext] login failed:', err);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore — token already invalid */ }
    sessionStorage.removeItem('auth_token');
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};