import mongoose, { Schema } from 'mongoose';

export const CATEGORIES = [
  'BOOKS_STUDY_MATERIALS', 'ELECTRONICS_GADGETS', 'CALCULATORS',
  'LAB_WORKSHOP_EQUIPMENT', 'SPORTS_FITNESS', 'HOSTEL_DAILY_ESSENTIALS',
  'ACCESSORIES', 'OTHER',
] as const;
export const CONDITIONS = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR'] as const;
export const TRANSACTION_STATUSES = [
  'PENDING', 'ACCEPTED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING',
  'COMPLETED', 'REJECTED', 'CANCELLED', 'CANCELLED_BY_ADMIN',
] as const;

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  collegeName: { type: String, required: true, trim: true },
  phoneNumber: String,
  preferredContactMethod: { type: String, enum: ['PHONE', 'EMAIL'] },
  notificationPreferences: {
    inAppEnabled: { type: Boolean, default: true },
  },
  privacyPreferences: {
    contactSharingEnabled: { type: Boolean, default: false },
  },
  role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
  accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'], default: 'ACTIVE' },
}, { timestamps: true });

const listingSchema = new Schema({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, enum: CATEGORIES, required: true, index: true },
  condition: { type: String, enum: CONDITIONS, required: true },
  listingType: { type: String, enum: ['SALE', 'LEND'], required: true, index: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  availableQuantity: { type: Number, required: true, min: 0, default: 1 },
  images: { type: [{ publicId: String, secureUrl: String }], default: [] },
  sale: { pricePaise: Number },
  lend: {
    minDays: Number, maxDays: Number, advanceNoticeDays: Number, notes: String,
    feeMode: { type: String, enum: ['FREE', 'PAID_NEGOTIABLE'], default: 'FREE' },
    minFeePaise: Number, maxFeePaise: Number,
  },
  status: { type: String, required: true, index: true },
  reservationVersion: { type: Number, default: 0 },
  reservedByTransactionId: Schema.Types.ObjectId,
  soldAt: Date,
}, { timestamps: true });
listingSchema.index({ title: 'text', description: 'text' });

const transactionSchema = new Schema({
  listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  listingOwnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['SALE', 'BORROW'], required: true },
  requestedQuantity: { type: Number, required: true, min: 1, default: 1 },
  status: { type: String, enum: TRANSACTION_STATUSES, required: true, index: true },
  idempotencyKey: { type: String, required: true },
  requestMessage: String,
  sale: { agreedPricePaise: Number, sellerHandoverConfirmedAt: Date, buyerReceiptConfirmedAt: Date },
  borrow: {
    startDate: String, expectedReturnDate: String,
    agreedFeePaise: Number,
    feeNegotiationStatus: { type: String, enum: ['NOT_REQUIRED', 'OPEN', 'COUNTERED', 'AGREED', 'REJECTED'] },
    feeOffers: [{ proposerId: Schema.Types.ObjectId, amountPaise: Number, action: String, createdAt: Date }],
    payment: { status: { type: String, enum: ['NOT_REQUIRED', 'ORDER_PENDING', 'PENDING_VERIFICATION', 'PAID', 'FAILED', 'REFUNDED'] }, provider: String, providerOrderId: String, verifiedAt: Date },
    lenderHandoverConfirmedAt: Date, borrowerReceiptConfirmedAt: Date,
    borrowerReturnMarkedAt: Date, lenderReturnConfirmedAt: Date, returnIssueReason: String,
  },
  acceptedAt: Date, rejectedAt: Date, cancelledAt: Date, completedAt: Date,
  cancellationReason: String,
  statusHistory: { type: [{ from: String, to: String, actorId: Schema.Types.ObjectId, actorRole: String, reason: String, at: Date }], default: [] },
}, { timestamps: true });
transactionSchema.index({ requesterId: 1, idempotencyKey: 1 }, { unique: true });
transactionSchema.index({ listingId: 1, type: 1, status: 1 });

const notificationSchema = new Schema({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorId: Schema.Types.ObjectId, type: String, title: String, body: String,
  resourceType: String, resourceId: Schema.Types.ObjectId, readAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } });

const sessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  refreshTokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const reviewSchema = new Schema({
  transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
  reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  revieweeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });
reviewSchema.index({ transactionId: 1, reviewerId: 1 }, { unique: true });

export const User = mongoose.model('User', userSchema);
export const Listing = mongoose.model('Listing', listingSchema);
export const Transaction = mongoose.model('Transaction', transactionSchema);
export const Notification = mongoose.model('Notification', notificationSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const Review = mongoose.model('Review', reviewSchema);
