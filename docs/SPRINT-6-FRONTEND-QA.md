# Sprint 6 Frontend — S6.1 acceptance / manual QA

**Owner:** SayHub-GIT/EO-Frontend. **Scope:** UI-only QR vs manual attendance mode selector; remove deprecated manual QR-token input. Existing API requests, JWT/RBAC, storage/photo and backend attendance transitions are unchanged. **Status (2026-10-15):** implementation merged to main via PR #2 (`7ad4349`), PR head `4d7bbf4` passed Frontend Build, Cloudflare Workers Compatibility and Secret Scan. Manual browser/device QA is still required before calling S6.1 verified.

## Source audit before changes

- Existing `src/app/(dashboard)/admin/check-ins/page.tsx` had QR camera scanner + BarcodeDetector/jsQR fallback, manual search and check-in, package/result pane, and optional **post-check-in** photo flow.
- Old page displayed all functions simultaneously and also exposed a deprecated `Manual token` text field.
- Existing typed client `src/lib/check-ins.ts`: `checkInParticipant` directly `POST /check-ins`. QR **scan currently commits attendance**. `manualCheckIn` directly `POST /check-ins/manual`. `uploadCheckInPhoto` is post-check-in. There is **no non-mutating QR preview** or pre-finalization photo contract in this Frontend client.
- S6.2–S6.5 must wait for compatible Sprint 5 Backend contracts. Do not mislabel current QR or photo behavior as preview-first.

## S6.1 changes under review

- [x] Tabs `Scan CheckIn` / `Manual CheckIn`, QR default, accessible tab labels, responsive full-width layout.
- [x] Remove Manual Token text field; retain QR camera detector and responsive viewfinder.
- [x] Manual tab retains event selection, typed participant search, booking code confirmation and permission gating.
- [x] Switching modes releases scanner track/timer and clears pending manual selection; disabled while check-in submits or photo capture runs.
- [x] Shared photo-consent explanation remains clear about **after-check-in** behavior; QR mode explicitly cautions about immediate attendance mutation.
- [x] PR CI: Frontend Build (including TypeScript/Next), Cloudflare/OpenNext compatibility, and Secret Scan all succeeded on exact PR head `4d7bbf4`.
- [ ] Manual QA on mobile + desktop with a disposable event, **not production attendee QR codes**.

## Owner manual QA checklist

1. Visit `/admin/check-ins` as event-authorized user on HTTPS; verify QR tab selected by default. Switching Manual → QR does not automatically start the camera. Both tabs are touch-friendly and no horizontal overflow exists at 320px.
2. Start QR camera; grant permission; confirm viewfinder and stop button. Switch to Manual, then check browser camera indicator and stream tracks are closed. Return QR, manually restart. Check native BarcodeDetector and jsQR fallback separately in browsers where available.
3. Deny camera; confirm actionable error without crashing or showing manual QR-token form.
4. Switch Manual; select event if global Admin, or use assigned event as Admin Kecil. Search by name/email/booking with 2+ characters; verify pending, empty and error states. Select correct registration ID and confirm with a disposable participant only. No cross-event result should appear.
5. While request is pending, tab change should be disabled; double-click should not create two local submits. Photo capture should not be interrupted by mode switch.
6. Repeat with account lacking `attendance.checkin` permission: scanner start, selection and mutation must be blocked (Backend remains authoritative).
7. Verify successful response still renders package/race pack and recorded timestamp, and existing optional photo capture still takes place only after explicit participant consent.
8. Regression: no `Manual token` heading, token textarea or QR token paste entry; camera scanning remains usable. Confirm no changes to Backend / Notion.

## Important dependency / release blocker

The S6.1 change intentionally **does not** switch QR scanning to preview-first. Current `POST /check-ins` mutates attendance, and photo upload occurs **after** that mutation. Before completing S6.2–S6.5, Backend teammate must publish non-mutating preview, photo-before-finalization and atomic QR finalization contracts (including request DTOs, error codes, auth and idempotency), and QA must demonstrate them against an actual staging Backend. No guessed endpoint, simulated success, or production API change is part of S6.1.
