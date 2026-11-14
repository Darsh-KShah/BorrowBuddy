# BorrowBuddy — Coding Agent Handoff

**Handoff version:** 1.0  
**Prepared:** 14 November 2026  
**Purpose:** Transfer the project to Codex, a VS Code coding agent, or another development agent that has no access to prior ChatGPT conversations.

## 1. Read this first

You are taking over an existing project design, not a working codebase known to be complete. Assume zero prior context. Read this file, `AGENTS.md`, and all five files in `docs/` before making changes.

The five source documents are design artefacts. Their existence does not prove that any application, backend, database, API, deployment or test has been implemented.

## 2. Project in one paragraph

BorrowBuddy is a student-focused mobile marketplace for students across colleges to list items for sale or free lending, discover listings, submit purchase/borrowing requests, and track offline handovers and returns. The app manages discovery and transaction records. Physical exchanges and any offline payments are arranged by users outside the app. The app must not imply it guarantees payment, delivery, item quality or personal safety.

## 3. What has been completed

The project has completed substantial requirements and design work:
- Requirements baseline: `docs/BorrowBuddy_Requirements_v1.0.md`
- Architecture/technical design draft: `docs/BorrowBuddy_Technical_Design_v0.1.md`
- Technical design review and decision recommendations: `docs/BorrowBuddy_Design_Review_v0.1.md`
- Detailed proposed database schema and REST API contract: `docs/BorrowBuddy_Database_API_Contract_v1.0.md`
- Project working instructions: `docs/BorrowBuddy_Project_Instructions.md`

The owner explicitly approved the recommended design defaults and the detailed direction after reviewing the design. Some older source documents were not updated after that approval, so their `proposed`, `open decision` and `not approved` labels may be stale. Use the owner-approved decisions in Section 4 as the current decision register, and reconcile the documents into versioned successor files before implementation.

## 4. Owner-approved decisions to carry forward

### Stack and environment
- CPAD framework: React Native.
- Expo is the React Native development toolchain.
- TypeScript for mobile and backend.
- Backend: Node.js + Express.
- Database: MongoDB Atlas.
- Image storage: Cloudinary signed uploads.
- REST API base path: `/api/v1`.
- Development computer: Arch Linux + Hyprland, 4 GB RAM.
- Prefer a physical Android device. Avoid Android Studio emulator, Docker and unnecessary background services unless a concrete need is established.

### Product scope
- Audience: students across colleges.
- College affiliation is self-declared. Do not represent it as officially verified.
- Guest users may browse. Login is required for account-specific or transaction actions.
- Email verification is deferred for the first working prototype. Use unique email + password.
- Listing types are `SALE` and free `LEND` only.
- No paid rentals, payment gateway, shipping/delivery management or in-app chat in the first release.
- Offline exchanges are arranged by the participants. BorrowBuddy does not process or guarantee offline payments, delivery, item quality or in-person safety.
- Optional contact sharing is opt-in, only after a request is accepted, and visible only to the participants of that transaction. Never expose contact information publicly.

### Listing data
- Categories and stored slugs:
  - `BOOKS_STUDY_MATERIALS` — Books & Study Materials
  - `ELECTRONICS_GADGETS` — Electronics & Gadgets
  - `CALCULATORS` — Calculators
  - `LAB_WORKSHOP_EQUIPMENT` — Lab & Workshop Equipment
  - `SPORTS_FITNESS` — Sports & Fitness
  - `HOSTEL_DAILY_ESSENTIALS` — Hostel & Daily Essentials
  - `ACCESSORIES` — Accessories
  - `OTHER` — Other
- Conditions: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
- Up to 5 listing images. JPEG, PNG and WebP. Target maximum 5 MB per image. Validate server-side; use signed Cloudinary uploads.

### Borrowing dates and transaction lifecycle
- Lending dates are date-only strings `YYYY-MM-DD`, interpreted in `Asia/Kolkata`.
- Both start date and expected-return date are inclusive. Same-day end/start conflicts.
- Overlap predicate:
  `newStart <= existingEnd AND newEnd >= existingStart`.
