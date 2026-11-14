# BorrowBuddy — Database and REST API Contract

**Document ID:** BB-TECH-DB-API
**Version:** 1.1
**Status:** Reconciled contract awaiting owner review; implementation not started
**Prepared:** 14 November 2026
**Supersedes:** `BorrowBuddy_Database_API_Contract_v1.0.md`

## 0. Authority and conventions

This document is the normative draft for collections, indexes, routes, payloads,
permissions, validation and lifecycle transitions. It incorporates
`BorrowBuddy_Requirements_v1.1.md`, `BorrowBuddy_Technical_Design_v0.2.md` and
`BorrowBuddy_Design_Decisions_v1.0.md`. The original v1.0 remains unchanged.

MongoDB IDs are 24-character hexadecimal strings in JSON. Stored timestamps are UTC
BSON Dates serialized as ISO-8601. Borrow dates are date-only `YYYY-MM-DD` strings
interpreted in `Asia/Kolkata`. Monetary values are integer paise. Unknown fields are
rejected or explicitly allowlisted; request bodies are never mass-assigned.

## 1. Enumerations

Categories exactly:

`BOOKS_STUDY_MATERIALS`, `ELECTRONICS_GADGETS`, `CALCULATORS`,
`LAB_WORKSHOP_EQUIPMENT`, `SPORTS_FITNESS`, `HOSTEL_DAILY_ESSENTIALS`,
`ACCESSORIES`, `OTHER`.

Conditions exactly: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.

Other enums:

- Roles: `STUDENT`, `ADMIN`
- Account status: `ACTIVE`, `SUSPENDED`, `DEACTIVATED`
- Listing types: `SALE`, `LEND`
- Sale status: `AVAILABLE`, `RESERVED`, `SOLD`, `INACTIVE`
- Lending status: `ACTIVE`, `INACTIVE`
- Transaction status: `PENDING`, `ACCEPTED`, `HANDOVER_PENDING`, `ACTIVE`,
  `RETURN_PENDING`, `COMPLETED`, `REJECTED`, `CANCELLED`, `CANCELLED_BY_ADMIN`
- Report status: `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`

`OVERDUE` is derived, never persisted.

## 2. Collections

### 2.1 users

```ts
{
  _id: ObjectId,
  fullName: string,
  email: string,                 // normalized lowercase, unique
  passwordHash: string,
  collegeName: string,           // self-declared
  profileImage?: { publicId: string, secureUrl: string },
  phoneNumber?: string,          // private
  preferredContactMethod?: "PHONE" | "EMAIL",
  role: "STUDENT" | "ADMIN",
  accountStatus: "ACTIVE" | "SUSPENDED" | "DEACTIVATED",
  emailVerifiedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt?: Date
}
```

Registration controls role/status. Public profile responses omit password hashes,
refresh data, phone number and moderation fields. Email verification remains deferred.

### 2.2 listings

```ts
{
  _id: ObjectId,
  ownerId: ObjectId,
  title: string,
  description: string,
  category: CategorySlug,
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR",
  listingType: "SALE" | "LEND",
  images: Array<{ publicId: string, secureUrl: string, width?: number, height?: number }>,
  sale?: { pricePaise: number },
  lend?: { minDays?: number, maxDays?: number, advanceNoticeDays?: number, notes?: string },
  status: SaleStatus | LendingStatus,
  reservationVersion: number,
  reservedByTransactionId?: ObjectId, // sale reservation guard
  createdAt: Date,
  updatedAt: Date,
  deactivatedAt?: Date,
  soldAt?: Date
}
```

`SALE` requires `sale` and sale status; `LEND` requires `lend` (possibly empty) and
lending status. Images are optional, with 0–5 server-verified JPEG/PNG/WebP Cloudinary
assets targeted at no more than 5 MB each. A listing with an accepted/active transaction cannot be
deactivated or materially changed in a way that invalidates that transaction.

### 2.3 transactions

```ts
{
  _id: ObjectId,
  listingId: ObjectId,
  listingOwnerId: ObjectId,
  requesterId: ObjectId,
  type: "SALE" | "BORROW",
  status: TransactionStatus,
  idempotencyKey: string,
  requestMessage?: string,
  sale?: {
    agreedPricePaise: number,
    sellerHandoverConfirmedAt?: Date,
    buyerReceiptConfirmedAt?: Date
  },
  borrow?: {
    startDate: string,
    expectedReturnDate: string,
    lenderHandoverConfirmedAt?: Date,
    borrowerReceiptConfirmedAt?: Date,
    borrowerReturnMarkedAt?: Date,
    lenderReturnConfirmedAt?: Date,
    returnIssueReason?: string
  },
  acceptedAt?: Date,
  rejectedAt?: Date,
  cancelledAt?: Date,
  completedAt?: Date,
  cancellationReason?: string,
  statusHistory: Array<{
    from: string | null, to: string,
    actorId: ObjectId,
    actorRole: "STUDENT" | "ADMIN" | "SYSTEM",
    reason?: string, at: Date
  }>,
  createdAt: Date,
  updatedAt: Date
}
```

