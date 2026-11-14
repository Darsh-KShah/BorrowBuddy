# BorrowBuddy — Requirements Specification

**Document:** Requirements baseline  
**Version:** 1.0  
**Status:** Working baseline for design  
**Prepared:** 6 November 2026  
**Project title:** **BorrowBuddy: A Peer-to-Peer Buy, Sell, Borrow and Lend Marketplace**

---

## 0. How to use this document

This file is the current source of truth for BorrowBuddy's agreed project scope. Keep it in the project repository and update it when a requirement or design decision changes.

To reduce misunderstandings and unsupported assumptions, requirements are classified as follows:

- **Confirmed:** explicitly selected or stated by the student.
- **Proposed baseline:** suggested during planning but not yet explicitly approved. Treat it as provisional until reviewed.
- **Deferred:** intentionally outside the first release unless the scope is revised.
- **Open decision:** information that must be decided before the affected implementation begins.

Do not silently promote a proposed baseline or open decision into a confirmed requirement. When a decision changes, update the relevant section and the change log at the end of this document.

This is a requirements document, not proof that any feature has been implemented or tested.

## 1. Project identity and constraints

### 1.1 Project identity

- **Name:** BorrowBuddy
- **Submitted title:** BorrowBuddy: A Peer-to-Peer Buy, Sell, Borrow and Lend Marketplace
- **Core idea:** A student-focused mobile marketplace for listing items for sale or free lending, discovering listings, and managing requests and offline exchanges.

The title was entered in the shared project-title spreadsheet. The student's screenshot showed the BorrowBuddy title in the row associated with the student's entry.

### 1.2 Confirmed project constraints

| Area | Current decision | Status |
|---|---|---|
| Target audience | Students | Confirmed |
| Exchange model | Physical/offline exchange between users | Confirmed |
| CPAD framework | React Native | Confirmed by project-framework choice |
| Development computer | Arch Linux with Hyprland, 4 GB RAM | Confirmed constraint |
| Documentation | Comprehensive project documentation; upload to Google Classroom when instructed | Course requirement supplied by student |

The selected CPAD framework must remain **React Native**. Expo, if used, is development tooling for the React Native application, not a second CPAD framework.

### 1.3 Proposed technology stack (not yet frozen)

| Layer | Proposed choice | Status / note |
|---|---|---|
| Mobile framework | React Native | Selected CPAD framework |
| Development tooling | Expo | Proposed; verify compatibility and current setup before installation |
| Mobile language | TypeScript | Proposed; may be adopted in the architecture phase |
| Backend | Node.js + Express.js REST API | Proposed |
| Database | MongoDB Atlas | Proposed cloud database |
| Image storage | Cloudinary | Proposed external image storage |
| Authentication | JWT access authentication + bcrypt password hashing | Proposed; token storage and refresh strategy still need design |
| Mobile testing | Physical Android device with Expo Go or a compatible development build | Proposed; verify device/runtime compatibility |

### 1.4 Hardware and development constraints

The development setup must be suitable for a machine with 4 GB RAM running Arch Linux and Hyprland.

Design principles:

- Prefer testing on a physical Android device instead of running an Android emulator.
- Avoid requiring Android Studio to remain open during routine development.
- Avoid Docker and unnecessary local services unless a real need is demonstrated.
- Prefer a cloud-hosted database over running a database server locally.
- Keep the number of concurrently running development processes low.
- Install only dependencies that have a clear purpose.

These are design constraints, not a guarantee that every tool or workflow will have negligible resource use. Actual memory usage must be checked on the user's machine.

## 2. Problem statement

Students sometimes need items for a short period or want to purchase affordable pre-owned items. Other students may own items that they no longer need regularly and could sell or lend. Finding these items through informal contacts and scattered group chats can be inconvenient, and it can be difficult to track requests and exchanges.

BorrowBuddy proposes a central student marketplace where users can discover listings, express interest, and manage the status of sale or lending transactions. The physical exchange remains offline and is arranged by the participating users.

## 3. Product objectives

1. Provide a common marketplace for students.
2. Allow students to list items for sale.
3. Allow students to list items for free lending.
4. Help users discover listings through browsing, search and filters.
5. Provide structured purchase and borrowing requests.
6. Track the progress of accepted transactions and offline handovers.
7. Support transaction-based reviews as a trust feature, subject to final approval.
8. Keep the first release achievable on the available 4 GB RAM development machine.

