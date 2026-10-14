# Sprint 4 — UI RBAC & User Management

Status: **Frontend code integrated for release review; build and owner QA pending**. Original Sprint 4 features entered `main` through PR #193; stabilization integration uses `integration/sprint4-stabilization-20261014`.

The backend Sprint 3 was merged to `main` in PR #150. This is the separate frontend roadmap. UI changes should follow [anti-slop](https://github.com/miqdadbadjuber/anti-slop), use existing Vuexy/MUI design patterns, avoid ornamental filler, and enforce rights server-side.

- [ ] **S4.1** Super Admin selects event and eligible `Admin_kecil` from Roles & Permissions and manages genuine account-scoped event grants. **Implementation authored:** selector now opens dedicated Admin Kecil editor that loads/upserts the selected user's actual event grant. **Pending:** owner manual QA and local compile/build while GitHub runners cannot start.
- [x] **S4.2** Move Assigned Staff panel to the right on desktop and behind editor on mobile; use context-specific Indonesian labels. Implementation committed; CI on latest head to be checked.
- [ ] **S4.3** Admin Kecil UI creates subordinate users and manages event custom roles/granular permissions. **Implementation now authored:** typed API client, subordinate list/create, role-assignment UI, custom-role CRUD + permission editor. **Not QA complete** while GitHub Actions runners cannot start; endpoint and UX regression testing pending.
- [x] **S4.4** Users table Event column after Email using event assignment API, `Not Set` only after successful loading, separate warning on API error and long-name wrapping; awaiting latest CI.
- [x] **S4.5** Effective permission state controls navigation and buttons via existing Navigation/usePermissionAccess, with action-level permission rechecks in Users, Roles and Event Staff editor. Backend authorization remains authoritative. Await release CI before merging.

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

## Batch 5 — 2026-10-13

- Audited `Navigation.tsx`: links for Users, Roles, event editor, registration and other modules already conditionally render from session/workspace effective permissions, so no redundant nav rewrite was needed.
- Added action-layer checks for Roles create/edit/toggle/save/delete and Event Staff edit/toggle, complementing previous Users handlers. System role modification is also blocked locally. API RBAC remains security boundary.
- S4.5 implementation now checked pending current CI; S4.1 and S4.3 remain incomplete. Draft PR #193 must not be claimed to finish Sprint 4.

## Batch 6 — S4.1 account context

- Roles page now passes the selected Admin Kecil account ID in the staff-access route query string.
- Destination validates active Admin Kecil account from fetched users and visibly identifies the selected account, or warns if unavailable.
- **Not a backend ownership filter:** event staff assignments remain unfiltered. S4.1 stays partial until ownership-aware API filtering exists. No authorization is granted from URL query params.
- S4.2/S4.4/S4.5 were implemented in earlier batches. Await CI on latest head; PR #193 remains draft.

## Batch 7 — S4.3 start

- Verified real backend routes `/api/admin/events/{eventId}/sub-users` and `/api/admin/events/{eventId}/roles` plus DTO contracts before authoring API client. Backend already enforces owner/event scope.
- Added `event-sub-users.ts` typed client for subuser list/create and event custom-role list/create/update/delete/permission catalog.
- Added event subordinate page that lists accounts and provisions new inactive staff accounts; no role granting or activation is implied. Added scoped-event sidebar link.
- S4.3 remains partial until per-event custom role creation and assignment is implemented and tested. CI on latest head pending. Backend and Notion unchanged.

## Batch 8 — S4.3 subordinate role assignment UI (2026-10-14)

- Read backend `EventSubUserRoleDtos.cs` and confirmed `PUT /admin/events/{eventId}/sub-users/{subUserId}/roles` request `{ roleIds, isActive }` plus GET response with effective permissions.
- Added client read/write methods and subordinate page selector, active event-custom-role checkboxes, explicit activation switch, and save action.
- **Remaining:** event custom role creation/edit/delete UI, full permission editor, endpoint authorization QA, refresh-on-selection race protection, and latest CI. No claim S4.3 complete or merged.

## Batch 9 — Custom roles and safe assignment (2026-10-14)

