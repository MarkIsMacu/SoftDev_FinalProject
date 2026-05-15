/**
 * Context: AuthContext
 * Provides authentication state globally.
 *
 * RBAC: role comes from the shared accounts registry (accounts.js).
 * For newly registered clients, their account is written into the registry
 * by DataContext.registerCustomer() before they attempt to log in.
 *
 * Backend integration point:
 *   Replace the mock login() body with:
 *     const { user, token } = await authAPI.login(email, password);
 *     localStorage.setItem('auth_token', token);
 *     setToken(token); setUser(user); return true;
 *   The backend returns role + customerId already set.
 */
import { createContext, useContext, useState, useCallback } from 'react';
import { lookupAccount } from '../store/accounts.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  /**
   * Attempt login. Returns true on success, false on bad credentials.
   * The resulting `user` object includes customerId for customer role.
   */
  const login = useCallback(async (email, password) => {
    // ── Backend integration point ──────────────────────────────────────────
    // const { user, token } = await authAPI.login(email, password);
    // localStorage.setItem('auth_token', token);
    // setToken(token); setUser(user); return true;
    // ──────────────────────────────────────────────────────────────────────
    const account = lookupAccount(email);
    if (!account || password !== account.password) return false;

    const loggedInUser = {
      id:         `usr-${Date.now()}`,
      name:       account.name,
      email:      email.trim().toLowerCase(),
      role:       account.role,
      customerId: account.customerId ?? null, // only populated for customer role
    };
    setUser(loggedInUser);
    return true;
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
