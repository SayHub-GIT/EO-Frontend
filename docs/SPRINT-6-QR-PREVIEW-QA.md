# Sprint 6 Frontend - S6.2 QR preview and explicit Check-In confirmation

**Repository:** `SayHub-GIT/EO-Frontend`. **Scope:** QR preview UI only, typed client, QA and sprint tracker. **No Backend, Notion, production data or Cloudflare deployment changes.** Feature branch implementation does not constitute staging/manual QA.

## Verified Backend contract (source inspection only)

- `POST /api/check-ins/preview` accepts `{ "qrToken": "<scanned ticket token>" }` via `CheckInRequest` and returns `AttendanceParticipantResponse`, including `registrationId`, `eventId`, `bookingCode`, `fullName`, `eventName`, `eventPackageName`, `canCheckIn` and `attendanceState`.
- `CheckInService.PreviewAsync` hashes the QR, loads the registration, enforces event-scoped `registration.read`, and returns attendance eligibility without mutating registration status. It does **not** use `CheckInAsync`.
- `POST /api/check-ins` remains the attendance mutation and requires `attendance.checkin` permission. Server-side atomic validity/concurrency checks remain authoritative, regardless of `canCheckIn` in a prior preview.
- Frontend `src/lib/check-ins.ts` uses `/check-ins/preview` because the configured API base already includes `/api`. Do not prepend a second `/api`.
- **Limitation:** photo upload is currently post-check-in, and preview is not a reservation/lock of attendance state. If status changes between preview and confirmation, server may return a conflict. Production photo-before-finalization is **not** part of S6.2.

## Implemented

- [x] Scanning a QR stops the camera and calls **non-mutating** preview, not the attendance POST.
- [x] Display participant name, booking code, event, package and server `attendanceState` before confirmation. Respect `canCheckIn`, event context and `attendance.checkin` UI permission.
- [x] Only explicit `Konfirmasi CheckIn` invokes `POST /check-ins`; submit prevents local double click and clears preview token from UI state on attempt.
- [x] Reject incomplete preview response; display invalid QR / permission / conflict errors without success UI. No QR token entered manually or saved in storage.
- [x] Cancel/rescan discards preview token. Tab switch and new scan abort pending preview and release camera stream.
- [x] Keep existing manual participant search and optional **post-check-in** photo behavior unchanged.
- [x] PR #4 exact head `49c6006` passed Frontend Build (Linux + Windows), OpenNext compatibility and Secret Scan; merged as `0ddeeaa`. No Cloudflare deployment.
- [ ] Owner browser/mobile QA in an authorized **staging/disposable** event. CI cannot independently verify real camera or deployed Backend behavior.

## Manual QA with test participants (never scan real production tickets)

1. Valid QR: scan via live camera, observe preview name/booking/event/package and no check-in mutation before pressing confirmation; confirm once and verify recorded timestamp from Backend.
2. Click `Batalkan` after preview; assert **no** check-in. Start again for a different QR; verify old token and participant details do not leak into new preview.
3. Scan QR from another event while event-scoped user: Backend must reject. When Global Admin has selected an event, FE must not offer confirmation if `eventId` differs.
4. Already checked-in, checked-out, not-yet-active, unpaid, cancelled, or expired registrations: display `attendanceState`; never enable confirm when `canCheckIn=false`. On invalid/expired QR, show error without mutation.
5. Block preview permission (`registration.read`) vs mutation permission (`attendance.checkin`) separately. UI action gating is additional only; Backend must reject unauthorized calls.
6. Cancel preview during slow network call, or switch Manual/QR before its response. Old response must not repopulate the preview. Camera tracks must be released after scan or cancellation.
7. On duplicate confirmation or concurrent check-in from another device, Backend 409 must remain an error; never render misleading success. On transient error, rescan and retry after checking the actual attendance state.
8. Verify optional participant photo consent still captures **after** successfully confirmed check-in. This is a known gap awaiting Backend Sprint 5 photo finalization. Confirm no fake pre-photo claim in UI.
9. Recheck QR detector and jsQR fallback browsers, mobile width and keyboard focus; manual mode search and selection must remain functional.
10. Test with GitHub Actions, but remember no Cloudflare deployment is configured on this mirror repository.

## Next API dependency

S6.3-S6.5 need a documented photo-before-finalization/atomic check-in protocol, face detection requirements, retry/timeout semantics, idempotent finalization and safe cleanup. No guessed endpoints or fake success flows should be introduced before Backend and staging verify these contracts.
