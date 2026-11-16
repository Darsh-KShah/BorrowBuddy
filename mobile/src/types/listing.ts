export type ListingType = 'SALE' | 'LEND';

export type Listing = {
  id: string;
  title: string;
  category: string;
  condition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR';
  price: string;
  type: ListingType;
  owner: string;
  emoji: string;
  featured?: boolean;
  description: string;
  quantity: number;
  availableQuantity?: number;
  createdAt?: string;
  lendingPolicy?: { minDays?: number; maxDays?: number; feeMode?: 'FREE' | 'PAID_NEGOTIABLE' };
};
