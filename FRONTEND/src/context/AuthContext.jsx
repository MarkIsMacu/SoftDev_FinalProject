/**
 * Context: AuthContext
 * Provides authentication state globally.
 * Replace the mock login with authAPI.login() when backend is ready.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  const login = useCallback(async (email, password, role) => {
    // ── Backend integration point ──────────────────────────────────────────
    // When backend is live, uncomment the lines below and remove the mock:
    //
    // const { user, token } = await authAPI.login(email, password, role);
    // localStorage.setItem('auth_token', token);
    // setToken(token);
    // setUser(user);
    //
    // Mock for frontend-only phase:
    const mockUser = { id: 'usr-001', name: 'Demo User', email, role };
    setUser(mockUser);
    // ───────────────────────────────────────────────────────────────────────
  }, []);

  const logout = useCallback(async () => {
    // await authAPI.logout();
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  }, []);

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
