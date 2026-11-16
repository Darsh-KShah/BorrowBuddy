import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { listingApi, transactionApi, type Transaction } from '../../lib/api';
import type { Listing } from '../../types/listing';

export default function ProfileScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { colors } = useTheme();
  const [listings, setListings] = useState<Listing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccountData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [mine, activity] = await Promise.all([listingApi.mine(), transactionApi.listMine()]);
      setListings(mine);
      setTransactions(activity);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load account data.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => {
    void loadAccountData();
  }, [loadAccountData]));

  const logout = async () => {
    try {
      await signOut();
    } catch (reason) {
      Alert.alert('Sign out issue', reason instanceof Error ? reason.message : 'The session was cleared locally.');
    }
  };

  const activeTransactions = transactions.filter((transaction) =>
    ['PENDING', 'ACCEPTED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING'].includes(transaction.status),
  ).length;
  const completedTransactions = transactions.filter((transaction) => transaction.status === 'COMPLETED').length;
  const historicalTransactions = transactions.filter((transaction) =>
    ['REJECTED', 'CANCELLED', 'CANCELLED_BY_ADMIN'].includes(transaction.status),
  ).length;

  if (authLoading) {
    return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}><Text style={[styles.title, { color: colors.text }]}>My Profile</Text><Text style={[styles.muted, { color: colors.mutedText }]}>Restoring your session…</Text></SafeAreaView>;
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSurface }]}><Text style={[styles.avatarText, { color: colors.accent }]}>?</Text></View>
          <Text style={[styles.heading, { color: colors.text }]}>Welcome to BorrowBuddy</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>Sign in to create listings, manage requests and track your transactions.</Text>
          <Pressable onPress={() => router.push('/auth/login')} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={styles.primaryText}>Sign in</Text></Pressable>
          <Pressable onPress={() => router.push('/auth/register')} style={[styles.secondary, { borderColor: colors.accent }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>Create account</Text></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.accentSurface }]}><Text style={[styles.avatarText, { color: colors.accent }]}>{user.fullName.charAt(0).toUpperCase()}</Text></View>
          <Text style={[styles.heading, { color: colors.text }]}>{user.fullName}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{user.email}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>{user.collegeName}</Text>
          <Pressable onPress={() => router.push('../profile/edit')} style={[styles.secondary, { borderColor: colors.accent }]}><Text style={[styles.secondaryText, { color: colors.accent }]}>Edit profile</Text></Pressable>
        </View>
        {error && <View style={[styles.error, { backgroundColor: colors.accentSurface }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View>}
        <View style={styles.stats}>
          <View style={[styles.stat, { backgroundColor: colors.card }]}><Text style={[styles.statValue, { color: colors.accent }]}>{listings.length}</Text><Text style={[styles.statLabel, { color: colors.mutedText }]}>My listings</Text></View>
          <View style={[styles.stat, { backgroundColor: colors.card }]}><Text style={[styles.statValue, { color: colors.accent }]}>{activeTransactions}</Text><Text style={[styles.statLabel, { color: colors.mutedText }]}>Active</Text></View>
          <View style={[styles.stat, { backgroundColor: colors.card }]}><Text style={[styles.statValue, { color: colors.accent }]}>{completedTransactions}</Text><Text style={[styles.statLabel, { color: colors.mutedText }]}>Completed</Text></View>
          <View style={[styles.stat, { backgroundColor: colors.card }]}><Text style={[styles.statValue, { color: colors.accent }]}>{historicalTransactions}</Text><Text style={[styles.statLabel, { color: colors.mutedText }]}>Historical</Text></View>
        </View>
        <Pressable onPress={() => router.push('/listing/edit')} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={styles.primaryText}>Add listing</Text></Pressable>
        <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>My Listings</Text>
          <Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>{loading ? 'Loading…' : listings.length ? 'Tap a listing to edit it' : 'No listings yet'}</Text>
          {!loading && listings.map((listing) => (
            <Pressable key={listing.id} onPress={() => router.push({ pathname: '/listing/edit', params: { id: listing.id } })} style={styles.listingRow}>
              <Text style={[styles.listingTitle, { color: colors.text }]} numberOfLines={1}>{listing.title}</Text>
              <Text style={[styles.listingStatus, { color: colors.mutedText }]}>{listing.type} · {listing.condition.replace('_', ' ')}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={() => router.push('/activity')} style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.menuTitle, { color: colors.text }]}>My Borrowing Requests</Text><Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>View outgoing requests</Text></Pressable>
        <Pressable onPress={() => router.push('/activity')} style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.menuTitle, { color: colors.text }]}>My Selling Activity</Text><Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>Manage incoming requests</Text></Pressable>
        <Pressable onPress={() => router.push('/activity')} style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.menuTitle, { color: colors.text }]}>Transaction History</Text><Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>{transactions.length ? `${historicalTransactions} historical · ${completedTransactions} completed` : 'No transactions yet'}</Text></Pressable>
        <Pressable onPress={() => router.push('../profile/settings')} style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.menuTitle, { color: colors.text }]}>Account Settings</Text><Text style={[styles.menuSubtitle, { color: colors.mutedText }]}>Theme and preferences</Text></Pressable>
        <Pressable onPress={() => void logout()} style={styles.logout}><Text style={[styles.logoutText, { color: colors.error }]}>Log out</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  content: { paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  card: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 22, alignItems: 'center', marginTop: 22 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 30, fontWeight: '700', color: '#2563EB' },
  heading: { fontSize: 19, fontWeight: '700', color: '#0F172A', marginTop: 14, textAlign: 'center' },
  subtitle: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  muted: { color: '#64748B', marginTop: 20 },
  primary: { backgroundColor: '#2563EB', borderRadius: 11, padding: 14, alignItems: 'center', marginTop: 18 },
  primaryText: { color: '#FFF', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 11, padding: 13, alignItems: 'center', marginTop: 10, width: '100%' },
  secondaryText: { color: '#2563EB', fontWeight: '700' },
  error: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginTop: 14 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  stat: { width: '48%', backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { color: '#2563EB', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#64748B', fontSize: 12, marginTop: 4 },
  menu: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  menuTitle: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  menuSubtitle: { color: '#64748B', fontSize: 12, marginTop: 4 },
  listingRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10, marginTop: 10 },
  listingTitle: { color: '#0F172A', fontSize: 14, fontWeight: '600' },
  listingStatus: { color: '#64748B', fontSize: 11, marginTop: 3 },
  logout: { padding: 16, alignItems: 'center', marginTop: 12 },
  logoutText: { color: '#DC2626', fontWeight: '700' },
});
