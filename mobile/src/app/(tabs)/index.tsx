
import { useCallback, useMemo, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Listing } from '../../data/listings';
import { listingApi } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

const categories = [
  'All',
  'Books',
  'Electronics',
  'Calculators',
  'Sports',
  'Hostel',
  'Other',
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const [liveListings, setLiveListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');

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

  const filteredListings = useMemo(() => {
    return liveListings.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        item.category === selectedCategory;

      const matchesSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [liveListings, selectedCategory, search]);

  const featuredListings = filteredListings.filter(
    (item) => item.featured
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: colors.accent }]}>BorrowBuddy</Text>
            <Text style={[styles.tagline, { color: colors.mutedText }]}>Your campus marketplace</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={[styles.profileButton, { backgroundColor: colors.card }]}
            onPress={() => router.push('/profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Find what you need.
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.mutedText }]}>
            Borrow, lend or buy from fellow students.
          </Text>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search books, gadgets, and more..."
            placeholderTextColor={colors.mutedText}
            style={[styles.searchInput, { color: colors.text }]}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Text style={[styles.clearSearch, { color: colors.mutedText }]}>✕</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          >
            {categories.map((category) => {
              const selected = selectedCategory === category;

              return (
                <Pressable
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    [styles.categoryChip, { backgroundColor: colors.card, borderColor: colors.border }],
                    selected && styles.categoryChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      [styles.categoryText, { color: colors.mutedText }],
                      selected && styles.categoryTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Loading listings…</Text></View>
        ) : loadError ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>Unable to load listings</Text><Text style={[styles.emptyText, { color: colors.mutedText }]}>{loadError}</Text></View>
        ) : featuredListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Featured</Text>
              <Text style={[styles.sectionHint, { color: colors.mutedText }]}>Handpicked items</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            >
              {featuredListings.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push(`/listing/${item.id}`)}
                >
                  <View style={[styles.featuredImage, { backgroundColor: colors.accentSurface }]}>
                    <Text style={styles.itemEmoji}>{item.emoji}</Text>
                    <Text style={[styles.featuredBadge, { backgroundColor: colors.accentSurface, color: colors.accent }]}>FEATURED</Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.accent }]}>{item.price}</Text>
                  <Text style={[styles.itemOwner, { color: colors.mutedText }]}>
                    Listed by {item.owner}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent listings</Text>
            <Text style={[styles.sectionHint, { color: colors.mutedText }]}>
              {filteredListings.length} items
            </Text>
          </View>

          {!loading && !loadError && filteredListings.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
              <Text style={styles.emptyEmoji}>🔎</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No items found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedText }]}>
                Try another search or category.
              </Text>
            </View>
          ) : (

            filteredListings.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.listingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                <View style={[styles.listingImage, { backgroundColor: colors.accentSurface }]}>
                  <Text style={styles.itemEmoji}>{item.emoji}</Text>
                </View>

                <View style={styles.listingInfo}>
                  <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.itemMeta, { color: colors.mutedText }]}>
                    {item.category} · {item.condition.replace('_', ' ')}
                  </Text>
                  <Text style={[styles.itemPrice, { color: colors.accent }]}>{item.price}</Text>
                  <Text style={[styles.itemOwner, { color: colors.mutedText }]}>
                    Listed by {item.owner}
                  </Text>
                </View>

                <View
                  style={[
                    styles.typeBadge,
                    item.type === 'LEND'
                      ? styles.lendBadge
                      : styles.saleBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeBadgeText,
                      item.type === 'LEND'
                        ?                           [styles.lendText, { color: colors.success }]
                        : [styles.saleText, { color: colors.accent }],
                    ]}
                  >
                    {item.type === 'LEND' ? 'LEND' : 'SALE'}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Text style={[styles.footer, { color: colors.mutedText }]}>
          BorrowBuddy · Built for students
        </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  brand: {
    fontSize: 25,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: -0.8,
  },
  tagline: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  welcome: {
    marginTop: 30,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.7,
  },
  welcomeSubtitle: {
    color: '#64748B',
    fontSize: 14,
    marginTop: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  searchIcon: {
    fontSize: 24,
    color: '#64748B',
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  clearSearch: {
    color: '#64748B',
    fontSize: 16,
    padding: 6,
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionHint: {
    color: '#94A3B8',
    fontSize: 12,
  },
  categoryList: {
    gap: 9,
    paddingRight: 20,
  },
  categoryChip: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  categoryText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  featuredList: {
    gap: 14,
    paddingRight: 20,
  },
  featuredCard: {
    width: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  featuredImage: {
    height: 115,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  featuredBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    backgroundColor: '#DBEAFE',
    color: '#1D4ED8',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  itemEmoji: {
    fontSize: 38,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 6,
  },
  itemOwner: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  listingImage: {
    width: 76,
    height: 82,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingInfo: {
    flex: 1,
  },
  itemMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 5,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  saleBadge: {
    backgroundColor: '#DBEAFE',
  },
  lendBadge: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  saleText: {
    color: '#1D4ED8',
  },
  lendText: {
    color: '#15803D',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    alignItems: 'center',
    borderRadius: 15,
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
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 5,
  },
  footer: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 30,
  },
});
