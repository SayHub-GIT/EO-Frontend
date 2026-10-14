# Sprint 4 — Manual QA (when GitHub Actions runners cannot start)

Applies to PR #193, branch `feat/s4-1-admin-kecil-role-selector`. Manual testing is performed by the project owner. A successful local compile/test does **not** mean GitHub CI has passed.

## 1. Prepare local checkout and static/build checks (PowerShell)

Open PowerShell at your existing `EO-Frontend` checkout, make sure you have saved or committed any personal local changes, then:

```powershell
git fetch origin
git switch feat/s4-1-admin-kecil-role-selector
git pull --ff-only origin feat/s4-1-admin-kecil-role-selector
powershell -ExecutionPolicy Bypass -File .\scripts\check-s4-rbac.ps1
```

This verifies Node/npm availability, installs packages from lockfile, validates TypeScript and runs a Next production build. It does not start the API, create accounts, deploy, or mutate application data. To skip a fresh install, use `-SkipInstall` after dependencies are installed.

> Do **not** paste authentication tokens, passwords, environment secrets, or unredacted session cookies in any bug report.

## 2. Manual application test matrix

Use a non-production/test event and temporary accounts. The frontend needs its normal API base URL configuration and a reachable backend with Sprint 2–3 changes and migrations.

| # | Actor | Steps | Expected |
|---|---|---|---|
| 1 | Super Admin | Open Roles & Permissions, select Event + Admin Kecil, open Staff Access. | Selected account shows as **context only**; no misleading owner filtering. S4.1 is **still partial**. |
| 2 | Admin Kecil assigned to event A | Open Event workspace → Custom Roles; create role `Registrasi Event` with a permitted permission. | Role saved and displayed, scoped to A. |
| 3 | Same | Edit role name/description and permission list, then save. | Updated details persist after refresh. |
| 4 | Same | Try a reserved role name such as `ADMIN`. | Save blocked in UI; backend also enforces restriction. |
| 5 | Same | Try a permission outside the catalog or above own rights (direct API authorization test by developer only). | Backend rejects access elevation. |
| 6 | Same | Create a subordinate account with a valid email and 12+ character temporary password. | New account is inactive by default. |
| 7 | Same | Assign active custom role, enable staff access, save. | GET role assignment shows chosen role and server-derived effective permissions; account activates. |
| 8 | Same | Rapidly switch between subordinate A and B while role GET requests load. | Late A response never overwrites selected B. |
| 9 | Same | Change assignment, try leaving page or choosing another staff without saving. | Unsaved changes confirmation appears. |
| 10 | Same | Disable staff access, accept confirmation, save. | Request sends `{ roleIds: [], isActive: false }`. Roles cleared; backend revokes child sessions. |
| 11 | Same | Try deleting a role while a subordinate still holds it. | Frontend blocks deletion. This must also be enforced by Backend in a subsequent security task to eliminate API bypass/races. |
| 12 | Same | Delete a role with no assignments. | Role deleted successfully. |
| 13 | Admin Kecil for A | Attempt event B's custom-role and sub-user URLs directly. | Backend returns 403 / equivalent denied response; no B data exposed. |
| 14 | Disabled child | Try using a previous session after access revoked. | Backend refuses protected calls / forces re-authentication. |
| 15 | Admin Kecil | Navigate between event A and event B (only if legitimately assigned) on role editor. | A role ID and draft never carry into B. |
| 16 | Any | Inspect tablet/mobile width and browser console. | No severe overflow or runtime errors; form remains usable. |

## 3. Report a regression

Include the page URL (without any sensitive query parameters), step number above, current account **role** (not password), event A/B, expected vs actual result, screenshot, browser console stack trace and Network request **HTTP status** (sanitize request/response bodies). State which commit/branch was tested.

## 4. Release/merge checklist

- [ ] Local `npx tsc --noEmit` passes.
- [ ] Local `npx next build --no-lint` passes.
- [ ] Manual scenarios relevant to changed code pass and project owner accepts results.
- [ ] Security concerns are recorded: backend deletion of assigned roles needs owner-aware enforcement; Super Admin scoped S4.1 feature is not complete.
- [ ] PR #193 remains Draft until the remaining scope is resolved and owner explicitly approves.
- [ ] Do not bypass mandatory branch protection or mark CI green merely because runner allocation is blocked.

## Known blocker

Latest GitHub Actions runs on FE private repository fail with `runner_id=0`, `steps=[]` before any command starts. Local checks can provide evidence in the meantime, but cannot be described as successful GitHub Actions jobs.