`type` matches listing type (`SALE` or `LEND`→`BORROW`). `listingOwnerId` is an
immutable request-time snapshot; current ownership is still checked. The requester
cannot be the owner. `statusHistory` is append-only and server-controlled.

Borrow dates are valid calendar dates with `startDate <= expectedReturnDate`.
`startDate == expectedReturnDate` and `startDate < expectedReturnDate` are valid;
`startDate > expectedReturnDate` is invalid. No time-of-day fields are used. Borrow
overlap is:

```text
newStart <= existingEnd AND newEnd >= existingStart
```

Only `ACCEPTED`, `HANDOVER_PENDING`, `ACTIVE` and `RETURN_PENDING` borrowings block.
Pending requests do not. Therefore, a same-day booking conflicts with another blocking
booking covering that same date. `OVERDUE` requires `ACTIVE`, unmarked borrower return
and a current `Asia/Kolkata` date later than `expectedReturnDate`; `RETURN_PENDING` is
not automatically overdue.

For configured lending limits, `durationDays` is
`calendarDaysBetween(startDate, expectedReturnDate) + 1`. Same-day is one day,
10–16 November is seven days, and validation requires
`minDays <= durationDays <= maxDays`.

### 2.4 Supporting collections

- `notifications`: `recipientId`, optional `actorId`, controlled `type`, title/body,
  optional resource reference, `readAt`, `createdAt`.
- `reviews`: `transactionId`, `reviewerId`, `revieweeId`, integer `rating` 1–5,
  optional comment, `createdAt`; one per reviewer per completed transaction.
- `reports`: reporter/target references, target type, controlled reason, description,
  status, admin assignment/resolution and timestamps.
- `adminAuditLogs`: immutable `adminId`, action, target, required reason, allowlisted
  metadata and timestamp.
- Recommended optional `sessions`: user, hashed refresh token, expiry, revocation and
  timestamps. Exact session policy awaits approval.

## 3. Index plan

Create indexes through version-controlled scripts:

| Collection | Index |
|---|---|
| users | Unique `{ email: 1 }`; `{ accountStatus: 1, createdAt: -1 }` |
| listings | `{ listingType: 1, status: 1, createdAt: -1 }`; `{ ownerId: 1, createdAt: -1 }`; `{ category: 1, listingType: 1, status: 1, createdAt: -1 }`; text `{ title, description }` |
| transactions | `{ requesterId: 1, createdAt: -1 }`; `{ listingOwnerId: 1, status: 1, createdAt: -1 }`; `{ listingId: 1, type: 1, status: 1 }`; unique `{ requesterId: 1, idempotencyKey: 1 }`; borrow candidate index on listing/status/date fields |
| reviews | Unique `{ transactionId: 1, reviewerId: 1 }`; `{ revieweeId: 1, createdAt: -1 }` |
| notifications | `{ recipientId: 1, createdAt: -1 }`; `{ recipientId: 1, readAt: 1, createdAt: -1 }` |
| reports | `{ status: 1, createdAt: -1 }`; `{ reporterId: 1, createdAt: -1 }` |
| adminAuditLogs | `{ targetType: 1, targetId: 1, createdAt: -1 }`; `{ adminId: 1, createdAt: -1 }` |
| sessions | TTL `{ expiresAt: 1 }` if sessions are approved |

The date index only accelerates candidates; it cannot enforce arbitrary range
non-overlap.

## 4. Transaction state machine and atomicity

| Type | Current | Action | Next | Actor |
|---|---|---|---|---|
| Any | — | Create | `PENDING` | requester |
| Any | `PENDING` | Accept/approve | `ACCEPTED` | owner |
| Any | `PENDING` | Reject | `REJECTED` | owner |
| Any | `PENDING` | Withdraw | `CANCELLED` | requester |
| Sale | `ACCEPTED` | Seller handover | `HANDOVER_PENDING` | seller |
| Sale | `HANDOVER_PENDING` | Buyer receipt | `COMPLETED` | buyer |
| Borrow | `ACCEPTED` | Lender handover | `HANDOVER_PENDING` | lender |
| Borrow | `HANDOVER_PENDING` | Borrower receipt | `ACTIVE` | borrower |
| Borrow | `ACTIVE` | Borrower return | `RETURN_PENDING` | borrower |
| Borrow | `RETURN_PENDING` | Lender return confirmation | `COMPLETED` | lender |
| Borrow | `RETURN_PENDING` | Lender dispute | `ACTIVE` | lender, reason |
| Any | `ACCEPTED` | Cancel with reason | `CANCELLED` | either participant |
| `PENDING`/`ACCEPTED` | — | Admin cancellation | `CANCELLED_BY_ADMIN` | admin, reason |

