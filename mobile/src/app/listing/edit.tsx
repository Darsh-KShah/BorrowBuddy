import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { listingApi, uploadImage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const categoryOptions = [
  ['Books', 'BOOKS_STUDY_MATERIALS'],
  ['Electronics', 'ELECTRONICS_GADGETS'],
  ['Calculators', 'CALCULATORS'],
  ['Lab Equipment', 'LAB_WORKSHOP_EQUIPMENT'],
  ['Sports', 'SPORTS_FITNESS'],
  ['Hostel', 'HOSTEL_DAILY_ESSENTIALS'],
  ['Accessories', 'ACCESSORIES'],
  ['Other', 'OTHER'],
] as const;

export default function EditListingScreen() {
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [category, setCategory] = useState('CALCULATORS');
  const [condition, setCondition] = useState('GOOD');
  const [listingType, setListingType] = useState<'SALE' | 'LEND'>('SALE');
  const [price, setPrice] = useState('');
  const [feeMode, setFeeMode] = useState<'FREE' | 'PAID_NEGOTIABLE'>('FREE');
  const [minDays, setMinDays] = useState('1');
  const [maxDays, setMaxDays] = useState('7');
  const [images, setImages] = useState<{ uri: string; publicId?: string; secureUrl?: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    listingApi.get(id).then((item) => {
      setTitle(item.title);
      setDescription(item.description);
      setQuantity(String(item.quantity ?? 1));
      const option = categoryOptions.find(([label]) => label === item.category);
      if (option) setCategory(option[1]);
      setCondition(item.condition);
      setListingType(item.type);
      if (item.type === 'SALE') setPrice(item.price.replace(/[^\d.]/g, ''));
    }).catch((error: unknown) => Alert.alert('Unable to load listing', error instanceof Error ? error.message : 'Try again.'));
  }, [id]);

  const chooseImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to add listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.8 });
    if (!result.canceled) setImages(result.assets.slice(0, 5).map((asset) => ({ uri: asset.uri })));
  };

  const save = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Sign in before creating or editing a listing.', [{ text: 'Sign in', onPress: () => router.push('/auth/login') }]);
      return;
    }
    if (!title.trim() || description.trim().length < 10) {
      Alert.alert('Check your listing', 'Add a title and at least 10 characters of description.');
      return;
    }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) {
      Alert.alert('Check quantity', 'Enter at least 1 available item.');
      return;
    }
    if (listingType === 'SALE' && (!Number.isFinite(Number(price)) || Number(price) <= 0)) {
      Alert.alert('Check your listing', 'Enter a sale price greater than zero.');
      return;
    }
    if (listingType === 'LEND' && (!Number.isInteger(Number(minDays)) || !Number.isInteger(Number(maxDays)) || Number(minDays) < 1 || Number(maxDays) < Number(minDays))) {
      Alert.alert('Check your lending policy', 'Enter valid minimum and maximum lending days.');
      return;
    }
    setSaving(true);
    let uploadedImages: { publicId: string; secureUrl: string }[] = [];
    try {
      if (images.length) {
        const signature = await listingApi.signUpload();
        uploadedImages = await Promise.all(images.map((image) => image.publicId && image.secureUrl ? Promise.resolve({ publicId: image.publicId, secureUrl: image.secureUrl }) : uploadImage(image.uri, signature)));
      }
    } catch (error) {
      Alert.alert('Image upload failed', error instanceof Error ? error.message : 'Try again.');
      setSaving(false);
      return;
    }
    const body = {
      title: title.trim(),
      description: description.trim(),
      category,
      condition,
      listingType,
      quantity: Number(quantity),
      images: uploadedImages,
      ...(listingType === 'SALE'
        ? { sale: { pricePaise: Math.round(Number(price) * 100) } }
        : { lend: { feeMode, minDays: Number(minDays), maxDays: Number(maxDays) } }),
    };
    try {
      if (id) await listingApi.update(id, body);
      else await listingApi.create(body);
      Alert.alert('Saved', 'Your listing was saved.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      Alert.alert('Unable to save listing', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.keyboardAvoidingView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text }]}>{id ? 'Edit listing' : 'Create listing'}</Text>
        <TextInput placeholderTextColor={colors.mutedText} placeholder="Title" value={title} onChangeText={setTitle} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
        <TextInput placeholderTextColor={colors.mutedText} placeholder="Description" value={description} onChangeText={setDescription} multiline style={[styles.input, styles.description, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
        <Pressable disabled style={[styles.secondary, styles.disabledSecondary, { borderColor: colors.border }]}><Text style={[styles.secondaryText, { color: colors.mutedText }]}>Image uploads — coming soon</Text></Pressable>
        <TextInput placeholderTextColor={colors.mutedText} placeholder="Total quantity available" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {categoryOptions.map(([label, value]) => <Pressable key={value} onPress={() => setCategory(value)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, category === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={category === value ? styles.selectedText : [styles.chipText, { color: colors.mutedText }]}>{label}</Text></Pressable>)}
        </ScrollView>
        <Text style={[styles.label, { color: colors.text }]}>Condition</Text>
        <View style={styles.row}>{['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'].map((value) => <Pressable key={value} onPress={() => setCondition(value)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, condition === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={condition === value ? styles.selectedText : [styles.chipText, { color: colors.mutedText }]}>{value.replace('_', ' ')}</Text></Pressable>)}</View>
        <Text style={[styles.label, { color: colors.text }]}>Listing type</Text>
        <View style={styles.row}>{(['SALE', 'LEND'] as const).map((value) => <Pressable key={value} onPress={() => setListingType(value)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, listingType === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={listingType === value ? styles.selectedText : [styles.chipText, { color: colors.mutedText }]}>{value}</Text></Pressable>)}</View>
        {listingType === 'SALE' ? <TextInput placeholderTextColor={colors.mutedText} placeholder="Price in INR" keyboardType="decimal-pad" value={price} onChangeText={setPrice} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} /> : <>
          <Text style={[styles.label, { color: colors.text }]}>Lending fee</Text>
          <View style={styles.row}>{(['FREE', 'PAID_NEGOTIABLE'] as const).map((value) => <Pressable key={value} onPress={() => setFeeMode(value)} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }, feeMode === value && { backgroundColor: colors.accent, borderColor: colors.accent }]}><Text style={feeMode === value ? styles.selectedText : [styles.chipText, { color: colors.mutedText }]}>{value === 'FREE' ? 'Free' : 'Paid / negotiable'}</Text></Pressable>)}</View>
          <Text style={[styles.helper, { color: colors.mutedText }]}>Free means no online lending fee. Paid / negotiable lets the borrower and lender agree on a fee later.</Text>
          <TextInput placeholderTextColor={colors.mutedText} placeholder="Minimum lending duration (days)" keyboardType="number-pad" value={minDays} onChangeText={setMinDays} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
          <TextInput placeholderTextColor={colors.mutedText} placeholder="Maximum lending duration (days)" keyboardType="number-pad" value={maxDays} onChangeText={setMaxDays} style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} />
          <Text style={[styles.helper, { color: colors.mutedText }]}>These are inclusive calendar days. For example, 1 to 1 is a one-day booking.</Text>
        </>}
        <Pressable disabled={saving || authLoading} onPress={() => void save()} style={[styles.primary, { backgroundColor: colors.accent }]}><Text style={styles.primaryText}>{authLoading ? 'Restoring session…' : saving ? 'Saving…' : 'Save listing'}</Text></Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  keyboardAvoidingView: { flex: 1 },
  content: { padding: 20, paddingBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 22 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 12, color: '#0F172A' },
  description: { minHeight: 110, textAlignVertical: 'top' },
  label: { color: '#0F172A', fontWeight: '700', marginTop: 8, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9 },
  selected: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  selectedText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  primary: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: '#2563EB', fontWeight: '700' },
  disabledSecondary: { opacity: 0.8 },
  helper: { fontSize: 12, lineHeight: 18, marginBottom: 10 },
});
