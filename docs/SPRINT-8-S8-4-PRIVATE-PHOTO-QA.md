# Sprint 8 — S8.4 Private Attendance Photo Preview

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend contract verified:** `syberke/EO-Backend/src/EO.Api/Controllers/CheckInPhotoController.cs`  
**Scope:** Frontend code, tests and docs only. No Backend, Notion or deployment changes.

## Code delivered

- [x] The event attendance list offers **Lihat foto** on desktop and mobile only after a Check-In timestamp exists. This is an availability *attempt*, not a claim that an image exists: the Backend returns 404 if not yet stored.
- [x] Fetch on demand from protected `GET /api/check-ins/{registrationId}/photo` using the existing authenticated request client. The Backend checks the registration's event and `attendance.read`.
- [x] Distinct feedback for missing photo (404), permission denied (403), malformed/oversized JPEG and unexpected failures. The operator can retry a failed read.
- [x] The response must be JPEG, remain within the 400 KiB upload bound, and have basic JPEG start/end markers. Content-Length is checked when present; streamed bytes are bounded regardless.
- [x] Image bytes become a transient browser object URL. The dialog aborts its pending request and revokes the object URL during cleanup. Navigation to another event unmounts the dialog. No public storage URL, tokens, or image contents enter local/session storage.
- [x] Six focused tests included in Linux CI, preserving the existing checks.

## Manual QA checklist

- [ ] Admin Kecil with `attendance.read` opens a photo from the **same event**; browser Network tab shows authorized GET (not a public object-storage link).
- [ ] A participant not yet checked in has no actionable photo preview.
- [ ] A checked-in participant without a saved photo yields **Foto Check-In peserta belum tersedia** (404).
- [ ] Access revoked / wrong event (403), expired session (401), server error, offline, invalid MIME and corrupt JPEG show non-leaking errors.
- [ ] Open → close → reopen, click **Coba lagi**, change event, and close while a slow image fetch is pending. Check that obsolete responses never display and temporary object URLs are revoked.
- [ ] Mobile 320px, tablet, desktop, keyboard focus, screen reader dialog label, and long participant names.
- [ ] Confirm private image retrieval permissions at the deployed backend. GitHub CI cannot prove Cloudflare, VM, DB migration, private Supabase Storage, or real owner-camera QA.

## Handoff

**Next:** S8.5 — consistent server-backed attendance metrics/list refresh after state mutations. Sprint 6 QR/face photo-first functionality remains separate and not accepted end-to-end. The Backend's data retention and consent policies require owner approval.
