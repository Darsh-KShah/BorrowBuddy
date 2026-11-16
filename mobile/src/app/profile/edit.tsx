import { useState } from 'react';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [collegeName, setCollegeName] = useState(user?.collegeName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (fullName.trim().length < 2 || collegeName.trim().length < 2) {
      setError('Enter a valid full name and college name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await authApi.updateProfile({ fullName: fullName.trim(), collegeName: collegeName.trim() });
      await refreshUser();
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.text }]}>Edit profile</Text><Text style={[styles.error, { color: colors.error, backgroundColor: colors.accentSurface }]}>Sign in to edit your profile.</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Edit profile</Text>
        <Text style={[styles.label, { color: colors.text }]}>Full name</Text>
        <TextInput placeholderTextColor={colors.mutedText} value={fullName} onChangeText={setFullName} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} autoCapitalize="words" />
        <Text style={[styles.label, { color: colors.text }]}>Email</Text>
        <TextInput value={user.email} style={[styles.input, styles.disabled, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.mutedText }]} editable={false} />
        <Text style={[styles.emailNote, { color: colors.mutedText }]}>Email cannot be changed here because it is your sign-in identity.</Text>
        <Text style={[styles.label, { color: colors.text }]}>College</Text>
        <TextInput placeholderTextColor={colors.mutedText} value={collegeName} onChangeText={setCollegeName} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
        {error && <Text style={[styles.error, { color: colors.error, backgroundColor: colors.accentSurface }]}>{error}</Text>}
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.primary, { backgroundColor: colors.accent }]}>
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  keyboardAvoidingView: { flex: 1 },
  content: { paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 24 },
  label: { color: '#0F172A', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 12 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, color: '#0F172A' },
  disabled: { color: '#64748B', backgroundColor: '#F1F5F9' },
  emailNote: { color: '#64748B', fontSize: 12, marginTop: 6, lineHeight: 18 },
  error: { color: '#B91C1C', backgroundColor: '#FEF2F2', borderRadius: 9, padding: 11, marginTop: 14 },
  primary: { backgroundColor: '#2563EB', borderRadius: 11, padding: 15, alignItems: 'center', marginTop: 22 },
  primaryText: { color: '#FFF', fontWeight: '700' },
});