- New `/admin/events/[eventSlug]/custom-roles` editor: list/create/update/deactivate/delete event custom roles; supports grouped, server-provided assignable permissions and unknown-permission warnings. Uses confirmation before delete, saves only changed form and blocks duplicate requests.
- Linked role management from the scoped event navigation and subordinate management page. Backend still checks Admin Kecil owner/event and prevents global role escalation.
- Corrected subordinate revocation to satisfy the actual backend invariant: `isActive=false` MUST send `roleIds=[]`; warn about clearing roles and revoking refresh sessions. Active subordinate requires at least one role.
- Added effective permission display from server GET/PUT responses; clarified login account state vs delegated assignment state.
- Prevented stale async role GETs when rapidly switching selected users, added dirty-state navigation warning, and resets stale users/roles on event change.
- **CI/QA blocked, not green:** GitHub Actions FE jobs fail before any runner starts; latest checked workflow jobs showed `runner_id=0`, `steps=[]` and 2–3 second duration on both Ubuntu and Windows. The exact owner-account restriction is unknown because billing settings are not available. Do not bypass required build, Cloudflare, or secret-scan checks.
- Required QA after runner restoration: TypeScript compilation; Next production build; Cloudflare build; secret scan; create/update/deactivate/delete role; prevent deletion of assigned roles; 403 across wrong event/user; permission cap; rapid user switching; child deactivation clears roles and invalidates sessions; active child requires role; event change resets old state.

## Batch 10 — RBAC hardening, local QA tool and handoff (2026-10-14)

- S4.3 custom roles editor now clears role identity/draft/catalog on event switch. Editing role A on event B cannot silently reuse A's ID. Added reserved system role name validation in UI consistent with `EventCustomRoleService.RequireName`.
- Read `ptcpkl/EO-backend` `EventCustomRoleService.DeleteAsync`: it **does not check role assignment usage** before deleting. Added frontend fail-closed preflight that reads subordinate role assignments (batches of 8) before deletion and aborts if assigned or API fails. This protects normal UI use only; **Backend still needs atomic in-use deletion guard** to prevent direct API bypass and races. No Backend changes made in this batch.
- S4.1 route uses `useSearchParams` in Staff Access. Wrapped the hook owner in a React Suspense boundary to avoid Next.js 15 static prerendering/CSR bailout build errors.
- Added owner-run PowerShell local preflight `scripts/check-s4-rbac.ps1` and manual QA matrix `docs/SPRINT-4-MANUAL-QA.md` to allow checks while hosted Actions runners cannot allocate. `npm ci`, `tsc --noEmit`, `next build --no-lint` still need to be executed locally and their results reported by owner.
- Push is allowed despite CI blocker, following `docs/WORKING-AGREEMENT-HANDOFF.md`. **CI still not green; do not claim these changes compiled**. The owner is responsible for manual QA and explicit approval before merge, subject to GitHub branch protection.
- Remaining: S4.1 account-scoped owner access semantics require a verified Backend capability; S4.3 manual end-to-end QA, Backend atomic delete guard, and successful local compile/build are release gates. Do not modify Notion.

## Batch 11 — Real Admin Kecil assignment editor (2026-10-14)

- Audited backend `AdminEventAccessController` and `EventAccessAdminService` on `ptcpkl/EO-backend/main`. Main Admin can `GET /admin/events/{eventId}/access`, `GET /access/permissions`, and `PUT /access` for both Staff and Admin_kecil. Backend enforces no second active Admin Kecil for one event, no second active event per account, and revokes child permissions/sessions when an Admin Kecil assignment is deactivated.
- Added `/admin/events/[eventSlug]/admin-kecil-access?userId=...`: **dedicated actual assignment editor**. Verifies selected account in fetched Admin Users data, loads its event assignment, presents only permissions returned by backend catalog, saves changes through existing typed `saveEventStaffAccess`, and displays actual active/inactive/unassigned state. URL user ID never conveys authorization. Suspense boundary protects Next.js `useSearchParams`.
- Roles & Permissions selector now routes to the dedicated editor instead of the generic Staff page; copy was corrected so account filtering is no longer represented as informational-only. Existing Staff Access page and its functionality are left unchanged.
- Added confirmation before deactivating an active Admin Kecil, warning of cascading subordinate/session revocation, and front-end warning for an already-active different Admin Kecil on the event. Backend performs authoritative concurrency and permission validation.
- Updated `docs/SPRINT-4-MANUAL-QA.md` with assignment creation, edits, cross-account isolation, double-owner conflict, revocation, unauthorized direct URLs and invalid target tests.
- **Release gate**: GitHub Actions remain unable to allocate runners; source code is pushed but not verified with successful local TypeScript/production build or owner manual tests. Treat S4.1 as code authored, not QA complete. Backend/Notion untouched.

