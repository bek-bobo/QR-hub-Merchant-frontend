# QRHub Merchant Frontend

React and TypeScript SPA for the QRHub merchant interface, built with Vite,
Tailwind CSS and shadcn/Radix components. Live routes use authenticated API
access and permission gates. Synthetic demo data is isolated to development.

## Setup

Use Node.js 24 (see `.nvmrc`). From the project directory:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Edit `.env.local` for the intended environment. The example selects development
demo mode and leaves API URLs empty. Set `VITE_APP_MODE=live` to exercise live
integration locally. Environment values are supplied at build time; rebuild
after changing deployment configuration. Do not put secrets in `VITE_*` values,
which are included in client code.

## Environment

| Variable | Purpose | Requirement and behavior when absent |
|---|---|---|
| `VITE_APP_MODE` | Selects `demo` or `live` during development. | Optional. Only exact `demo` in development enables demo mode; absent or other values select live. Production always selects live. |
| `VITE_AUTH_API_BASE_URL` | Base URL for the authentication API. | Required for live startup. Missing/invalid URL causes the integration-unavailable page. |
| `VITE_WEB_API_BASE_URL` | Base URL for merchant feature APIs. | Optional for auth/account startup; required for merchant API features. Missing/invalid URL marks those integrations unavailable and prevents their live requests. |
| `VITE_DYNAMIC_QR_STATS_ENABLED` | Enables the optional Dynamic QR aggregate stats query. | Optional; disabled unless the value is exactly `true`. Permission, valid date/filter evidence and query readiness gates still apply. |

API base URLs must use HTTPS in production. Development also permits HTTP for
`localhost` and `127.0.0.1`. Embedded credentials, query strings and fragments
are rejected. Use the service base URL, without an individual endpoint path.

## Live and development boundaries

With a valid auth URL and the registered verified auth contract, `LiveRoot`
mounts the query, auth and read providers and live router. Session restoration
and permission gates determine which routes become available; valid
configuration does not bypass login or access checks. A valid web API URL
enables merchant integrations subject to those same gates.

Missing/invalid auth configuration, or an unavailable auth contract
registration, fails closed to the integration-unavailable page. Missing/invalid
web configuration leaves auth/account startup available while merchant
integrations show their unavailable state. Neither condition substitutes demo
data into live mode.

Demo mode loads `DemoRoot` only when Vite is running in development and
`VITE_APP_MODE=demo`. Production builds and `npm run preview` always use live
mode, even if demo was requested. A configured production preview can therefore
show the live frontend; it is not required to show the unavailable page.

The approved auth implementation persists access/refresh tokens and expiry
metadata in browser localStorage for session restoration. Auth ownership uses
the browser's Web Locks API; restoration/login fails closed when that mechanism
is unavailable or another tab owns the session. Route/import failures show a
safe recovery page with an explicit reload button; they do not automatically
log the user out.

## Validation and production preview

```powershell
npm run lint
npm run typecheck
npm test -- --reporter=dot
npm run build
npm run preview
```

TypeScript strict mode is enforced for application and tooling configuration.
The production build writes `dist`; preview serves that build locally. Set
deployment environment variables before building. `vercel.json` rewrites SPA
navigation to `index.html` so direct route navigation reaches the client router.

For deeper architecture and historical handoffs, see `docs/` and
`QRHUB_FRONTEND_CODE_AUDIT.md`.
