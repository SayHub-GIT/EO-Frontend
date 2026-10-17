# Sprint 9 — S9.4-A: Attendance operator search contract

**Frontend:** `SayHub-GIT/EO-Frontend` (code changes only).  
**Backend source of truth:** `syberke/EO-Backend` main at `0fc79d3`, `CheckInsController.Search` and `CheckInService.SearchAsync`.

## Confirmed contract mismatch

`GET /api/check-ins/search?eventId={id}&q={text}` defaults to backend `AttendanceSearchMode.All`, which demands `registration.read`. Admin Kecil subordinate operators may have **only** `attendance.checkin` or `attendance.checkout` and therefore cannot search eligible participants if the frontend omits `mode`.

The backend already supports:
- `mode=CheckIn`: event-scoped `attendance.checkin`, candidate lookup filtered to Check-In.
- `mode=CheckOut`: event-scoped `attendance.checkout`, candidate lookup filtered to Check-Out.
- `mode=All`: `registration.read` (not suitable for the operator flow).

## Frontend repair

- [x] The shared client **requires** the operation mode; no `All` default is permitted. Sends event ID, trimmed search text and mode as encoded query parameters, `cache: no-store` and an AbortSignal.
- [x] Manual Check-In and Manual Check-Out pass `CheckIn` and `CheckOut` respectively, instead of falling into the backend's general search.
- [x] Frontend checks the effective operation permission before starting a search; revoked/denied permissions trigger effect cleanup.
- [x] Non-array results, missing participant identity and **any row from another event** fail closed rather than rendering a partial cross-event list.
- [x] Seven deterministic regression cases cover each mode, query escaping, cancellation forwarding, invalid mode/event, permission failure, foreign event payload and case-insensitive GUID scope.
- [x] Existing QR Photo Check-In, attendance metrics, manual mutation endpoint, Check-Out mutation and navigation remain unchanged.

## Integration acceptance — owner / staging

- [ ] Login with **Check-In only** subordinate assigned to event A but without `registration.read`: search A, select eligible Registered participant, confirm Check-In, check attendance/metrics.
- [ ] Login with **Check-Out only** subordinate without `registration.read`: search checked-in participant, confirm Check-Out, ensure Check-In control remains unavailable.
- [ ] Try changing `eventId` to event B, `mode=All` or forging other actors directly at backend: expect permission/event isolation enforcement.
- [ ] Revoke a permission during search; check that the frontend stops issuing new requests and backend rejects unauthorized calls.
- [ ] Verify empty results, 403, 409 on finalization, network drop, lost permissions, rapid mode/event switching and cancellation.
- [ ] Re-run end-to-end QR preview → face capture → `qr-with-photo` → private photo → Attendance list. Camera/browser support and backend deployment must be tested separately.
- [ ] Confirm migrations/private storage/retention and real staging credentials with the owner before release.

## Limitations

This fixes **a verified API contract mismatch** and provides mock-transport regression evidence; it is not an authenticated network test against deployed staging. Backend remains the authorization authority. S9.4 live E2E and S9.5 release checks remain pending.