## 4. Scope

### 4.1 In-scope for the proposed first release

- Student accounts and profiles.
- Item listings with photographs and descriptions.
- Two listing types: **SALE** and **LEND**.
- Marketplace browsing, keyword search and basic filters.
- Purchase requests for sale listings.
- Borrowing requests for lending listings, with requested start and return dates.
- Seller/lender approval or rejection of requests.
- Separate tracking of transaction approval and physical handover/return confirmations.
- Basic in-app notifications, if retained after scope review.
- Reviews after completed transactions, if retained after scope review.
- Basic reporting and administrator moderation, if retained after scope review.

The main user-facing purpose and the two listing types follow the conversation's decisions. Notifications, reviews, reporting and administration were proposed during planning and remain provisional until confirmed.

### 4.2 Explicitly deferred from the initial release

- In-app payment gateway or payment collection.
- Delivery, shipping or courier management.
- Paid rentals and rental-fee calculations.
- Built-in real-time chat.
- Advanced location-based discovery or maps.
- AI recommendations or local AI inference.
- Complex dispute resolution or escrow.

These may be considered later only if time, course requirements and implementation capacity allow.

### 4.3 Offline exchange model

BorrowBuddy manages discovery, requests and transaction records. Users arrange and perform the physical exchange themselves.

The app must not imply that it processes or guarantees offline payments, item quality, delivery, or the safety of an in-person exchange.

**Open decision:** The exact method for users to coordinate offline (for example, contact details revealed after acceptance, or an external contact method) has not yet been selected. Do not expose personal contact information publicly by default.

## 5. User types and permissions

### 5.1 Student

A student account is the primary user type. The same student may act as buyer, seller, borrower or lender depending on the listing and transaction.

Expected abilities in the proposed baseline:

- Register, sign in and manage a profile.
- Browse and search listings.
- Create and manage their own eligible listings.
- Submit or withdraw eligible requests.
- Accept/reject requests for their own listings.
- Confirm only the transaction actions assigned to their role.
- Review another participant only after an eligible completed transaction, if reviews are retained.
- Report listings or users, if reporting is retained.

### 5.2 Administrator

A basic administrator role is proposed for moderation. Its exact capabilities and whether it will be implemented in the mobile application or through a minimal separate admin interface remain open design decisions.

Potential abilities: review reports, remove inappropriate listings, suspend/reactivate accounts and inspect basic platform activity.

### 5.3 Guest

A guest experience is not fully specified. A minimal introduction, registration and login experience is proposed. Whether guests may browse public listings must be decided before screen and API design is finalised.

### 5.4 Student eligibility and verification

The intended audience is students, including students from different colleges. The mechanism for verifying student status has not been decided.

Email verification only proves control of an email address; it does not by itself prove current student enrolment. Do not describe the application as institution-verified unless a genuine verification process is designed and implemented.

## 6. Functional requirements

Requirement priorities below are provisional until the project schedule and evaluation rubric are known.

### FR-01 — Account registration and authentication

The system should allow a student to:

- Create an account using required registration details.
- Sign in and sign out.
- Access protected functions only when authenticated.
- View and edit permitted profile fields.
- Recover access after forgetting a password, if password recovery is included.

Proposed profile fields:

| Field | Proposed requirement |
|---|---|
| Full name | Required |
| Email | Required and unique |
| Password | Required; store only a password hash |
| College/institution | Required for the student-focused marketplace |
| Profile image | Optional |
| Phone number | Optional; must not be publicly exposed by default |

**Open decisions:** email verification provider and flow; student-verification policy; password reset mechanism; exact required fields; token lifecycle and secure client-side token storage.

### FR-02 — Listing management

Authenticated students should be able to create a listing with:

- Title and description.
- Category.
- One or more item photographs (exact limits to be defined).
- Item condition.
- Listing type: `SALE` or `LEND`.
- Asking price for `SALE` listings.
- Availability information for `LEND` listings.

For the proposed initial release:

- `SALE` requires a valid positive asking price.
- `LEND` is free; no lending fee is charged through the app.
- Users may edit or deactivate their own eligible listings.
- A listing with an active or unresolved transaction must not be deleted or edited in a way that invalidates that transaction.

