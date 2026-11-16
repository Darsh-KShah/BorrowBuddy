import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { config } from './config.js';
import { User, Listing, Transaction, Notification, Session, Review } from './models.js';
import { accessToken, createRefreshSession, hashPassword, hashRefreshToken, requireAuth, verifyPassword, verifyRefreshToken, type AuthRequest } from './auth.js';
import { accountPreferencesSchema, borrowRequestSchema, changePasswordSchema, inclusiveDurationDays, listingSchema, loginSchema, overlapsInclusive, profileUpdateSchema, reasonSchema, registerSchema, reviewSchema, saleRequestSchema } from './validation.js';

const app = express();
app.use(cors({ origin: config.mobileOrigin === '*' ? true : config.mobileOrigin }));
app.use(express.json({ limit: '1mb' }));
const ok = (data: unknown, meta: unknown = {}) => ({ success: true, data, meta });
const fail = (res: Response, status: number, code: string, message: string, details?: unknown) => res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } });
const parse = <T>(schema: { safeParse: (input: unknown) => { success: boolean; data?: T; error?: { issues: unknown[] } } }, input: unknown, res: Response): T | undefined => {
  const result = schema.safeParse(input);
  if (!result.success) { fail(res, 422, 'VALIDATION_ERROR', 'The request contains invalid fields.', result.error?.issues); return undefined; }
  return result.data;
};
const notify = (recipientId: string, actorId: string, type: string, title: string, body: string, resourceId: string) =>
  Notification.create({ recipientId, actorId, type, title, body, resourceType: 'TRANSACTION', resourceId });
const validateImages = (images: Array<{ publicId: string; secureUrl: string }>) => {
  if (!images.length) return true;
  if (!config.cloudinaryCloudName) return false;
  const prefix = `https://res.cloudinary.com/${config.cloudinaryCloudName}/image/upload/`;
  return images.every((image) => image.publicId.startsWith(`${config.cloudinaryFolder}/`) && image.secureUrl.startsWith(prefix));
};

app.get('/health', (_req, res) => res.json(ok({ service: 'borrowbuddy-api', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })));

app.post('/api/v1/auth/register', async (req, res, next) => {
  try {
    const input = parse(registerSchema, req.body, res); if (!input) return;
    const exists = await User.exists({ email: input.email }); if (exists) return fail(res, 409, 'DUPLICATE_EMAIL', 'An account with this email already exists.');
    const user = await User.create({ ...input, passwordHash: await hashPassword(input.password) });
    const tokens = { accessToken: accessToken({ id: user.id, role: user.role }), refreshToken: await createRefreshSession(user.id) };
    res.status(201).json(ok({ user: publicUser(user), ...tokens }));
  } catch (error) { next(error); }
});
app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const input = parse(loginSchema, req.body, res); if (!input) return;
    const user = await User.findOne({ email: input.email.toLowerCase() }); if (!user || !(await verifyPassword(input.password, user.passwordHash))) return fail(res, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    res.json(ok({ user: publicUser(user), accessToken: accessToken({ id: user.id, role: user.role }), refreshToken: await createRefreshSession(user.id) }));
  } catch (error) { next(error); }
});
app.post('/api/v1/auth/refresh', async (req, res, next) => {
  try {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : '';
    if (!token) return fail(res, 401, 'AUTH_REQUIRED', 'Refresh token is required.');
    let payload;
    try { payload = verifyRefreshToken(token); } catch { return fail(res, 401, 'AUTH_REQUIRED', 'Refresh token is invalid or expired.'); }
    if (payload.type !== 'refresh' || !payload.sub) return fail(res, 401, 'AUTH_REQUIRED', 'Refresh token is invalid.');
    const session = await Session.findOne({ userId: payload.sub, refreshTokenHash: hashRefreshToken(token), revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    if (!session) return fail(res, 401, 'AUTH_REQUIRED', 'Refresh token has been revoked or expired.');
    session.revokedAt = new Date();
    await session.save();
    const user = await User.findById(payload.sub).select('_id role accountStatus');
    if (!user || user.accountStatus !== 'ACTIVE') return fail(res, 403, 'FORBIDDEN', 'Account is not active.');
    res.json(ok({ accessToken: accessToken({ id: user.id, role: user.role }), refreshToken: await createRefreshSession(user.id) }));
  } catch (error) { next(error); }
});
app.post('/api/v1/auth/logout', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const token = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    await Session.updateMany({ userId: req.user!.id, ...(token ? { refreshTokenHash: hashRefreshToken(token) } : {}) }, { $set: { revokedAt: new Date() } });
    res.status(204).send();
  } catch (error) { next(error); }
});
app.get('/api/v1/auth/me', requireAuth, async (req: AuthRequest, res, next) => {
  try { const user = await User.findById(req.user!.id); if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.'); res.json(ok(publicUser(user))); } catch (error) { next(error); }
});
app.patch('/api/v1/auth/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(profileUpdateSchema, req.body, res); if (!input) return;
    const user = await User.findByIdAndUpdate(req.user!.id, { $set: input }, { new: true, runValidators: true });
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');
    res.json(ok(publicUser(user)));
  } catch (error) { next(error); }
});
app.post('/api/v1/auth/change-password', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(changePasswordSchema, req.body, res); if (!input) return;
    const user = await User.findById(req.user!.id); if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) return fail(res, 422, 'CURRENT_PASSWORD_INVALID', 'The current password is incorrect.');
    if (input.currentPassword === input.newPassword) return fail(res, 422, 'PASSWORD_UNCHANGED', 'Choose a different password.');
    user.passwordHash = await hashPassword(input.newPassword);
    await user.save();
    await Session.updateMany({ userId: user.id, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
    res.status(204).send();
  } catch (error) { next(error); }
});
app.patch('/api/v1/auth/preferences', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(accountPreferencesSchema, req.body, res); if (!input) return;
    const user = await User.findByIdAndUpdate(req.user!.id, {
      $set: {
        'notificationPreferences.inAppEnabled': input.inAppNotifications,
        'privacyPreferences.contactSharingEnabled': input.contactSharing,
      },
    }, { new: true, runValidators: true });
    if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found.');
    res.json(ok(publicUser(user)));
  } catch (error) { next(error); }
});

