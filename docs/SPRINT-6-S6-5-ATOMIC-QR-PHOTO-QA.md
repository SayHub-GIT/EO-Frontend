# Sprint 6 — S6.5 Photo-first QR Check-In

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend contract (read-only):** `syberke/EO-Backend/src/EO.Api/Controllers/CheckInPhotoController.cs`  
**Status:** FE implementation and automated tests; staging/device QA still required.

## Implementation

- [x] **QR preview is read-only:** `POST /api/check-ins/preview` validates ticket and event without recording attendance.
- [x] Check-In QR requires explicit consent and a captured JPEG of a **single detected face** before the confirmation button can be used.
- [x] A camera with retry stays associated with the same event and registration ID; cancel, new QR, mode/event switch, and completion clear the in-memory photo state.
- [x] **Only one QR mutation path** in the page: `POST /api/check-ins/qr-with-photo` with multipart `qrToken`, `file`, `consentConfirmed`. No legacy `POST /check-ins` without photo, and no after-Check-In photo upload from QR mode.
- [x] The JPEG client validates media type, size (4–409600 bytes), JPEG SOI/EOI markers; the backend repeats validation/authorization and owns storage and attendance commit.
- [x] Single-flight lock blocks double-clicks while the network operation is pending. A successful response must match registration ID, event ID and booking code, with a valid Check-In timestamp.
- [x] HTTP 409, network failure, HTTP 5xx, or an unverifiable 2xx response must **not** be treated as success or automatically retried. Operator needs to inspect the attendance list, acknowledge the review, and only then start a new QR scan.
- [x] Event-bound QR selection for Super Admin. Manual Check-In and manual Check-Out remain separate.
- [x] Focused adapter/UI tests added to Linux CI alongside earlier S6 and Sprint 8 regression tests.

## Important release limitations

**Source compatibility is not proof of production readiness.** The Backend's `qr-with-photo` route writes private storage first, then attempts to commit Check-In, with an uncertainty ledger for failures; it is not a distributed ACID transaction spanning both operations. Uncertain requests require manual reconciliation, never blind replay. The frontend's one-click submission wrapper may refresh an expired session on HTTP 401, but it does not automatically replay network timeouts/errors.

The face detector relies on browser-native `FaceDetector`, which does not work on every browser, especially some mobile devices. When unsupported, fail closed (no photo → no QR Check-In). A verified cross-browser on-device fallback is a separate compatibility task before broad rollout. Detection of one face is **not** biometric identity verification.

## Owner acceptance / staging QA

- [ ] Deploy backend source with private storage, attendance/photo migrations and appropriate `attendance.checkin` permission, then deploy compatible FE; verify all API routes on HTTPS.
- [ ] QR scan → preview, consent → live single-face capture (including auto retry) → Check-In becomes enabled → click once → backend confirms → List Attendance and metrics refresh.
- [ ] Without consent/photo, wrong event, inactive event, invalid QR, duplicate check-in, two faces or zero faces: no attendance mutation.
- [ ] Test denied/busy/unavailable camera, browser without `FaceDetector`, timeout (best-effort 2s attempts and 30s capture), device orientation, mobile 320px and focus/keyboard access.
- [ ] Test 409, 401/403, storage failure, network drop during upload/finalization, 500, and successful response with wrong IDs. Check that operator sees uncertainty and does not inadvertently submit a second request.
- [ ] Confirm the private photo is accessible only via authorized `GET /api/check-ins/{registrationId}/photo` (S8.4) and no photo/token appears in URL, console or local/session storage.
- [ ] Verify QR/mode/event changes destroy staged photo, and that previous successful Manual Check-In/Out workflows are unaffected.
- [ ] Confirm the backend's photo-required setting and retention/consent policy **only after** staging and hardware QA; do not claim real-camera or production acceptance from CI.

## Next

Sprint 6 S6.3–S6.5 are integrated at **FE source** level after PR #17, but hardware/cross-browser/backend E2E acceptance remain open. The next code/release batch should audit compatibility fallback and Sprint 9 workspace integration; keep deployment to the owner.
