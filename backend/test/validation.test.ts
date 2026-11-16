import assert from 'node:assert/strict';
import test from 'node:test';
import { borrowRequestSchema, inclusiveDurationDays, listingSchema, overlapsInclusive, reviewSchema } from '../src/validation.js';

test('inclusive duration counts a same-day booking as one day', () => {
  assert.equal(inclusiveDurationDays('2026-11-10', '2026-11-10'), 1);
  assert.equal(inclusiveDurationDays('2026-11-10', '2026-11-16'), 7);
});

test('inclusive duration rejects an end date before the start date', () => {
  assert.throws(() => inclusiveDurationDays('2026-11-11', '2026-11-10'), /DATE_RANGE_INVALID/);
});

test('inclusive overlap treats shared boundaries as conflicts', () => {
  assert.equal(overlapsInclusive('2026-11-10', '2026-11-10', '2026-11-10', '2026-11-12'), true);
  assert.equal(overlapsInclusive('2026-11-13', '2026-11-14', '2026-11-10', '2026-11-12'), false);
});

test('quantity fields default to one and reject non-positive values', () => {
  const listing = listingSchema.parse({
    title: 'Shared calculator',
    description: 'A calculator available for student use.',
    category: 'CALCULATORS',
    condition: 'GOOD',
    listingType: 'LEND',
    lend: { feeMode: 'FREE', minDays: 1, maxDays: 3 },
  });

  assert.equal(listing.quantity, 1);
  assert.equal(borrowRequestSchema.parse({
    listingId: '507f1f77bcf86cd799439011',
    startDate: '2030-01-01',
    expectedReturnDate: '2030-01-01',
  }).quantity, 1);
  assert.throws(() => borrowRequestSchema.parse({
    listingId: '507f1f77bcf86cd799439011',
    quantity: 0,
    startDate: '2030-01-01',
    expectedReturnDate: '2030-01-01',
  }));
});

test('review validation accepts ratings from one to five and limits comments', () => {
  assert.deepEqual(reviewSchema.parse({ rating: 5, comment: 'Reliable exchange.' }), { rating: 5, comment: 'Reliable exchange.' });
  assert.throws(() => reviewSchema.parse({ rating: 6 }));
  assert.throws(() => reviewSchema.parse({ rating: 4, comment: 'x'.repeat(501) }));
});
