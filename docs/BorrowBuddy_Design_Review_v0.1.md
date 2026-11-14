# BorrowBuddy — Technical Design Review and Decision Register

**Document:** Review of technical design draft v0.1  
**Version:** 0.1  
**Status:** Recommendations for owner review; not approved for implementation  
**Prepared:** 6 November 2026  
**Depends on:** `BorrowBuddy_Requirements_v1.0.md` and `BorrowBuddy_Technical_Design_v0.1.md`

> This review does not silently change the requirements baseline. Each recommendation below remains provisional until the project owner approves it. Once approved, update the requirements and technical design documents and their change logs.

---

## 1. Review findings

The v0.1 technical design is a useful architecture draft, but it is not yet an implementation contract. The following points need to be made precise before coding:

1. Student eligibility and what the app can honestly claim to verify.
2. Whether guests can browse listings.
3. How users coordinate offline without exposing private contact details publicly.
4. Date format, timezone and overlap semantics for borrowing.
5. Whether multiple future non-overlapping bookings are allowed for one lending item.
6. Cancellation rules before and after physical handover.
7. What happens when one participant does not confirm a handover or return.
8. How concurrent approval of sale and borrowing requests is made safe.
9. Which optional features belong in the first release.
10. Exact image limits, categories, condition values and mobile authentication storage.

### Important consistency note

The v0.1 design correctly identifies that a simple read-then-write check is not sufficient for concurrency. For borrowing approvals, a transaction must also write to a shared per-listing document (for example, incrementing a reservation version) so competing approvals for the same listing conflict and retry. MongoDB transaction support and retry behaviour must be verified against the selected Atlas deployment before implementation.

---

## 2. Recommended decisions

All values in this section are **recommendations**, not confirmed user decisions.

| ID | Topic | Recommended first-release decision | Reason |
|---|---|---|---|
| DD-01 | Student eligibility | Allow self-declared students from any college. Require college name, but do not claim official student verification. | Colleges may not share a universal email domain; avoids collecting student ID documents. |
| DD-02 | Guest access | Allow guests to browse listing cards and details. Require login to create listings, view private contact information or submit requests. | Lets users discover the marketplace while protecting transactions. |
| DD-03 | Email verification | Defer email OTP/verification for the first working prototype. Use unique email + password authentication. Revisit before public deployment. | Avoids adding an email provider before the core product works. |
| DD-04 | Offline coordination | No in-app chat. After a request is accepted, allow the owner to share an optional contact method with that transaction participant only. Never show phone/email publicly. | Keeps implementation small while allowing users to arrange a physical exchange. |
| DD-05 | Sale vs lending | Support `SALE` and free `LEND` only. Defer paid rentals. | Matches current project scope and avoids payment/rental-fee complexity. |
| DD-06 | Borrowing dates | Use calendar dates (`YYYY-MM-DD`) in the user's local calendar, with inclusive start and expected-return dates. Record the agreed app timezone as `Asia/Kolkata` for the initial India-focused release. | Easier to understand than time-of-day booking; avoids daylight-saving/time conversion ambiguity for date-only periods. |
| DD-07 | Multiple future borrowings | Permit multiple non-overlapping approved future bookings for one item. Pending requests do not reserve an item. | Supports planned borrowing while keeping approval logic understandable. |
| DD-08 | Overlap rule | Treat both requested dates as occupied. Two bookings conflict when `existingStart <= requestedEnd AND existingEnd >= requestedStart`, unless the earlier transaction is completed or cancelled. | A return-date booking cannot begin on the same day the previous borrower is expected to return the item. |
| DD-09 | Cancellation | Pending requester may withdraw; owner may reject. Before physical handover, either participant may cancel an accepted/approved transaction with a reason. After handover starts, no ordinary cancellation; report an issue for admin review. | Clear, small lifecycle with an auditable path for exceptional cases. |
| DD-10 | Two-party confirmation | Keep two-party confirmations: owner marks handover, recipient confirms receipt; for borrowing, borrower marks return and owner confirms it. Never auto-complete solely because time passed. | Avoids falsely recording an offline exchange as completed. |
| DD-11 | One-sided confirmations | If confirmation is disputed or never received, leave the transaction unresolved and let a user raise an issue. An administrator may resolve it with a recorded reason. Do not auto-release an item or mark it completed based only on a timeout. | Avoids inventing a timeout and protects data integrity. Requires a minimal admin action. |
| DD-12 | Notifications | Include an in-app notification inbox in the first release; defer push notifications. | Useful for request/transaction updates without push-service setup. |
| DD-13 | Reviews | Include simple two-way, one-per-user-per-completed-transaction ratings (1–5) after core flows pass testing. | Adds a trust feature without requiring a separate service. |
| DD-14 | Reports and admin | Include basic listing/user reporting and a small admin area inside the same React Native app. Admin accounts are provisioned manually; no public admin registration. | Avoids introducing a second frontend framework and gives the moderation workflow somewhere to go. |
| DD-15 | Categories | Start with: Books & Study Materials; Electronics & Gadgets; Calculators; Lab & Workshop Equipment; Sports & Fitness; Hostel & Daily Essentials; Accessories; Other. | A controlled list simplifies filtering and data quality. |
| DD-16 | Item condition | Use `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`. Require condition for both sale and lending listings. | Small, understandable enum. |
| DD-17 | Images | Allow up to 5 images per listing; accept JPEG, PNG and WebP; target a 5 MB maximum per image. Validate content type and size server-side and use signed Cloudinary uploads. | Enough visual detail without excessive uploads. Confirm Cloudinary account limits before implementation. |
| DD-18 | Language/tooling | Use TypeScript for mobile and backend. Use Expo as React Native tooling, not as a second CPAD framework. Select navigation and validation libraries only after checking current compatibility. | Type safety and one consistent language; avoids premature dependency selection. |
| DD-19 | Mobile token storage | Store credentials/tokens in platform secure storage, not AsyncStorage. Prefer short-lived access tokens plus refresh-token rotation if implemented with a server-side session record. | Reduces exposure of credentials and supports logout/revocation. Exact durations to be chosen during auth design. |
| DD-20 | Admin audit | Record every admin intervention on a transaction or listing with actor, action, reason and timestamp. | Makes exceptional corrections traceable. |

