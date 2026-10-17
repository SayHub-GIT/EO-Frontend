# Sprint 9 — S9.5-A No-replay attendance writes / release gate

**FE repository:** `SayHub-GIT/EO-Frontend`  
**BE reference (read-only):** `syberke/EO-Backend`  
**Status:** code and simulated regression only; staging and production sign-off **pending**.

## Release-critical defect and code repair

The shared `authFetch` client traditionally performs an automatic session refresh **and resends the same HTTP request** after receiving 401. That behavior is useful for read-only requests, but should not be used for irreversible attendance writes: a `POST` for Check-In, Check-Out, or a private JPEG must not be blindly replayed.

- [x] Added `authFetch(path, init, { retryOn401: false })` policy and a testable request orchestrator. Existing calls continue to use the prior refresh/retry behavior unless explicitly opted out.
- [x] The QR + JPEG `POST /api/check-ins/qr-with-photo` opts out. No second HTTP request is issued after an initial 401.
- [x] Manual `POST /api/check-ins/manual`, `POST /api/check-ins/{registrationId}/checkout`, legacy QR `POST /api/check-ins` and private JPEG `POST /api/check-ins/{registrationId}/photo` also opt out.
- [x] Read-only `POST /api/check-ins/preview` keeps the default session-refresh policy.
- [x] New simulated transport tests verify one HTTP request for a 401 non-replay mutation, unchanged refresh for reads, at most one retry for default requests, no replay on 409/5xx, and error propagation.
- [x] Check-In UI continues to block a second QR scan following uncertain finalization and directs the operator to inspect authoritative Attendance records.

**Tradeoff:** a 401 may require reauthentication before a subsequent intentional user action. The operator must verify the existing attendance record before attempting another irreversible write. A backend-authorized 401 normally rejects before mutation, but neither client logic nor a passing unit test constitutes distributed idempotency.

## Before deploy — owner checklist

- [ ] Confirm which frontend is live (Cloudflare Workers OpenNext vs Pages) and which GitHub repository/branch drives that deployment. This repository contains `wrangler.jsonc`, `open-next.config.ts` and `deploy/cloudflare/{build-worker,deploy-worker}.sh`; **do not assume** deploying GitHub `main` updates the live site.
- [ ] Verify `NEXT_PUBLIC_API_URL` matches the intended HTTPS backend base path including `/api`, and `NEXT_PUBLIC_APP_URL` matches the public origin. Environment values for `NEXT_PUBLIC_MIDTRANS_*` must match the target environment. Never commit actual keys or copy production credentials into CI.
- [ ] Verify Cloudflare Access/Zero Trust policy, API CORS and cookie/refresh paths using the intended FE and BE domains. Keep Admin Kecil/staff event isolation active.
- [ ] Run Linux TypeScript + tests + Next production build, Windows dependency recovery and OpenNext compatibility on the **exact release commit**. Secret Scan must pass.
- [ ] Backend owner confirms schema migrations, private photo storage, retention/consent policy, `qr-with-photo` deployment and current authorization rules. Do not infer these are deployed from repo source.
- [ ] Record the FE release SHA, BE release SHA, deployment identifier, config fingerprint (redacted), operator and acceptance timestamp before promotion.

## Staging verification — owner

- [ ] Global Admin and Admin Kecil with staff accounts: Check-In only, Check-Out only, read-only, revoked permission, unassigned and mismatched event.
- [ ] Scanned QR preview is read-only; consent + detected live face are required before submitting multipart QR + JPEG once. Verify authorized private image preview and server metrics.
- [ ] Manual Check-In and Check-Out use the operation-specific searches, validate response IDs/event/time and refresh server attendance.
- [ ] Confirm the 401 handling using a controlled staging session: exactly **one** attendance mutation HTTP request appears in the browser network panel, no automatic replay after 401. Check 403, 409, 408, 500/503, network interruption and malformed success; require manual review when outcome is uncertain.
- [ ] Simultaneous operator Check-In, repeat QR, stale preview, hidden tab, camera denied, face not detected, unsupported native FaceDetector and 320px mobile.
- [ ] Test on real HTTPS devices: supported desktop and mobile browsers. Document FaceDetector compatibility and supported-device policy before production; never bypass photo validation to force a successful QR Check-In.

## Release / rollback — owner

- [ ] Keep the last known-good frontend deployment available. Promote the validated immutable build/SHA only after staging acceptance; avoid simultaneous unrelated Backend and FE rollout.
- [ ] After promotion, check application load, authentication/refresh, event workspace, event pages, QR preview + private photo, manual Check-In/Out, Attendance totals, failed/denied requests and Cloudflare Access.
- [ ] Watch error rates/logs without logging QR tokens, JPEG contents, session secrets or participant face data.
- [ ] If regression occurs, stop new Check-In operations if integrity cannot be guaranteed, reconcile pending/uncertain transactions on the Backend, and **roll back only the FE build** to its last known-good deployment. Do not attempt DB schema rollback or delete attendance/photo records as part of frontend rollback.
- [ ] Repeat smoke tests after rollback, document discrepancies, and escalate backend migration/storage rollback separately.

## Acceptance status

Source + CI can mark **S9.5-A implementation complete** after merge. S9.3 browser/device acceptance, S9.4 live staging E2E, and full S9.5 production release verification are **not complete** until the owner records external acceptance evidence.
