# BorrowBuddy — Requirements Specification

**Document:** Reconciled requirements
**Version:** 1.1
**Status:** Owner-approved requirements reconciled; implementation not started
**Prepared:** 14 November 2026
**Supersedes:** `BorrowBuddy_Requirements_v1.0.md`

## 0. Authority and status

This successor reconciles the historical requirements baseline with the owner-approved
decisions in `BORROWBUDDY_AGENT_HANDOFF.md`. The five original baseline documents remain
unchanged. This document describes the product requirements; it is not evidence that any
feature has been implemented or tested.

Status labels:

- **Approved:** owner-approved product or technical direction recorded in the handoff.
- **Technical recommendation:** an implementation choice recommended for review, not an
  additional product decision.
- **Deferred:** intentionally outside the first release.

## 1. Product and constraints

BorrowBuddy is a student-focused mobile marketplace for students across colleges to list
items for sale or free lending, discover listings, submit requests and track offline
exchanges. College affiliation is self-declared; the product must not claim official
student verification.

The selected CPAD framework is **React Native**. **Expo** is development tooling, not a
second framework. Mobile and backend code use **TypeScript**. The backend is
**Node.js + Express**, the database is **MongoDB Atlas**, and images use **Cloudinary**
with server-authorised signed uploads.

Development must remain practical on Arch Linux with Hyprland and 4 GB RAM. Prefer a
physical Android device; avoid Docker, an Android Studio emulator and unnecessary
background services unless a demonstrated need justifies them.

## 2. Scope

### 2.1 First release

- Account registration, login, logout and profile management.
- Guest browsing of public listings.
- Authenticated listing creation, editing and deactivation.
- `SALE` and free `LEND` listings only.
- Browse, keyword search and category/type/condition filters.
- Sale requests and borrowing requests.
- Backend-controlled acceptance, rejection, withdrawal, cancellation and confirmations.
- Offline handover and receipt tracking.
- Inclusive calendar-date borrowing in `Asia/Kolkata`.
- In-app notifications; push notifications are deferred.
- Secure mobile token storage with short-lived access tokens and refresh-token
  rotation/revocation.

Reviews and basic reporting/protected admin moderation are approved for the product
direction but are implemented only after core transaction flows are stable. Admin
accounts are provisioned manually, and every admin intervention records actor, action,
reason and timestamp.

### 2.2 Explicitly excluded or deferred

- Paid rentals, rental fees, payment gateways, escrow or in-app payments.
- Delivery, shipping or courier management.
- In-app chat or direct messaging.
- Claims or guarantees about offline payment, delivery, item quality or in-person safety.
- Official student identity verification.
- Push notifications, maps, AI recommendations and automatic dispute resolution.

## 3. Users and permissions

| User | Permissions |
|---|---|
| Guest | Browse public active/available listings and public profile information. |
| Student | All guest actions; manage own profile/listings; create and manage own requests; perform only assigned participant actions. |
| Admin | Protected moderation and exceptional transaction actions; manually provisioned; every intervention is audited. |

Authentication is required for account-specific and transaction actions. A student
cannot request their own listing. Ownership, participant role, account status and every
state transition are enforced on the server.

## 4. Approved listing data

Listing modes are exactly `SALE` and free `LEND`. A sale has a positive INR amount;
borrowing has no fee or in-app payment.

Categories are exactly:

`BOOKS_STUDY_MATERIALS`, `ELECTRONICS_GADGETS`, `CALCULATORS`,
`LAB_WORKSHOP_EQUIPMENT`, `SPORTS_FITNESS`, `HOSTEL_DAILY_ESSENTIALS`,
`ACCESSORIES`, `OTHER`.

Conditions are exactly: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.

Listings support zero to five images; images are optional. Accepted formats are JPEG,
PNG and WebP, with a target maximum of 5 MB per image. The server validates type, size
and Cloudinary asset identity; the mobile app never receives Cloudinary secrets.

## 5. Approved transaction requirements

### 5.1 Sale

1. A buyer creates a `PENDING` request for an available sale listing.
2. The seller may accept or reject it; the buyer may withdraw while pending.
3. Acceptance atomically reserves the listing and closes competing pending requests.
4. Either participant may cancel an accepted sale before physical handover, with a
   reason. The listing may return to `AVAILABLE` only through a guarded server action.
5. The seller marks handover and the buyer confirms receipt using separate actions.
6. Only both confirmations make the transaction `COMPLETED` and the listing `SOLD`.
7. Once handover begins, ordinary cancellation is unavailable; use issue reporting and
   admin review.

### 5.2 Free lending

1. A borrower creates a `PENDING` request with a start and expected-return date.
2. Pending requests do not reserve dates.
3. The lender may approve or reject; the borrower may withdraw while pending.
4. Approval atomically rechecks availability and reserves the requested period.
5. Multiple future approved bookings are allowed when they do not overlap.
6. The lender marks handover, the borrower confirms receipt, the borrower marks return,
   and the lender confirms return. These are separate actions.