### FR-03 — Marketplace discovery

Users should be able to:

- Browse available listings.
- Search by title/keywords.
- Filter by category and listing type.
- Filter by item condition.
- Open a listing detail view.
- View the owner's permitted public profile information and college.

Default marketplace results should exclude sold, inactive and otherwise unavailable listings.

### FR-04 — Sale requests

A buyer should be able to submit a purchase request for an available `SALE` listing. The seller should be able to accept or reject a pending request. A buyer should be able to withdraw their own pending request.

Accepting one sale request reserves the listing for that buyer. Other pending requests for that listing must become ineligible and should be closed with a clear outcome. A listing must not be sold to more than one buyer.

Approval is not the same as a completed sale. The application should record offline handover and buyer receipt confirmation as separate actions.

### FR-05 — Borrowing/lending requests

A borrower should be able to:

- Select an available `LEND` listing.
- Request a start date and expected return date.
- Submit a borrowing request.
- Withdraw their own pending request.
- View request and active-borrowing status.

A lender should be able to:

- View requests for their listing.
- Approve or reject a pending request.
- Confirm physical handover.
- Confirm receipt of the returned item.

The backend must prevent overlapping approved/active borrowing periods for the same item. The exact date boundary convention and timezone handling must be defined in the technical design.

### FR-06 — Transaction and handover tracking

The system must distinguish:

1. A request being accepted.
2. The physical item being handed over.
3. The other participant acknowledging receipt.
4. A return being initiated (for lending).
5. The lender acknowledging the returned item.

Only the backend may validate and apply state transitions. A client must not be allowed to set an arbitrary transaction status.

### FR-07 — Notifications (proposed)

Potential in-app notifications include:

- New purchase or borrowing request.
- Request accepted or rejected.
- Request withdrawn.
- Handover or receipt confirmation required.
- Return reminder or overdue notice.
- Return confirmation.

In-app notifications are the proposed first implementation. Push notifications are deferred until the core workflow is stable.

### FR-08 — Reviews and ratings (proposed)

If included, reviews should obey these rules:

- Only participants in a completed transaction may review one another.
- A reviewer may review the other participant only once per transaction.
- Rating scale proposed: 1–5.
- Written feedback is optional and subject to length/content validation.
- Pending, rejected or cancelled transactions are not review-eligible.

### FR-09 — Reporting and moderation (proposed)

If included, users may report a listing or user with a reason and optional description. An administrator may review reports and take a defined action, such as dismissing a report, removing a listing or restricting an account. The moderation policy and audit trail require design.

## 7. Detailed user workflows

### 7.1 Registration and login

Proposed flow:

1. User opens BorrowBuddy.
2. User chooses registration and enters required details.
3. Backend validates fields and checks email uniqueness.
4. Account is created with a secure password hash.
5. If email verification is enabled, the user completes the verification flow.
6. User signs in and accesses the application.

Required error cases: duplicate email, malformed input, incorrect credentials, expired/invalid verification token and unavailable server.

### 7.2 Create a listing

1. Authenticated student opens Add Listing.
2. Student enters title, description, category and item condition.
3. Student uploads item photographs.
4. Student selects `SALE` or `LEND`.
5. For `SALE`, student enters a positive asking price.
6. For `LEND`, student supplies availability information.
7. App validates basic form input; backend validates all trusted rules.
8. Listing is saved and becomes visible according to its status.

### 7.3 Sale workflow

1. Buyer discovers and opens a `SALE` listing.
2. Buyer submits a purchase request.
3. Seller receives/ sees the request.
4. Seller accepts or rejects it.
5. If accepted, the listing becomes reserved for that request. Other pending requests are closed or marked no longer eligible.
6. Buyer and seller arrange an offline meeting using the coordination method eventually selected.
7. Seller records that the item was handed over.
8. Buyer confirms receipt.
9. The transaction becomes completed and the listing becomes sold.

**Open design point:** The exact confirmation protocol for disputed or one-sided handovers is not yet defined. A timeout or dispute mechanism should not be invented without deciding the required scope.

### 7.4 Borrowing/lending workflow

