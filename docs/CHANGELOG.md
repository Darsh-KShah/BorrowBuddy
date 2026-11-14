# BorrowBuddy Documentation Changelog

## 14 November 2026 — Documentation Reconciliation (Milestone 1)

Created versioned successors without modifying the five original baseline documents:

- `BorrowBuddy_Requirements_v1.1.md`
- `BorrowBuddy_Technical_Design_v0.2.md`
- `BorrowBuddy_Design_Decisions_v1.0.md`
- `BorrowBuddy_Database_API_Contract_v1.1.md`

Reconciled the owner-approved stack, scope, access rules, exact category and condition
enums, contact privacy, inclusive `Asia/Kolkata` lending dates, transaction state
machine, cancellation rules, derived overdue handling, in-app notifications and
Atlas-backed borrow-approval concurrency. Technical choices without owner approval are
listed explicitly as recommendations awaiting approval. No application implementation,
dependency installation or external-service configuration was performed.

## 14 November 2026 — Same-Day Lending Decision

Recorded owner approval that `startDate == expectedReturnDate` is valid,
`startDate < expectedReturnDate` is valid, and `startDate > expectedReturnDate` is
invalid. Inclusive overlap remains authoritative, so same-day bookings conflict on
their shared date. No time-of-day fields were introduced.

## 14 November 2026 — Milestone 1 Review Corrections

- Standardized listing images as optional, with 0–5 JPEG/PNG/WebP images and a target
  maximum of 5 MB each.
- Defined inclusive lending duration as calendar-day difference plus one, including
  same-day duration of one day and inclusive `minDays`/`maxDays` validation.
- Defined atomic accepted-sale cancellation with conditional listing restoration,
  history, notifications and closed competing requests.
- Defined admin cancellation for `PENDING` and `ACCEPTED` transactions with required
  reasons, audit/history/notification writes and correct sale/borrow effects.
- Recorded post-handover admin cancellation as an owner decision rather than guessing
  an outcome that could misrepresent custody or availability.