---

## 3. Proposed transaction rules to add to the design

### 3.1 Sale

- A listing begins as `AVAILABLE`.
- A buyer request begins as `PENDING`; multiple pending requests may exist.
- Only the owner may accept a pending request.
- Acceptance atomically changes the listing to `RESERVED` and the selected request to `ACCEPTED`.
- Other pending sale requests for that listing are closed as unavailable/rejected with a system reason.
- Before handover, either participant may cancel with a reason. The listing returns to `AVAILABLE`; users must create a fresh request because prior pending requests were closed.
- Owner marks physical handover; buyer confirms receipt. Only then does the transaction become `COMPLETED` and listing become `SOLD`.
- If a participant disputes the handover or does not confirm, the transaction remains unresolved for manual review. No automatic completion.

### 3.2 Free lending

- A lending listing remains `ACTIVE` while it can accept requests; availability is determined from approved/active transaction periods.
- Multiple pending requests and multiple future non-overlapping approved bookings may exist.
- Pending requests do not reserve dates.
- On approval, the backend checks for overlapping approved/handed-over/active/return-pending transactions and atomically reserves the requested period.
- If another booking already occupies any requested date, approval returns a conflict response (`409`) and does not change the request to approved.
- The lender marks handover; borrower confirms receipt; borrower marks return; lender confirms return.
- A borrowing is overdue when the local calendar date is later than the expected return date and the return has not been marked by the borrower. A return awaiting lender confirmation is not automatically treated as overdue, but remains unresolved.
- A lender may reject a return confirmation with a reason, returning the transaction to an active/issue-needed state. The exact status name should be finalised in the state diagram.
- After handover, use issue reporting/admin review rather than ordinary cancellation.

### 3.3 Date overlap

Use date-only values formatted as `YYYY-MM-DD`. For inclusive start and return dates, two ranges overlap when:

```text
existingStartDate <= requestedEndDate
AND
existingExpectedReturnDate >= requestedStartDate
```

