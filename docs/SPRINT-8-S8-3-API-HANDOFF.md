# Sprint 8 — S8.3-A Attendance API contract adapter (2026-10-16)

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend source of truth:** `syberke/EO-Backend`, `src/EO.Api/Controllers/AdminEventAttendanceController.cs`  
**Scope:** read-only Frontend adapter and regression tests. No Backend, Notion, database or deployment changes.

## Delivered in this small batch

- [x] Added `src/lib/attendance-records-contract.ts` with a Backend S8.1-specific query allowlist, response normalization and event-ID cross-check.
- [x] Added `src/lib/attendance-records.ts`, a typed `GET /admin/events/{eventId}/attendance` client using the existing authorized `authFetch`, `no-store` and `AbortSignal`.
- [x] Normalize the Backend's `totalCount` into the Frontend's paginated `total`; the old registration-list endpoint has a different DTO.
- [x] Preserve real Check-In/Out times, attendance status, method and server-provided operator names; never fabricate a photo URL or operator identity.
- [x] Add six contract regressions and require them in Linux `Frontend Build` CI.

## Backend contract inspected

- Route: `GET /api/admin/events/{eventId}/attendance` with event-scoped `attendance.read` authorization.
- Filters: `page`, `pageSize`, `search`, `status`, `method`, `participantType`, `eventPackageId`, `actorUserId`, UTC Check-In/Out boundaries, and `sort`/`direction`.
- Allowed sorting: `registeredAt`, `fullName`, `checkedInAt`, `checkedOutAt`. The previous registration-list `bookingCode` sorting is **not supported** by this API.
- Body: `PagedResult<AttendanceListItem>` with `items`, `page`, `pageSize`, `totalCount`. Each row includes `registrationId`, `eventId`, `attendanceStatus`, `registrationStatus`, `checkInMethod`, timestamp and actor fields.
- The backend's attendance metrics route now requires `attendance.read` rather than `registration.read` (see `docs/S8-attendance-metrics-permissions.md` in the new Backend repository).

## Explicit next batch — S8.3-B UI integration

- [ ] Change the event attendance page from the old registration list to this verified attendance client. Keep the old registration list client for its other consumers.
- [ ] Use `attendance.read` UI access checks and verify navigation/metrics permissions consistently.
- [ ] Reconcile existing shareable URL filters with the new backend sort and status/method/date filter contract; do not send unsupported `bookingCode` sort.
- [ ] Display the real Check-Out and operator fields without changing existing Vuexy/MUI layout or suggesting an unavailable photo.
- [ ] Cover 403, revoked permission, cross-event rows, abort/cancel, empty pages and browser navigation.
- [ ] Run against an authorized staging Backend **after** the migration rollout; do not equate a green PR with staging or production QA.

After S8.3-B, proceed to S8.4 private photo preview, then S8.5 metrics/status refresh. Sprint 6 face-before-commit and final camera QA remain independent open acceptance gates.
