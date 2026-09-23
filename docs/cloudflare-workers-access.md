# Private Cloudflare deployment — EO Frontend

This is a second deployment path. Keep Vercel available as a rollback target until
the Cloudflare Worker, Access policies, API Tunnel, and real-device Quiz flow have
all passed acceptance.

## Target architecture

```text
Browser
  |
  | Cloudflare Access login
  v
https://eo.example.com
Cloudflare Worker / OpenNext
  |
  | browser: CF_Authorization cookie
  | server-rendered requests: Access Service Token
  v
https://api.eo.example.com
Cloudflare Access
  |
  v
Cloudflare Tunnel
  |
  v
127.0.0.1:5000 on Ubuntu
  |
  v
EO.Api Docker container
```

The frontend stays on Next.js 15.5.x. Cloudflare is built with a pinned
OpenNext adapter instead of upgrading the application framework during the
deployment migration.

## Repository build

Normal Vercel and GitHub builds remain unchanged.

Cloudflare build:

```bash
NEXT_PUBLIC_API_URL=https://api.eo.example.com/api \
  bash deploy/cloudflare/build-worker.sh
```

Manual deploy after authenticating Wrangler:

```bash
NEXT_PUBLIC_API_URL=https://api.eo.example.com/api \
  bash deploy/cloudflare/deploy-worker.sh
```

The build script installs only its pinned deployment tooling with
`--no-save --package-lock=false`, so it does not rewrite the project's
package.json/package-lock.json.

## Cloudflare Worker build variables

For a Git-connected Workers Build, configure:

```text
Build command:
bash deploy/cloudflare/build-worker.sh

NEXT_PUBLIC_API_URL=https://api.eo.example.com/api
```

Do not expose Access service-token credentials as `NEXT_PUBLIC_*`.

Set these as Worker runtime secrets:

```text
CF_ACCESS_CLIENT_ID
CF_ACCESS_CLIENT_SECRET
```

They are used only for server-side Next.js requests to the Access-protected
API. Browser requests use the user's Access cookie instead.

## Access layout

Before go-live, use real hostnames from a Cloudflare-managed domain.

Protected user-facing hostnames:

```text
eo.example.com
api.eo.example.com
```

Use the same Allow policy for both (for example, approved email addresses or
an approved company email domain). Enable One-Time PIN if no corporate IdP is
connected.

The API application also needs a Service Auth policy that accepts the service
token stored in the Worker secrets.

For browser requests across the two hostnames, enable the Access cookie option
that eagerly issues authorization cookies to the application's configured
domains. The application already sends cross-origin API requests with
credentials.

### Midtrans webhook exception

Do not make the entire API public.

Create a more-specific Access application for only:

```text
api.eo.example.com/api/payments/midtrans/webhook
```

and apply a narrowly-scoped Bypass policy for Everyone to that exact webhook
path. Cloudflare evaluates the more-specific application path before the
broader API application.

## workers.dev must not remain an unprotected bypass

During bootstrap, the generated `workers.dev` URL can be used for a temporary
test only if it is protected with Access.

Before production acceptance, disable the Worker's `workers.dev` route in
Workers & Pages once the custom domain is working. Do not rely on an obscure
workers.dev URL for privacy.

## Final environment consistency

Backend root `.env`:

```env
Frontend__Origins__0=https://eo.example.com
RegistrationFlow__FrontendBaseUrl=https://eo.example.com
QuizRooms__FrontendBaseUrl=https://eo.example.com
```

Cloudflare Worker build:

```env
NEXT_PUBLIC_API_URL=https://api.eo.example.com/api
```

The values must use the exact final hostnames and HTTPS.

## Acceptance

Do not remove Vercel until all of these pass:

1. Unauthenticated browser is redirected to Access.
2. Unauthorized email cannot enter.
3. Allowed user can enter using OTP/IdP.
4. `/api/version` reports the expected frontend commit.
5. Public event data loads after Access authentication.
6. Admin login/refresh/logout work.
7. Host Quiz page connects to SignalR.
8. Phone 1 joins by QR.
9. Phone 2 joins by PIN.
10. Both participants answer through final podium.
11. Refresh/reconnect works.
12. Midtrans webhook remains reachable without an Access browser session.
13. The Worker's direct workers.dev route is disabled or separately protected.
