
import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout() {
  return (
      <ThemeProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="listing/[id]" />
            <Stack.Screen name="listing/edit" />
            <Stack.Screen name="auth/login" />
            <Stack.Screen name="auth/register" />
            <Stack.Screen name="profile/edit" />
            <Stack.Screen name="profile/settings" />
          </Stack>
        </AuthProvider>
      </ThemeProvider>
  );
}
