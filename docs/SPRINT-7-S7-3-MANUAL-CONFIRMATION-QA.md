# Sprint 7 Frontend: S7.3 Manual Check-In confirmation & error handling

**Owner:** Frontend / `SayHub-GIT/EO-Frontend` · **Backend:** `ptcpkl/EO-backend` (read-only contract audit). **No Backend modification, Notion update, Cloudflare binding or production deployment.**

## Baseline and known Backend behavior

- Frontend already uses `POST /check-ins/manual` with the **selected registration ID**, never an ambiguous participant name. The button and synchronous `submittingRef` guard already provided a basic double-click lock.
- Backend `CheckInsController.CheckInManual` resolves current registration, enforces `attendance.checkin`, then `CheckInService.CommitCheckInAsync` validates eligibility and performs a conditional update; stale/duplicate attendance returns `409 Conflict`. The response contains `registrationId`, `eventId`, `bookingCode`, `fullName`, `eventName`, `checkedInAtUtc`.
- Previous UI accepted an unchecked JSON response as success and allowed the shared photo checkbox to run **post-check-in face capture even in Manual mode**. Manual mode must not depend on QR/face capture.
- Backend remains the sole authority. A client-side disabled button, local eligibility list or successful earlier search does not guarantee the server will accept an attendance mutation.

## S7.3 Frontend changes

- [x] Confirm from a selected eligible **registration ID** and event; require `attendance.checkin` and Manual mode; block while search, attendance submission or camera activity is in progress.
- [x] Retain synchronous single-flight guard: rapid repeat clicks cannot trigger concurrent Manual Check-In requests from one page instance. Show `Mencatat kehadiran...` until the operation finishes.
- [x] Only display success if server returns a complete response matching the exact selected registration/event and a parseable server timestamp. A malformed/mismatched response is an error requiring status verification, not a false success.
- [x] On HTTP 409, explicitly inform operator that the server state changed, clear stale selection/results, refresh search without automatically retrying the mutation.
- [x] On successful response, remove the now-ineligible registration from the selectable list, clear selection and render authoritative server-confirmed name/booking/event/timestamp in existing result card.
- [x] Manual Check-In does **not** trigger face capture. Existing optional **post-confirmation QR** photo consent/camera remains intact; it is separate from S6.3–S6.5 photo-before-finalization requirements.
- [x] Five new regression tests for valid confirmation, registration/event mismatches, malformed response, invalid server timestamps and 409 conflict type; retain five existing S7.2 eligibility tests.
- [x] CI Linux `Frontend Build` now runs both test files via `npx tsx --test`.
- [ ] PR CI: TypeScript, Linux/Windows build, OpenNext compatibility and Secret Scan all pass on same PR head.
- [ ] Owner staging/device QA with disposable registered attendees. CI cannot verify HTTP/server races or real camera behavior.

## Manual QA checklist (staging only)

1. Choose Manual mode, select event, search two or more characters and click a valid `Registered` candidate. Confirm name, booking code and event before clicking the final button.
2. Click final confirmation rapidly twice. Network should show **one** `POST /check-ins/manual`, with the correct registration ID and no QR token or photo request.
3. Backend success: confirm `checkedInAtUtc` displayed is the **server timestamp**, registration vanishes from eligible options, result uses server-returned participant details, and no photo camera starts regardless of the QR mode photo checkbox setting.
4. On the second device, check the same participant in first, then attempt from a stale selection in this UI. Backend must return 409; no success card; stale selection cleared and search refreshed. **Never auto-retry** after conflict.
5. Test a failed network request: preserve error, don't show success. Because the server might have committed before network loss, operator must verify current attendance rather than repeatedly submitting blindly.
6. Test a malformed server success payload or mismatched event/registration via a mocked HTTP response: UI rejects it as unconfirmed and instructs operator to verify current attendance.
7. Revoke `attendance.checkin` permission; UI must disable action, and Backend still rejects forged requests.
8. During pending submission, tab changes, event switch, selecting another candidate and rescans remain blocked. Re-test mobile layout, keyboard and screen-reader loading/error messages.
9. QR Preview and optional **post-confirmation QR photo** should still behave as before. Manual flow must never activate face camera.
10. No Cloudflare production deployment or Notion changes.

## Remaining dependencies

S7.2 server search still limits the first 20 matches **before** `canCheckIn` eligibility, which may hide qualifying participants; Backend team needs to reconcile server-side eligible-only query semantics. Device/browser QA still pending for S7.1–S7.3. QR photo-before-finalization is separate S6.3–S6.5 work awaiting Backend Sprint 5 contract.
