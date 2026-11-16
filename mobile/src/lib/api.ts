import * as SecureStore from 'expo-secure-store';
import type { Listing } from '../types/listing';

const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not configured. Create mobile/.env before starting Expo.');
}
const ACCESS_TOKEN_KEY = 'borrowbuddy.access-token';
const REFRESH_TOKEN_KEY = 'borrowbuddy.refresh-token';

type ApiResponse<T> = { success: true; data: T; meta?: unknown } | {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

const refreshAccessToken = async () => {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return false;
  const payload = (await response.json()) as ApiResponse<{ accessToken: string; refreshToken: string }>;
  if (!payload.success) return false;
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, payload.data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, payload.data.refreshToken);
  return true;
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const makeRequest = async () => {
    const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...init.headers,
      },
    });
  };
  let response = await makeRequest();
  if (response.status === 401 && !['/auth/register', '/auth/login', '/auth/refresh'].includes(path)) {
    if (await refreshAccessToken()) response = await makeRequest();
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !payload.success) {
    if (!payload.success) throw new Error(payload.error.message);
    throw new Error(`Request failed with status ${response.status}`);
  }
  return payload.data;
};

export type SessionUser = {
  id: string;
  fullName: string;
  email: string;
  collegeName: string;
  role: 'STUDENT' | 'ADMIN';
  notificationPreferences: { inAppEnabled: boolean };
  privacyPreferences: { contactSharingEnabled: boolean };
};

type AuthResult = { user: SessionUser; accessToken: string; refreshToken: string };
const saveSession = async (result: AuthResult) => {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, result.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken);
  return result.user;
};

export const authApi = {
  register: async (input: { fullName: string; email: string; password: string; collegeName: string }) =>
    saveSession(await request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(input) })),
  login: async (input: { email: string; password: string }) =>
    saveSession(await request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) })),
  me: () => request<SessionUser>('/auth/me'),
  updateProfile: (input: { fullName: string; collegeName: string }) =>
    request<SessionUser>('/auth/me', { method: 'PATCH', body: JSON.stringify(input) }),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<void>('/auth/change-password', { method: 'POST', body: JSON.stringify(input) }),
  updatePreferences: (input: { inAppNotifications: boolean; contactSharing: boolean }) =>
    request<SessionUser>('/auth/preferences', { method: 'PATCH', body: JSON.stringify(input) }),
  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    try {
      await request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  },
};

export const listingApi = {
  list: async () => {
    const response = await request<RawListing[]>('/listings');
    return response.map(toListing);
  },
  get: async (id: string) => toListing(await request<RawListing>(`/listings/${id}`)),
  mine: async () => {
    const response = await request<RawListing[]>('/listings/mine');
    return response.map(toListing);
  },
  create: (input: unknown) => request<RawListing>('/listings', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: unknown) => request<RawListing>(`/listings/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deactivate: (id: string) => request<RawListing>(`/listings/${id}/deactivate`, { method: 'POST' }),
  signUpload: () => request<{ cloudName: string; apiKey: string; timestamp: number; folder: string; signature: string }>('/uploads/signature', { method: 'POST', body: JSON.stringify({}) }),
};

export const uploadImage = async (uri: string, signature: Awaited<ReturnType<typeof listingApi.signUpload>>) => {
  const body = new FormData();
  body.append('file', { uri, name: 'listing-image.jpg', type: 'image/jpeg' } as unknown as Blob);
  body.append('api_key', signature.apiKey);
  body.append('timestamp', String(signature.timestamp));
  body.append('folder', signature.folder);
  body.append('signature', signature.signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: 'POST', body });
  if (!response.ok) throw new Error('Cloudinary image upload failed.');
  const result = await response.json() as { public_id: string; secure_url: string };
  return { publicId: result.public_id, secureUrl: result.secure_url };
};

export type Transaction = {
  _id: string;
  listingId: { _id: string; title: string; listingType: 'SALE' | 'LEND'; sale?: { pricePaise?: number } } | string;
  listingOwnerId: { _id: string; fullName: string; collegeName: string } | string;
  requesterId: { _id: string; fullName: string; collegeName: string } | string;
  type: 'SALE' | 'BORROW';
  status: string;
  requestedQuantity: number;
  sale?: { agreedPricePaise?: number };
  borrow?: { startDate?: string; expectedReturnDate?: string; agreedFeePaise?: number };
  reviews?: Array<{ reviewerId: string | { _id: string; fullName: string }; revieweeId: string; rating: number; comment?: string }>;
};

export const transactionApi = {
  listMine: () => request<Transaction[]>('/transactions/me'),
  saleRequest: (listingId: string, quantity = 1) => request<Transaction>('/transactions/sale-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': `${Date.now()}-${Math.random()}` },
    body: JSON.stringify({ listingId, quantity }),
  }),
  borrowRequest: (listingId: string, startDate: string, expectedReturnDate: string, quantity = 1) => request<Transaction>('/transactions/borrow-requests', {
    method: 'POST',
    headers: { 'Idempotency-Key': `${Date.now()}-${Math.random()}` },
    body: JSON.stringify({ listingId, startDate, expectedReturnDate, quantity }),
  }),
  action: (id: string, action: string, body?: unknown) => request<Transaction>(`/transactions/${id}/${action}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  }),
  review: (id: string, rating: number, comment?: string) => request(`/transactions/${id}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, ...(comment?.trim() ? { comment: comment.trim() } : {}) }),
  }),
};

type RawListing = {
  _id: string;
  title: string;
  description: string;
  category: string;
  condition: Listing['condition'];
  listingType: Listing['type'];
  quantity?: number;
  availableQuantity?: number;
  sale?: { pricePaise?: number };
  lend?: { minDays?: number; maxDays?: number; feeMode?: 'FREE' | 'PAID_NEGOTIABLE' };
  createdAt?: string;
  ownerId?: { fullName?: string } | string;
};

const categoryLabels: Record<string, string> = {
  BOOKS_STUDY_MATERIALS: 'Books',
  ELECTRONICS_GADGETS: 'Electronics',
  CALCULATORS: 'Calculators',
  LAB_WORKSHOP_EQUIPMENT: 'Lab Equipment',
  SPORTS_FITNESS: 'Sports',
  HOSTEL_DAILY_ESSENTIALS: 'Hostel',
  ACCESSORIES: 'Accessories',
  OTHER: 'Other',
};

const categoryEmoji: Record<string, string> = {
  BOOKS_STUDY_MATERIALS: '📚',
  ELECTRONICS_GADGETS: '🎧',
  CALCULATORS: '🧮',
  LAB_WORKSHOP_EQUIPMENT: '🔬',
  SPORTS_FITNESS: '🏸',
  HOSTEL_DAILY_ESSENTIALS: '🏠',
  ACCESSORIES: '🎒',
  OTHER: '📦',
};

const toListing = (item: RawListing): Listing => {
  const owner = typeof item.ownerId === 'string' ? 'Student' : item.ownerId?.fullName ?? 'Student';
  return {
    id: item._id,
    title: item.title,
    category: categoryLabels[item.category] ?? item.category,
    condition: item.condition,
    price: item.listingType === 'SALE' && item.sale?.pricePaise
      ? `₹${item.sale.pricePaise / 100}`
      : 'Free to borrow',
    type: item.listingType,
    owner,
    emoji: categoryEmoji[item.category] ?? '📦',
    description: item.description,
    quantity: item.quantity ?? 1,
    availableQuantity: item.availableQuantity,
    createdAt: item.createdAt,
    lendingPolicy: item.lend,
  };
};