1. Borrower opens a `LEND` listing.
2. Borrower selects a requested start date and expected return date.
3. Backend validates dates and checks availability.
4. Borrower submits a request.
5. Lender approves or rejects it.
6. On approval, the requested period is reserved, subject to an atomic conflict check.
7. Lender records physical handover.
8. Borrower acknowledges receipt; only then does the borrowing become active.
9. Borrower returns the item offline.
10. Borrower marks the item as returned.
11. Lender confirms receipt of the returned item.
12. The borrowing becomes completed and the item becomes available for future non-conflicting requests.

If an active borrowing passes its expected return date, it may be flagged as overdue. Overdue should be derived from the expected return date and transaction state, not treated as a separate user-editable status.

### 7.5 Reviews workflow (if included)

1. Transaction reaches completed status.
2. Each participant becomes eligible to review the other participant.
3. Reviewer selects a rating and optionally writes feedback.
4. Backend checks transaction participation, completion and duplicate review rules.
5. Review is stored and contributes to the recipient's rating summary.

### 7.6 Reports workflow (if included)

1. User opens a listing or profile.
2. User submits a report with a reason and optional details.
3. Backend stores the report.
4. Administrator reviews it.
5. Administrator dismisses the report or takes an allowed moderation action.
6. The action and its actor/time should be auditable if moderation is implemented.

## 8. Status models and transaction rules

Statuses below are proposed models to validate during architecture design. They must not be implemented as arbitrary client-controlled strings.

### 8.1 Sale listing statuses

| Status | Meaning |
|---|---|
| `AVAILABLE` | New purchase requests may be submitted |
| `RESERVED` | A seller accepted one request; no other purchase request may be accepted |
| `SOLD` | Sale completion was confirmed |
| `INACTIVE` | Owner/admin deactivated the listing |

### 8.2 Sale transaction statuses

Proposed lifecycle:

`PENDING` → `ACCEPTED` → `HANDOVER_PENDING_CONFIRMATION` → `COMPLETED`

Alternative terminal outcomes: `REJECTED`, `CANCELLED`.

A possible implementation is to keep handover acknowledgements as explicit fields/events rather than creating a status for every individual participant action. Final representation belongs in the data model.

### 8.3 Lending listing availability

A lending listing should remain an item listing, while its bookable availability is determined by its availability rules and approved/active borrowing periods. Do not reuse sale-only `RESERVED` and `SOLD` semantics without a reasoned design.

The owner may deactivate a lending listing only when doing so does not invalidate an active borrowing. Existing transactions must remain readable and resolvable.

### 8.4 Borrowing transaction statuses

Proposed lifecycle:

`PENDING` → `APPROVED` → `HANDOVER_PENDING_CONFIRMATION` → `ACTIVE` → `RETURN_PENDING_CONFIRMATION` → `COMPLETED`

Alternative terminal outcomes: `REJECTED`, `CANCELLED`.

`OVERDUE` should be a derived flag (for example, active borrowing after its expected return date), not a separate state that users can set.

### 8.5 State transition safeguards

- Only the relevant participant may perform their assigned confirmation.
- The backend checks the current state before applying a transition.
- Repeated requests must be idempotent where practical; a retry must not create duplicate transactions or confirmations.
- Approval must re-check availability at the time of approval, not rely only on an earlier mobile-side check.
- Approval and reservation must be atomic with respect to competing requests.
- A sale listing may have at most one accepted/in-progress sale transaction.
- Approved/active lending periods for the same item must not overlap.
- Exact cancellation rules after approval remain an open decision.

## 9. Business rules

| ID | Rule | Status |
|---|---|---|
| BR-01 | A user cannot request their own listing. | Proposed baseline |
| BR-02 | Authentication is required to create listings or transactions. | Proposed baseline |
| BR-03 | A sale listing requires a positive asking price. | Proposed baseline |
| BR-04 | Lending is free in the initial release. | Proposed baseline; confirm before implementation |
| BR-05 | Sold/inactive listings cannot receive new requests. | Proposed baseline |
| BR-06 | A sale listing can have only one completed buyer and at most one accepted/in-progress sale. | Required consistency rule |
| BR-07 | Approved/active borrowing periods for the same item cannot overlap. | Required consistency rule |
| BR-08 | A requested return date must be later than the start date. | Required validation rule |
| BR-09 | Participants may confirm only the actions assigned to their transaction role. | Required authorisation rule |
| BR-10 | Reviews, if included, require a completed transaction. | Conditional on reviews feature |
| BR-11 | Users may modify only their own listings, subject to transaction constraints. | Required authorisation rule |
| BR-12 | Suspended users cannot create listings or initiate new transactions. | Proposed; moderation feature dependent |
| BR-13 | The backend, not the client, controls transaction state transitions. | Required consistency/security rule |
| BR-14 | Private contact information is not publicly exposed by default. | Proposed privacy rule |

