# Sprint 4 — Manual QA (when GitHub Actions runners cannot start)

Applies to merged Sprint 4 baseline (PR #193) and follow-on stabilization work. This QA revision targets `fix/s4-7-assigned-staff-async-boundaries-20261014`. Manual testing is performed by the project owner. A successful local compile/test does **not** mean GitHub CI has passed.

## 1. Prepare local checkout and static/build checks (PowerShell)

Open PowerShell at your existing `EO-Frontend` checkout, make sure you have saved or committed any personal local changes, then:

```powershell
git fetch origin
git switch fix/s4-7-assigned-staff-async-boundaries-20261014
git pull --ff-only origin fix/s4-7-assigned-staff-async-boundaries-20261014
powershell -ExecutionPolicy Bypass -File .\scripts\check-s4-rbac.ps1
```

This verifies Node/npm availability, installs packages from lockfile, validates TypeScript and runs a Next production build. It does not start the API, create accounts, deploy, or mutate application data. To skip a fresh install, use `-SkipInstall` after dependencies are installed.

> Do **not** paste authentication tokens, passwords, environment secrets, or unredacted session cookies in any bug report.

## 2. Manual application test matrix

Use a non-production/test event and temporary accounts. The frontend needs its normal API base URL configuration and a reachable backend with Sprint 2–3 changes and migrations.

| # | Actor | Steps | Expected |
|---|---|---|---|
| 1 | Super Admin | Open Roles & Permissions, select Event A; choose **Atur Admin Event** without choosing a user if already assigned. | **Event Admin Access** opens. **Choose member** automatically shows the event's assigned Admin Kecil, read-only. No Staff list or selector appears. |
| 1a | Super Admin | Grant X `event.read` plus one module permission, save and refresh. | API assignment is persisted for X **only** on event A; unrelated Staff accounts cannot be edited from this page. |
| 1b | Super Admin | Remove a module permission and save, then switch between X and another eligible Admin Kecil. | Each account loads its own actual grant; no permission leakage across IDs. |
| 1c | Super Admin | Try activating another Admin Kecil on event A while X remains actively assigned. | UI warns and blocks conflicting activation; Backend also refuses it. |
| 1d | Super Admin | Disable X's active event assignment, confirm the warning, and save. | Backend revokes subordinate event roles and refresh sessions, as defined in `EventAccessAdminService`. |
| 1e | Non-admin or user with no Roles permissions | Visit the dedicated Admin Kecil access URL directly. | UI denies access and Backend blocks direct API reads/writes. |
| 1f | Super Admin | Edit the query string to a non-Admin-Kecil or inactive account ID. | UI rejects the target and disables writes; URL parameters alone grant no permissions. |
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
- [ ] Security concerns recorded: backend deletion of assigned custom roles needs atomic server enforcement; S4.1 now has code for account-targeted Super Admin access but still requires successful owner QA and local build.
- [ ] New stabilization PRs remain Draft until the owner tests relevant changes and approves merging. PR #193 was already merged without successful CI.
- [ ] Do not bypass mandatory branch protection or mark CI green merely because runner allocation is blocked.

## Known blocker

Latest GitHub Actions runs on FE private repository fail with `runner_id=0`, `steps=[]` before any command starts. Local checks can provide evidence in the meantime, but cannot be described as successful GitHub Actions jobs.

## Batch 12 — separation of Super Admin and Admin Kecil flows (2026-10-14)

Manual scenarios to verify:

1. **Super Admin → Event Admin Access:** Select an event already assigned to Admin Kecil X via Roles & Permissions, leave candidate account blank, and open Event Admin Access. Verify it displays X automatically in a **disabled** Choose member field; changing `userId` in URL must not switch an already-assigned active event Admin.
2. **No assignment:** Create Event B without Admin Kecil. Event Admin Access must show a clear unassigned warning and no Staff account choices. Select an eligible Admin Kecil in Roles & Permissions to perform the initial assignment.
3. **Legacy URL:** Visit `/admin/events/{eventId}/staff-access`. Verify automatic redirect to `/admin/events/{eventId}/admin-kecil-access` and no Assigned Staff panel in Super Admin.
4. **Super Admin → User Management:** Only system Admin/Admin Kecil accounts appear; Staff/Manager subordinates are not offered in Create/Edit and are absent from visible user list. New account defaults to Admin Kecil (not Staff).
5. **Admin Kecil → Assigned Staff:** Login as assigned Admin Kecil X. Verify the Event Workspace menu displays **Assigned Staff** and **Custom Roles**, with permission editor on left, owned staff list on right, and staff creation form below. Create a child account, create bounded custom roles (e.g. Check-in or Manager), assign role(s), save, then verify effective permissions.
6. **Permission ceiling:** Attempt to add child permissions not allowed to Admin Kecil X. Ensure Backend rejects and child cannot gain those rights. Revoke staff access and confirm role IDs cleared and sessions revoked.
7. **Isolation:** Login as Staff child or Super Admin and try visiting `/admin/events/{eventId}/sub-users` and `/custom-roles`; the UI must deny both. Verify Backend also returns access-denied for unauthorized API calls.
8. **Cross-event:** Admin Kecil X with Event A must not see Staff accounts from Event B; editing URLs must not override Backend owner/event checks.

**Backend API privacy caveat:** `AdminUserService.ListAsync` still returns all global users, including subordinate Staff, before Frontend filters the visible Super Admin list. Complete server-side suppression and mutation restrictions require separate Backend work; the Frontend filter is NOT an API privacy boundary.

Testing status: pending owner local checks; CI runner allocation still unavailable at the time of this batch. No claim of compiled/deployed/merged code.

## Batch 14 — Assigned Staff request-scoping QA

1. In Assigned Staff on Event A, choose Staff A, then quickly switch to Staff B before A's role GET responds. Verify only B's assigned roles and permissions are shown.
2. Begin saving Staff A's role assignment, then navigate to Event B before PUT completes. B must show no selected staff and no A-related success/error notification. **Return to A and verify actual Backend state**: the pending PUT may still have completed.
3. Start creating a subordinate on Event A and navigate to Event B before POST completes. B must not display A's newly created account or draft name, email, and password. Check A separately for whether the request completed.
4. Simulate a GET-role network error and click **Ulangi**. The current user's roles should reload without refreshing the full page.
5. During a role save or create request, selector and affected form fields cannot start another mutation. Rapid A/B switching still works while *reads* (not saves) are pending.
6. Verify keyboard access and tablet/mobile reflow. Run `powershell -ExecutionPolicy Bypass -File .\scripts\check-s4-rbac.ps1` on the Batch 14 branch and report errors, if any.
