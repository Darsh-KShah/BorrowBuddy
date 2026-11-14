# AGENTS.md — BorrowBuddy

## Mission
Build BorrowBuddy, a student-focused peer-to-peer marketplace for buying, selling, borrowing and free lending. Work in small, verifiable milestones. Preserve the product rules and course constraints below.

## Mandatory first steps
1. Inspect the repository, current branch, `git status`, existing files and package manifests before changing anything.
2. Read all five source documents in `docs/`:
   - `BorrowBuddy_Project_Instructions.md`
   - `BorrowBuddy_Requirements_v1.0.md`
   - `BorrowBuddy_Technical_Design_v0.1.md`
   - `BorrowBuddy_Design_Review_v0.1.md`
   - `BorrowBuddy_Database_API_Contract_v1.0.md`
3. Read `BORROWBUDDY_AGENT_HANDOFF.md` at the repository root.
4. Report what exists, what is missing, any conflicts, and the next smallest safe step. Do not start feature coding before this inspection and document reconciliation.
5. Do not overwrite or silently edit the five original baseline documents. Preserve them and use versioned successor documents for corrections.

## Authority and decision handling
- Treat the requirements and design files as historical baselines whose status labels and open questions must be reconciled with the owner-approved decisions recorded in the handoff.
- Source-of-truth order after reconciliation:
  1. Latest owner-approved requirements.
  2. Latest owner-approved technical design and database/API contract.
  3. Owner-approved decision register.
  4. Earlier drafts and conversation-derived notes.
- Never silently resolve a contradiction. Record it, explain its impact, and update the relevant versioned document.
- Do not treat a proposed item in an old document as approved unless the handoff explicitly records owner approval.
- If a decision is genuinely missing or materially ambiguous, ask the owner before making a breaking assumption.

## Owner-approved product and technical decisions
- CPAD framework: React Native. Expo is development tooling, not a second framework.
- Mobile and backend language: TypeScript.
- Mobile tooling: Expo.
- Backend: Node.js + Express.
- Database: MongoDB Atlas.
- Image storage: Cloudinary with server-authorised signed uploads.
- API prefix: `/api/v1`.
- Audience: students across colleges. College affiliation is self-declared; do not claim official student verification.
- Guest browsing is allowed. Authentication is required for account-specific and transaction actions.
- First working prototype defers email verification; use unique email and password.
- Listing modes: `SALE` and free `LEND` only. No paid rentals or in-app payments.
- Physical exchange is offline. The app does not process or guarantee offline payment, delivery, item quality or in-person safety.
- No in-app chat.
- Optional contact sharing is user-opt-in, only after a request is accepted, and visible only to the relevant transaction participants. Never expose contact details publicly.
- Lending dates are date-only `YYYY-MM-DD`, interpreted in `Asia/Kolkata`. Start and expected-return dates are both inclusive. Same-day end/start overlaps.
- Multiple future non-overlapping approved bookings are allowed. Pending requests do not reserve dates. Availability must be rechecked atomically at approval.
- Either participant may cancel an accepted transaction before physical handover, with a reason. Once handover starts, ordinary cancellation is disallowed; use issue reporting/admin review.
- Two-sided confirmations: seller/lender marks handover; buyer/borrower confirms receipt. Borrower marks return; lender confirms return.
- No automatic completion or release based only on elapsed time.
- In-app notifications are in the first release; push notifications are deferred.
- Reviews are two-way, one per participant per completed transaction, rating 1–5. Implement after core flows are stable.
- Basic listing/user reporting and a small protected admin area in the same mobile app are planned after core transaction flows are stable. Admin accounts are provisioned manually. Log every admin intervention with actor, action, reason and timestamp.
- Categories (stable uppercase slugs):
  `BOOKS_STUDY_MATERIALS`, `ELECTRONICS_GADGETS`, `CALCULATORS`, `LAB_WORKSHOP_EQUIPMENT`, `SPORTS_FITNESS`, `HOSTEL_DAILY_ESSENTIALS`, `ACCESSORIES`, `OTHER`.
- Conditions exactly: `NEW`, `LIKE_NEW`, `GOOD`, `FAIR`.
- Up to 5 listing images; JPEG/PNG/WebP; target maximum 5 MB each. Validate on the server and use signed Cloudinary uploads.
- Secure mobile token storage, short-lived access tokens and refresh-token rotation/revocation.
- Keep the development setup lightweight for Arch Linux + Hyprland with 4 GB RAM. Prefer a physical Android device. Avoid Docker, Android Studio emulator and unnecessary background services unless a demonstrated need justifies them.

## Core lifecycle and integrity rules
- Never allow arbitrary client-supplied transaction status updates. Use dedicated action endpoints and backend state-transition validation.
- Sale acceptance must atomically reserve the listing and close competing pending requests. Sale completion requires both handover and receipt confirmations.
- Borrow date overlap is inclusive:
  `newStart <= existingEnd AND newEnd >= existingStart`.
- Blocking borrow states include accepted/approved, handover-pending, active and return-pending states as defined by the approved contract. Completed/cancelled transactions do not block.
- Borrow approval must not use query-then-update alone. Use a transaction-capable MongoDB Atlas deployment and a shared per-listing conditional write/version bump inside the same transaction as overlap recheck and approval. Retry transient conflicts in a bounded, deliberate way.
- Never claim concurrency safety until parallel-approval integration tests pass against the actual transaction-capable Atlas deployment.
- `OVERDUE` is derived for `ACTIVE` borrow transactions only when the current `Asia/Kolkata` date is later than `expectedReturnDate` and the borrower has not marked return. `RETURN_PENDING` awaiting lender confirmation is unresolved, not automatically overdue.
- After physical handover starts, do not offer ordinary cancellation. Use an issue/report path.
- Do not auto-complete transactions because a date passed or a participant failed to respond.

## Security and code quality
- Keep secrets in environment variables. Never commit `.env`, tokens, passwords, Atlas credentials, Cloudinary secrets or signing keys.
- Provide `.env.example` with placeholder names only.
- Never put database credentials or Cloudinary secrets in the mobile app.
- Hash passwords with an appropriate password-hashing library.
- Enforce authentication, ownership, participant checks, admin permissions, validation and state transitions on the server.
- Avoid mass assignment. Explicitly map allowed request fields.
- Do not log passwords, tokens, private contact details or other secrets.
- Validate upload content type, size and returned Cloudinary asset identity.
- Use server time for state transitions.
- Keep API types, backend validation, database models, mobile types, docs and tests aligned.
- Use maintainable modular architecture, not microservices.
- Do not add dependencies without a clear need. Verify current official documentation for version-sensitive setup.
- Do not invent endpoints, fields, enum values, credentials, outputs or test results.
- Never state that a command succeeded or a test passed unless you ran it and inspected the result.
- Ask before destructive operations, deleting data, force-pushing, rewriting history or overwriting user work.

## Working method
- Work in small milestones. State the goal, files to change, risks and verification plan before substantial changes.
- After changes, run relevant formatting, type-checking, linting and tests where configured. Report exact commands and outcomes.
- Update versioned docs and changelogs whenever a decision, schema, API or implementation contract changes.
- Keep implementation and verification status honest: distinguish not started, implemented but untested, tested locally, and tested against deployed services.
- Prefer simple, readable solutions suitable for a student project and the available hardware.