- Multiple future non-overlapping approved bookings are allowed.
- Pending requests do not reserve dates. Recheck availability atomically when approving.
- Either participant may cancel an accepted transaction before physical handover, with a reason. Once handover starts, ordinary cancellation is not allowed. Use issue reporting/admin review.
- Two-sided confirmation:
  - Seller/lender marks handover.
  - Buyer/borrower confirms receipt.
  - Borrower marks return.
  - Lender confirms return.
- No automatic completion or release based on timeout.
- `OVERDUE` is derived for `ACTIVE` borrow transactions only when the local `Asia/Kolkata` date is later than expected return date and borrower has not marked return. A `RETURN_PENDING` transaction waiting for lender confirmation is unresolved, not automatically overdue.

### Additional features and security
- In-app notifications in the first release; push notifications deferred.
- Reviews: two-way, one per participant per completed transaction, rating 1–5. Implement after core flows are stable.
- Basic listing/user reports and a protected admin area in the same mobile app are planned after core transaction flows are stable. Admins are provisioned manually. Log each admin intervention with actor, action, reason and timestamp.
- Mobile tokens must use secure device storage. Use short-lived access tokens and refresh-token rotation/revocation.
- Keep secrets out of source control and mobile bundles.

## 5. Important design details in the v1.0 database/API contract

The database/API contract describes these collections:
- `users`
- `listings`
- `transactions`
- `reviews`
- `notifications`
- `reports`
- `adminAuditLogs`
- Optional `sessions`

It defines indexes, API routes/payloads, validation, state transitions, security requirements and testing expectations. Treat it as a detailed proposed baseline, not an approved deployed schema and not evidence of implementation.

Borrow approval concurrency design:
1. Use a MongoDB Atlas deployment that supports multi-document transactions.
2. Within one transaction, read/check overlapping blocking bookings.
3. Conditionally update a shared per-listing `reservationVersion` (or the precisely approved equivalent) so competing approvals for the same listing conflict.
4. Recheck/approve the request and write related state history/notification atomically.
5. Commit with bounded retry handling for transient transaction conflicts.
6. Test parallel approvals against the actual transaction-capable Atlas deployment. Query-then-update alone is unsafe. A mock or in-memory database is not proof of transaction isolation.

Sale acceptance must conditionally reserve the listing and close competing pending requests atomically. Completion requires the two-party handover/receipt confirmations.

## 6. Source documents and known reconciliation work

Keep all five originals unchanged under `docs/`:
1. `BorrowBuddy_Project_Instructions.md`
2. `BorrowBuddy_Requirements_v1.0.md`
3. `BorrowBuddy_Technical_Design_v0.1.md`
4. `BorrowBuddy_Design_Review_v0.1.md`
5. `BorrowBuddy_Database_API_Contract_v1.0.md`

