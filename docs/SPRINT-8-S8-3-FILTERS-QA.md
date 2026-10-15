# Sprint 8 Frontend — S8.3 Shareable filters, server search and pagination

**Repository:** `SayHub-GIT/EO-Frontend`. Only Frontend files and CI/docs were changed. No Backend, Notion or Cloudflare deployment.

## Source-of-truth contract verified on 2026-10-15

The existing Backend endpoint `GET /api/admin/events/{eventId}/registrations` accepts:
- `page` (1-based, minimum 1), `pageSize` (1–100). Frontend offers 10, 20, 50.
- `search` (maximum 200 characters): server-side registration search (name/email/booking).
- `participantType` (`Internal` or `External`, matching .NET ParticipantType enum).
- `eventPackageId` (UUID); package options come from `GET /api/admin/events/{eventId}/packages`, which requires `event.read`.
- `sort` (allowed `registeredAt`, `fullName`, `email`, `status`, `bookingCode`) and `direction` (`asc`/`desc`). FE offers registeredAt/fullName/bookingCode sorting.
- Endpoint authorization remains `registration.read` and server-side event isolation.

**Not supported:** server-side attendance-status, QR/manual method, check-in/check-out date-range filters, employee category or photo filters. The FE does **not** apply fake filters to the current page, silently omit matching server records, or invent these query parameters. Backend Sprint S8.1 and S8.3 API contract are required for full acceptance.

## Frontend implementation

- [x] URL is the source of truth for search, event participant type, event package, sort, direction, page and page size. Refresh and Back/Forward recover the same view.
- [x] Name/email/booking search is debounced 350 ms and capped to the Backend maximum of 200 characters; search updates use history `replace` to avoid hundreds of entries.
- [x] Changing search/category/package/sort resets to page 1; pagination remains server-driven with accurate `total`. When filters reduce the total below a deep-linked page, clamp to the last valid page.
- [x] Use `AbortController` to avoid stale results overwriting current event/filter results. Keep previous S8.2 permission/error/empty/mobile UI.
- [x] Optional package selector degrades gracefully when `event.read` permission is not available; other filters remain functional.
- [x] URL parser rejects unrecognized enum values, invalid page sizes/pages/UUIDs and strips unsupported status/method/date keys. No UI authorization substitute; API permissions remain authoritative.
- [x] Six new regression tests verify defaults, round-trip URL, malformed values, enum casing, unsupported filters and paging reset. Existing 25 tests retained; 31 focused attendance tests now included in Linux CI.
- [x] PR #10 head `47c0a3c` passed Linux/Windows Frontend Build including all 31 attendance regression tests, OpenNext compatibility and Secret Scan; merged as `c97eb14`. No deployment.
- [ ] Browser QA with disposable event and staging Backend.
- [ ] Backend S8.1 rich attendance list with status/method/dates/category filter semantics and accurate summary fields.

## Staging / device QA checklist

1. Load a disposable event attendance URL, search a participant (including spaces, plus sign, ampersand and Unicode) by name/email/booking. Confirm that all search filtering happens server-side across pages; no client-only partial filter.
2. Check search debounce: rapid typing should only request the final value after 350 ms; subsequent request cancels stale inflight responses.
3. Choose `Internal` or `Eksternal`, then an event package. Confirm API gets those parameters, server total adjusts, and selections persist after browser reload and copied URL.
4. Test sort newest, oldest, name A–Z/Z–A, booking code A–Z/Z–A. Verify `sort` + `direction` API parameters and that the selected label matches the URL.
5. Navigate page 1 → 3 and change page size 20 → 10. Confirm URL changes, server page/total is used; changing filter resets to page 1.
6. Deep link to page 99 with only 3 matching entries. UI must correct URL to last available page without an endless request loop.
7. Use browser Back and Forward after changing type or package. Search field, selectors, pagination and data must recover from URL.
8. Remove `event.read` but keep `registration.read` in an authorized staging account: package options may fail, but participant list/search/type/sort should remain available. Unauthorized `registration.read` must show warning and no data.
9. Force 403/500, offline, delayed response and empty matches. Error/retry must be distinct from empty results. Event A data must never appear for Event B.
10. Verify 320px mobile, tablet and desktop forms, focus, keyboard, long names, no overflow; do not trigger any mutating Check-In/Out endpoint from a list page.
11. Real backend does **not** support status/method/date filtering in this registration list. Those remain pending rather than being described as functional.
12. Cloudflare deployment remains disabled; compatibility build only. Do not use real participant data for fixtures.

## Backend handoff (no BE modification)

Agree on a dedicated `S8.1` event-scoped attendance endpoint requiring `attendance.read`, with documented paginated search, attendance status/method/date range/category, safe private photo availability marker, Check-In/Out times and actor attribution. Filters must be applied **before pagination in SQL**, with stable sort/tie-break and count. Preserve event permission enforcement, no public photo URLs or fake operator labels. Once that API is deployed, Frontend can migrate S8.2/S8.3 without pretending the current registration list provides those fields.

**S8.3 implementation status:** partial FE UI and URL contract. Server-specific status/method/date acceptance remains blocked; staging QA not completed by CI.