### 9.1 Important edge cases to test

- Two buyers attempt to request or obtain the same sale item at nearly the same time.
- Two lenders' approval actions would create overlapping borrowing periods.
- A listing owner tries to delete or materially edit an item with an active transaction.
- A user tries to request their own item.
- A borrower fails to return the item by the expected date.
- A user retries a request after a slow or interrupted network response.
- A user repeats a confirmation action.
- A user's account is suspended while they have an active transaction.
- An item becomes inactive while there are pending requests.
- A participant does not acknowledge a handover or return.

The expected resolution for one-sided confirmations, disputes and post-approval cancellation must be defined before those cases are considered fully implemented.

## 10. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Common screens and API operations should respond promptly under normal network conditions. Set measurable targets after an initial prototype. |
| Security | Hash passwords; authenticate protected requests; enforce authorisation and validation on the backend. |
| Reliability | Prevent duplicate/contradictory transactions and protect critical state changes. |
| Usability | Use clear navigation, status labels and actionable error messages. |
| Maintainability | Keep mobile, backend and data-access responsibilities modular. |
| Compatibility | Support the selected Android test device and agreed target OS range. |
| Privacy | Collect only necessary personal information; avoid public exposure of contact details. |
| Data integrity | Validate references, ownership, status transitions and date conflicts. |
| Resource use | Keep the development workflow practical on 4 GB RAM; measure rather than assume memory use. |

### 10.1 Security measures proposed

- Hash passwords using bcrypt or an appropriately selected password-hashing implementation.
- Protect private API routes with authentication.
- Enforce ownership and participant checks on the server.
- Validate and sanitise incoming data.
- Rate-limit sensitive endpoints such as login and password recovery.
- Validate image uploads and restrict file types/sizes.
- Keep secrets in environment variables and out of version control.
- Use secure token storage on the mobile device; exact token/refresh design remains open.

## 11. Preliminary data entities

This is a conceptual inventory only, not the final MongoDB schema.

| Entity/collection | Purpose |
|---|---|
| `users` | Account identity, profile, college, credentials metadata and account status |
| `listings` | Item information, owner, images, listing type, price/availability and listing status |
| `transactions` | Sale or borrowing request, participants, requested dates, state and confirmations |
| `reviews` | Transaction-linked rating and feedback, if feature is retained |
| `notifications` | Recipient, event, message, read state and timestamp, if feature is retained |
| `reports` | Reporter, reported listing/user, reason and moderation state, if feature is retained |

The exact fields, indexes, embedded/reference strategy, retention policy and referential checks must be designed in Phase 1. Do not code from this conceptual list alone.

## 12. Acceptance criteria

The core release should not be called complete until these checks pass:

- [ ] A student can register and sign in.
- [ ] Users can create, edit and deactivate their own eligible listings.
- [ ] Users can browse, search and filter sale and lending listings.
- [ ] A buyer can submit a request and a seller can accept/reject it.
- [ ] A sale listing cannot be accepted by two buyers.
- [ ] The sale handover and buyer receipt are recorded separately.
- [ ] A borrower can request a defined date range.
- [ ] Conflicting approved/active borrowing periods are prevented.
- [ ] Both participants can confirm borrowing handover and return.
- [ ] Overdue borrowing is identified correctly.
- [ ] Users cannot modify another user's listing or transaction.
- [ ] Invalid or repeated state transitions are rejected safely.
- [ ] Reviews work only for eligible completed transactions, if included.
- [ ] Reports can be reviewed by an authorised administrator, if included.

A checklist item is complete only after it has been implemented and tested. This document does not mark any item as implemented.

## 13. Development roadmap

