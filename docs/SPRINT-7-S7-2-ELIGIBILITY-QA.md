# Sprint 7 — S7.2 Manual Check-In eligibility

**Frontend repo:** `SayHub-GIT/EO-Frontend` · **Scope:** UI eligibility list, automated regression, QA/handoff · **No Backend code, Notion or Cloudflare deployment changes.**

## Verified server contract

- Backend `RegistrationStatus.Registered = 2`, with JSON payload potentially containing numeric `2` or text `Registered`. `Paid` is a legacy alias with the same enum value.
- `GET /check-ins/search?eventId=<id>&q=<term>` returns `AttendanceParticipantResponse` objects with `status`, `canCheckIn`, `checkedInAtUtc`, `checkedOutAtUtc`, and `eventId`.
- Backend `BuildAttendanceResponseAsync` produces `canCheckIn` from actual state and eligibility checks: registration/event status, event time, payment, and existing Check-In.
- Backend search selects at most **20** records **before** returning eligibility flags. Therefore client filtering can only hide ineligible results among these 20; it cannot guarantee that all eligible matching records beyond the first 20 are shown. This is a **Backend follow-up**, not a reason to silently claim complete server filtering.

## S7.2 Frontend implementation

- [x] Only show rows with **Registered** (`2` / `Registered`), `canCheckIn === true`, null `checkedInAtUtc`, null `checkedOutAtUtc`, and exactly matching selected event ID.
- [x] Derive eligible subset without mutating API results. Reuse eligibility guard at click/submit boundary; Backend still validates atomically.
- [x] Separate no-search-results state from no-eligible-rows-within-results state; prompt operator to search a more specific name or booking code rather than wrongly claiming no eligible attendee exists in the entire event.
- [x] Add regression tests for enum numeric/text encodings, inactive registration states, already checked-in/out users, server-declined eligibility, cross-event leakage and selection ordering.
- [x] Add focused `npx tsx --test scripts/test-manual-check-in-eligibility.test.ts` to Linux Frontend Build after TypeScript check.
- [x] PR #5 exact head `7f8f440` passed Linux/Windows Frontend Build (including all five S7.2 tests), OpenNext compatibility and Secret Scan; merged to main as `0438c63`.
- [ ] Manual QA against staging API in a disposable event, on phone and desktop.
- [ ] Coordinate Backend-side **eligible-only search before `Take(20)`** or another agreed API response contract if event-level complete eligibility search is required.

## Manual QA checklist

1. As authorized event staff, open Manual CheckIn, search a name with at least two characters: loading appears and eligible results display without stale participants.
2. Seed one `Registered` participant eligible for Check-In: visible, selectable, and confirm action succeeds once through Backend.
3. Seed existing Check-In / Completed (Check-Out), Pending Payment and ineligible registrations: none selectable or visible as eligible rows; use read-only server data to verify the filtered set.
4. Search with results that exist but none eligible: explain that no eligible result is available **within returned matches**, not that event is empty. Search for no matching name: distinct message.
5. Confirm participant from a different event cannot appear/select even if a malformed response contains it.
6. Disable operator `attendance.checkin` permission and confirm mutation controls do not activate. Backend denial remains authoritative if a request is forged.
7. Verify event changes and quick query typing cancel old results, and a successful Check-In removes the person from the eligible list. Reject duplicate check-ins server-side.
8. Test 320px mobile, keyboard selection, long names, no horizontal overflow, error and empty states.
9. Confirm server's max-20 prefilter limitation with >20 seeded matching records (if available); request Backend contract update if eligible matches are omitted.
10. Cloudflare deployment remains disconnected: compatibility build is **CI only**, not a production rollout.

## Handoff to Backend colleague (no API change made)

For full S7.2 acceptance, Backend should filter `Registered` and `canCheckIn`-eligible registrants before applying result limits, preserving server RBAC, event isolation and consistent pagination/search semantics. This may require coordinating the status/time/payment eligibility rule and query performance; do **not** assume a new `eligibleOnly` query parameter already exists. The frontend guard is defense-in-depth, not a server substitute.
