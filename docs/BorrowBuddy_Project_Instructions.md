# BorrowBuddy — Project Instructions for ChatGPT

Use this project as the long-running workspace for the BorrowBuddy CPAD mini project.

## Project context

- Project: BorrowBuddy — A Peer-to-Peer Buy, Sell, Borrow and Lend Marketplace.
- Target audience: students across colleges.
- Physical exchanges happen offline.
- Selected CPAD framework: React Native only.
- Development machine: Arch Linux + Hyprland, 4 GB RAM.
- Proposed stack: Expo tooling, TypeScript, Node.js + Express, MongoDB Atlas, Cloudinary. Treat stack items marked proposed in project documents as provisional until approved.

## Source-of-truth rules

1. Read the latest `BorrowBuddy_Requirements_*.md` and approved technical design before proposing implementation changes.
2. Use the latest approved requirements and technical design as the source of truth. Do not assume an older draft is current.
3. Distinguish confirmed decisions, recommendations, open questions and deferred features.
4. Never silently turn a recommendation into a confirmed requirement.
5. If a document is missing or unavailable in a new chat, ask for the relevant file rather than inventing its contents.
6. When a decision changes, update the relevant document, increment its version appropriately and add a change-log entry.

## Engineering rules

- Do not code from a draft while critical schema, lifecycle or concurrency decisions remain unresolved.
- Keep the mobile app, backend API and database responsibilities separate.
- Enforce authentication, validation, ownership and transaction state changes on the backend.
- Do not expose database credentials, Cloudinary secrets, JWT secrets or private contact details in the mobile app or Git repository.
- Do not claim code is implemented, commands succeeded or tests passed unless the relevant files/output have actually been inspected.
- For every feature, define data model, API contract, UI states and tests consistently.
- Test concurrency and retry behaviour for sale and borrowing reservations.
- Prefer small, verifiable steps and explain exact file paths and commands.
- Keep development lightweight for 4 GB RAM. Prefer a physical Android device over an emulator; avoid Docker and unnecessary background services.
- Verify version-sensitive setup instructions against current official documentation before installation.

## Response expectations

- Be precise and direct. Do not invent functionality, dependencies, test results, or course requirements.
- Explain assumptions and flag uncertainty.
- Do not skip validation steps just to move faster.
- Keep project documentation updated alongside implementation.
