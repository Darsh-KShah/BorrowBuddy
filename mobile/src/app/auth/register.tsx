import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function RegisterScreen() {
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try {
      const user = await authApi.register({ fullName, collegeName, email, password });
      signIn(user);
      router.replace('/profile');
    }
    catch (error) { Alert.alert('Unable to create account', error instanceof Error ? error.message : 'Try again.'); }
    finally { setLoading(false); }
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
      <Text style={[styles.subtitle, { color: colors.mutedText }]}>College affiliation is self-declared.</Text>
      <TextInput placeholderTextColor={colors.mutedText} placeholder="Full name" value={fullName} onChangeText={setFullName} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <TextInput placeholderTextColor={colors.mutedText} placeholder="College name" value={collegeName} onChangeText={setCollegeName} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <TextInput placeholderTextColor={colors.mutedText} autoCapitalize="none" keyboardType="email-address" placeholder="Email" value={email} onChangeText={setEmail} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <TextInput placeholderTextColor={colors.mutedText} secureTextEntry placeholder="Password (8+ characters)" value={password} onChangeText={setPassword} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
      <Pressable disabled={loading} onPress={() => void submit()} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={styles.primaryText}>{loading ? 'Creating…' : 'Create account'}</Text></Pressable>
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
});
