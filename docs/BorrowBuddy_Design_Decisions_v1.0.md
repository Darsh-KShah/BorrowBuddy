# BorrowBuddy — Design Decision Register

**Document:** Owner-approved design decisions and remaining technical choices
**Version:** 1.0
**Status:** Review-ready register; implementation not started
**Prepared:** 14 November 2026
**Source:** `BORROWBUDDY_AGENT_HANDOFF.md`

## 1. Purpose

This register records decisions that reconcile the historical requirements, technical
design, design review and database/API contract. “Approved” means the handoff explicitly
records the decision. “Awaiting approval” means a technical recommendation remains
open; it must not be silently promoted.

## 2. Owner-approved decisions

| ID | Decision |
|---|---|
| OD-01 | React Native is the CPAD framework; Expo is development tooling. |
| OD-02 | Mobile and backend language is TypeScript. |
| OD-03 | Backend is Node.js + Express; database is MongoDB Atlas. |
| OD-04 | Images use Cloudinary server-authorised signed uploads. |
| OD-05 | API prefix is `/api/v1`. |
| OD-06 | Audience is students across colleges; college affiliation is self-declared, not officially verified. |
| OD-07 | Guests may browse; authentication is required for account-specific and transaction actions. |
| OD-08 | The first prototype uses unique email/password and defers email verification. |
| OD-09 | Listing modes are exactly `SALE` and free `LEND`; no paid rentals or in-app payments. |
| OD-10 | Physical exchange is offline; the app does not process or guarantee offline payment, delivery, item quality or in-person safety. |
| OD-11 | No in-app chat. |
| OD-12 | Contact sharing is optional, explicit, after acceptance and visible only to relevant transaction participants; never public. |
| OD-13 | Lending dates are date-only `YYYY-MM-DD` in `Asia/Kolkata`, with inclusive start and expected-return dates. |
| OD-14 | Overlap is `newStart <= existingEnd AND newEnd >= existingStart`; same-day boundaries conflict. |
| OD-15 | Pending requests do not reserve dates; multiple future non-overlapping approved bookings are allowed. |
| OD-16 | Borrow approval requires Atlas multi-document transactions, a shared per-listing conditional version bump, an in-transaction overlap recheck, atomic state-history/notification writes, bounded retries and Atlas-backed parallel-approval tests. |
| OD-17 | Either participant may cancel an accepted transaction before physical handover with a reason; ordinary cancellation is unavailable after handover begins. |
| OD-18 | Sale/lending handover, receipt and return confirmations are two-sided as applicable. |
| OD-19 | No timeout-based automatic completion or release. |
| OD-20 | `OVERDUE` is derived only for `ACTIVE` borrowings past expected return when return is not marked; `RETURN_PENDING` is unresolved, not automatically overdue. |
| OD-21 | In-app notifications are first-release; push is deferred. |
| OD-22 | Reviews are two-way, one per participant per completed transaction, rating 1–5, after core flows are stable. |
| OD-23 | Basic reports and protected in-app admin are planned after core flows; admins are manually provisioned and interventions are audited. |
| OD-24 | Categories are exactly `BOOKS_STUDY_MATERIALS`, `ELECTRONICS_GADGETS`, `CALCULATORS`, `LAB_WORKSHOP_EQUIPMENT`, `SPORTS_FITNESS`, `HOSTEL_DAILY_ESSENTIALS`, `ACCESSORIES`, `OTHER`. |
| OD-25 | Conditions are exactly `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`. |
| OD-26 | Listing images are optional: zero to five JPEG/PNG/WebP images are accepted, target maximum 5 MB each, with server validation and signed uploads. |
| OD-27 | Mobile tokens use secure storage; access tokens are short-lived and refresh tokens rotate and can be revoked. |
| OD-28 | Same-day lending is valid: `startDate == expectedReturnDate` and `startDate < expectedReturnDate` are valid; `startDate > expectedReturnDate` is invalid. Inclusive overlap means a same-day booking conflicts with another booking on that date. |
| OD-29 | Inclusive lending duration is `calendarDaysBetween(startDate, expectedReturnDate) + 1`; same-day is one day, and configured limits use `minDays <= durationDays <= maxDays`. |
| OD-30 | Admin cancellation is defined for `PENDING` and `ACCEPTED` transactions only, requires a reason, writes audit/history/notifications atomically, conditionally restores an accepted sale listing, and unblocks an accepted borrow only after commit. |

## 3. Technical recommendations awaiting owner approval

| ID | Recommendation and impact |
|---|---|
| TD-01 | Use a separate `sessions` collection for multi-device hashed refresh sessions. This affects session schema and logout semantics. |
| TD-02 | Select exact access/refresh lifetimes, maximum sessions and password-reset flow. These affect security controls and external-service scope. |
| TD-03 | Use the v1.1 response/error envelopes and stable error codes. This affects mobile error handling and API compatibility. |
| TD-04 | Use embedded append-only `statusHistory` initially. A separate history collection would change indexes and audit queries. |
| TD-05 | Use bounded retry configuration with explicit transient-conflict mapping. Exact count/backoff requires Atlas integration validation. |
| TD-06 | Select navigation, validation and search libraries after compatibility/query review. This affects dependencies and device resource use. |
| TD-07 | Define measurable performance targets and supported Android OS range after the first prototype. |
| TD-08 | Owner approval is required for post-handover handling: may admins cancel `HANDOVER_PENDING`, `ACTIVE` or `RETURN_PENDING`, or must a separate issue-resolution outcome be used? This affects custody, listing restoration and borrow availability. |

## 4. Resolved historical contradictions

- “Proposed” stack and feature labels are promoted only where the handoff approves them.
- Guest visibility is public browsing, not login-only discovery.
- Categories use stable uppercase slugs; old lowercase examples are invalid.
- Borrow dates are inclusive date-only values, not half-open date/time intervals.
- Borrow approval uses `ACCEPTED` and `HANDOVER_PENDING` consistently; old alternate
  names such as `APPROVED` and `HANDOVER_PENDING_CONFIRMATION` are superseded.
- Contact sharing is opt-in and participant-scoped, not a public profile field.
- Either participant may cancel before handover; no ordinary cancellation after handover.
- `RETURN_PENDING` is unresolved and not automatically overdue.
- Accepted-sale cancellation is conditional and cannot restore a listing reserved by a
  different transaction or already sold.
- Reviews/reports/admin remain planned after core flows, not silently omitted.

## 5. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 14 November 2026 | Initial owner-approved decision register and explicit technical recommendation register. |
