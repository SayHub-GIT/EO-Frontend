# Sprint 8 Frontend — S8.2 Attendance List foundation

**Owner:** Frontend (`SayHub-GIT/EO-Frontend`). **Backend:** `ptcpkl/EO-backend` read-only contract audit. **Scope:** usable list UI backed by real existing paginated registration endpoint plus database-derived metrics. No Backend, Notion, or Cloudflare deployment changes.

## Backend contracts inspected

- `GET /api/admin/events/{eventId}/registrations?page=1&pageSize=20`, guarded by `registration.read`, already returns a `PagedResult<RegistrationListItem>`: `items`, `total`, `page`, `pageSize`.
- `RegistrationListItem` currently has `id`, `bookingCode`, `fullName`, `email`, `eventPackageName`, `status`, `registeredAtUtc`, `checkedInAtUtc`. It does **not** include `checkedOutAtUtc`, check-in method, operator/actor, or private photo reference.
- `GET /api/admin/events/{eventId}/attendance-metrics` provides database-derived `totalParticipants`, `checkedIn`, `checkedOut`, `currentlyOnSite`, and other summary values, protected by `registration.read`. These authoritative totals are NOT recomputed from the current page.
- There is **no separate Sprint 8.1 event-scoped attendance list API** with `attendance.read`, rich actor/method/photo fields, full attendance time history or dedicated filter contract in the current Backend repository. This is a Backend-team request, not a Frontend assumption.

## S8.2 delivered in this batch

- [x] New event-scoped route: `/admin/events/{eventId}/attendance`; event dashboard's attendance overview includes a permission-gated navigation link.
- [x] Backend-powered pagination (10, 20 or 50) with server `total`, not slicing a guessed full result set.
- [x] Desktop table and mobile stacked cards for participant, booking code, package, original registration status, Check-In time in WIB and explicit unknown Check-Out time.
- [x] Real attendance metrics cards from existing aggregate endpoint; separate non-blocking error state if metrics are unavailable.
- [x] API payload checks, abort stale page loads, loading/empty/error/retry and `registration.read` UI permission check. Backend is still authoritative for event scope and access.
- [x] Visible notice that check-out time, method, actor and private photo are missing from the existing registration-list DTO. Never generate an operator, infer missing Check-Out timestamp or expose photo URLs.
- [x] Five regression tests for typed normalization, pagination totals, enum labels, nullable timestamps, and WIB formatting; Linux Frontend Build runs all 25 attendance tests.
- [x] PR #9 exact head `d1ea14c` passed Linux/Windows Frontend Build including 25 focused attendance regressions, OpenNext compatibility and Secret Scan; merged as `fceea6c`. No deployment.
- [ ] Staging/device QA with an authorized disposable event and intentionally populated registration/Check-In data.

## Manual QA and accessibility

1. Log in as authorized Admin Kecil or Admin with `registration.read`. Open Event Dashboard → **Lihat List Attendance**; route must contain selected Event ID and not show another event's registrations.
2. Verify event title and server metrics. With a 45-participant fixture, pages 1/2/3 at 20/page should show 20/20/5, while the `total` and metrics values reflect the real server, not page aggregates.
3. Check one Pending Payment, Registered, Checked-In and Completed status. The UI must distinguish underlying registration statuses and never assert Checkout timestamp if not provided by the API.
4. Check server `checkedInAtUtc` displays in WIB (Asia/Jakarta). Missing time reads **Belum tercatat**. Do not treat `Registered` as checked-in.
5. Simulate offline / 403 / 500: error must appear with a **Coba lagi** action, not a false empty list. Metrics failure must not erase a valid participant list.
6. Change pagination quickly: old response must not replace new rows. Change event URL: old results should clear. Check URL encoding of Event ID and server event permission enforcement.
7. With `registration.read` missing, show permission warning, do not fetch event/registration/metrics, and do not expose the dashboard's List Attendance button.
8. Check responsive 320px phone, tablet, desktop, long names/booking, keyboard controls, list loading announcement, focus and contrast. No mobile horizontal overflow.
9. No face photo or operator data may be synthesized. Private photo display remains S8.4, pending authorized Backend endpoint and consent/retention policy.
10. Cloudflare remains disconnected. OpenNext CI is a compatibility build only; it must not deploy.

## Backend handoff for S8.1 / full S8.2 acceptance

Implement a dedicated event-scoped, paginated attendance list endpoint with explicit `attendance.read` permission and server-side status/method/category/date/search filters as needed by S8.3. Include authoritative Check-In and Check-Out timestamps, method (`QR`/`MANUAL`), operator attribution fields with event-scoped permissions, and only a safe private-photo availability marker (not a public object URL). Publish Swagger DTO, error semantics, pagination/sort rules, and regression tests. Existing registration-list endpoint is a **temporary partial source**, not a replacement for this planned API.

**Status interpretation:** S8.2 foundation can be source-merged with green CI, but full S8.2 acceptance, rich columns, browser QA and S8.1 contract remain pending.
