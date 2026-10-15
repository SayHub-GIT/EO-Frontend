# Sprint 7 Frontend - S7.1 manual search QA and API handoff

**Repo:** `SayHub-GIT/EO-Frontend`. **Scope:** S7.1 Frontend only, first small batch. No Backend, Notion, production deployment, or Cloudflare binding changes.

## Baseline checked on 2026-10-15

- Existing `/admin/check-ins` already provides Manual CheckIn mode, event selection, input of name/email/booking code, 350 ms debounce, participant selection by **registration ID**, and existing post-check-in response UI.
- Client typed API is `GET /check-ins/search?eventId=<id>&q=<term>` in `src/lib/check-ins.ts`.
- Backend `CheckInsController.Search` delegates to `CheckInService.SearchAsync`; it requires permission `registration.read` and an event scope, minimum two characters, and max 20 results.
- Backend `RegistrationRepository.SearchAttendanceAsync` currently uses `ToLower().Contains(value)` on name, email, booking code and optional employee number. The semantics are **case-insensitive substring matching**, not strict **prefix** matching. If Sprint 7 requires exact prefix behavior, coordinate this contract change with the Backend teammate instead of filtering guessed results in the browser.
- The previous Frontend had a local `AbortController` but forgot to pass its signal to the request. The old debounce also showed the “not found” state before the request started.

## Implemented in this S7.1 batch

- [x] Forward the `AbortSignal` into `authFetch` from `searchCheckInParticipants`. Abort inflight searches when the query, selected event, or CheckIn mode changes, or when the component unmounts.
- [x] Reject stale search results and errors, and keep only rows associated with the selected event as a supplementary UI guard (Backend remains authoritative).
- [x] Start visible loading on query eligibility (including 350 ms debounce); clear old results/selection/error at each query change, avoiding misleading empty-state flicker.
- [x] Stop searches while in QR mode; restart a fresh search on returning to Manual mode.
- [x] Keep event and manual selection controls disabled while CheckIn submit or photo capture is active, to avoid conflicting actions.
- [ ] PR CI: Frontend Build (Linux + Windows), Secret Scan and Cloudflare Workers Compatibility on current head; **no deploy**.
- [ ] Manual QA with a disposable/staging event and non-production registrations.
- [ ] Backend confirmation if strict prefix matching is required for S7.1 full acceptance.

## Manual QA checklist

1. Open the Manual CheckIn tab. Type one character: no search request. Type a second: “Mencari peserta...” displays immediately and remains through debounce + network response. No false empty state while pending.
2. Type quickly (>2 characters, before 350 ms). Observe only the last query being submitted. Repeat with a slow network connection and confirm older inflight results do not replace newer results.
3. Switch event while request is pending; old results and selected registration disappear, and no attendee from another event is selectable. Permission-denied response appears as an error, not as “no results.”
4. Switch Manual → QR during pending search, then back to Manual; requests are cancelled and only a fresh manual search populates results.
5. Verify populated, empty and error responses, case-insensitive matching, selected registration's name and booking code, and server-driven `canCheckIn` blocking.
6. When CheckIn is submitting, or post-check-in photo capture runs, event changes and another manual selection are disabled. Verify the previously working result panel and existing consent behavior remain unchanged.
7. Run on desktop/mobile in a supported browser; controls must be keyboard-focusable with readable loading status and no horizontal overflow.
8. Do not use real QR tickets in production; existing QR POST still commits attendance, and photo remains a separate post-check-in operation. Sprint 6 preview/photo-before-finalization is separate.

## Backend teammate follow-up (no Backend edit made)

If strict prefix matching is required, change repository-level `SearchAttendanceAsync` to documented case-insensitive prefix logic, add regression tests covering name/email/booking/employee number, preserve event isolation, limit/order and authorization; publish a compatible API contract to Frontend. The user requested Frontend-only implementation here.
