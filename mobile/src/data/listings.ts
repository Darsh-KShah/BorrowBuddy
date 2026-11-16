
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

export const listings: Listing[] = [
  {
    id: '1',
    title: 'Engineering Mathematics',
    category: 'Books',
    condition: 'GOOD',
    price: '₹250',
    type: 'SALE',
    owner: 'Rahul',
    emoji: '📚',
    featured: true,
    description: 'Engineering Mathematics textbook. Good condition, useful for semester preparation.',
    quantity: 1,
  },
  {
    id: '2',
    title: 'Casio Scientific Calculator',
    category: 'Calculators',
    condition: 'LIKE_NEW',
    price: 'Free to borrow',
    type: 'LEND',
    owner: 'Ananya',
    emoji: '🧮',
    featured: true,
    description: 'Scientific calculator in excellent working condition. Available for free lending.',
    quantity: 1,
  },
  {
    id: '3',
    title: 'Bluetooth Headphones',
    category: 'Electronics',
    condition: 'GOOD',
    price: '₹800',
    type: 'SALE',
    owner: 'Aditya',
    emoji: '🎧',
    description: 'Bluetooth headphones in good working condition.',
    quantity: 1,
  },
  {
    id: '4',
    title: 'Badminton Racket',
    category: 'Sports',
    condition: 'LIKE_NEW',
    price: 'Free to borrow',
    type: 'LEND',
    owner: 'Karan',
    emoji: '🏸',
    description: 'Well-maintained badminton racket available for borrowing.',
    quantity: 1,
  },
  {
    id: '5',
    title: 'Data Structures Notes',
    category: 'Books',
    condition: 'GOOD',
    price: '₹100',
    type: 'SALE',
    owner: 'Priya',
    emoji: '📝',
    description: 'Handwritten Data Structures notes covering important concepts.',
    quantity: 1,
  },
  {
    id: '6',
    title: 'Physics Lab Kit',
    category: 'Lab Equipment',
    condition: 'FAIR',
    price: 'Free to borrow',
    type: 'LEND',
    owner: 'Rohan',
    emoji: '🔬',
    description: 'Basic physics lab kit available for temporary borrowing.',
    quantity: 1,
  },
];