app.get('/api/v1/listings', async (req, res, next) => {
  try {
    const query: Record<string, unknown> = { status: { $in: ['AVAILABLE', 'ACTIVE'] } };
    if (typeof req.query.listingType === 'string') query.listingType = req.query.listingType;
    if (typeof req.query.category === 'string') query.category = req.query.category;
    if (typeof req.query.condition === 'string') query.condition = req.query.condition;
    if (typeof req.query.q === 'string' && req.query.q.trim()) query.$text = { $search: req.query.q.trim() };
    const page = Math.max(1, Number(req.query.page ?? 1)); const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20)));
    const [items, total] = await Promise.all([Listing.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('ownerId', 'fullName collegeName'), Listing.countDocuments(query)]);
    res.json(ok(items, { page, limit, total }));
  } catch (error) { next(error); }
});
app.get('/api/v1/listings/mine', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const items = await Listing.find({ ownerId: req.user!.id }).sort({ createdAt: -1 }).populate('ownerId', 'fullName collegeName');
    res.json(ok(items));
  } catch (error) { next(error); }
});
app.get('/api/v1/listings/:id', async (req, res, next) => {
  try { const item = await Listing.findOne({ _id: req.params.id, status: { $in: ['AVAILABLE', 'ACTIVE'] } }).populate('ownerId', 'fullName collegeName'); if (!item) return fail(res, 404, 'NOT_FOUND', 'Listing not found.'); res.json(ok(item)); } catch (error) { next(error); }
});
app.post('/api/v1/listings', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(listingSchema, req.body, res); if (!input) return;
    if (!validateImages(input.images)) return fail(res, 422, 'VALIDATION_ERROR', 'Images must be verified Cloudinary assets.');
    const status = input.listingType === 'SALE' ? 'AVAILABLE' : 'ACTIVE';
    const item = await Listing.create({ ...input, ownerId: req.user!.id, status, availableQuantity: input.quantity }); res.status(201).json(ok(item));
  } catch (error) { next(error); }
});
app.patch('/api/v1/listings/:id', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(listingSchema, req.body, res); if (!input) return;
    if (!validateImages(input.images)) return fail(res, 422, 'VALIDATION_ERROR', 'Images must be verified Cloudinary assets.');
    const blocked = await Transaction.exists({ listingId: req.params.id, status: { $in: ['ACCEPTED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING'] } });
    if (blocked) return fail(res, 409, 'TRANSACTION_STATE_CONFLICT', 'This listing cannot be edited while a transaction is active.');
    const current = await Listing.findOne({ _id: req.params.id, ownerId: req.user!.id });
    if (!current) return fail(res, 404, 'NOT_FOUND', 'Listing not found.');
    const reservedQuantity = (current.quantity ?? 1) - (current.availableQuantity ?? current.quantity ?? 1);
    if (input.quantity < reservedQuantity) return fail(res, 409, 'QUANTITY_INVALID', `Quantity cannot be lower than the ${reservedQuantity} item(s) already reserved.`);
    const availableQuantity = input.quantity - reservedQuantity;
    const nextStatus = current.listingType === 'SALE' && ['AVAILABLE', 'RESERVED'].includes(current.status)
      ? availableQuantity === 0 ? 'RESERVED' : 'AVAILABLE'
      : current.status;
    const item = await Listing.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!.id },
      { $set: { ...input, availableQuantity, status: nextStatus } },
      { new: true, runValidators: true },
    );
    res.json(ok(item));
  } catch (error) { next(error); }
});
app.post('/api/v1/listings/:id/deactivate', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const blocked = await Transaction.exists({ listingId: req.params.id, status: { $in: ['ACCEPTED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING'] } });
    if (blocked) return fail(res, 409, 'TRANSACTION_STATE_CONFLICT', 'This listing cannot be deactivated while a transaction is active.');
    const item = await Listing.findOneAndUpdate({ _id: req.params.id, ownerId: req.user!.id, status: { $in: ['AVAILABLE', 'ACTIVE'] } }, { $set: { status: 'INACTIVE' } }, { new: true });
    if (!item) return fail(res, 404, 'NOT_FOUND', 'Listing not found or already inactive.');
    res.json(ok(item));
  } catch (error) { next(error); }
});
app.post('/api/v1/uploads/signature', requireAuth, async (_req: AuthRequest, res) => {
  if (!config.cloudinaryCloudName || !config.cloudinaryApiKey || !config.cloudinaryApiSecret) return fail(res, 503, 'CONFIGURATION_ERROR', 'Cloudinary uploads are not configured.');
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `folder=${config.cloudinaryFolder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(`${params}${config.cloudinaryApiSecret}`).digest('hex');
  res.json(ok({ cloudName: config.cloudinaryCloudName, apiKey: config.cloudinaryApiKey, timestamp, folder: config.cloudinaryFolder, signature }));
});

app.post('/api/v1/transactions/sale-requests', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(saleRequestSchema, req.body, res); if (!input) return;
    const listing = await Listing.findOne({ _id: input.listingId, listingType: 'SALE', status: { $in: ['AVAILABLE', 'RESERVED'] } }); if (!listing || input.quantity > (listing.availableQuantity ?? listing.quantity ?? 1)) return fail(res, 409, 'LISTING_UNAVAILABLE', 'The requested quantity is not available.');
    if (listing.ownerId.toString() === req.user!.id) return fail(res, 422, 'SELF_REQUEST_NOT_ALLOWED', 'You cannot request your own listing.');
    const transaction = await Transaction.create({ listingId: listing.id, listingOwnerId: listing.ownerId, requesterId: req.user!.id, requestedQuantity: input.quantity, type: 'SALE', status: 'PENDING', idempotencyKey: req.header('idempotency-key') ?? crypto.randomUUID(), requestMessage: input.requestMessage, statusHistory: [{ from: null, to: 'PENDING', actorId: req.user!.id, actorRole: 'STUDENT', at: new Date() }] });
    await notify(listing.ownerId.toString(), req.user!.id, 'SALE_REQUESTED', 'New purchase request', 'Someone requested your listing.', transaction.id);
    res.status(201).json(ok(transaction));
  } catch (error) { next(error); }
});
app.post('/api/v1/transactions/borrow-requests', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(borrowRequestSchema, req.body, res); if (!input) return;
    const listing = await Listing.findOne({ _id: input.listingId, listingType: 'LEND', status: 'ACTIVE' }); if (!listing) return fail(res, 409, 'LISTING_UNAVAILABLE', 'This lending listing is not available.');
    if (listing.ownerId.toString() === req.user!.id) return fail(res, 422, 'SELF_REQUEST_NOT_ALLOWED', 'You cannot request your own listing.');
    let duration: number; try { duration = inclusiveDurationDays(input.startDate, input.expectedReturnDate); } catch { return fail(res, 422, 'DATE_RANGE_INVALID', 'Expected return date must be on or after start date.'); }
    if (listing.lend?.minDays && duration < listing.lend.minDays || listing.lend?.maxDays && duration > listing.lend.maxDays) return fail(res, 422, 'DATE_RANGE_INVALID', 'Requested duration is outside this listing policy.');
    if (input.quantity > (listing.quantity ?? 1)) return fail(res, 422, 'QUANTITY_INVALID', 'Requested quantity exceeds this listing quantity.');
    const transaction = await Transaction.create({ listingId: listing.id, listingOwnerId: listing.ownerId, requesterId: req.user!.id, requestedQuantity: input.quantity, type: 'BORROW', status: 'PENDING', idempotencyKey: req.header('idempotency-key') ?? crypto.randomUUID(), requestMessage: input.requestMessage, borrow: { startDate: input.startDate, expectedReturnDate: input.expectedReturnDate }, statusHistory: [{ from: null, to: 'PENDING', actorId: req.user!.id, actorRole: 'STUDENT', at: new Date() }] });
    await notify(listing.ownerId.toString(), req.user!.id, 'BORROW_REQUESTED', 'New borrowing request', 'Someone requested your lending listing.', transaction.id);
    res.status(201).json(ok(transaction));
  } catch (error) { next(error); }
});
app.get('/api/v1/transactions/me', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const items = await Transaction.find({ $or: [{ requesterId: req.user!.id }, { listingOwnerId: req.user!.id }] })
      .sort({ createdAt: -1 })
      .populate('listingId', 'title listingType sale')
      .populate('listingOwnerId', 'fullName collegeName')
      .populate('requesterId', 'fullName collegeName');
    const reviews = await Review.find({ transactionId: { $in: items.map((item) => item._id) } })
      .select('transactionId reviewerId revieweeId rating comment createdAt')
      .populate('reviewerId', 'fullName')
      .lean();
    const reviewsByTransaction = new Map<string, typeof reviews>();
    for (const review of reviews) {
      const key = review.transactionId.toString();
      reviewsByTransaction.set(key, [...(reviewsByTransaction.get(key) ?? []), review]);
    }
    res.json(ok(items.map((item) => ({ ...item.toObject(), reviews: reviewsByTransaction.get(item.id) ?? [] }))));
  } catch (error) { next(error); }
});
app.post('/api/v1/transactions/:id/reviews', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(reviewSchema, req.body, res); if (!input) return;
    const transaction = await Transaction.findOne({ _id: req.params.id, status: 'COMPLETED', $or: [{ requesterId: req.user!.id }, { listingOwnerId: req.user!.id }] });
    if (!transaction) return fail(res, 409, 'REVIEW_NOT_ELIGIBLE', 'Only participants may review a completed transaction.');
    const revieweeId = transaction.listingOwnerId.toString() === req.user!.id ? transaction.requesterId : transaction.listingOwnerId;
    if (await Review.exists({ transactionId: transaction.id, reviewerId: req.user!.id })) return fail(res, 409, 'REVIEW_ALREADY_SUBMITTED', 'You have already reviewed this transaction.');
    const review = await Review.create({ transactionId: transaction.id, reviewerId: req.user!.id, revieweeId, ...input });
    await notify(revieweeId.toString(), req.user!.id, 'REVIEW_RECEIVED', 'New review received', 'A participant reviewed your completed transaction.', transaction.id);
    res.status(201).json(ok(review));
  } catch (error) { next(error); }
});
app.post('/api/v1/transactions/:id/accept', requireAuth, async (req: AuthRequest, res, next) => {
  const session = await mongoose.startSession();
  const postCommitNotifications: Array<{ recipientId: string; type: string; title: string; body: string; resourceId: string }> = [];
  try {
    let result: unknown;
    await session.withTransaction(async () => {
      const tx = await Transaction.findOne({ _id: req.params.id, status: 'PENDING', listingOwnerId: req.user!.id }).session(session); if (!tx) throw new ApiError(409, 'TRANSACTION_STATE_CONFLICT', 'Request is no longer pending or you are not the owner.');
      const listing = await Listing.findById(tx.listingId).session(session); if (!listing) throw new ApiError(404, 'NOT_FOUND', 'Listing not found.');
      if (listing.quantity == null) listing.quantity = 1;
      if (listing.availableQuantity == null) listing.availableQuantity = listing.quantity;
      await listing.save({ session });
      const now = new Date();
      if (tx.type === 'SALE') {
        const requestedQuantity = tx.requestedQuantity ?? 1;
        const updated = await Listing.findOneAndUpdate(
          { _id: listing.id, status: { $in: ['AVAILABLE', 'RESERVED'] }, availableQuantity: { $gte: requestedQuantity }, reservationVersion: listing.reservationVersion },
          { $inc: { availableQuantity: -requestedQuantity, reservationVersion: 1 } },
          { new: true, session },
        );
        if (!updated) throw new ApiError(409, 'LISTING_UNAVAILABLE', 'The requested quantity is no longer available.');
        updated.status = updated.availableQuantity === 0 ? 'RESERVED' : 'AVAILABLE';
        updated.reservedByTransactionId = updated.availableQuantity === 0 ? tx.id : undefined;
        await updated.save({ session });
        const pendingSales = await Transaction.find({ listingId: listing.id, type: 'SALE', status: 'PENDING', _id: { $ne: tx.id }, ...(updated.availableQuantity === 0 ? {} : { requestedQuantity: { $gt: updated.availableQuantity } }) }).session(session);
        for (const pending of pendingSales) {
          pending.status = 'REJECTED';
          pending.rejectedAt = now;
          pending.statusHistory.push({ from: 'PENDING', to: 'REJECTED', actorId: req.user!.id, actorRole: 'SYSTEM', reason: 'The requested quantity is no longer available.', at: now });
          await pending.save({ session });
          postCommitNotifications.push({ recipientId: pending.requesterId.toString(), type: 'TRANSACTION_REJECTED', title: 'Request rejected', body: 'The requested quantity is no longer available.', resourceId: pending.id });
        }
        tx.sale = { agreedPricePaise: listing.sale?.pricePaise ?? 0 }; tx.status = 'ACCEPTED';
      } else {
        const overlaps = await Transaction.find({ _id: { $ne: tx.id }, listingId: listing.id, type: 'BORROW', status: { $in: ['ACCEPTED', 'HANDOVER_PENDING', 'ACTIVE', 'RETURN_PENDING'] }, 'borrow.startDate': { $lte: tx.borrow!.expectedReturnDate }, 'borrow.expectedReturnDate': { $gte: tx.borrow!.startDate } }).session(session);
        const requestedQuantity = tx.requestedQuantity ?? 1;
        const usedQuantity = overlaps.reduce((total, overlap) => total + (overlap.requestedQuantity ?? 1), 0);
        const remainingQuantity = (listing.quantity ?? 1) - usedQuantity;
        if (requestedQuantity > remainingQuantity) throw new ApiError(409, 'DATE_RANGE_CONFLICT', 'The requested quantity is no longer available for these dates.');
        const bumped = await Listing.findOneAndUpdate({ _id: listing.id, status: 'ACTIVE', reservationVersion: listing.reservationVersion }, { $inc: { reservationVersion: 1 } }, { new: true, session }); if (!bumped) throw new ApiError(409, 'TRANSACTION_STATE_CONFLICT', 'Listing approval conflicted; retry.');
        if (remainingQuantity - requestedQuantity === 0) {
          const pendingBorrows = await Transaction.find({ listingId: listing.id, type: 'BORROW', status: 'PENDING', _id: { $ne: tx.id }, 'borrow.startDate': { $lte: tx.borrow!.expectedReturnDate }, 'borrow.expectedReturnDate': { $gte: tx.borrow!.startDate } }).session(session);
          for (const pending of pendingBorrows) {
            pending.status = 'REJECTED';
            pending.rejectedAt = now;
            pending.statusHistory.push({ from: 'PENDING', to: 'REJECTED', actorId: req.user!.id, actorRole: 'SYSTEM', reason: 'The requested quantity is no longer available for these dates.', at: now });
            await pending.save({ session });
            postCommitNotifications.push({ recipientId: pending.requesterId.toString(), type: 'TRANSACTION_REJECTED', title: 'Request rejected', body: 'The requested quantity is no longer available for these dates.', resourceId: pending.id });
          }
        }
        tx.status = 'ACCEPTED';
      }
      tx.acceptedAt = now; tx.statusHistory.push({ from: 'PENDING', to: 'ACCEPTED', actorId: req.user!.id, actorRole: 'STUDENT', at: now }); result = await tx.save({ session });
      postCommitNotifications.push({ recipientId: tx.requesterId.toString(), type: 'TRANSACTION_ACCEPTED', title: 'Request accepted', body: 'Your request was accepted.', resourceId: tx.id });
    });
    for (const notification of postCommitNotifications) {
      await notify(notification.recipientId, req.user!.id, notification.type, notification.title, notification.body, notification.resourceId);
    }
    res.json(ok(result));
  } catch (error) { next(error); } finally { await session.endSession(); }
});
app.post('/api/v1/transactions/:id/reject', requireAuth, transactionAction('REJECTED'));
app.post('/api/v1/transactions/:id/withdraw', requireAuth, transactionAction('CANCELLED'));
app.post('/api/v1/transactions/:id/cancel', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const input = parse(reasonSchema, req.body, res); if (!input) return;
    const tx = await Transaction.findOne({ _id: req.params.id, status: 'ACCEPTED', $or: [{ requesterId: req.user!.id }, { listingOwnerId: req.user!.id }] }); if (!tx) return fail(res, 409, 'TRANSACTION_STATE_CONFLICT', 'Only an accepted transaction can be cancelled before handover.');
    tx.status = 'CANCELLED'; tx.cancelledAt = new Date(); tx.cancellationReason = input.reason; tx.statusHistory.push({ from: 'ACCEPTED', to: 'CANCELLED', actorId: req.user!.id, actorRole: 'STUDENT', reason: input.reason, at: new Date() }); await tx.save();
    if (tx.type === 'SALE') {
      const listing = await Listing.findByIdAndUpdate(tx.listingId, { $inc: { availableQuantity: tx.requestedQuantity ?? 1, reservationVersion: 1 }, $unset: { reservedByTransactionId: 1 } }, { new: true });
      if (listing) await Listing.updateOne({ _id: listing.id }, { $set: { status: 'AVAILABLE' } });
    }
    await notify(tx.requesterId.toString(), req.user!.id, 'TRANSACTION_CANCELLED', 'Transaction cancelled', input.reason, tx.id); await notify(tx.listingOwnerId.toString(), req.user!.id, 'TRANSACTION_CANCELLED', 'Transaction cancelled', input.reason, tx.id);
    res.json(ok(tx));
  } catch (error) { next(error); }
});
app.post('/api/v1/transactions/:id/seller-handover', requireAuth, participantAction('SALE', 'ACCEPTED', 'HANDOVER_PENDING', 'sellerHandoverConfirmedAt', 'Seller handover recorded.'));
app.post('/api/v1/transactions/:id/lender-handover', requireAuth, participantAction('BORROW', 'ACCEPTED', 'HANDOVER_PENDING', 'lenderHandoverConfirmedAt', 'Lender handover recorded.'));
app.post('/api/v1/transactions/:id/buyer-receipt', requireAuth, participantAction('SALE', 'HANDOVER_PENDING', 'COMPLETED', 'buyerReceiptConfirmedAt', 'Buyer receipt recorded.'));
app.post('/api/v1/transactions/:id/borrower-receipt', requireAuth, participantAction('BORROW', 'HANDOVER_PENDING', 'ACTIVE', 'borrowerReceiptConfirmedAt', 'Borrower receipt recorded.'));
app.post('/api/v1/transactions/:id/borrower-return', requireAuth, participantAction('BORROW', 'ACTIVE', 'RETURN_PENDING', 'borrowerReturnMarkedAt', 'Borrower return recorded.'));
app.post('/api/v1/transactions/:id/lender-return-confirmation', requireAuth, participantAction('BORROW', 'RETURN_PENDING', 'COMPLETED', 'lenderReturnConfirmedAt', 'Lender return confirmed.'));
app.post('/api/v1/notifications/:id/read', requireAuth, async (req: AuthRequest, res, next) => {
  try { const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipientId: req.user!.id }, { $set: { readAt: new Date() } }, { new: true }); if (!notification) return fail(res, 404, 'NOT_FOUND', 'Notification not found.'); res.json(ok(notification)); } catch (error) { next(error); }
});
app.get('/api/v1/notifications', requireAuth, async (req: AuthRequest, res, next) => {
  try { res.json(ok(await Notification.find({ recipientId: req.user!.id }).sort({ createdAt: -1 }).limit(50))); } catch (error) { next(error); }
});

function transactionAction(nextStatus: 'REJECTED' | 'CANCELLED') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const tx = await Transaction.findOne({ _id: req.params.id, status: 'PENDING', ...(nextStatus === 'REJECTED' ? { listingOwnerId: req.user!.id } : { requesterId: req.user!.id }) });
      if (!tx) return fail(res, 409, 'TRANSACTION_STATE_CONFLICT', 'Transaction cannot be changed from its current state.');
      tx.status = nextStatus; tx.rejectedAt = nextStatus === 'REJECTED' ? new Date() : undefined; tx.cancelledAt = nextStatus === 'CANCELLED' ? new Date() : undefined; tx.statusHistory.push({ from: 'PENDING', to: nextStatus, actorId: req.user!.id, actorRole: 'STUDENT', at: new Date() }); await tx.save();
      const recipientId = nextStatus === 'REJECTED' ? tx.requesterId : tx.listingOwnerId;
      await notify(recipientId.toString(), req.user!.id, nextStatus === 'REJECTED' ? 'TRANSACTION_REJECTED' : 'TRANSACTION_WITHDRAWN', nextStatus === 'REJECTED' ? 'Request rejected' : 'Request withdrawn', 'The transaction request was updated.', tx.id);
      res.json(ok(tx));
    } catch (error) { next(error); }
  };
}
function participantAction(type: 'SALE' | 'BORROW', current: string, nextStatus: string, field: string, message: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const roleFilter = field.includes('buyer') || field.includes('borrower') ? { requesterId: req.user!.id } : { listingOwnerId: req.user!.id };
      const tx = await Transaction.findOne({ _id: req.params.id, type, status: current, ...roleFilter });
      if (!tx) return fail(res, 409, 'TRANSACTION_STATE_CONFLICT', 'This action is not available in the current state.');
      const now = new Date();
      tx.status = nextStatus as typeof tx.status;
      if (type === 'SALE') {
        if (!tx.sale) throw new ApiError(409, 'TRANSACTION_STATE_CONFLICT', 'Sale details are missing.');
        (tx.sale as Record<string, unknown>)[field] = now;
      } else {
        if (!tx.borrow) throw new ApiError(409, 'TRANSACTION_STATE_CONFLICT', 'Borrow details are missing.');
        (tx.borrow as Record<string, unknown>)[field] = now;
      }
      tx.statusHistory.push({ from: current, to: nextStatus, actorId: req.user!.id, actorRole: 'STUDENT', at: now }); if (nextStatus === 'COMPLETED') tx.completedAt = now; await tx.save();
      const other = tx.requesterId.toString() === req.user!.id ? tx.listingOwnerId.toString() : tx.requesterId.toString();
      await notify(other, req.user!.id, 'TRANSACTION_UPDATED', 'Transaction updated', message, tx.id);
      res.json(ok(tx));
    } catch (error) { next(error); }
  };
}
function publicUser(user: { _id?: unknown; id?: string; fullName: string; email: string; collegeName: string; role: string; notificationPreferences?: { inAppEnabled?: boolean } | null; privacyPreferences?: { contactSharingEnabled?: boolean } | null }) {
  return {
    id: user.id ?? String(user._id),
    fullName: user.fullName,
    email: user.email,
    collegeName: user.collegeName,
    role: user.role,
    notificationPreferences: { inAppEnabled: user.notificationPreferences?.inAppEnabled ?? true },
    privacyPreferences: { contactSharingEnabled: user.privacyPreferences?.contactSharingEnabled ?? false },
  };
}
export class ApiError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => { const apiError = error instanceof ApiError ? error : undefined; console.error(error instanceof Error ? error.message : error); fail(res, apiError?.status ?? 500, apiError?.code ?? 'INTERNAL_ERROR', apiError?.message ?? 'An unexpected error occurred.'); });
export default app;