| Phase | Deliverable | Gate before moving on |
|---|---|---|
| 0. Requirements | This requirements baseline | Confirm the remaining scope decisions |
| 1. System design | Architecture, data model, state diagrams, API contract, screen/navigation map | Check consistency across requirements, schema and APIs |
| 2. Environment setup | Lightweight React Native/Expo and Node.js development setup | Confirm it runs on Arch and physical Android device |
| 3. Backend foundation | Project structure, configuration, database connection, authentication | Test APIs independently |
| 4. Marketplace backend | Listing CRUD, search/filter, sale and borrowing request logic | Test ownership, validation and concurrency cases |
| 5. Mobile foundation | Navigation, screens, forms and API client | Verify flows on physical device |
| 6. Integration | Connect mobile application to backend | Test complete user journeys |
| 7. Supporting features | Notifications, reviews, reports/admin, as approved | Test authorisation and lifecycle constraints |
| 8. QA and documentation | Test results, screenshots, diagrams and final report | Verify against course submission instructions |

## 14. Immediate next step: Phase 1 technical design

Do not begin feature coding yet. The next design package should contain:

1. System context and component architecture.
2. Final scope and user-permission matrix.
3. MongoDB schema: fields, types, required/optional rules, references and indexes.
4. Transaction state machines and transition guards.
5. Date-range and timezone policy for lending availability.
6. REST API specification, including authentication, request/response examples and error formats.
7. Mobile screen inventory and navigation map.
8. Image-upload flow and security limits.
9. Error handling, retry and idempotency strategy.
10. Test plan covering normal, invalid, concurrent and interrupted-network cases.

Implementation should start only after the design has been reviewed for consistency and the open decisions that affect the data model or APIs have been resolved.

## 15. Open decisions register

These items are not settled. Resolve them deliberately; do not guess in code.

| ID | Open decision | Why it matters |
|---|---|---|
| OD-01 | Is the marketplace limited to verified students, or open to self-identified students? | Registration and trust model |
| OD-02 | What evidence, if any, verifies a student's college affiliation? | Account fields and verification flow |
| OD-03 | Can guests browse listings, or must users log in first? | Permissions and navigation |
| OD-04 | Is email verification mandatory? Which service will send verification emails? | Authentication implementation and external service setup |
| OD-05 | How do users coordinate offline after request acceptance? | Contact privacy and transaction UX |
| OD-06 | Are in-app notifications required for the first release, or are screen-based status updates sufficient? | Scope and infrastructure |
| OD-07 | Are reviews and ratings required for the first release? | Data model and moderation |
| OD-08 | Is reporting/admin moderation required for the first release? | Admin interface and permissions |
| OD-09 | What is the exact cancellation policy before and after approval? | Transaction lifecycle and consistency |
| OD-10 | What happens when only one participant confirms a handover or return? | Dispute handling and transaction completion |
| OD-11 | What lending date granularity is required: whole days or date-and-time? What timezone is authoritative? | Availability logic and database representation |
| OD-12 | Can a lender accept several non-overlapping requests for one item in advance? | Reservation and availability rules |
| OD-13 | What categories and item-condition values should be available? | Listing forms and filters |
| OD-14 | What image count, size and file-type limits should apply? | Upload flow, storage and validation |
| OD-15 | Will an administrator use the same mobile app or a separate minimal web/admin interface? | Architecture and framework scope |
| OD-16 | What are the course's exact documentation format and evaluation requirements? | Final submission package |

## 16. Change log

| Version | Date | Change |
|---|---|---|
| 1.0 | 6 November 2026 | Initial requirements baseline created from the project discussion. Confirmed student audience, offline exchange model and React Native framework. Recorded proposed sale/free-lending scope, workflows, safeguards, open decisions and next design phase. |

---

## 17. Accuracy and implementation rules for future work

When using this document in future conversations or coding sessions:

1. Treat this file as the requirements source of truth, but check its version and status first.
2. Do not invent requirements, APIs, fields, dependencies, credentials, test results or completed work.
3. Distinguish confirmed decisions from proposed and unresolved items.
4. If a requested change conflicts with this document, explain the conflict and update the specification deliberately before coding.
5. Keep the data model, API contract, frontend types and tests consistent.
6. Never claim a feature is implemented or tested unless the corresponding code or test result has actually been inspected.
7. Prefer small, verifiable changes and provide exact file paths and commands.
8. Re-check current tool/library documentation when implementation depends on version-sensitive behaviour.

**End of requirements baseline v1.0.**
