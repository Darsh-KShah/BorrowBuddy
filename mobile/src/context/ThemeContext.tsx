import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Colors, type ThemeColors } from '../constants/theme';

export type ThemeMode = 'light' | 'dark' | 'system';
type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = 'borrowbuddy.theme-mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const resolvedMode = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    void SecureStore.getItemAsync(STORAGE_KEY).then((storedMode) => {
      if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') setModeState(storedMode);
    });
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    mode,
    colors: Colors[resolvedMode],
    setMode: async (nextMode) => {
      setModeState(nextMode);
      await SecureStore.setItemAsync(STORAGE_KEY, nextMode);
    },
  }), [mode, resolvedMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used within ThemeProvider');
  return value;
}
