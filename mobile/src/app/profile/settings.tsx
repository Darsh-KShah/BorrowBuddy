import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../lib/api';

const modes: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'system', label: 'System default', description: 'Follow your Android appearance setting.' },
  { value: 'light', label: 'Light', description: 'Use a bright, minimal interface.' },
  { value: 'dark', label: 'Dark', description: 'Use a darker interface for low-light conditions.' },
];

export default function SettingsScreen() {
  const { mode, colors, setMode } = useTheme();
  const { user, refreshUser, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [inAppNotifications, setInAppNotifications] = useState(user?.notificationPreferences.inAppEnabled ?? true);
  const [contactSharing, setContactSharing] = useState(user?.privacyPreferences.contactSharingEnabled ?? false);

  useEffect(() => {
    if (!user) return;
    setInAppNotifications(user.notificationPreferences.inAppEnabled);
    setContactSharing(user.privacyPreferences.contactSharingEnabled);
  }, [user]);

  const savePreferences = async (nextInApp: boolean, nextContact: boolean) => {
    setSavingPreferences(true);
    try {
      await authApi.updatePreferences({ inAppNotifications: nextInApp, contactSharing: nextContact });
      await refreshUser();
    } catch (error) {
      Alert.alert('Unable to save preferences', error instanceof Error ? error.message : 'Try again.');
      setInAppNotifications(user?.notificationPreferences.inAppEnabled ?? true);
      setContactSharing(user?.privacyPreferences.contactSharingEnabled ?? false);
    } finally {
      setSavingPreferences(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Invalid password', 'Use at least 8 characters for your new password.');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      await signOut();
      Alert.alert('Password changed', 'Sign in again with your new password.', [{ text: 'Sign in', onPress: () => router.replace('/auth/login') }]);
    } catch (error) {
      Alert.alert('Unable to change password', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>Account settings</Text>
        <Text style={[styles.sectionTitle, styles.firstSectionTitle, { color: colors.text }]}>Appearance</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Choose how BorrowBuddy looks on this device.</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {modes.map((option) => {
            const selected = mode === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => void setMode(option.value)}
                style={[styles.option, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.accentSurface : colors.card }]}
              >
                <View style={[styles.radio, { borderColor: selected ? colors.accent : colors.mutedText }]}>
                  {selected && <View style={[styles.radioSelected, { backgroundColor: colors.accent }]} />}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, { color: colors.text }]}>{option.label}</Text>
                  <Text style={[styles.optionDescription, { color: colors.mutedText }]}>{option.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.note, { color: colors.mutedText }]}>Theme preference is stored securely and restored when the app restarts.</Text>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications and privacy</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceText}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>In-app notifications</Text>
              <Text style={[styles.optionDescription, { color: colors.mutedText }]}>Receive transaction and request updates in BorrowBuddy.</Text>
            </View>
            <Switch
              value={inAppNotifications}
              disabled={savingPreferences || !user}
              onValueChange={(value) => {
                setInAppNotifications(value);
                void savePreferences(value, contactSharing);
              }}
              trackColor={{ false: colors.border, true: colors.accentSurface }}
              thumbColor={inAppNotifications ? colors.accent : colors.mutedText}
            />
          </View>
          <View style={[styles.preferenceRow, styles.preferenceDivider, { borderTopColor: colors.border }]}>
            <View style={styles.preferenceText}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>Share contact after acceptance</Text>
              <Text style={[styles.optionDescription, { color: colors.mutedText }]}>Only relevant accepted-transaction participants can see opted-in contact details.</Text>
            </View>
            <Switch
              value={contactSharing}
              disabled={savingPreferences || !user}
              onValueChange={(value) => {
                setContactSharing(value);
                void savePreferences(inAppNotifications, value);
              }}
              trackColor={{ false: colors.border, true: colors.accentSurface }}
              thumbColor={contactSharing ? colors.accent : colors.mutedText}
            />
          </View>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Security</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            placeholder="Current password"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
            value={currentPassword}
            onChangeText={setCurrentPassword}
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          />
          <TextInput
            placeholder="New password (8+ characters)"
            placeholderTextColor={colors.mutedText}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
          />
          <Pressable disabled={savingPassword || !user} onPress={() => void changePassword()} style={[styles.primary, { backgroundColor: colors.accent }]}>
            <Text style={styles.primaryText}>{savingPassword ? 'Changing password…' : 'Change password'}</Text>
          </Pressable>
          <Text style={[styles.note, { color: colors.mutedText }]}>Changing your password signs out all devices and requires you to sign in again.</Text>
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Account deletion</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.optionDescription, { color: colors.mutedText }]}>Account deletion is not available yet. Existing transactions and audit records require a reviewed retention and recovery policy before this action is enabled.</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  keyboardAvoidingView: { flex: 1 },
  content: { paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 28 },
  firstSectionTitle: { marginTop: 0 },
  subtitle: { fontSize: 13, marginTop: 6, marginBottom: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 10 },
  option: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 11, padding: 13, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, marginLeft: 12 },
  optionLabel: { fontSize: 14, fontWeight: '700' },
  optionDescription: { fontSize: 12, marginTop: 3 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 16 },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  preferenceDivider: { borderTopWidth: 1, marginTop: 8, paddingTop: 16 },
  preferenceText: { flex: 1, paddingRight: 12 },
  input: { borderWidth: 1, borderRadius: 11, padding: 13, marginTop: 10 },
  primary: { borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
});