7. Either participant may cancel before physical handover, with a reason. After
   handover begins, ordinary cancellation is unavailable.
8. A return dispute remains unresolved and uses issue reporting/admin review; it does not
   auto-complete or auto-cancel.

Borrowing dates are date-only `YYYY-MM-DD` values interpreted in `Asia/Kolkata`.
Both endpoints are inclusive. `startDate == expectedReturnDate` and
`startDate < expectedReturnDate` are valid; `startDate > expectedReturnDate` is
invalid. Ranges overlap exactly when:

```text
newStart <= existingEnd AND newEnd >= existingStart
```

Approved, `HANDOVER_PENDING`, `ACTIVE` and `RETURN_PENDING` borrowings block overlap.
Completed and cancelled transactions do not. Borrow approval must recheck this inside a
MongoDB transaction.

The inclusive lending duration is:
`durationDays = calendarDaysBetween(startDate, expectedReturnDate) + 1`.
Therefore, a same-day booking is one day, 10–16 November is seven days, and a
10–17 November request is eight days. If `minDays` or `maxDays` is configured on a
listing, the duration must satisfy `minDays <= durationDays <= maxDays`.

`OVERDUE` is derived only when a borrow transaction is `ACTIVE`, the borrower has not
marked return, and the current `Asia/Kolkata` date is later than
`expectedReturnDate`. `RETURN_PENDING` is unresolved and is not automatically overdue.

No transaction is completed, cancelled or released solely because time elapsed or a
participant did not respond.

An administrator may cancel a `PENDING` or `ACCEPTED` transaction only with a reason.
Student-initiated cancellation transitions to `CANCELLED`; administrator-initiated
cancellation transitions to `CANCELLED_BY_ADMIN`. For an accepted sale, an
administrator cancellation transactionally changes the transaction to
`CANCELLED_BY_ADMIN`, appends history, writes the admin audit record, notifies both
participants, and restores the listing to `AVAILABLE` only when it is still `RESERVED`
by that exact transaction and no sale has completed. Competing pending requests remain
closed and must be resubmitted. For an accepted borrow, administrator cancellation
transactionally changes the transaction to `CANCELLED_BY_ADMIN`, appends history,
writes the admin audit record and notifications, and removes that booking from date
blocking.
Administrative cancellation does not permit ordinary user cancellation after handover.

## 6. Privacy and contact sharing

Contact sharing is optional and user-controlled. After a request is accepted, a
participant may explicitly share their configured contact method with the other
participant in that transaction. Contact details are never public, never included in
public profiles/listings and are not available before acceptance. There is no chat.

## 7. Reviews, reports and notifications

Notifications are in-app in the first release; push is deferred. Backend services create
notifications for relevant events, and users can read their own inbox.

After core flows are stable, each participant may leave one 1–5 review for the other
participant per completed transaction. Reports may target a listing, user or review.
Admins may moderate through the protected mobile area and must create an immutable audit
record for every intervention.

## 8. Security and integrity requirements

- Hash passwords with an appropriate password-hashing library.
- Keep secrets in environment variables; never commit `.env`, tokens or credentials.
- Use secure mobile token storage, short-lived access tokens and refresh rotation/revocation.
- Use server time for transitions and explicit field allowlists; reject mass assignment.
- Never accept arbitrary client-supplied transaction statuses.
- Validate ownership, participant permissions, account status, dates and upload metadata.
- Do not log passwords, tokens or private contact details.

## 9. Technical recommendations awaiting approval

These are not new product decisions:

1. Use a separate `sessions` collection for multi-device refresh sessions; recommend
   server-side hashed refresh tokens and a bounded access-token lifetime. Exact duration,
   session limit and password-reset flow remain to be selected.
2. Use the response/error envelopes and endpoint contract in
   `BorrowBuddy_Database_API_Contract_v1.1.md`.
3. Select navigation, validation and search implementation after compatibility and query
   needs are checked. Do not add dependencies before that review.
4. Use embedded append-only transaction history and MongoDB Atlas transactions for
   multi-document actions unless schema review identifies a reason to separate history.

Post-handover administrator handling remains an owner question: should an administrator
be allowed to cancel `HANDOVER_PENDING`, `ACTIVE` or `RETURN_PENDING`, or must those
cases use a separate issue-resolution outcome that does not falsely restore or release
the item?

## 10. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 6 November 2026 | Historical requirements baseline. |
| 1.1 | 14 November 2026 | Reconciled owner-approved stack, access, scope, enums, privacy, inclusive dates, lifecycle, cancellation, overdue and concurrency requirements. Supersedes stale provisional/open-decision labels without modifying v1.0. |