No ordinary cancellation is allowed from `HANDOVER_PENDING` or later. Admin
cancellation is currently defined only for `PENDING` and `ACCEPTED`; post-handover
admin handling remains an owner decision. No generic status-update route exists.
Every action validates actor, ownership/participation, current status, listing state,
dates and idempotency.

Borrow approval runs in one transaction on a transaction-capable MongoDB Atlas
deployment: read listing; conditionally bump `reservationVersion`; recheck overlap;
update request, history and notification atomically; commit; boundedly retry transient
conflicts. Parallel-approval integration tests must run against that actual Atlas
deployment before concurrency safety is claimed.

Sale acceptance atomically requires listing `AVAILABLE`, accepts the selected pending
request, changes listing to `RESERVED` and closes competing pending requests. Sale
completion requires both handover and receipt; borrow completion requires both return
actions.

Accepted-sale cancellation atomically changes the transaction to `CANCELLED`, appends
status history, writes cancellation notifications for both participants and conditionally
updates the listing to `AVAILABLE` only when the listing is still `RESERVED` with
`reservedByTransactionId` equal to that transaction and no completed sale exists.
Competing pending requests remain closed. Stale, duplicate or already-sold cancellation
attempts fail without restoring the listing. Accepted-borrow cancellation atomically
changes the transaction, history and notifications; its dates stop blocking only after
commit. Admin cancellation uses the same atomic effects and also appends an immutable
`adminAuditLogs` record.

## 5. API conventions

All routes are under `/api/v1`. JSON uses `Content-Type` and `Accept:
application/json`. Protected routes use `Authorization: Bearer <accessToken>`.
Transaction creation uses an opaque `Idempotency-Key`. Tokens never appear in query
parameters.

Success:

```json
{ "success": true, "data": {}, "meta": {} }
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "title", "message": "Title is required." }],
    "requestId": "server-generated-id"
  }
}
```

Use `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429` and `500`
consistently. Do not expose stack traces, secrets or database errors.

## 6. Endpoint contract

### Authentication and profiles

