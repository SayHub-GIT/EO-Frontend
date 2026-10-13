# Sprint 4 — UI RBAC & User Management

Status: **In progress**. Branch: `feat/s4-1-admin-kecil-role-selector`.

The backend Sprint 3 was merged to `main` in PR #150. This is the separate frontend roadmap. UI changes should follow [anti-slop](https://github.com/miqdadbadjuber/anti-slop), use existing Vuexy/MUI design patterns, avoid ornamental filler, and enforce rights server-side.

- [ ] **S4.1** Super Admin selects event and eligible `Admin_kecil` account from Roles & Permissions, then can inspect/manage genuine event-scoped assignments. **Partial:** selectors rendered; existing staff-access page is linked by event only, so chosen account is informative context, not yet scoped end-to-end.
- [x] **S4.2** Move Assigned Staff panel to the right on desktop and behind editor on mobile; use context-specific Indonesian labels. Implementation committed; CI on latest head to be checked.
- [ ] **S4.3** Admin Kecil UI creates subordinate users and manages event custom roles/granular permissions.
- [x] **S4.4** Users table Event column after Email using event assignment API, `Not Set` only after successful loading, separate warning on API error and long-name wrapping; awaiting latest CI.
- [ ] **S4.5** Effective permission state controls menu/buttons, with backend authorization still mandatory. **Partial:** Users create/edit/delete event handlers check permissions again (not only disabled buttons).

## Batch 1

- Added event + active Admin Kecil selection to existing Roles & Permissions page with explicit communication that the staff-access route currently scopes by event only.
- Does not add or modify API endpoints, permission enforcement, accounts, or ownership records.
- **QA gate:** TypeScript/build/CI must pass; do not merge before verification.

## Batch 2 — 2026-10-13

- PR #193 batch 1 (commit `4f8c009`) verified with three successful checks: Frontend Build, Secret Scan and Cloudflare Workers Compatibility.
- S4.2: event Staff Access editor takes primary left column; Assigned Staff list moves to secondary right column, following editor on narrow screens. Smaller localized labels improved; no API/business logic changes.
- **S4.1 still partial**: selecting an Admin Kecil in the Roles page is contextual only, not an actual account-scoped edit on the destination page. Do not mark S4.1 complete until event ownership/assignment verified through backend.
- Latest CI must be verified prior to merge. Notion untouched.

## Batch 3 — 2026-10-13

- Verified previous batch commit `0928d615`: Frontend Build, Cloudflare Workers Compatibility and Secret Scan all passed.
- S4.4 retrieves event assignments per visible event and maps them to users, rendering the Event column after Email. Long event titles wrap, with `Not Set` only when all assignment requests succeeded and a user has no mapping; API failure yields warning and an em dash rather than a misleading empty assignment.
- Loading all event assignments is a temporary client-side join; revisit server-side projection for large event catalogs, and ensure permission-scoped API reads. No Backend or Notion changes.
- S4.1 remains partial and S4.3/S4.5 remain open; do not merge until CI on latest head is green.

## Batch 4 — 2026-10-13

- S4.5 partial: guard the Users create/edit/save/delete event handlers against denied permissions, including preventing self-delete. UI controls already had disabled gates; this closes accidental direct handler invocation. Backend permission enforcement remains authoritative.
- Scope intentionally small. No Backend or Notion changes. Await PR CI on latest commit.
