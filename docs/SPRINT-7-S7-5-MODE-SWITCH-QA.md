# Sprint 7 Frontend — S7.5 Mode-switch confirmation and Check-Out result

**Owner:** Frontend in `SayHub-GIT/EO-Frontend`. **Backend audit only:** `ptcpkl/EO-backend`. No Backend code, database, Notion or Cloudflare deployment changes.

## Verified API facts

- Existing `POST /api/check-ins/{registrationId}/checkout` responds with `CheckOutResponse`: `RegistrationId`, `EventId`, `BookingCode`, `FullName`, `EventName`, `EventPackageId`, `EventPackageName`, **server `CheckedInAtUtc` and `CheckedOutAtUtc`**.
- The response does **not** expose `CheckedOutByUserId` or operator name. Frontend must **not** derive or invent an authoritative operator from the current local browser session. S7.5 operator attribution remains a **Backend API dependency** until an authorized identity field is formally added and tested.
- Prior FE behavior immediately cleared selected registration/QR preview and last confirmed transaction when switching tabs, with no warning.

## Scope delivered for S7.5

- [x] Define a pure mode-switch confirmation policy, reused by the attendance UI, for selected registration, validated QR preview, live QR camera, and pending QR preview.
- [x] Open a focus-managed MUI dialog on destructive tab transitions. **Tetap di sini** preserves selections/QR preview and camera state. **Ya, ganti metode** cancels preview, stops scanner, clears transient selection/search/error and changes tab.
- [x] Do not show the confirmation dialog for the currently selected tab or when no draft/scan activity exists. Disable switches during an attendance POST or photo capture.
- [x] Preserve already server-confirmed Check-In or Check-Out result across mode changes. Never clear recorded attendance or claim switching reverses an API mutation.
- [x] Continue displaying **Waktu Check-In** and **Waktu Check-Out** from the Backend response, formatted in `Asia/Jakarta`; display an explicit accurate message that operator identity is unavailable from the current API response.
- [x] Preserve existing permission gate, debounce/cancel behavior, QR scanner life cycle, Manual Check-In/Out and S7.4 409 recovery.
- [x] Five tests verify no unnecessary confirmations, selected registrations, QR preview, active camera and preview loading. Linux CI runs these tests together with S7.2–S7.4 regressions (20 total).
- [ ] Exact PR-head GitHub Actions: Linux TypeScript / tests / Next build, Windows dependency recovery, OpenNext compatibility and Secret Scan.
- [ ] Browser/mobile and staging Backend manual QA (not performed by CI).

## QA checklist — operator / maintainer

1. Start at `Scan CheckIn`. Click Manual CheckIn with no active scan: switch directly.
2. In Manual CheckIn, select an eligible registration. Click Manual CheckOut. Dialog appears; **Tetap di sini**, Escape or dialog close retains selected participant and mode. **Ya, ganti metode** clears only unconfirmed selection and changes mode. No attendance request is sent.
3. Repeat from Manual CheckOut with a checked-in participant selected, switching back to Manual CheckIn or QR. Confirm same behavior.
4. While QR camera runs, click another tab. Dialog should warn; cancel keeps scanner active, confirm closes camera tracks and switches. Check mobile camera indicator disappears.
5. Scan a disposable QR; preview name/booking and `canCheckIn` response appears. Change tab; cancel retains preview token and identity, confirm discards them without recording attendance. Repeat during a slow preview request and verify abort without stale reappearance.
6. Successful Manual Check-Out: show authoritative participant, booking code, event, Check-In timestamp and Check-Out timestamp (WIB). Change mode with no pending draft: result stays visible; no false new POST. Operator label must clearly state unavailable, not show the local user's name as if server-verified.
7. Successful Manual Check-In or QR Check-In result also stays visible during ordinary tab changes. Starting a new transaction and receiving a real confirmation updates the last-result pane correctly.
8. Existing single-flight lock should block tab changes while a POST is pending. QR photo capture also blocks switches until camera stops. Check denied/expired permissions and 409 retry guards remain as before.
9. Check 320px mobile, focus trap, Escape, keyboard tab actions, error/empty/loading text, no horizontal overflow or decorative small-corner text.
10. Use only a disposable/staging event. Never use real participant QR codes in production for UI QA. Cloudflare workflow is a **compatibility test, not deployment**.

## Backend handoff

S7.5 requires authoritative Checkout operator attribution. The Backend teammate should agree on an event-scoped, permission-guarded DTO field (such as stable actor ID and optionally display name), access policy, timezone convention, and regression tests. FE should only render it when the real API provides it. No guessed endpoint or fabricated operator data is introduced here.

Previously identified S7.1–S7.4 dependencies remain: existing search is substring matching and applies a 20-record cap before checking `canCheckIn`/`canCheckOut`, so a server-side eligible search or pagination API is needed for complete results. Sprint 7 **UI implementation can be merged** while end-to-end Sprint 7 acceptance remains pending Backend and staging QA.
