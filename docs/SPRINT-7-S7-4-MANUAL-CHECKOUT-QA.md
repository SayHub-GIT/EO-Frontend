# Sprint 7 Frontend — S7.4 Manual Check-Out

**Repository:** `SayHub-GIT/EO-Frontend`. **Scope:** checkout UI, typed API client, event-scoped eligibility and confirmation tests. No changes to `ptcpkl/EO-backend`, Notion, or Cloudflare deployment.

## Existing Backend contract verified in source

- `GET /api/check-ins/search?eventId={id}&q={term}`: requires `registration.read`; returns up to 20 attendance rows with `eventId`, `canCheckOut`, `checkedInAtUtc`, `checkedOutAtUtc`.
- `POST /api/check-ins/{registrationId}/checkout`: requires `attendance.checkout`. Backend validates that participant has checked in, not checked out; enforces event-scoped permissions and conditional concurrency update; returns `CheckOutResponse`.
- `CheckOutResponse`: `registrationId`, `eventId`, `fullName`, `bookingCode`, `eventName`, `checkedInAtUtc`, `checkedOutAtUtc` (all timestamps server-generated).
- The API does **not** return operator/actor identity in `CheckOutResponse`. S7.5 operator display requires a future documented API contract, not fabricated UI data.

## Implementation

- [x] Add a distinct `Manual CheckOut` tab; retain existing QR and Manual CheckIn screens, camera lifecycle and role permissions.
- [x] Search candidates by event with existing cancelable/debounced API. Only list participants whose `eventId` matches the selected event, `canCheckOut` is true, Check-In timestamp exists, and Check-Out timestamp is absent. Recheck eligibility before mutation.
- [x] Gate checkout input/action on `attendance.checkout`; existing search endpoint independently enforces `registration.read`. Do not trust client filtering as authorization.
- [x] Confirm **registration ID** (not name), use one synchronous in-flight guard, and disable conflicting mode changes during submission.
- [x] Validate server success response against selected registration/event, non-empty details and plausible chronological timestamps. Never mark success from a malformed/mismatched response.
- [x] On HTTP 409, clear stale selection and refresh search without automatically repeating the checkout operation.
- [x] Remove successful registration from eligible list and display authoritative Check-In/Check-Out times in Asia/Jakarta; no photo or QR scan required.
- [x] Five automated regression tests for eligibility, cross-event isolation, filtering, success validation and conflict error; test file now included in Linux CI alongside S7.2–S7.3 tests.
- [x] PR #7 head `0f8b9f7` passed Linux/Windows Frontend Build including all 15 manual attendance regression tests, OpenNext compatibility and Secret Scan; merged as `ae50d01`. No deployment.
- [ ] Browser/device/staging QA by owner with disposable event and registrations.

## Manual QA checklist

1. Authorized operator selects `Manual CheckOut`. Camera stays off; checkbox for optional QR photo is not displayed.
2. Search by at least 2 chars within assigned event. Only currently checked-in and not-yet-checked-out candidates appear. Verify checked-out, registered-only and foreign-event registrants are excluded.
3. Global Admin changes event: old search and selection clear, no cross-event row appears. Admin Kecil is restricted to assigned event.
4. Test a user with `attendance.checkout` denied: search controls/action cannot be used, and backend rejects any forged mutation.
5. Select same-name participants and verify precise booking code/registration ID. Confirm once: network shows only one `POST /check-ins/{id}/checkout`, no camera or photo upload.
6. Success shows server-returned checked-in/out times and correct participant/event; participant no longer selectable for checkout.
7. Race another operator to checkout the same participant. Backend should return 409; UI refreshes search and never displays a false success or auto-retries.
8. Mock malformed Checkout response, incorrect registration/event or invalid timestamps; show verification error, not success.
9. Verify loading, empty, forbidden, network error, keyboard operation, touch targets and 320px layout.
10. Regression QR preview, QR photo consent and Manual CheckIn (existing 10 tests), and verify no Cloudflare deployment or backend edit.

## Remaining dependencies

Search endpoint currently returns up to 20 matches **before** frontend filters `canCheckOut` and timestamps; thus a user might not see eligible matches beyond the returned 20. Backend should provide eligible-only server-side search/filtering or agreed pagination, coordinated with S7.2 and S8. Future **S7.5** should improve mode-switch confirmation and operator attribution when Backend exposes an authorized actor field. S7.4 source merge does not establish staging/device QA.
