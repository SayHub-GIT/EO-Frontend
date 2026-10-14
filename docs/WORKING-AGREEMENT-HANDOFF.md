# EO Frontend — Working Agreement & Handoff

Last updated: 2026-10-14 (Asia/Jakarta)

## Working agreement confirmed by project owner

1. **Keep shipping code to GitHub even if GitHub Actions is unavailable.** Push completed, coherent code batches to the active **feature branch** and PR. An Actions failure does not block a Git push. Do not equate `pushed` with `tested`.
2. **Use medium-sized cohesive batches, not a cascade of tiny ones.** Target approximately 2–4 closely related sub-tasks per working batch, based on risk and code complexity. Do not mix unrelated modules. Work sustainably; no rushed broad rewrites or claims of background execution.
3. **Project owner handles manual application testing while CI runners are blocked.** The owner reports screenshots, repro steps, API responses/logs and expected behavior when something fails. Fix reproducible problems in the next coherent batch.
4. **Main-branch safety:** Continue pushing the feature branch without waiting for CI, but do **not** merge unfinished or unverified features to `main` automatically. A merge follows the owner's explicit approval after manual validation, subject to repository branch protection and any required checks. Never disable required checks, security scanners, or repository protections merely to make a red status green.
5. **State evidence precisely:** `code authored/pushed`, `manually tested by owner`, `CI passed`, and `merged to main` are separate milestones. If GitHub Actions cannot start, clearly state `CI blocked; no build/security test executed`.
6. **Keep existing functionality stable:** Respect existing module boundaries and APIs, don't modify Backend or Notion unless explicitly requested. Apply [anti-slop](https://github.com/miqdadbadjuber/anti-slop) for all UI changes; align with existing Vuexy/MUI components.
7. **Conversation continuity is mandatory:** At the end of substantial coding batches, update this file or the sprint tracker with branch, PR, latest commit, implemented work, unfinished tasks, known blockers and precise manual QA steps. In a new/duplicated conversation, first retrieve this handoff and the sprint tracker; do not restart the plan or make the owner repeat decisions already documented.

## Current handoff

- FE repository: `ptcpkl/EO-Frontend`; BE repository: `ptcpkl/EO-backend`; both verified accessible through connected GitHub app.
- Original FE Sprint 4 baseline merged into `main` via PR #193 (commit `a795fe2`); manual QA and CI were not verified at merge.
- Stabilization PR #194 (Batch 13) remains separate as last verified. Batch 14 is on `fix/s4-7-assigned-staff-async-boundaries-20261014`.
- Backend Sprint 3 merged earlier; no additional Backend changes were made during FE Sprint 4.
- Sprint 4 tracker: `docs/SPRINT-4-RBAC-UI-TRACKER.md` on working branch.
- S4.1 **code authored, owner QA pending**: Super Admin selector opens dedicated Admin Kecil event access page, validates selected account and uses real backend event assignment GET/PUT. Other staff are not editable from that page; local compile/build and owner manual verification pending.
- S4.2 **implemented**: Assigned Staff/editor responsive layout.
- S4.3 **implementation authored; QA pending**: event sub-user creation, event custom role CRUD and permissions, subordinate role assignment/revocation.
- S4.4 **implemented**: Event column after Email.
- S4.5 **implemented**: UI permissions guard/navigation.
- **GitHub Actions blocker:** Private-repo FE workflow runs abruptly fail before any job step, `runner_id=0`, `steps=[]`. Billing/entitlement remains unverified and requires owner review. Pushing code still works. Workflow concurrency/cancel-old-runs mitigation is committed, not a runner-allocation fix.
- **Latest medium-batch changes:** Sprint 4 hardening of custom role editor state on event switches and system-name validation, UI-safe role deletion preflight, Staff Access Suspense boundary, Windows preflight script `scripts/check-s4-rbac.ps1`, QA matrix `docs/SPRINT-4-MANUAL-QA.md`. Backend deletion of assigned roles is **not atomically guarded**; client preflight is not a substitute. See Sprint tracker Batch 10.
- **How to continue:** Check open Draft PR #193 head and tracker, address owner QA report first; do not reask owner about medium batches / manual QA / no Notion. Batch 11 used backend's existing `AdminEventAccessController` to implement S4.1's real Super Admin → Admin Kecil event grant UI, in a **dedicated** page. Next: manual QA and local type/build of S4.1–S4.5, then repair identified bugs. Backend atomic deletion guard remains separate security debt; no undocumented Backend changes.

## Manual QA priorities while CI is blocked

- Open the FE from this branch (local checkout or an actual branch preview—not assumed to exist). Verify page loading, navigation, and browser console.
- Check event-scoped subordinate creation, custom-role creation/edit/deactivation/deletion, permission ceilings, role assignment and revocation, and session invalidation.
- Check rapid account switching, unsaved changes, and switching between events. Validate a denied user cannot access another event via direct URL.
- Report exact route, user role, event, expected vs observed result, browser console and response status (remove passwords/tokens from screenshots).

**Important:** No claim of completed regression, static type check or production build is made here while Actions jobs cannot execute. This handoff documents the owner's agreed workflow, not a waiver of verification.

## Latest confirmation and implementation — Batch 12 (2026-10-14)

User corrected the RBAC hierarchy after seeing a screenshot of the old `Event Staff Access` UI. **Super Admin must not configure Staff/Manager or see Assigned Staff.** Super Admin creates an event and Admin Kecil account, assigns at most one active Admin Kecil to the event, then configures only that Admin Kecil's event permissions. The event's Admin Kecil identity must autofill a disabled Choose member field and cannot be switched in the permission editor. Only after Admin Kecil logs in can they see and manage **Assigned Staff**, provision child accounts and create per-event Custom Roles (e.g. Manager, Check-in) whose effective permissions cannot exceed the owner.

Frontend Batch 12 updated Super Admin navigation, replaced the legacy staff-access editor with a redirect, locked `Event Admin Access` to assigned Admin Kecil, clarified optional initial assignment in Roles & Permissions, and moved the **Assigned Staff** concept/role controls exclusively into Admin Kecil workspace. The Super Admin Users screen is now limited to Admin/Admin Kecil and defaults to an Admin Kecil role when creating accounts.

**Security debt that requires a future separate Backend request:** Although the FE hides child Staff accounts from Super Admin, the global `AdminUserService.ListAsync` API can still return subordinate users and global admin user endpoints can operate on them if authorized. This does not satisfy strict server-level data isolation. Also Backend Custom Role deletion still needs atomic assigned-role guard. Do NOT claim those are fixed by the FE.

Next step: owner tests current feature-branch code, reports repro steps; preserve medium-batch push workflow and never merge without owner-approved validation. See tracker Batch 12 and QA matrix Batch 12.

## Batch 14 — Assigned Staff async scope guard (2026-10-14)

Feature branch `fix/s4-7-assigned-staff-async-boundaries-20261014`, Sprint 4 Batch 14. The page editor is keyed by event so switching event never reuses stale form data. Pending role reads, role saves, subordinate creation, and subsequent staff-list refreshes ignore results after the editor unmounts. Stale role replies cannot overwrite a newer staff selection. Saving disables staff selection and creation inputs; failed role reads can be retried from the error alert.

Backend mutations already sent can still complete after navigation; their UI responses are discarded, not canceled. Owner handles tests and merge approvals. No changes to API, Notion, `main`, or existing Vuexy/MUI visual system. See `docs/SPRINT-4-RBAC-UI-TRACKER.md` Batch 14 and updated QA matrix.