Completed and cancelled borrowings do not block future bookings. Approved, handover-pending, active and return-pending borrowings do block overlapping dates until the return is confirmed or an administrator resolves the transaction.

### 3.4 Concurrency requirement

Do not implement borrowing approval as only:

1. Query for overlapping bookings.
2. If none found, insert/update the transaction.

Two requests could pass the query simultaneously. The proposed safe pattern is a MongoDB transaction that:

1. Reads/checks overlapping blocking transactions.
2. Conditionally updates a shared reservation/version field on the parent listing (forcing competing approvals for that listing to conflict).
3. Changes the chosen transaction to approved.
4. Closes overlapping pending requests if that is the chosen policy.
5. Commits, with bounded retry handling for transient transaction conflicts.

This pattern must be tested with parallel requests against the actual Atlas deployment. It is a design requirement, not yet implemented code.

---

## 4. Scope recommendation for the first demonstrable release

### Core release

- Registration/login and profile.
- Public listing browse/search/filter.
- Create/edit/deactivate sale and free-lending listings.
- Purchase request lifecycle.
- Borrowing request lifecycle with date conflicts.
- Two-party handover/receipt and return confirmation.
- My listings and my transactions.
- In-app notifications.

### After core release is stable

- Reviews and ratings.
- Listing/user reports and admin moderation.
- Optional user contact sharing after request acceptance.
- Password recovery and email verification, depending on service setup.

### Explicitly deferred

- Payments, escrow and paid rental.
- Delivery/shipping.
- Built-in real-time chat.
- Push notifications.
- Maps and location tracking.
- AI matching/recommendation.

This prioritisation is recommended only. If the course rubric explicitly requires any deferred item, revise the scope before implementation.

---

## 5. Required additions to the data model

The v0.1 schema should be updated to consider these fields/records:

### `listings`

- `listingType`: `SALE | LEND`.
- `status`: sale-specific `AVAILABLE | RESERVED | SOLD | INACTIVE`; lending-specific `ACTIVE | INACTIVE`.
- `saleDetails.amountMinor` and `saleDetails.currency` only for sale listings.
- `reservationVersion` (integer) to coordinate concurrent borrowing approvals for the same listing.
- `images`: URL/public ID pairs, subject to server-side upload validation.
- `category` and `condition` constrained to approved enums.

### `transactions`

- Store date-only borrowing fields as `startDate` and `expectedReturnDate` in `YYYY-MM-DD` form if the date-only decision is approved.
- Store the accepted sale amount/currency as an immutable transaction snapshot so later listing edits cannot alter the agreed price.
- Store handover and return acknowledgements as separate actor/timestamp fields.
- Store cancellation reason, issue/review status and a minimal status history.
- Do not accept arbitrary client-supplied transaction status.

### Optional collections

- `notifications`: in-app inbox events.
- `reviews`: one record per reviewer per completed transaction.
- `reports`: user/listing/transaction issue reports.

Use a small transaction history/audit structure so administrator interventions and critical state transitions can be traced. Decide whether this is an embedded `statusHistory` array or a separate collection after expected query needs are reviewed.

---

## 6. Questions that still require owner approval

The recommendations above are ready for review. The following are the most consequential choices to confirm:

1. **Student verification:** self-declared college affiliation, without collecting student ID documents?
2. **Offline contact:** reveal an optional contact method only after a request is accepted, with no in-app chat?
3. **Borrowing dates:** whole calendar days in `Asia/Kolkata`, with both start and expected-return dates treated as occupied?
4. **First-release extras:** include in-app notifications; defer reviews and reports/admin until core transactions work?
5. **Technology:** TypeScript for both React Native and Express, with Expo as development tooling?

All other recommendations can remain provisional until the final API/schema review.

---

## 7. Approval and change control

- Owner approval must be explicit before these recommendations are treated as confirmed.
- After approval, update `BorrowBuddy_Requirements_v1.0.md` to a new version only where user-facing requirements changed.
- Update the technical design to v0.2 or later with approved schema, status diagrams, API request/response formats and indexes.
- Keep a change log entry for every meaningful scope or schema change.
- Do not begin feature implementation while a critical state-machine or concurrency rule remains unresolved.

**End of design review v0.1.**