Create versioned successor documents rather than silently editing these originals. At minimum, review and reconcile:
- The requirements and technical design still contain provisional/open-decision language that predates the owner's approval.
- The design review still labels its recommendations as awaiting owner approval.
- The database/API contract v1.0 labels itself a proposed baseline and has implementation gates that need to be re-evaluated against the later owner approval.
- Keep reviews and reports/admin in the design, but mark their implementation priority as after core transaction flows are stable.
- Ensure contact sharing is explicitly opt-in, only after acceptance, and participant-scoped.
- Ensure cancellation is allowed to either participant before physical handover, and ordinary cancellation is disallowed after handover starts.
- Ensure inclusive date semantics and the overlap predicate above are consistent everywhere.
- Preserve the overdue rule above.
- Use only the approved uppercase category slugs and condition values listed in Section 4.
- Do not invent a new condition enum. The authoritative condition set is exactly `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
- Keep the five original baseline files intact. Suggested successor names: `BorrowBuddy_Requirements_v1.1.md`, `BorrowBuddy_Technical_Design_v0.2.md`, `BorrowBuddy_Design_Decisions_v1.0.md`, and `BorrowBuddy_Database_API_Contract_v1.1.md`. Do not promote a successor to approved until the owner-facing review is complete.

## 7. Current implementation status (last verified project handoff)

As of 14 November 2026, the known state is design/documentation complete enough to begin development setup, subject to document reconciliation.

Not completed or not verified:
- Git repository initialisation and branch state.
- Mobile application scaffold.
- Backend scaffold.
- MongoDB Atlas project/cluster and connection.
- Cloudinary configuration.
- Database models and index/migration scripts.
- API implementation.
- Mobile screens/navigation and API integration.
- Authentication implementation.
- Unit, integration and concurrency tests.
- Deployment.

Do not assume any of these exist. Inspect the actual workspace and report evidence before updating this status.

## 8. Required first session workflow

### Step A — Inspect, do not code yet
- Identify the opened workspace root.
- List top-level files and directories.
- Run `git status --short --branch` and inspect the current branch/log if Git exists.
- Inspect `package.json`, lockfiles, Expo config, TypeScript config, backend manifests and existing source directories if present.
- Confirm whether the five source docs are present and whether this handoff plus `AGENTS.md` are present.
- Do not overwrite existing user work.

### Step B — Report the baseline
Return a concise audit:
- Workspace path.
- Git repository/branch/status.
- Existing application/backend files.
- Which of the five source documents are present.
- Any mismatch between the files and this handoff.
- Current milestone and safest next action.
- Any required owner decisions that remain genuinely unresolved.

### Step C — Reconcile documents
- Produce a decision register based on Section 4.
- Create versioned successor documents and changelogs.
- Cross-check enum values, API routes, payloads, state machines, date semantics, contact privacy, cancellation, admin audit and implementation priority.
- Do not silently alter v1.0.
- Ask the owner to review the corrected database/API contract before treating it as the implementation contract.

### Step D — Check machine prerequisites
On the user's Arch Linux machine, inspect (do not blindly install):
- `node --version`
- `npm --version`
- `git --version`
- available disk space and memory
- Android phone availability and whether Expo Go or a compatible development build can be used

Explain any missing prerequisites. Avoid installing a large toolchain before confirming it is needed. Do not assume an Android emulator is available or appropriate.

### Step E — Establish the smallest runnable skeleton
Only after the document review and workspace audit:
- Set up the repository structure if it does not already exist.
- Create a minimal React Native + Expo + TypeScript mobile scaffold.
- Create a separate Node.js + Express + TypeScript backend scaffold.
- Add `.gitignore`, safe `.env.example` files and a README with exact run instructions.
- Add a minimal health endpoint and verify it locally.
- Verify the mobile app on a physical Android device if the device/tooling is available.
- Do not require Atlas or Cloudinary credentials just to prove the local skeleton starts.

Do not build all features in one pass. Report exact commands and outcomes.

## 9. Recommended implementation order after the skeleton

1. Backend configuration, health endpoint, database connection and reviewed index/migration script.
2. Authentication: register, login, refresh, logout, current user/profile.
3. Cloudinary signed upload flow.
4. Listing create/read/update/deactivate and browse/search/filter.
5. Sale request lifecycle, atomic acceptance and two-party completion.
6. Borrow request lifecycle, inclusive overlap checks, atomic approval and concurrency integration tests.
7. In-app notifications.
8. Reviews.
9. Reports and admin moderation/audit.
10. Mobile integration and complete user journeys.
11. QA, screenshots, diagrams and course documentation aligned to the actual rubric.

Each milestone needs acceptance criteria and tests before moving on. Reviews and reports/admin come after the core flows are stable.

## 10. Non-negotiable safeguards

- No secrets in Git, source files, screenshots or logs.
- No claims of implementation or test success without evidence.
- No arbitrary transaction status updates from the client.
- No query-then-update-only borrowing approval.
- No public contact details.
- No accidental introduction of payments, paid rentals, delivery or chat.
- No automatic transaction completion based on timeout.
- No mass assignment or client-authoritative ownership checks.
- No destructive workspace changes without explicit approval.
- No silent edits to the five baseline documents.
- If the codebase contradicts the design, report the discrepancy and ask before making a product-level change.

## 11. First response expected from the coding agent

Start by saying that you have read the handoff and are inspecting the workspace. Then provide the Step B audit. Do not begin by generating screens or implementing features. The first goal is to establish the real repository state and reconcile the design baseline safely.