| Method | Route | Access |
|---|---|---|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/refresh` | Refresh credential |
| POST | `/auth/logout` | Student |
| GET | `/auth/me` | Student |
| GET | `/users/:userId` | Public |
| PATCH | `/users/me` | Student |
| GET | `/users/me/listings` | Student |

Registration accepts `fullName`, `email`, `password`, `collegeName`; server assigns
student/active. Profile patch allowlists `fullName`, `collegeName`, optional phone and
verified image metadata. Email verification and password recovery are deferred.

### Listings and uploads

| Method | Route | Access |
|---|---|---|
| GET | `/listings` | Public |
| GET | `/listings/:listingId` | Public |
| POST | `/listings` | Student |
| PATCH | `/listings/:listingId` | Owner |
| POST | `/listings/:listingId/deactivate` | Owner |
| POST | `/listings/:listingId/reactivate` | Owner |
| POST | `/uploads/signature` | Student |

Query filters are `q`, `listingType`, exact approved `category`, exact `condition`,
`page`, `limit` (default 20, maximum 50) and `sort=newest`. Public results omit
reserved/sold/inactive sale listings. Listing payloads use uppercase category slugs;
lowercase values such as `calculators` or unapproved values such as `stationery` are
invalid.

Create sale example:

```json
{
  "title": "Scientific Calculator",
  "description": "Casio calculator in good working condition.",
  "category": "CALCULATORS",
  "condition": "GOOD",
  "listingType": "SALE",
  "images": [{ "publicId": "borrowbuddy/items/abc", "secureUrl": "https://..." }],
  "sale": { "pricePaise": 45000 }
}
```

Create lending example:

```json
{
  "title": "Engineering Drawing Set",
  "description": "Complete set for temporary borrowing.",
  "category": "LAB_WORKSHOP_EQUIPMENT",
  "condition": "LIKE_NEW",
  "listingType": "LEND",
  "images": [{ "publicId": "borrowbuddy/items/def", "secureUrl": "https://..." }],
  "lend": { "minDays": 1, "maxDays": 7, "advanceNoticeDays": 0 }
}
```

The server verifies Cloudinary asset identity, type and size; arbitrary URLs are not
trusted. Clients cannot patch owner, status, reservationVersion or transaction fields.

### Transactions and contact

| Method | Route | Access |
|---|---|---|
| POST | `/transactions/sale-requests` | Student |
| POST | `/transactions/borrow-requests` | Student |
| GET | `/transactions/me` | Student |
| GET | `/transactions/:transactionId` | Participant |
| POST | `/transactions/:transactionId/accept` | Owner |
| POST | `/transactions/:transactionId/reject` | Owner |
| POST | `/transactions/:transactionId/withdraw` | Requester, pending only |
| POST | `/transactions/:transactionId/cancel` | Either participant before handover |
| POST | `/transactions/:transactionId/seller-handover` | Sale seller |
| POST | `/transactions/:transactionId/buyer-receipt` | Sale buyer |
| POST | `/transactions/:transactionId/lender-handover` | Lender |
| POST | `/transactions/:transactionId/borrower-receipt` | Borrower |
| POST | `/transactions/:transactionId/borrower-return` | Borrower |
| POST | `/transactions/:transactionId/lender-return-confirmation` | Lender |
| POST | `/transactions/:transactionId/lender-return-dispute` | Lender |
| POST | `/transactions/:transactionId/share-contact` | Participant after acceptance |

Create sale requests contain `listingId` and optional `requestMessage`; create borrow
requests contain `listingId`, `startDate`, `expectedReturnDate` and optional message.
The server validates active matching listings, participant identity, date validity,
inclusive range semantics and configured lending duration. Pending availability is not
guaranteed until approval.

Inclusive duration validation examples: 10–10 November has duration 1 and is valid
when `minDays <= 1 <= maxDays`; 10–16 November has duration 7; 10–17 November has
duration 8 and fails `maxDays: 7`; and a range whose end precedes its start fails
`DATE_RANGE_INVALID`.

Accept, handover, receipt, return and cancellation action bodies do not contain a
client-supplied status. Cancellation requires a reason. Contact sharing reveals only
the caller's explicitly configured preferred method to the other participant in that
transaction; it is never public.

### First-release notifications

| Method | Route | Access |
|---|---|---|
| GET | `/notifications` | Student |
| PATCH | `/notifications/:notificationId/read` | Recipient |
| POST | `/notifications/read-all` | Student |

### Approved after core transaction flows are stable

| POST | `/transactions/:transactionId/reviews` | Participant after completion |
| POST | `/reports` | Student |
| GET | `/admin/reports` | Admin |
| PATCH | `/admin/reports/:reportId` | Admin |
| POST | `/admin/transactions/:transactionId/cancel` | Admin, reason required |
| POST | `/admin/users/:userId/suspend` | Admin |
| POST | `/admin/users/:userId/reactivate` | Admin |
| POST | `/admin/listings/:listingId/remove` | Admin |
| GET | `/admin/audit-logs` | Admin |

Admin operations require a reason and immutable audit log. Review submission derives
reviewer/reviewee from authentication and transaction participation.

## 7. Error codes

`VALIDATION_ERROR`, `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`,
`FORBIDDEN`, `NOT_FOUND`, `LISTING_UNAVAILABLE`, `SELF_REQUEST_NOT_ALLOWED`,
`TRANSACTION_STATE_CONFLICT`, `DATE_RANGE_INVALID`, `DATE_RANGE_CONFLICT`,
`DUPLICATE_REQUEST`, `REVIEW_NOT_ELIGIBLE`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## 8. Security and testing gates

Use password hashing, secure storage, short-lived access tokens, refresh rotation/
revocation, HTTPS in deployment, server-side authorisation, rate limiting, signed
uploads, server timestamps, explicit field mapping and secret-free logs.

Before calling a route complete, test invalid/valid input, permissions, retries,
state transitions, sale races, inclusive adjacent date conflicts, non-overlapping
future bookings, two-sided confirmations, overdue derivation, dispute handling and
notification visibility. Borrow concurrency tests must run against the actual
transaction-capable Atlas deployment; mocks do not prove isolation.

## 9. Technical recommendations awaiting approval

Exact token durations/session policy, retry count/backoff, password reset, search
strategy, performance targets and Android support range remain open as recorded in
`BorrowBuddy_Design_Decisions_v1.0.md`. They do not authorize changing the product
rules or this contract's approved enums and lifecycle.

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 6 November 2026 | Historical proposed schema/API baseline. |
| 1.1 | 14 November 2026 | Reconciled approved enums, endpoints, envelopes, privacy, date overlap, lifecycle, cancellation, overdue and Atlas concurrency requirements; corrected stale examples. |
