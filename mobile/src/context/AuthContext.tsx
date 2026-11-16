import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { authApi, type SessionUser } from '../lib/api';

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signIn: (user: SessionUser) => void;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<SessionUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      return currentUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    signIn: setUser,
    signOut: async () => {
      await authApi.logout();
      setUser(null);
    },
    refreshUser,
  }), [loading, refreshUser, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