## Batch 12 — Explicit role hierarchy and page separation (2026-10-14)

User-confirmed hierarchy: Super Admin creates event + Admin Kecil account and grants Admin Kecil event permissions. One event has one active Admin Kecil. Only Admin Kecil creates/manages subordinate Staff/Manager-like **event custom roles**; subordinates never get the same or broader rights than their Admin Kecil owner.

- Changed Super Admin menu to **Event Admin Access** linking `/admin/events/[eventSlug]/admin-kecil-access`. Legacy `staff-access` URL redirects there, eliminating the unrelated Assigned Staff panel / Staff dropdown from the Super Admin workflow.
- Event Admin Access auto-resolves the event's actual active Admin Kecil from `GET /admin/events/{eventId}/access` and admin users. **Choose member** is displayed disabled (read-only), permission catalog still controls edits, and changes are saved through real `PUT /access`. An optional candidate user ID only supports initial assignment if no active event owner; changing the URL cannot replace an already-active Admin Kecil.
- Roles & Permissions permits direct entry by event alone when an admin is already assigned; account selection is optional initial setup.
- Scoped Admin Kecil menu now labels `/sub-users` as **Assigned Staff**; this page owns the subordinate permission editor (left), owned Staff listing (right), and new child provisioning form. `custom-roles` and `sub-users` UI now check Admin Kecil account role, while Backend enforces event/ownership/permission ceilings.
- Super Admin Users UI now lists only Admin and Admin Kecil accounts, exposing only system Admin/Admin Kecil roles for creation/edit. New user defaults to Admin Kecil instead of Staff; no child list or management buttons.
- **Known Backend gap**: AdminUserService.ListAsync returns all accounts to Super Admin's API before FE presentation filtering. Enforcing strict API-level non-visibility of subordinates and blocking Super Admin direct API mutation of child accounts needs Backend scope; no Backend changes in this FE-only batch.
- Manual test coverage added to `docs/SPRINT-4-MANUAL-QA.md`. Code pushed, owner QA and local compile/build remain pending. Do not bypass GitHub security gates, and keep PR Draft until owner approves.

## Stabilization integration — Batches 13–16 (2026-10-14)

- **Batch 13 / PR #194:** Event Admin Access retains the active Admin Kecil owner regardless of URL candidate; when no active owner exists, an eligible newly chosen candidate wins over stale inactive grants. Disabled owners' active grants can be revoked, not reactivated. Added pure selection tests.
- **Batch 14 / PR #195:** Assigned Staff editor is keyed by event. Late role GET/PUT and subordinate-create POST results cannot overwrite the UI of another event. Selection and form inputs are disabled while saving, and failed role reads can be retried.
- **Batch 15 / PR #195:** Fixed confirmed Cloudflare/OpenNext syntax error `Expected ',', got 'const'` at `sub-users/page.tsx`. The prior effect ended `}, [access.resolved, eventId, isAdminKecil]` instead of `...])`. Added `npm run check:syntax`, integrated into `prebuild` and the PowerShell Sprint 4 QA script.
- **Batch 16 / PR #196:** Custom Roles editor is keyed by event. Async create/update/delete results are scoped to the mounted editor, and delete preflight stops before DELETE if the user leaves the event mid-check. Load retry is available; delete is disabled while a draft has unsaved changes.
- **Integration branch:** `integration/sprint4-stabilization-20261014`, first combined source commit `fb9f654`. This consolidates *code* from drafts #194–196 without repeatedly merging overlapping documentation. Do not merge redundant Draft PRs after integration is accepted.
- **Status:** code pushed, TypeScript/Next/Cloudflare build and post-merge user testing still **unverified**. Owner requested testing after the Sprint 4 code merges into `main`, subject to GitHub protections.
- **Separate Backend dependency:** Draft PRs #151 (atomic assigned-role deletion protection), #152 (global API subordinate isolation), #153 (global user creation role boundary) are not included in the Frontend integration. Do not describe the deployed Backend as hardened until they are separately merged.
