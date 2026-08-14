import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setSession, clearSession, getStoredUser, TOKEN_KEY } from '../api/client.js';
import * as authApi from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [isReady, setIsReady] = useState(true);
  const [lastAuthSource, setLastAuthSource] = useState(null);

  useEffect(() => {
    function handleUnauthorized() {
      clearSession();
      setUser(null);
    }
    window.addEventListener('eic:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('eic:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data, source, error } = await authApi.login({ email, password });
    setSession(data.access_token, data.user);
    setUser(data.user);
    setLastAuthSource(source);
    return { source, error };
  }, []);

  const signup = useCallback(async (fullName, email, password) => {
    const { data, source, error } = await authApi.signup({ full_name: fullName, email, password });
    setSession(data.access_token, data.user);
    setUser(data.user);
    setLastAuthSource(source);
    return { source, error };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem('eic_auth_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user && localStorage.getItem(TOKEN_KEY)),
      isReady,
      lastAuthSource,
      login,
      signup,
      logout,
      updateUser
    }),
    [user, isReady, lastAuthSource, login, signup, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
