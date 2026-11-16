import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi, transactionApi, type Transaction } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

const actionFor = (transaction: Transaction, userId: string) => {
  const ownerId = typeof transaction.listingOwnerId === 'string' ? transaction.listingOwnerId : transaction.listingOwnerId._id;
  const incoming = ownerId === userId;
  if (transaction.status === 'PENDING') return incoming ? 'accept' : 'withdraw';
  if (transaction.status === 'ACCEPTED') return incoming ? (transaction.type === 'SALE' ? 'seller-handover' : 'lender-handover') : 'cancel';
  if (transaction.status === 'HANDOVER_PENDING') return incoming ? undefined : (transaction.type === 'SALE' ? 'buyer-receipt' : 'borrower-receipt');
  if (transaction.status === 'ACTIVE' && transaction.type === 'BORROW' && !incoming) return 'borrower-return';
  if (transaction.status === 'RETURN_PENDING' && transaction.type === 'BORROW' && incoming) return 'lender-return-confirmation';
  return undefined;
};

export default function ActivityScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState('');
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'LISTING' | 'REQUESTS'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALE' | 'BORROW'>('ALL');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');

  const load = useCallback(async () => {
    try {
      const [user, items] = await Promise.all([authApi.me(), transactionApi.listMine()]);
      setUserId(user.id);
      setTransactions(items);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in to view activity.');
    }
  }, []);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const runAction = async (transaction: Transaction, action: string) => {
    try {
      await transactionApi.action(transaction._id, action, action === 'cancel' ? { reason: 'Cancelled by participant.' } : undefined);
      await load();
    } catch (reason) {
      Alert.alert('Action failed', reason instanceof Error ? reason.message : 'Try again.');
    }
  };

  const submitReview = async (transaction: Transaction) => {
    if (reviewRating < 1) {
      Alert.alert('Choose a rating', 'Select between 1 and 5 stars.');
      return;
    }
    try {
      await transactionApi.review(transaction._id, reviewRating, reviewComment);
      setReviewRating(0);
      setReviewComment('');
      await load();
      Alert.alert('Review submitted', 'Thank you for sharing your experience.');
    } catch (reason) {
      Alert.alert('Review failed', reason instanceof Error ? reason.message : 'Try again.');
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const ownerId = typeof transaction.listingOwnerId === 'string' ? transaction.listingOwnerId : transaction.listingOwnerId._id;
    const isOwner = ownerId === userId;
    return (roleFilter === 'ALL' || (roleFilter === 'LISTING' ? isOwner : !isOwner))
      && (typeFilter === 'ALL' || transaction.type === typeFilter);
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>My Activity</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>Incoming and outgoing requests from the backend.</Text>
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.mutedText }]}>View</Text>
          <View style={styles.filterRow}>
            {([['ALL', 'All activity'], ['LISTING', 'My listings'], ['REQUESTS', 'My requests']] as const).map(([value, label]) => (
              <Pressable key={value} onPress={() => setRoleFilter(value)} style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, roleFilter === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={[styles.filterChipText, { color: roleFilter === value ? '#FFFFFF' : colors.mutedText }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.filterLabel, { color: colors.mutedText }]}>Type</Text>
          <View style={styles.filterRow}>
            {([['ALL', 'All types'], ['SALE', 'Sales'], ['BORROW', 'Lending']] as const).map(([value, label]) => (
              <Pressable key={value} onPress={() => setTypeFilter(value)} style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }, typeFilter === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={[styles.filterChipText, { color: typeFilter === value ? '#FFFFFF' : colors.mutedText }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {error ? <View style={[styles.empty, { backgroundColor: colors.card }]}><Text style={[styles.emptyTitle, { color: colors.text }]}>{error}</Text></View> : filteredTransactions.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.card }]}><Text style={styles.emoji}>📋</Text><Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</Text><Text style={[styles.description, { color: colors.mutedText }]}>No transactions match these filters.</Text></View> : filteredTransactions.map((transaction) => {
          const listingDetails = typeof transaction.listingId === 'string' ? undefined : transaction.listingId;
          const listing = listingDetails?.title ?? (transaction.listingId as string);
          const owner = typeof transaction.listingOwnerId === 'string' ? undefined : transaction.listingOwnerId;
          const requester = typeof transaction.requesterId === 'string' ? undefined : transaction.requesterId;
          const otherParty = typeof transaction.listingOwnerId !== 'string' && transaction.listingOwnerId._id === userId ? requester : owner;
          const amountPaise = transaction.type === 'SALE'
            ? transaction.sale?.agreedPricePaise ?? listingDetails?.sale?.pricePaise
            : transaction.borrow?.agreedFeePaise;
          const action = actionFor(transaction, userId);
          const ownerId = typeof transaction.listingOwnerId === 'string' ? transaction.listingOwnerId : transaction.listingOwnerId._id;
          const pendingIncoming = transaction.status === 'PENDING' && ownerId === userId;
          const reviewAuthorId = (review: NonNullable<Transaction['reviews']>[number]) =>
            typeof review.reviewerId === 'string' ? review.reviewerId : review.reviewerId._id;
          const hasReviewed = transaction.reviews?.some((review) => reviewAuthorId(review) === userId) ?? false;
          const receivedReview = transaction.reviews?.find((review) => reviewAuthorId(review) !== userId);
          const receivedReviewerName = receivedReview
            ? typeof receivedReview.reviewerId === 'string'
              ? otherParty?.fullName ?? 'Other participant'
              : receivedReview.reviewerId.fullName
            : null;
          const receivedRating = receivedReview ? Number(receivedReview.rating) : 0;
          const expanded = expandedTransactionId === transaction._id;
          return <View key={transaction._id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable onPress={() => setExpandedTransactionId(expanded ? null : transaction._id)}>
              <Text style={[styles.listing, { color: colors.text }]}>{listing}</Text>
              <Text style={[styles.meta, { color: colors.mutedText }]}>{transaction.type} · {transaction.status}</Text>
              <Text style={[styles.meta, { color: colors.mutedText }]}>Quantity: {transaction.requestedQuantity ?? 1}</Text>
              {transaction.borrow?.startDate && transaction.borrow.expectedReturnDate && <Text style={[styles.meta, { color: colors.mutedText }]}>From {transaction.borrow.startDate} to {transaction.borrow.expectedReturnDate}</Text>}
              <Text style={[styles.detailsHint, { color: colors.accent }]}>{expanded ? 'Hide details' : 'View details'}</Text>
            </Pressable>
            {expanded && <View style={[styles.details, { borderTopColor: colors.border }]}>
              <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Other party</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{otherParty?.fullName ?? 'Participant details unavailable'}</Text>
              {otherParty?.collegeName && <Text style={[styles.meta, { color: colors.mutedText }]}>{otherParty.collegeName}</Text>}
              <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Item</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{listing}</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedText }]}>Cost</Text>
              <Text style={[styles.detailValue, { color: colors.accent }]}>{amountPaise ? `₹${(amountPaise / 100).toFixed(2)}` : transaction.type === 'BORROW' ? 'Free / not agreed' : 'Unavailable'}</Text>
              {transaction.borrow?.startDate && transaction.borrow.expectedReturnDate && <><Text style={[styles.detailLabel, { color: colors.mutedText }]}>Borrowing dates</Text><Text style={[styles.detailValue, { color: colors.text }]}>From {transaction.borrow.startDate} to {transaction.borrow.expectedReturnDate}</Text></>}
              {transaction.status === 'COMPLETED' && <View style={[styles.reviewBox, { borderTopColor: colors.border }]}>
                <Text style={[styles.detailLabel, { color: colors.mutedText }]}>{hasReviewed ? 'Your review' : 'Review this transaction'}</Text>
                {hasReviewed ? <Text style={[styles.detailValue, { color: colors.success }]}>Submitted</Text> : <>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((rating) => <Pressable key={rating} onPress={() => setReviewRating(rating)}><Text style={[styles.star, { color: rating <= reviewRating ? colors.warning : colors.border }]}>★</Text></Pressable>)}
                  </View>
                  <TextInput placeholder="Optional feedback" placeholderTextColor={colors.mutedText} value={reviewComment} onChangeText={setReviewComment} maxLength={500} style={[styles.reviewInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
                  <Pressable onPress={() => void submitReview(transaction)} style={[styles.action, { backgroundColor: colors.accent }]}><Text style={styles.actionText}>Submit review</Text></Pressable>
                </>}
                {receivedReview && <Text style={[styles.meta, { color: colors.mutedText }]}>{receivedReviewerName ?? 'Other participant'} rated this transaction: {receivedRating >= 1 && receivedRating <= 5 ? `${'★'.repeat(receivedRating)} (${receivedRating}/5)` : 'Rating unavailable'}{receivedReview.comment ? ` — ${receivedReview.comment}` : ''}</Text>}
              </View>}
            </View>}
            {(action || pendingIncoming) && <View style={styles.actionRow}>
              {action && <Pressable onPress={() => void runAction(transaction, action)} style={[styles.action, { backgroundColor: colors.accent }]}><Text style={styles.actionText}>{action.replace('-', ' ')}</Text></Pressable>}
              {pendingIncoming && <Pressable onPress={() => void runAction(transaction, 'reject')} style={[styles.action, styles.rejectAction, { borderColor: colors.error }]}><Text style={[styles.rejectText, { color: colors.error }]}>Reject</Text></Pressable>}
            </View>}
          </View>;
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 6, marginBottom: 22 },
  empty: { alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#FFFFFF', borderRadius: 14 },
  emoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  description: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 7 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 15, marginBottom: 12 },
  listing: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  meta: { color: '#64748B', fontSize: 12, marginTop: 6 },
  action: { alignSelf: 'flex-start', backgroundColor: '#2563EB', borderRadius: 9, paddingHorizontal: 13, paddingVertical: 9, marginTop: 12 },
  rejectAction: { backgroundColor: 'transparent', borderWidth: 1, marginLeft: 8 },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  rejectText: { fontSize: 12, fontWeight: '700' },
  detailsHint: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  details: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  detailLabel: { fontSize: 11, fontWeight: '600', marginTop: 8 },
  detailValue: { fontSize: 14, fontWeight: '700', marginTop: 3 },
  filterGroup: { marginBottom: 18 },
  filterLabel: { fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 6 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  actionRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  reviewBox: { borderTopWidth: 1, marginTop: 14, paddingTop: 4 },
  starRow: { flexDirection: 'row', marginTop: 8 },
  star: { fontSize: 28, marginRight: 4 },
  reviewInput: { borderWidth: 1, borderRadius: 9, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, marginTop: 8 },
});
