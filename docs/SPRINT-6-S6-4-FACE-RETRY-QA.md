# Sprint 6 — S6.4 Face Capture Auto Retry

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Baseline:** S6.3 PR #15, `d380287`.  
**Scope:** Retry and identity-bound lifecycle inside the reusable face capture component; no Backend changes, deployment, or QR finalization path modification.

## Implemented

- [x] Face detection retried **automatically within one camera session** after a two-second no-face/multiple-face timeout, without another QR scan or camera permission request.
- [x] Reuses the video stream for subsequent attempts; stops after the overall **30-second target budget**. A user may explicitly **Coba foto lagi** to begin a fresh capture session, without validating a QR again.
- [x] Camera permission, device and unexpected detection errors stop the loop immediately; they are never treated as a valid captured face.
- [x] A single captured face produces one bounded in-memory JPEG and the success callback only if the session is still active.
- [x] Abort/cancel and component unmount stop owned camera tracks and revoke preview URLs. Changing `eventId` or `registrationId` restarts with a clean capture session rather than reusing another participant's image.
- [x] Callback prop changes do not restart the camera effect. Existing S6.3 regressions were updated and seven new S6.4 tests added to Linux CI.

## Scope guard and limitations

- **The component remains isolated from the live QR Check-In screen until S6.5**, when the validated QR context and photo must be connected to Backend `POST /api/check-ins/qr-with-photo`. Legacy QR finalization has NOT been changed, and users must not interpret this as production face-first Check-In.
- Existing QR preview state in the Check-In page carries the validated token and participant; S6.5 must keep it intact during photo attempts, cancel it on event/mode switch, and destroy staged JPEG bytes on cancellation. Never put token/photo in localStorage or URL.
- Retry budget starts when video playback is ready, not when camera permissions are requested. Browser camera availability and individual native FaceDetector calls can exceed targets; timing is a **best-effort UX limit**, not a hard real-time guarantee. Device-specific support still must be confirmed.
- A detected face does **not** verify the attendee's identity, merely one face in frame. Consent and backend authorization remain mandatory.
- The 30-second end-to-end acceptance test, private storage, camera hardware tests and staging E2E are not covered by code CI. Do not enable backend photo-required enforcement yet.

## Manual QA / next handoff

- [ ] Face missing for several 2s windows: automatic repeated attempt, no QR re-scan and no permission loop.
- [ ] Two faces then one face: keep scanning until a single detected face is present.
- [ ] Cancel during camera permission, detection, encoding and manual retry; no stale photo, no post-cancel success.
- [ ] Switch event/participant or leave QR mode during capture; tracks and blob URLs cleaned, old image cannot be submitted to a new participant.
- [ ] Camera permission denied, missing camera, busy camera, browser without FaceDetector; clear error, no fake success.
- [ ] Mobile 320px, keyboard focus, page visibility, camera orientation, real latency and performance. Validate 30s full flow only after integration.
- [ ] **S6.5:** integrate validated token + image into the atomic backend check-in endpoint, eliminate QR legacy commit, check exactly one server-confirmed transaction, and never fall back to check-in without a photo.
