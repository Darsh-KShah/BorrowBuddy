import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      const user = await authApi.login({ email, password });
      signIn(user);
      router.back();
    }
    catch (error) { Alert.alert('Unable to sign in', error instanceof Error ? error.message : 'Try again.'); }
    finally { setLoading(false); }
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
      <Text style={[styles.subtitle, { color: colors.mutedText }]}>Sign in to manage requests and listings.</Text>
      <TextInput placeholderTextColor={colors.mutedText} autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <TextInput placeholderTextColor={colors.mutedText} secureTextEntry placeholder="Password" value={password} onChangeText={setPassword} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <Pressable disabled={loading} onPress={() => void submit()} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={styles.primaryText}>{loading ? 'Signing in…' : 'Sign in'}</Text></Pressable>
      <Pressable onPress={() => router.push('./register')}><Text style={[styles.link, { color: colors.accent }]}>Create an account</Text></Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  keyboardAvoidingView: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 40 },
  subtitle: { marginTop: 8, marginBottom: 28 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  primary: { borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#FFF', fontWeight: '700' },
  link: { textAlign: 'center', marginTop: 20, fontWeight: '600' },
});
