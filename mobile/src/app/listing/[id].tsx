
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Listing } from '../../types/listing';
import { listingApi, transactionApi } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

export default function ListingDetailsScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [pickerTarget, setPickerTarget] = useState<'start' | 'return' | null>(null);

  const formatDisplayDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
  const formatDateInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    return digits.length <= 2 ? digits : `${digits.slice(0, 2)}-${digits.slice(2, 4)}${digits.length > 4 ? `-${digits.slice(4)}` : ''}`;
  };
  const toApiDate = (value: string) => {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    if (!match) return null;
    const [, day, month, year] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
    return `${year}-${month}-${day}`;
  };
  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  useEffect(() => {
    listingApi.get(id)
      .then(setItem)
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unable to load listing.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}><View style={styles.notFound}><Text style={[styles.notFoundTitle, { color: colors.text }]}>Loading listing…</Text></View></SafeAreaView>;
  }

  if (!item || loadError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>Listing not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.accent }]}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isSale = item.type === 'SALE';

  const handleRequest = async () => {
    try {
      if (isSale) {
        const requestedQuantity = Number(quantity);
        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > (item.availableQuantity ?? item.quantity)) {
          Alert.alert('Check quantity', `Enter a quantity from 1 to ${item.availableQuantity ?? item.quantity}.`);
          return;
        }
        await transactionApi.saleRequest(item.id, requestedQuantity);
      } else {
        const apiStartDate = toApiDate(startDate);
        const apiExpectedReturnDate = toApiDate(expectedReturnDate);
        if (!apiStartDate || !apiExpectedReturnDate) {
          Alert.alert('Enter dates', 'Use DD-MM-YYYY for both lending dates.');
          return;
        }
        const requestedQuantity = Number(quantity);
        if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > item.quantity) {
          Alert.alert('Check quantity', `Enter a quantity from 1 to ${item.quantity}.`);
          return;
        }
        await transactionApi.borrowRequest(item.id, apiStartDate, apiExpectedReturnDate, requestedQuantity);
      }
      Alert.alert('Request sent', isSale ? 'The seller received your request.' : 'The lender received your request.');
    } catch (error) {
      Alert.alert('Request failed', error instanceof Error ? error.message : 'Try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={[styles.backText, { color: colors.accent }]}>‹  Back</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: colors.accentSurface }]}>
          <Text style={styles.heroEmoji}>{item.emoji}</Text>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isSale ? colors.accentSurface : `${colors.success}22` },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: isSale ? colors.accent : colors.success },
              ]}
            >
              {isSale ? 'FOR SALE' : 'FREE TO LEND'}
            </Text>
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={[styles.price, { color: colors.accent }]}>{item.price}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.mutedText }]}>{item.category}</Text>
            <Text style={[styles.dot, { color: colors.mutedText }]}>•</Text>
            <Text style={[styles.meta, { color: colors.mutedText }]}>
              {item.condition.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
          <Text style={[styles.description, { color: colors.mutedText }]}>{item.description}</Text>
          <Text style={[styles.policyText, { color: colors.mutedText }]}>Available quantity: {item.availableQuantity ?? item.quantity} of {item.quantity}</Text>
        </View>

        {!isSale && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Provider availability window</Text>
            {item.createdAt && item.lendingPolicy?.maxDays ? (() => {
              const windowStart = new Date(item.createdAt);
              const windowEnd = addDays(windowStart, item.lendingPolicy.maxDays - 1);
              return <Text style={[styles.policyText, { color: colors.mutedText }]}>From {formatDisplayDate(windowStart)} to {formatDisplayDate(windowEnd)} ({item.lendingPolicy.minDays ?? 1}–{item.lendingPolicy.maxDays} inclusive calendar days). Actual availability is rechecked when a request is approved.</Text>;
            })() : <Text style={[styles.policyText, { color: colors.mutedText }]}>The provider allows {item.lendingPolicy?.minDays ?? 1}–{item.lendingPolicy?.maxDays ?? 'flexible'} inclusive calendar days.</Text>}
            <Text style={[styles.sectionTitle, styles.requestedDatesTitle, { color: colors.text }]}>Your requested dates</Text>
            <View style={styles.dateRow}>
              <TextInput placeholderTextColor={colors.mutedText} placeholder="Start date (DD-MM-YYYY)" value={startDate} onChangeText={(value) => setStartDate(formatDateInput(value))} keyboardType="number-pad" maxLength={10} style={[styles.dateInput, styles.dateInputFlex, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
              <Pressable onPress={() => setPickerTarget('start')} style={[styles.calendarButton, { backgroundColor: colors.accentSurface, borderColor: colors.border }]}><Text style={styles.calendarIcon}>📅</Text></Pressable>
            </View>
            <View style={styles.dateRow}>
              <TextInput placeholderTextColor={colors.mutedText} placeholder="Expected return (DD-MM-YYYY)" value={expectedReturnDate} onChangeText={(value) => setExpectedReturnDate(formatDateInput(value))} keyboardType="number-pad" maxLength={10} style={[styles.dateInput, styles.dateInputFlex, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
              <Pressable onPress={() => setPickerTarget('return')} style={[styles.calendarButton, { backgroundColor: colors.accentSurface, borderColor: colors.border }]}><Text style={styles.calendarIcon}>📅</Text></Pressable>
            </View>
          </View>
        )}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quantity requested</Text>
          <TextInput placeholderTextColor={colors.mutedText} placeholder="1" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} style={[styles.dateInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Listed by</Text>
          <View style={[styles.ownerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.accentSurface }]}>
              <Text style={[styles.avatarText, { color: colors.accent }]}>
                {item.owner.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.ownerName, { color: colors.text }]}>{item.owner}</Text>
              <Text style={[styles.ownerSubtitle, { color: colors.mutedText }]}>Student</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.requestButton, { backgroundColor: colors.accent }]}
          onPress={handleRequest}
        >
          <Text style={styles.requestButtonText}>
            {isSale ? 'Request to Buy' : 'Request to Borrow'}
          </Text>
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedText }]}>
          Connect with fellow students and arrange the exchange responsibly.
        </Text>
      </ScrollView>
      </KeyboardAvoidingView>
      {!isSale && pickerTarget && (
        <DateTimePicker
          value={pickerTarget === 'start' && toApiDate(startDate) ? new Date(`${toApiDate(startDate)}T00:00:00`) : new Date()}
          mode="date"
          display="calendar"
          onValueChange={(_, date) => {
            const displayDate = formatDisplayDate(date);
            if (pickerTarget === 'start') setStartDate(displayDate);
            else setExpectedReturnDate(displayDate);
          }}
          onDismiss={() => setPickerTarget(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  backButton: {
    marginBottom: 18,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    height: 230,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  heroEmoji: {
    fontSize: 88,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  saleBadge: {
  },
  lendBadge: {
  },
  typeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  saleText: {
  },
  lendText: {
  },
  titleSection: {
    marginBottom: 24,
  },
  price: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 7,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 10,
  },
  meta: {
    fontSize: 13,
  },
  dot: {
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  requestedDatesTitle: {
    marginTop: 18,
  },
  policyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  ownerName: {
    fontSize: 15,
    fontWeight: '700',
  },
  ownerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  requestButton: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 13,
  },
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
    marginBottom: 9,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInputFlex: {
    flex: 1,
  },
  calendarButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },
  calendarIcon: {
    fontSize: 18,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  backLink: {
    fontWeight: '600',
  },
});
