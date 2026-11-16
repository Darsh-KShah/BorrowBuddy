import { z } from 'zod';
import { CATEGORIES, CONDITIONS } from './models.js';

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  collegeName: z.string().trim().min(2).max(120),
});
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  collegeName: z.string().trim().min(2).max(120),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});
export const accountPreferencesSchema = z.object({
  inAppNotifications: z.boolean(),
  contactSharing: z.boolean(),
});
export const listingSchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  listingType: z.enum(['SALE', 'LEND']),
  quantity: z.number().int().positive().default(1),
  images: z.array(z.object({ publicId: z.string().min(1), secureUrl: z.string().url() })).max(5).default([]),
  sale: z.object({ pricePaise: z.number().int().positive() }).optional(),
  lend: z.object({
    minDays: z.number().int().positive().optional(),
    maxDays: z.number().int().positive().optional(),
    advanceNoticeDays: z.number().int().nonnegative().default(0),
    notes: z.string().max(500).optional(),
    feeMode: z.enum(['FREE', 'PAID_NEGOTIABLE']).default('FREE'),
    minFeePaise: z.number().int().positive().optional(),
    maxFeePaise: z.number().int().positive().optional(),
  }).optional(),
}).superRefine((value, ctx) => {
  if (value.listingType === 'SALE' && (!value.sale || value.lend)) ctx.addIssue({ code: 'custom', message: 'SALE requires sale pricing only' });
  if (value.listingType === 'LEND' && (!value.lend || value.sale)) ctx.addIssue({ code: 'custom', message: 'LEND requires lending policy only' });
  if (value.lend?.minDays && value.lend.maxDays && value.lend.minDays > value.lend.maxDays) ctx.addIssue({ code: 'custom', message: 'minDays cannot exceed maxDays' });
  if (value.lend?.feeMode === 'FREE' && (value.lend.minFeePaise || value.lend.maxFeePaise)) ctx.addIssue({ code: 'custom', message: 'FREE lending cannot define fees' });
  if (value.lend?.minFeePaise && value.lend.maxFeePaise && value.lend.minFeePaise > value.lend.maxFeePaise) ctx.addIssue({ code: 'custom', message: 'minFeePaise cannot exceed maxFeePaise' });
});
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
export const borrowRequestSchema = z.object({
  listingId: z.string().regex(/^[a-f\d]{24}$/i),
  quantity: z.number().int().positive().default(1),
  startDate: dateOnly,
  expectedReturnDate: dateOnly,
  requestMessage: z.string().max(500).optional(),
});
export const saleRequestSchema = z.object({ listingId: z.string().regex(/^[a-f\d]{24}$/i), quantity: z.number().int().positive().default(1), requestMessage: z.string().max(500).optional() });
export const reasonSchema = z.object({ reason: z.string().trim().min(1).max(1000) });
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const inclusiveDurationDays = (startDate: string, endDate: string): number => {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) throw new Error('DATE_RANGE_INVALID');
  return Math.floor((end - start) / 86_400_000) + 1;
};
export const overlapsInclusive = (newStart: string, newEnd: string, existingStart: string, existingEnd: string): boolean =>
  newStart <= existingEnd && newEnd >= existingStart;
