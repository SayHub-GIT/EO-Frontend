# Sprint 8 — S8.5 Attendance refresh (2026-10-17)

**Frontend:** `SayHub-GIT/EO-Frontend`  
**Backend contract:** `syberke/EO-Backend` (read-only)  
**Scope:** Frontend attendance state synchronization, code and regression tests only.

## Implemented

- [x] `publishAttendanceChange(eventId)` is called only after confirmed QR Check-In, confirmed Manual Check-In and confirmed Manual Check-Out in the operator screen.
- [x] Scope refresh messages to validated event IDs. No registration ID, participant name, photo, token, or authorization value is transmitted.
- [x] Use a per-event in-tab `CustomEvent` and cross-tab `BroadcastChannel` (where available), without persistent browser storage.
- [x] When the user returns to a visible tab, refresh at most once per 15 seconds; prevent repeated focus/visibility events from flooding requests.
- [x] List Attendance refreshes its **server-paginated rows and authoritative server metrics** following the event signal. Changing page/search/sort no longer re-requests metrics or event details.
- [x] Event Dashboard re-requests the same server metrics following the event signal. Both views reject mismatched event IDs and cancel stale requests through `AbortController`.
- [x] Add five focused regression tests for event isolation, cross-tab messages, focus throttle/cleanup, confirmed operation emitters, and authoritative dashboard/list wiring.

The frontend never computes event-level counts from the current page, and this batch does **not** claim to provide websocket/live server pushes. Changes made on other devices are refreshed when this tab regains focus or the operator clicks **Muat ulang** (List Attendance).

## Owner manual QA

- [ ] With event A open on Attendance in one tab and Check-In in another, confirm QR and Manual Check-In trigger updated server rows and counts. Repeat with Check-Out.
- [ ] Confirm an event B update does **not** trigger event A refresh. Open two windows with different accounts and verify API permissions still control visibility.
- [ ] Verify a second tab receives updates via BroadcastChannel; unsupported browsers still refresh after focus.
- [ ] Perform fast page, search, and sort changes while an earlier list request is slow. No obsolete response should overwrite a newer view.
- [ ] Confirm dashboard refreshes on focus but does not hammer metrics when focusing multiple times quickly; no duplicate requests per simple pagination.
- [ ] Test revoked `attendance.read`, 401/403, server 500, offline, event switch, and empty rows. Old metrics must not be treated as fresh after failed refresh.
- [ ] Verify manual **Muat ulang** refreshes list and counts. Test 320px mobile/desktop display and keyboard focus.
- [ ] Perform staging E2E after authorized Backend migration and Storage rollout. GitHub CI does not verify deployment or camera behavior.

## Next

The Sprint 8 **code tasks S8.2–S8.5 are merged or staged with CI**, but Sprint 8 manual/staging acceptance remains open. Complete outstanding Sprint 6 S6.3–S6.5 face-first QR photo finalization and Sprint 9 workspace/release tasks in small batches, with deployed Backend E2E kept for the owner.
