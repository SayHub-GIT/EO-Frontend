# Sprint 9 — S9.5-B Cloudflare release preflight and sign-off

**Repository:** `SayHub-GIT/EO-Frontend`  
**Scope:** Frontend release validation and operator handoff. Does not deploy or modify Backend/Notion.

## Fixed release risk

The Next.js/OpenNext compatibility workflows use `NEXT_PUBLIC_API_URL=https://api.example.invalid/api` as a **safe build fixture**. A successful CI build proves source compilation, **not** that the Worker points to a usable API. Previously `deploy/cloudflare/deploy-worker.sh` only ran the generic Worker build and deploy commands; its validation did not reject the placeholder backend or require the public frontend origin.

A strict preflight now runs **before** the build/deploy commands. It validates environment values and exits nonzero with field-only error messages (not credential values).

## Production preflight contract

- `NEXT_PUBLIC_API_URL` **required**: absolute HTTPS URL with exactly the `/api` path (optional trailing slash), publicly routable hostname, no username/password, query or fragment. No loopback, private-network IP, reserved test/example domain, or `api.example.invalid`.
- `NEXT_PUBLIC_APP_URL` **required**: absolute HTTPS frontend origin, no additional path/query/fragment or credentials; rejects local/private/example URLs.
- Cloudflare Access service-token environment variables `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET` are **server-only** and must be set together if used. Empty pair is allowed where the deployment does not need a service token.
- Secret-like nonempty `NEXT_PUBLIC_*SECRET`, `NEXT_PUBLIC_*PASSWORD`, `NEXT_PUBLIC_*PRIVATE_KEY`, or `NEXT_PUBLIC_*ACCESS_TOKEN` environment variables are rejected. These prefixes are client-visible and must never hold private credentials.
- `.env.example` documents the two server-only Cloudflare Access variables. Never commit real values.
- `scripts/test-release-config.test.mjs` tests passing and failing configurations, CLI output redaction, and preflight ordering; both Linux and Cloudflare compatibility pipelines run these tests.
- Existing CI fixture URLs remain isolated to **nondeploy** build jobs, which never invoke the strict production deployment command.

## Local/operator commands

Before an approved production deployment, provide correctly scoped variables to the shell/Cloudflare configuration without committing secrets:

```bash
node scripts/validate-release-config.mjs
bash deploy/cloudflare/build-worker.sh
```

Once the **staging E2E and change approval are signed off**, a human operator may run:

```bash
bash deploy/cloudflare/deploy-worker.sh
```

The deploy script validates the environment again before building and deploying.

## Unverified gates — must remain open

- [ ] Establish which deployment target actually serves the application (Cloudflare Worker vs Pages), the GitHub repo/branch mapped to it, its custom domain and Access policy. The supplied script targets **Workers OpenNext**, not a generic Pages upload.
- [ ] Verify both public HTTPS origins, CORS, cookies/refresh and relevant Cloudflare Access service-token policy using real staging values (do not post credentials to the repository or tests).
- [ ] Confirm CI green on the **exact release SHA**, including Linux build + tests, Windows recovery, OpenNext compatibility and Secret Scan. CI does not check runtime secrets or production DNS.
- [ ] Run staging E2E with Global Admin, Admin Kecil, staff, revoked access, unauthorized event IDs, full QR/face capture and private photo, manual Check-In/Out, metrics and failure recovery; record results.
- [ ] Test real browsers/mobile/camera and document unsupported native `FaceDetector` cases; never bypass the photo-required policy to obtain artificial success.
- [ ] Backend owner signs off on schema migrations, photo private storage and retention, `qr-with-photo` live contract, authorization rules and operational recovery.
- [ ] Record approved FE and BE release SHAs, redacted environment fingerprint, staging evidence, timestamp, operator and rollback target.
- [ ] Run production smoke and verify Cloudflare Worker logs, 401/403/409, attendance consistency, private photo authorization and navigation before announcing release ready.

## Rollback

Retain the previous proven Worker deployment. If postrelease behavior fails, suspend unsafe attendance operations and reconcile uncertain transactions on the Backend. Revert the FE Worker to the previous known-good immutable deployment through the operator's approved Cloudflare workflow. Do **not** delete private photos or roll back DB migrations as a side effect of frontend rollback.

**Status:** S9.5-B code can be merged on CI success. **Live release, real browser/camera acceptance, staging E2E and rollback drill are not established by code tests.**
