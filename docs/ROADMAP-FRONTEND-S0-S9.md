# Website EO — Frontend-only roadmap (Sprint 0–9)

> **Owner:** Frontend contributor (SayHub-GIT). **Repository:** `SayHub-GIT/EO-Frontend`. **Companion Backend handoff:** [Backend roadmap](https://github.com/ptcpkl/EO-backend/blob/main/docs/ROADMAP-BACKEND-S0-S9.md) in `ptcpkl/EO-backend`. **Last reconciled:** 2026-10-15.

## Scope / status convention

This document **splits the existing Sprint 0–9 / 49 original task slots** without renumbering them. Task IDs `Sx.y` remain cross-team references. A row owned by Backend is **not a Frontend TODO**; Frontend may integrate, mock or validate its API but must not implement Backend behavior. Backend-specific additional tasks `S4-SEC1–3` are outside the original 49-task denominator. MicroSite visual-builder work is a **separate roadmap**, not included here.

**Status meanings:** `MERGED / QA OPEN` = Frontend source on main, build / deployment / manual behavior not confirmed; `HISTORICAL` = older audit reported, no fresh independent audit; `AUDIT FIRST` = existing UI code may already cover some behavior, inspect before reimplementation; `BE` = Backend-only scope. A merged commit is **not** a production deployment.

**Verified repository baseline:** `SayHub-GIT/EO-Frontend/main` at `a727c131f3251be8c9c40ba15ecd4fbd0f94b051` (mirror of original Frontend `ptcpkl/EO-Frontend/main` at split time). Frontend Sprint 4 implementation: original PR #193 and stabilization PR #197 in the original repository. GitHub Actions at the new owner must still be executed; copied workflow YAML is not proof of a passing build. Backend companion baseline: `ptcpkl/EO-backend/main` at `d627ae23650ad43ae4b800489423f5bc087723fa`, PR #154.

## Sprint ownership matrix

| Original sprint | Frontend responsibility | Backend responsibility / prerequisite | Frontend status |
| --- | --- | --- | --- |
| S0 — Discovery & baseline (4 slots) | UI/QR workflow audit, component inventory, current TS/Next baseline (parts of S0.1–0.4) | RBAC, API, data/migrations, service tests (parts of S0.1–0.4) | HISTORICAL; no new delivery implied |
| S1 — Admin Kecil isolation (5) | Consume effective permissions in UI later under S4 | S1.1–S1.5 policy, role, event and token enforcement | BE |
| S2 — Subaccounts & custom roles (5) | Consume scoped users/roles API later under S4 | S2.1–S2.5 owners, scoped CRUD, permission caps, multirole | BE |
| S3 — Account lifecycle (5) | Existing account UI integration only if requested | S3.1–S3.5 profile security, OTP, handover, suspend/restore | BE |
| S4 — UI RBAC & user management (5) | **S4.1–S4.5** and Frontend stabilization | S4-SEC1–3 security fixes, already merged | MERGED / QA OPEN |
| S5 — Attendance Backend integrity (5) | API contract review and client preparation only | **S5.1–S5.5** QR preview, photo safety, finalization, audit, storage | BE; blocker for S6–8 |
| S6 — QR scan & face capture (5) | **S6.1–S6.5** | S5 API + permission/photo contract | AUDIT FIRST |
| S7 — Manual check-in/out (5) | **S7.1–S7.5** UI and server-driven states | Search/check-in/out endpoints, audit and atomic state transitions | AUDIT FIRST |
| S8 — Attendance list & monitoring (5) | **S8.2–S8.5 FE slice** | S8.1 API and S8.5 event-scoped server metrics | AUDIT FIRST |
| S9 — Workspace integration & release QA (5) | **S9.1–S9.5 FE slice** | S9.4 cross-stack regression; S9.5 migration/rollout/backend validation | AUDIT FIRST |

## Historical split — S0 to S3

- **S0.1** Review role/user/event permissions: FE inventories existing guards, routes and current user states; BE owns authorization and policy verification.
- **S0.2** Review QR scan, manual entry, face photo, checkout: FE inventories screens and browser/camera behavior; BE owns transaction and data integrity.
- **S0.3** Reusable components and contract map: FE owns UI design-system and typed API client map; BE owns DTO/routes, database migrations, concurrency.
- **S0.4** Baseline: FE owns npm/TypeScript/Next/Cloudflare CI checks; BE owns .NET/EF/PostgreSQL tests. S0 activities were previously *reported* complete; do not infer a new green CI result here.
- **S1.1–S1.5, S2.1–S2.5, S3.1–S3.5:** no stand-alone Frontend work package was defined in the original roadmap. Existing FE integration is tracked under S4, not counted as imaginary completed FE tasks. Backend source was previously reported/merged; run UI regressions against the deployed API when ready.

## Sprint 4 — FRONTEND (source merged, QA open)

| ID | Deliverable / acceptance | Status |
| --- | --- | --- |
| **S4.1** | Main Admin chooses event; Event Admin Access finds actual assigned Admin Kecil; only eligible candidate for empty owner; no query-string escalation; saves account-scoped event grant | MERGED / QA OPEN |
| **S4.2** | Assigned Staff editor primary on desktop; staff list secondary/right and follows editor on mobile; Indonesian labels | MERGED / QA OPEN |
| **S4.3** | Admin Kecil scoped subordinate provisioning, activation/revocation, multi-custom-role assignment; Custom Role CRUD, permissions within owner cap; safely scope async results by event | MERGED / QA OPEN |
| **S4.4** | Users table Event after Email; wrap long names; show 'Not Set' only on successful lookup; explicit API error state | MERGED / QA OPEN |
| **S4.5** | Navigation, disabled controls and handlers follow effective permissions; Backend remains authorization authority | MERGED / QA OPEN |

**S4 integration evidence:** Frontend merged `a727c13`; Backend safeguards (S4-SEC1 assigned-role delete protection; S4-SEC2 global user subordinate isolation; S4-SEC3 global Admin/Admin Kecil role boundary) merged in `ptcpkl/EO-backend` `d627ae2`. Neither is proof of production rollout.

**Immediate S4 FE gate:** run on `SayHub-GIT` using PR CI: `npm ci`, `npm run check:syntax`, `npx tsc --noEmit`, `npx next build --no-lint`, and Cloudflare/OpenNext compatibility + secret scan. Owner tests are in [SPRINT-4-MANUAL-QA.md](SPRINT-4-MANUAL-QA.md). Confirm status of migrated GitHub App/Actions before declaring green.

## Sprint 5 — BACKEND prerequisite only

- **S5.1** QR preview/validation must **not** mutate attendance; FE may consume a documented response.
- **S5.2** Photo upload must be private, validated and cleaned up when abandoned; FE may implement camera/upload states only after contract.
- **S5.3** Check-in finalization happens only after valid required photo, with idempotent retry.
- **S5.4** Method QR/MANUAL, timestamp and actor audit are determined by server.
- **S5.5** Private photo access, retention and concurrency controls are server-owned.
- **FE boundary:** do not invent endpoints, trust client-only attendance status, expose storage secrets, or implement server policy in the browser. FE may build against documented fixtures/mocks while Backend is unavailable.

## Sprint 6 — FRONTEND QR scan + face capture

All work marked **AUDIT FIRST** because existing `checkin` code/branches were present before this split.

- [x] **S6.1 (merged via PR #2; PR CI green, device QA pending)** Separate `Scan CheckIn` and `Manual CheckIn` tabs, remove deprecated Manual Token, retain camera QR and manual participant search; stop stale scanner frames when switching mode. See [Sprint 6 QA checklist](SPRINT-6-FRONTEND-QA.md). Not yet validated on real devices.
- [ ] **S6.2 (merged via PR #4; PR CI green, staging/device QA pending)** Scan now requests Backend `POST /check-ins/preview` without attendance mutation; renders eligibility/details, requires explicit confirmation for `POST /check-ins`, and handles invalid/forbidden/duplicate status, abort and rescan. See [S6.2 QA](SPRINT-6-QR-PREVIEW-QA.md). Preserve incomplete status until tested against staging API and real camera.
- [ ] **S6.3** Face Capture UI with permissions, camera previews, fallback device errors and target capture <=2s in supported conditions; don't claim guaranteed timing across hardware.
- [ ] **S6.4** Permit photo retry without rescanning; cancel without finalizing attendance or leaving an orphaned user-facing state.
- [ ] **S6.5** Enable final `CheckIn` only with validated photo, submit exactly one logical operation (disable repeat while pending), handle idempotent retry and show server-confirmed result.

**S6 checkpoint (2026-10-15):** Existing Check-In UI and `src/lib/check-ins.ts` were audited before S6.1; it already had native/jsQR scanning, a manual participant search, results, and optional photo capture **after** QR Check-In. S6.1 is an interaction/UI split, not a new Backend preview or atomic finalization. `POST /check-ins` still mutates attendance; Backend currently exposes a non-mutating `POST /check-ins/preview` endpoint in source, so **S6.2 can be implemented against this documented real endpoint** after staging verification. S6.3–S6.5 still require photo-before-finalization/atomic attendance contracts and cannot be declared end-to-end complete. PR #2 source is merged to main as `7ad4349`. PR head `4d7bbf4` passed Frontend Build, Cloudflare Workers Compatibility and Secret Scan. Device/browser QA is still pending; S6.1 is not yet end-to-end verified. No Backend or Notion changes.

**S6.2 implementation checkpoint (2026-10-15):** Backend source already exposes non-mutating QR preview, and Frontend now consumes it with explicit CheckIn confirmation. This does **not** change the separate post-check-in photo behavior or finish face detection/photo-before-finalization S6.3–S6.5. PR #4 merged to main as `0ddeeaa`; the exact PR head `49c6006` passed Linux/Windows Frontend Build, Secret Scan and OpenNext Compatibility. Camera/manual and staging Backend verification remain pending.

**S6.3 component checkpoint (2026-10-17):** QR face capture foundation PR #15 adds a consent-gated live-camera preview, native single-face detection with a 2-second target, 400-KiB in-memory JPEG, capability/device fallback errors, cleanup and automated regressions. It is intentionally **not wired into the existing QR Check-In submission yet**; that replacement must be completed in S6.4/S6.5 together with the Backend `qr-with-photo` operation. S6.3 integration and real-device QA remain open. See [S6.3 Face Capture QA](SPRINT-6-S6-3-FACE-CAPTURE-FOUNDATION-QA.md). Native `FaceDetector` support is not guaranteed across browsers.

**S6.4 capture retry checkpoint (2026-10-17):** PR #16 adds retry after no/multiple-face detection in the same camera session, a best-effort 30-second deadline, a restart control, cancellation and event/registration scoped media cleanup, plus regression tests. **This is reusable capture code, not yet wired to the live QR confirmation**. S6.5 remains required to couple validated QR context, JPEG and consent to Backend `qr-with-photo` atomically. See [S6.4 retry QA](SPRINT-6-S6-4-FACE-RETRY-QA.md). Browser/hardware testing remains with the owner.

**S6.5 QR photo finalization checkpoint (2026-10-17):** PR #17 replaces the live QR Check-In mutation with Backend `POST /api/check-ins/qr-with-photo`. Consent, event/registration identity and captured JPEG are required before confirmation. The old QR `POST /check-ins` and post-check-in photo upload were removed from the page; Manual Check-In/Out remain separate. Errors/409/unknown server outcomes require operator review before another scan. [S6.5 QA and backend contract](SPRINT-6-S6-5-ATOMIC-QR-PHOTO-QA.md). This records **FE implementation**, not hardware, cross-browser, backend rollout, or end-to-end acceptance. The native FaceDetector compatibility gap remains a release blocker for unsupported browsers.

## Sprint 7 — FRONTEND manual check-in/out

All tasks require audit of current UI and authoritative Backend search/mutation contracts before new implementation.

- [ ] **S7.1 (FE improvements merged via PR #3; CI green; device QA + Backend prefix contract pending)** Manual participant search now cancels stale queries on input/event/mode changes, shows loading during debounce, and prevents stale cross-event UI rows. Existing API matches case-insensitive **substrings**, not prefixes. QA checklist: [Sprint 7 Frontend QA](SPRINT-7-FRONTEND-QA.md). Keep incomplete until tested and contract reconciled.
- [ ] **S7.2 (FE merged via PR #5; CI green, device QA + Backend query completeness pending)** Show only event-matching `Registered` (`2` or text), `canCheckIn` participants with null Check-In/Out times. Click and submit also check eligibility; Backend remains authority. The existing API limits the first 20 matches *before* FE filtering; full eligible-only server search still needs Backend coordination. See [S7.2 QA](SPRINT-7-S7-2-ELIGIBILITY-QA.md).
- [ ] **S7.3 (FE merged via PR #6; CI passed, staging/device QA pending)** Manual confirmation uses selected eligible registration ID, single-flight lock and validated server response. HTTP 409 clears stale selection and refreshes search without retrying automatically. Manual mode does not trigger face capture; QR photo flow stays unchanged. See [S7.3 QA](SPRINT-7-S7-3-MANUAL-CONFIRMATION-QA.md).
- [ ] **S7.4 (FE merged via PR #7; PR CI green, device/staging QA pending)** Add Manual CheckOut tab using Backend checkout API; display only same-event `canCheckOut` participants with Check-In time and no Check-Out. Validate server-confirmed times/IDs and handle 409 safely. Backend search still limits results to 20 before filtering. See [S7.4 QA](SPRINT-7-S7-4-MANUAL-CHECKOUT-QA.md).
- [ ] **S7.5 (FE merged via PR #8, PR CI passed; staging QA + Backend operator field pending)** Confirm destructive tab changes involving selected registration, QR preview or active scanner; keep last server-confirmed result through mode changes; show genuine checkout timestamps and disclose operator identity unavailable from current Backend DTO. Do not invent operator identity. See [S7.5 QA](SPRINT-7-S7-5-MODE-SWITCH-QA.md).

**S7 checkpoint (2026-10-15):** S7.1 FE cancellation/loading improvements merged as `b475408` in PR #3; exact PR head `b0f9f5f` passed Linux/Windows Frontend Build, OpenNext compatibility build and Secret Scan. Existing Backend search uses case-insensitive **substring**, not the strict **prefix** requirement; manual QA and API contract decision remain outstanding. No Cloudflare deployment or Backend changes were made.

**S7.2 checkpoint (2026-10-15):** Frontend eligibility helper, UI filtering and five test cases added to Linux GitHub Actions. Backend status enum `Registered=2`, but Backend search currently takes 20 registrations before eligibility is known; Frontend must not claim complete query results. PR #5 merged as `0438c63`; exact head `7f8f440` passed Linux/Windows Frontend Build including five eligibility unit tests, OpenNext compatibility and Secret Scan. Manual/staging QA and Backend search completeness remain outstanding.

**S7.3 checkpoint (2026-10-15):** Frontend Manual CheckIn success is now validated against the exact event/registration and server timestamp, HTTP 409 refreshes without automatic duplicate mutation, and face photo only runs for the existing QR flow. PR #6 merged to main as `dc151d5`; exact PR head `a029f0e` passed Linux/Windows Frontend Build including ten manual attendance tests, OpenNext compatibility and Secret Scan. Browser and staging QA still pending. No Backend/Notion/deployment changes.

**S7.4 checkpoint (2026-10-15):** Manual CheckOut UI, existing real Checkout endpoint integration, event-scope eligibility, 409 refresh, and five tests were authored. PR #7 merged to main as `ae50d01`; exact PR head `0f8b9f7` passed Linux/Windows Frontend Build with 15 manual attendance tests, OpenNext compatibility and Secret Scan. Browser/staging QA remain pending. S7.5 still owns enhanced mode-switch UX/operator metadata; Backend checkout DTO currently has no actor field.

**S7.5 checkpoint (2026-10-15):** A pending-operation mode-switch confirmation dialog and verified Checkout result display are implemented on the FE feature branch, with five new focused tests. The current Backend `CheckOutResponse` provides server Check-In/Check-Out timestamps but no operator identity; S7.5 operator attribution is blocked by a documented Backend contract. PR #8 merged as `ee827fb`; exact head `aef01e8` passed Linux/Windows Frontend Build with 20 manual attendance tests, OpenNext compatibility and Secret Scan. Manual device/staging QA and Backend actor field remain outstanding. Do not equate source merged with E2E acceptance.

## Sprint 8 — FRONTEND attendance list and monitoring

- **S8.1 (BE):** Backend provides event-scoped attendance list with pagination and `attendance.read` permission. FE does not implement the API.
- [ ] **S8.2 (FE foundation merged PR #9; CI passed, staging/device QA + full Backend S8.1 API pending)** Event-scoped server-paginated attendance table and mobile cards using existing registration-list endpoint, with authoritative check-in time and database metrics. Method, checkout time, operator, private photo are explicitly unavailable from the current DTO. See [S8.2 QA & Backend handoff](SPRINT-8-S8-2-ATTENDANCE-LIST-QA.md).
- [ ] **S8.3 (supported FE filters merged PR #10, CI passed; device QA + Backend status/method/date API pending)** URL-backed search, participant type, event package, sort/direction, server pagination, debounce and Back/Forward support. Unsupported status/method/date filters are not simulated on a paginated subset. See [S8.3 QA / Backend handoff](SPRINT-8-S8-3-FILTERS-QA.md).
- [ ] **S8.4 (FE)** Safe private-photo preview through Backend-authorized URL/proxy (no embedded permanent public URL or secrets); graceful forbidden/expired state.
- [ ] **S8.5 (FE slice)** Refresh status and statistics consistently with Backend-provided counts, avoid guessed client aggregation from a paginated page.

**S8.2 checkpoint (2026-10-15):** Frontend added a route `/admin/events/{eventId}/attendance`, permission-gated dashboard link, real server pagination and metrics, responsive list, five contract regression tests. Backend S8.1 dedicated attendance list is still missing. Source does not expose method, actor, photo or checkout timestamp. PR #9 merged to main as `fceea6c`; exact head `d1ea14c` passed Linux/Windows Frontend Build, all 25 attendance regression tests, OpenNext compatibility and Secret Scan. Staging/device QA still pending; do not claim full S8.2 acceptance.

**S8.3 checkpoint (2026-10-15):** Frontend filters now use only the existing Backend `RegistrationListQueryRequest` contract (search, participantType, eventPackageId, sort, direction, pagination) with shareable query state and six new regressions. Attendance status/method/date filters await Backend S8.1; PR #10 merged into main as `c97eb14`; exact PR head `47c0a3c` passed Linux/Windows Build with 31 attendance regression tests, OpenNext compatibility and Secret Scan. Device/staging QA remains outstanding.

### S8.3-B code handoff (2026-10-17)

The frontend Attendance view was migrated in PR #12 to the dedicated event-scoped attendance client (`syberke/EO-Backend`), with `attendance.read` authorization, real Check-In/Out timestamps, operator names, method and status filters. The old registration-list code is intentionally retained for its other callers. `bookingCode` sorting is no longer sent to the dedicated attendance endpoint. Details: [S8.3-B integration QA](SPRINT-8-S8-3-UI-INTEGRATION-QA.md). CI/source merge and staging acceptance must be recorded separately. S8.4/S8.5 and Sprint 6 camera integration remain outstanding.

### Sprint 8 status reconciliation (2026-10-17)

The earlier S8.2/S8.3 rows above describe their **original 15 October checkpoints**, not the current implementation:
- **S8.2 + S8.3:** dedicated `syberke/EO-Backend` attendance API, scoped permissions, server filters and real actor/Check-Out fields were added in PRs #11–#12; source merged, staging QA still open.
- **S8.4:** private authenticated JPEG preview source merged in PR #13, with Linux/Windows/OpenNext/Secret Scan green; manual browser/privacy QA still open. [QA](SPRINT-8-S8-4-PRIVATE-PHOTO-QA.md).
- **S8.5:** the per-event server-backed attendance list/metrics refresh and cross-tab notification are being implemented in PR #14. Status is **PR/CI review pending**, not live verified. [QA](SPRINT-8-S8-5-ATTENDANCE-REFRESH-QA.md).
- Release gate: do **not** treat completed code as camera device verification, backend staging migration, production deployment or authorization E2E acceptance.

## Sprint 9 — FRONTEND workspace + final release verification

- [ ] **S9.1** Event Workspace sidebar only exposes selected/authorized event sections.
- [ ] **S9.2** `Check-in & Out` and `List Attendance` menu entries follow effective permission; `Settings` remains last.
- [ ] **S9.3** Cross-browser, desktop/mobile, camera permissions, focus/accessibility and responsive regression.
- [ ] **S9.4 (FE slice)** Full end-to-end against staging Backend: Admin → Admin Kecil → subordinate, QR preview/photo/finalize, manual, checkout, list, forged event ID, revoked permissions.
- [ ] **S9.5 (FE slice)** Next/Cloudflare build, config, environment, deployment preview, rollback and live smoke; Backend team separately signs off DB migration/storage/retention before production.

### Sprint 9 implementation checkpoints (2026-10-17)

- **S9.1 code merged:** [PR #18](https://github.com/SayHub-GIT/EO-Frontend/pull/18), authorized and enabled Event Workspace sidebar items. [QA](SPRINT-9-S9-1-WORKSPACE-SIDEBAR-QA.md).
- **S9.2 code merged:** [PR #19](https://github.com/SayHub-GIT/EO-Frontend/pull/19), commit `4f2b99c`, splits `Check-in & Out` (checkin/checkout) from `List Attendance` (read + event), for vertical/horizontal navigation, and places Settings last. [QA](SPRINT-9-S9-2-ATTENDANCE-NAVIGATION-QA.md).
- **S9.3-A in review:** camera visibility safety, QR keyboard focus, screen reader status, and mobile tab/preview adjustments; [QA](SPRINT-9-S9-3-A-CAMERA-A11Y-QA.md). Native FaceDetector cross-browser support and actual device validation remain **open**.
- **Pending acceptance:** S9.3 device/browser coverage, S9.4–S9.5 and manual/staging validation of S9.1/S9.2. Do not treat CI as live RBAC E2E acceptance.

## Contract handoff / independent development rules

1. **Ownership**: FE changes only `SayHub-GIT/EO-Frontend`; Backend team changes only `ptcpkl/EO-backend`. No blind cherry-picks or mirror `push --mirror` once the repositories begin diverging. Original `ptcpkl/EO-Frontend` remains historical/deployment copy; sync `main` via reviewed ordinary push/PR after CI, if needed.
2. **API source of truth**: Backend Swagger/OpenAPI + DTOs. Before starting a dependent FE task, agree on route/method, event-scoped authorization, request/response shapes, errors, timestamps/timezone, pagination, signed photo URL expiry, idempotency/retry and rollout status. Do not use guessed URLs in production FE.
3. **Mocking**: Fixtures are explicitly labeled mocked/stubbed and tested alongside real permission-denied and empty/error states. Mock success does not mark integration complete.
4. **RBAC**: UI hides/disables controls for usability, but Backend must reject unauthorized operations; verify both. FE must not write to DB, issue secrets, or bypass auth.
5. **CI/QA**: A task is `implemented` when code is merged; `verified` only after current repository CI and manual/integration tests pass. GitHub Actions on old owner had runner allocation failures; new owner must be validated independently. Use scoped branches + small PRs; do not touch Notion.
6. **UI standard**: existing Vuexy/MUI and `.agents/skills/antislop*` rules, no generic AI-looking redesign; preserve existing modules outside scope.
7. **Change request**: if FE discovers a missing/mismatched endpoint, record a Backend request with repro, expected contract and acceptance test. Do **not** silently modify Backend source; unblock FE with a typed fixture if safe.

## Proposed execution order for FE owner

**First:** establish SayHub GitHub Actions health and verify S4 (build + owner QA). **Next:** audit existing check-in UI and perform S6.1 screen/flow improvements against real/fixture contracts. Then S6.2–S6.5 after BE S5 contracts; S7, S8 and S9 in narrow batches, with explicit blocked/unblocked flags and no fictional completion percentages.

This document is forward-looking for S5–S9. It does **not** assert that existing attendance code has no implementation; audit current `main` before creating duplicates.
