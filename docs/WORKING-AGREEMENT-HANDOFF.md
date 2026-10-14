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
- Working FE branch: `feat/s4-1-admin-kecil-role-selector`.
- PR: https://github.com/ptcpkl/EO-Frontend/pull/193 (draft, open).
- Backend Sprint 3 merged earlier; no additional Backend changes were made during FE Sprint 4.
- Sprint 4 tracker: `docs/SPRINT-4-RBAC-UI-TRACKER.md` on working branch.
- S4.1 **partial**: Admin Kecil selector/context present, but ownership-aware event filtering not complete.
- S4.2 **implemented**: Assigned Staff/editor responsive layout.
- S4.3 **implementation authored; QA pending**: event sub-user creation, event custom role CRUD and permissions, subordinate role assignment/revocation.
- S4.4 **implemented**: Event column after Email.
- S4.5 **implemented**: UI permissions guard/navigation.
- **GitHub Actions blocker:** Private-repo FE workflow runs abruptly fail before any job step, `runner_id=0`, `steps=[]`. Billing/entitlement remains unverified and requires owner review. Pushing code still works. Workflow concurrency/cancel-old-runs mitigation is committed, not a runner-allocation fix.
- **Latest medium-batch changes:** Sprint 4 hardening of custom role editor state on event switches and system-name validation, UI-safe role deletion preflight, Staff Access Suspense boundary, Windows preflight script `scripts/check-s4-rbac.ps1`, QA matrix `docs/SPRINT-4-MANUAL-QA.md`. Backend deletion of assigned roles is **not atomically guarded**; client preflight is not a substitute. See Sprint tracker Batch 10.
- **How to continue:** Check open Draft PR #193 head and tracker, address owner QA report first; do not reask owner about medium batches / manual QA / no Notion. Next unresolved feature: S4.1 genuine Super Admin -> Admin Kecil event ownership visibility/management, which needs API contract inspection and likely separate Backend work (do not silently assume existing staff assignment route is owner filtered).

## Manual QA priorities while CI is blocked

- Open the FE from this branch (local checkout or an actual branch preview—not assumed to exist). Verify page loading, navigation, and browser console.
- Check event-scoped subordinate creation, custom-role creation/edit/deactivation/deletion, permission ceilings, role assignment and revocation, and session invalidation.
- Check rapid account switching, unsaved changes, and switching between events. Validate a denied user cannot access another event via direct URL.
- Report exact route, user role, event, expected vs observed result, browser console and response status (remove passwords/tokens from screenshots).

**Important:** No claim of completed regression, static type check or production build is made here while Actions jobs cannot execute. This handoff documents the owner's agreed workflow, not a waiver of verification.
