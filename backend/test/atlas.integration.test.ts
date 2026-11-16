import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import test from 'node:test';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Listing, Notification, Session, Transaction, User } from '../src/models.js';

const hasAtlas = Boolean(process.env.MONGODB_URI);
test.after(async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
});

test('Atlas auth and public listing APIs persist and read real documents', {
  skip: !hasAtlas ? 'MONGODB_URI is not configured' : false,
  concurrency: false,
}, async () => {
  const suffix = crypto.randomUUID().replaceAll('-', '');
  const email = `atlas-${suffix}@example.test`;
  const otherEmail = `atlas-other-${suffix}@example.test`;
  const password = 'AtlasTestPassword123!';
  const server = http.createServer(app);

  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const registerResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Atlas Integration User',
        email,
        password,
        collegeName: 'Atlas Test College',
      }),
    });

    await test('Atlas parallel borrow approvals allow only one overlapping approval', {
      skip: !hasAtlas ? 'MONGODB_URI is not configured' : false,
      concurrency: false,
    }, async () => {
      const suffix = crypto.randomUUID().replaceAll('-', '');
      const server = http.createServer(app);
      if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const baseUrl = `http://127.0.0.1:${address.port}`;
      const emails = [`lender-${suffix}@example.test`, `borrower-a-${suffix}@example.test`, `borrower-b-${suffix}@example.test`];
      const password = 'AtlasTestPassword123!';

      const register = async (email: string) => {
        const response = await fetch(`${baseUrl}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fullName: 'Concurrency User', email, password, collegeName: 'Atlas Test College' }),
        });
        assert.equal(response.status, 201);
        const body = await response.json() as { data: { user: { id: string }; accessToken: string } };
        return body.data;
      };

      try {
        const lender = await register(emails[0]);
        const borrowerA = await register(emails[1]);
        const borrowerB = await register(emails[2]);
        const listingResponse = await fetch(`${baseUrl}/api/v1/listings`, {
          method: 'POST',
          headers: { authorization: `Bearer ${lender.accessToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            title: `Concurrency Listing ${suffix}`,
            description: 'A lending listing for the Atlas concurrency test.',
            category: 'LAB_WORKSHOP_EQUIPMENT',
            condition: 'GOOD',
            listingType: 'LEND',
            quantity: 2,
            images: [],
            lend: { feeMode: 'FREE', minDays: 1, maxDays: 3 },
          }),
        });
        assert.equal(listingResponse.status, 201);
        const listing = await listingResponse.json() as { data: { _id: string } };
        const request = async (token: string, key: string) => fetch(`${baseUrl}/api/v1/transactions/borrow-requests`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': key },
          body: JSON.stringify({ listingId: listing.data._id, quantity: 2, startDate: '2030-01-10', expectedReturnDate: '2030-01-10' }),
        });
        const [requestA, requestB] = await Promise.all([
          request(borrowerA.accessToken, `request-a-${suffix}`),
          request(borrowerB.accessToken, `request-b-${suffix}`),
        ]);
        assert.equal(requestA.status, 201);
        assert.equal(requestB.status, 201);
        const transactionA = await requestA.json() as { data: { _id: string } };
        const transactionB = await requestB.json() as { data: { _id: string } };
        const [approvalA, approvalB] = await Promise.all([
          fetch(`${baseUrl}/api/v1/transactions/${transactionA.data._id}/accept`, { method: 'POST', headers: { authorization: `Bearer ${lender.accessToken}` } }),
          fetch(`${baseUrl}/api/v1/transactions/${transactionB.data._id}/accept`, { method: 'POST', headers: { authorization: `Bearer ${lender.accessToken}` } }),
        ]);
        assert.deepEqual([approvalA.status, approvalB.status].sort(), [200, 409]);
        const acceptedCount = await Transaction.countDocuments({ listingId: listing.data._id, status: 'ACCEPTED' });
        assert.equal(acceptedCount, 1);
      } finally {
        const users = await User.find({ email: { $in: emails } }).select('_id').lean();
        const userIds = users.map((user) => user._id);
        await Notification.deleteMany({ $or: [{ recipientId: { $in: userIds } }, { actorId: { $in: userIds } }] });
        await Session.deleteMany({ userId: { $in: userIds } });
        await Transaction.deleteMany({ $or: [{ requesterId: { $in: userIds } }, { listingOwnerId: { $in: userIds } }] });
        await Listing.deleteMany({ ownerId: { $in: userIds } });
        await User.deleteMany({ _id: { $in: userIds } });
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
    assert.equal(registerResponse.status, 201);
    const registered = await registerResponse.json() as { success: boolean; data: { user: { id: string }; accessToken: string; refreshToken: string } };
    assert.equal(registered.success, true);
    assert.ok(registered.data.user.id);
    assert.ok(registered.data.accessToken);

    const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginResponse.status, 200);
    const loggedIn = await loginResponse.json() as { success: boolean; data: { user: { id: string }; accessToken: string; refreshToken: string } };
    assert.equal(loggedIn.data.user.id, registered.data.user.id);

    const meResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}` },
    });
    assert.equal(meResponse.status, 200);
    const me = await meResponse.json() as { data: { id: string; email: string } };
    assert.equal(me.data.id, registered.data.user.id);
    assert.equal(me.data.email, email);

    const profileUpdateResponse = await fetch(`${baseUrl}/api/v1/auth/me`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Updated Atlas User', collegeName: 'Updated Atlas College' }),
    });
    assert.equal(profileUpdateResponse.status, 200);
    const updatedProfile = await profileUpdateResponse.json() as { data: { fullName: string; collegeName: string } };
    assert.equal(updatedProfile.data.fullName, 'Updated Atlas User');
    assert.equal(updatedProfile.data.collegeName, 'Updated Atlas College');

    const preferencesResponse = await fetch(`${baseUrl}/api/v1/auth/preferences`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ inAppNotifications: false, contactSharing: true }),
    });
    assert.equal(preferencesResponse.status, 200);
    const preferences = await preferencesResponse.json() as { data: { notificationPreferences: { inAppEnabled: boolean }; privacyPreferences: { contactSharingEnabled: boolean } } };
    assert.equal(preferences.data.notificationPreferences.inAppEnabled, false);
    assert.equal(preferences.data.privacyPreferences.contactSharingEnabled, true);

    const passwordChangeResponse = await fetch(`${baseUrl}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: password, newPassword: `${password}Changed` }),
    });
    assert.equal(passwordChangeResponse.status, 204);

    const refreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: loggedIn.data.refreshToken }),
    });
    assert.equal(refreshResponse.status, 401);
    const newLoginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: `${password}Changed` }),
    });
    assert.equal(newLoginResponse.status, 200);
    const newLogin = await newLoginResponse.json() as { data: { refreshToken: string } };
    const rotatedRefreshResponse = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken: newLogin.data.refreshToken }),
    });
    assert.equal(rotatedRefreshResponse.status, 200);
    const rotated = await rotatedRefreshResponse.json() as { data: { refreshToken: string } };
    assert.notEqual(rotated.data.refreshToken, newLogin.data.refreshToken);

    const listingResponse = await fetch(`${baseUrl}/api/v1/listings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${loggedIn.data.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title: `Atlas Listing ${suffix}`,
        description: 'A listing created by the Atlas integration test.',
        category: 'CALCULATORS',
        condition: 'GOOD',
        listingType: 'SALE',
        images: [],
        sale: { pricePaise: 12345 },
      }),
    });
    assert.equal(listingResponse.status, 201);
    const createdListing = await listingResponse.json() as { data: { _id: string; title: string } };
    assert.ok(createdListing.data._id);

    const publicResponse = await fetch(`${baseUrl}/api/v1/listings/${createdListing.data._id}`);
    assert.equal(publicResponse.status, 200);
    const publicListing = await publicResponse.json() as { data: { _id: string; title: string } };
    assert.equal(publicListing.data._id, createdListing.data._id);
    assert.equal(publicListing.data.title, createdListing.data.title);

    const mineResponse = await fetch(`${baseUrl}/api/v1/listings/mine`, {
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}` },
    });
    assert.equal(mineResponse.status, 200);
    const mine = await mineResponse.json() as { data: Array<{ _id: string }> };
    assert.ok(mine.data.some((item) => item._id === createdListing.data._id));

    const persistedUser = await User.findOne({ email }).lean();
    const persistedListing = await Listing.findById(createdListing.data._id).lean();
    assert.equal(persistedUser?.email, email);
    assert.equal(persistedUser?.notificationPreferences?.inAppEnabled, false);
    assert.equal(persistedUser?.privacyPreferences?.contactSharingEnabled, true);
    assert.equal(persistedListing?.ownerId.toString(), registered.data.user.id);
    assert.equal(persistedListing?.status, 'AVAILABLE');

    const otherRegisterResponse = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Other User', email: otherEmail, password, collegeName: 'Other College' }),
    });
    const other = await otherRegisterResponse.json() as { data: { accessToken: string } };
    const forbiddenEdit = await fetch(`${baseUrl}/api/v1/listings/${createdListing.data._id}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${other.data.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized edit',
        description: 'This edit must be rejected because ownership is enforced.',
        category: 'CALCULATORS',
        condition: 'GOOD',
        listingType: 'SALE',
        images: [],
        sale: { pricePaise: 12345 },
      }),
    });
    assert.equal(forbiddenEdit.status, 404);
    const ownerEdit = await fetch(`${baseUrl}/api/v1/listings/${createdListing.data._id}`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Edited Atlas Listing',
        description: 'The owner edited this persisted listing.',
        category: 'CALCULATORS',
        condition: 'GOOD',
        listingType: 'SALE',
        images: [],
        sale: { pricePaise: 12345 },
      }),
    });
    assert.equal(ownerEdit.status, 200);
    const deactivate = await fetch(`${baseUrl}/api/v1/listings/${createdListing.data._id}/deactivate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${loggedIn.data.accessToken}` },
    });
    assert.equal(deactivate.status, 200);
    const hiddenPublic = await fetch(`${baseUrl}/api/v1/listings/${createdListing.data._id}`);
    assert.equal(hiddenPublic.status, 404);
  } finally {
    const persistedUsers = await User.find({ email: { $in: [email, otherEmail] } }).select('_id').lean();
    if (persistedUsers.length) {
      const userIds = persistedUsers.map((user) => user._id);
      await Listing.deleteMany({ ownerId: { $in: userIds } });
      await Session.deleteMany({ userId: { $in: userIds } });
      await User.deleteMany({ _id: { $in: userIds } });
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
