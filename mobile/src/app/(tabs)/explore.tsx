
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Listing } from '../../types/listing';
import { listingApi } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

const categories = [
  'All',
  'Books',
  'Electronics',
  'Calculators',
  'Lab Equipment',
  'Sports',
  'Hostel',
  'Accessories',
  'Other',
];

type ListingType = 'ALL' | 'SALE' | 'LEND';

export default function ExploreScreen() {
  const { colors } = useTheme();
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [listingType, setListingType] = useState<ListingType>('ALL');

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    listingApi.list()
      .then((items) => { if (active) setLiveListings(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load listings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return liveListings.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      const matchesCategory =
        category === 'All' || item.category === category;

      const matchesType =
        listingType === 'ALL' || item.type === listingType;

      return matchesSearch && matchesCategory && matchesType;
    });
  }, [search, category, listingType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.heading, { color: colors.text }]}>Explore</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Discover items shared by students.
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search for anything..."
          placeholderTextColor={colors.mutedText}
          style={[styles.search, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]}
        />

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Listing type</Text>
        <View style={styles.filters}>
          {([
            ['ALL', 'All'],
            ['SALE', 'For sale'],
            ['LEND', 'For lending'],
          ] as const).map(([value, label]) => {
            const selected = listingType === value;

            return (
              <Pressable
                key={value}
                onPress={() => setListingType(value)}
                style={[
                styles.filterChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                  selected && styles.selectedChip,
                ]}
              >
                <Text
                  style={[
                    [styles.filterText, { color: colors.mutedText }],
                    selected && styles.selectedText,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
        <View style={styles.categories}>
          {categories.map((value) => {
            const selected = category === value;

            return (
              <Pressable
                key={value}
                onPress={() => setCategory(value)}
                style={[
                styles.categoryChip,
                { backgroundColor: colors.card, borderColor: colors.border },
                  selected && styles.selectedChip,
                ]}
              >
                <Text
                  style={[
                    [styles.filterText, { color: colors.mutedText }],
                    selected && styles.selectedText,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.resultsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Results</Text>
          <Text style={[styles.count, { color: colors.mutedText }]}>
            {filteredItems.length} items
          </Text>
        </View>

        {loading ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Loading listings…</Text></View>
        ) : loadError ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Unable to load listings</Text><Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>{loadError}</Text></View>
        ) : filteredItems.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.card }]}>
            <Text style={styles.emptyEmoji}>🔎</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No items found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedText }]}>
              Try changing your search or filters.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/listing/${item.id}`)}
            >              
              <View style={[styles.itemImage, { backgroundColor: colors.accentSurface }]}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>

              <View style={styles.itemInfo}>
                <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.meta, { color: colors.mutedText }]}>
                  {item.category} · {item.condition.replace('_', ' ')}
                </Text>
                <Text style={[styles.price, { color: colors.accent }]}>{item.price}</Text>
              </View>

              <View
                style={[
                  styles.typeBadge,
                  item.type === 'LEND' ? styles.lendBadge : styles.saleBadge,
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    item.type === 'LEND' ? [styles.lendText, { color: colors.success }] : [styles.saleText, { color: colors.accent }],
                  ]}
                >
                  {item.type}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoidingView: { flex: 1 },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 5,
    marginBottom: 22,
  },
  search: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 13,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#0F172A',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  filters: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  selectedChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  selectedText: {
    color: '#FFFFFF',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 12,
    marginBottom: 26,
  },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  count: {
    color: '#94A3B8',
    fontSize: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 11,
    marginBottom: 11,
    gap: 11,
  },
  itemImage: {
    width: 68,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  meta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 5,
  },
  price: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 5,
  },
  saleBadge: {
    backgroundColor: '#DBEAFE',
  },
  lendBadge: {
    backgroundColor: '#DCFCE7',
  },
  typeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  saleText: {
    color: '#1D4ED8',
  },
  lendText: {
    color: '#15803D',
  },
  empty: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
});
