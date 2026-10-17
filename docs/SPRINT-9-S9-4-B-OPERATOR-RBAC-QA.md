# Sprint 9 — S9.4-B Effective operator RBAC / E2E readiness

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Read-only Backend contract:** `syberke/EO-Backend` main `0fc79d3` — `GET /api/admin/event-workspace`, `CheckInService` and `CheckInsController`.

## Integration gap

The Check-In page previously used `usePermissionAccess`, which reads permission claims in the local session. For **Admin Kecil and subordinate accounts**, the authoritative permission set is the active event assignment returned by `GET /api/admin/event-workspace`. A stale session may omit a newly granted permission or still contain a revoked one, causing the UI to disagree with Backend authorization.

## FE corrections

- [x] Global Admin: use the normal session permission for each operation **and** require a selected event.
- [x] Scoped Admin Kecil/staff: require `status=assigned`, the selected event equals `workspace.eventId`, and the exact operation permission in `workspace.permissions`. Session claims do not override this assignment.
- [x] Unassigned, ambiguous, permission_required, event mismatch, failed/unresolved workspace: fail closed for both Check-In and Check-Out.
- [x] The Check-In page revalidates workspace on focus/return to the visible tab; operation controls/search fail closed while it refreshes. Rapid repeated browser focus signals are throttled.
- [x] All existing QR + photo, manual Check-In, manual Check-Out and scoped-search UI paths use the shared effective `checkInAccess.allowed` / `checkoutAccess.allowed` rules, without changing the Backend or mutation endpoints.
- [x] Eight deterministic tests cover global/scoped permissions, revocation, event isolation, failure states and frontend gate wiring.

## Backend and test evidence limits

- The frontend does not store workspace permissions in localStorage/sessionStorage. Server authorization still rejects forged event IDs, unauthorized operations and revoked permissions **at execution time**.
- The tests simulate authoritative workspace replies and assert integration wiring; they do **not** exercise a live Backend, QR camera, real photo storage or a real JWT lifecycle. The Backend's delegated permissions may change while an HTTP request is in flight; only the Backend can reject unauthorized mutations.
- The earlier S9.4-A `mode=CheckIn` / `mode=CheckOut` search fix remains in place.

## Owner staging E2E acceptance

- [ ] **Super Admin:** select event A; verify Check-In/Out per session permission and no action without a selected event.
- [ ] **Admin Kecil A:** with explicit `attendance.checkin` and no checkout permission, check manual search → manual Check-In; Checkout remains disabled. Check the reverse configuration.
- [ ] **Staff A:** grant/revoke `attendance.checkin` / `attendance.checkout` without changing login role. Reload or focus the tab; verify the UI follows `workspace.permissions`, and Backend rejects revoked operations.
- [ ] **Event isolation:** open `?eventId=B` while assigned to A; verify A remains the selected event, no B participant data, and forged B mutation/API requests return 403.
- [ ] **QR flow:** validate preview (no commit) → consent and live single-face capture → `POST /api/check-ins/qr-with-photo` exactly once → Attendance and metrics refresh → authorized private photo preview.
- [ ] **Failures:** 401, 403, 409, upload failure, 5xx, network drop, mismatched response, simultaneous operators, denied camera, hidden tab, unsupported FaceDetector; never report success or blindly retry a possibly committed transaction.
- [ ] **Read-only staff:** List Attendance available with `attendance.read` while Check-In/Out operations are not.
- [ ] Confirm DB migrations, private storage/retention, backend deployment, HTTPS and real devices separately before release.

**Remaining:** S9.4 staging E2E acceptance and S9.5 release verification are still **pending**.
