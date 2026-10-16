# Sprint 6 — S6.3 Face Capture foundation

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend reference only:** `syberke/EO-Backend/src/EO.Api/Controllers/CheckInPhotoController.cs`  
**Scope:** Component and in-memory media utilities, regression tests. No production QR routing, Backend, Notion or deployment changes.

## Implemented in this small batch

- [x] `src/lib/qr-face-capture.ts`: native `FaceDetector` capability check, attempt to detect **exactly one face** with a 2,000-ms target window after the preview is ready, abort support, and privacy-safe JPEG in-memory compression under 400 KiB.
- [x] `src/components/attendance/QrFaceCapture.tsx`: consent-gated camera permission and live preview, detected-face photo preview, cancellation, camera track shutdown, transient blob URL revocation, and actionable browser/permission/device errors.
- [x] Nine focused regression tests and Linux CI gate for detection, multiple/no faces, timeout, cancellation, encoding and privacy.
- [x] No attendee photo or QR token is written to local/session storage or sent to an external image detection service.

## Scope and security hold

- The **existing production QR screen is intentionally unchanged** in S6.3. It currently finalizes via `POST /api/check-ins` then optionally uploads a photo; it is **not yet** photo-first or atomic.
- `QrFaceCapture` is a reusable isolated component, **not connected to the live Check-In button**. Do not claim S6.3 fully integrated, and do not enable `CheckIn__RequirePhotoForQr` yet.
- Native browser `FaceDetector` is **not universally available**. Unsupported devices fail with a clear message, **not** a fabricated successful face match. Select and audit a suitable on-device cross-browser detector if device QA shows inadequate support.
- A two-second detection **target** is not a guarantee over all hardware; camera startup, permissions and JPEG compression take additional time. The 30-second end-to-end acceptance gate remains open.
- Backend exposes `POST /api/check-ins/qr-with-photo` and checks consent and private storage; S6.5 must wire that **after** S6.4 retry/cancellation and photo validation, replacing the legacy QR commit path for QR mode. Do not use the legacy after-commit photo upload to satisfy this requirement.
- Face detection establishes that an image contains one face; it does **not** verify identity or establish who the participant is.

## Next small tasks

- [ ] **S6.4** Prepare the QR preview to preserve validated ticket context, automatically retry photo detection without a QR rescan, and safely cancel/dispose camera and blob state. Ensure event/mode change also disposes it.
- [ ] **S6.5** Wire verified JPEG + QR ticket + explicit consent to the authorized **atomic** `qr-with-photo` endpoint. Guard duplicate submit, require server-confirmed `registrationId/eventId`, surface conflicts and uncertain outcomes for reconciliation, and remove the unsafe legacy QR finalization path.
- [ ] **Manual QA by owner:** HTTPS permission prompts; rear/front camera options; unsupported `FaceDetector`; face missing / two faces / background faces; camera busy; sleep/resume; slow detector; mobile 320px; keyboard/a11y; stale unmount, abort, and camera track closure.
- [ ] **Staging release gate:** only enable backend photo-required flag after real device, end-to-end, and private photo retrieval QA.

CI build success verifies code, not real-camera support, face identity or staging behavior.
