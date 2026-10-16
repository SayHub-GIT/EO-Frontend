# Sprint 8 — S8.3-B Attendance UI integration (2026-10-17)

**Frontend owner:** `SayHub-GIT/EO-Frontend`  
**Read-only Backend contract:** `syberke/EO-Backend`  
**Baseline:** S8.3-A PR #11, `83823cd`

## Implemented in this batch

- [x] Event `/admin/events/{eventId}/attendance` now uses the dedicated `GET /api/admin/events/{eventId}/attendance` client, not the registration-list DTO.
- [x] Attendance page checks `attendance.read` before requesting data. Event Dashboard uses that permission to show List Attendance and to request metrics.
- [x] New shareable URL parser accepts Backend supported status, method, participant type, event package, date/actor query parameters, and permitted sort keys. Legacy `bookingCode` sorting is reset to the supported default rather than passed to the API.
- [x] Added visible server-side **status** and **method** selectors. Their selections reset paging; server applies filters before pagination.
- [x] Desktop and mobile rows display authoritative `attendanceStatus`, Check-In/Out timestamps, server operator names where present and actual method or `Tidak tercatat`. Private photo URLs are not exposed or fabricated.
- [x] Added URL/filter/UI permission regression tests and made them mandatory in Linux CI. The existing registration list module stays untouched for its other consumers.

## QA / release gates

- [ ] Verify PR CI on the exact head: TypeScript, Linux Next build, Windows dependency recovery, OpenNext worker build and Secret Scan.
- [ ] Staging test on the **deployed** `syberke/EO-Backend` version with the required attendance migrations. Source compatibility alone does not establish deployed support.
- [ ] Test Admin Kecil and Staff with/without `attendance.read`; direct URL to a foreign event must be 403 and must not leak rows/metrics.
- [ ] Search, status, method, package, ascending/descending, pagination, Back/Forward and over-range deep links against real data.
- [ ] Verify old attendance records with null method/actor, check-in/out timestamps, and empty pages; test 401/403/500, aborted requests and mobile width.
- [ ] Verify dashboard metrics still load when `registration.read` is absent but `attendance.read` is granted (and fail closed in the reverse case).

## Remaining work

- **S8.4:** on-demand private photo preview using existing authorized Backend JPEG endpoint; no public URL, enforce byte/type bounds and revoke object URLs.
- **S8.5:** status/metrics refresh after attendance mutation with consistent server-backed counts, and investigate potential double-fetch or stale metrics.
- **S8.3 follow-up:** expose date-range and operator filters as user controls if required; URL/Backend contract is already prepared. Staging checks remain the owner’s responsibility.
- **Sprint 6 remaining:** face-before-finalization and QR photo-first integration still require separate FE work/device QA.

Backend, Notion, production data, Cloudflare and Vercel deployment were not changed by this batch.
