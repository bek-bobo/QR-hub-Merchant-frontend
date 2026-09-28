# Auth Session Decision

**Status:** Accepted for frontend implementation planning  
**Scope:** QRHub Merchant frontend architecture  
**Decision date:** 2026-09-14

## Context

The merchant frontend is a browser SPA. Day 02 needs a fail-closed session
boundary without inventing a server-side session layer or treating browser
storage as proof of identity. This record is a frontend architecture decision,
not a statement that the backend mandates these storage or tab-coordination
choices.

## Decision

- Use a direct SPA-to-API integration with `Authorization: Bearer <accessToken>`.
- Keep the access token and refresh token in JavaScript RAM only.
- Keep the login session key and OTP ID in RAM only.
- A page reload, browser close, renderer loss, or unrecoverable auth-tab loss
  ends the frontend session and requires login again.
- Persist only the generated device UUID, under the exact localStorage key
  `qrhub.device-key.v1`.
- The device UUID is a stable client identifier only. It is neither
  authentication proof nor permission/authorization proof.
- Permit one active auth tab per origin. Coordinate ownership with the Web
  Locks API; a tab that cannot acquire the auth lock must fail closed instead
  of starting an independent token lifecycle.
- Do not introduce a BFF.
- Do not assume cookie authentication or a server-managed browser session.
- Never persist access tokens, refresh tokens, login session keys, OTP IDs, or
  authenticated user data in `localStorage` or `sessionStorage`.
- Keep TanStack Query cache in RAM. On logout, expired/invalid session reset, or
  any transition back to anonymous state, clear auth-scoped cached server data.
- Treat every `VITE_*` value as public build-time/browser-visible
  configuration, never as a secret.

## Security consequences

RAM-only credentials reduce persistence after reload and avoid intentionally
placing bearer credentials in browser storage. Single-tab ownership reduces
refresh-token races and divergent auth state. These choices do not eliminate
XSS: script executing in the authenticated page can still access in-memory
credentials and act with the user's session. CSP, dependency hygiene, output
encoding, input handling, and normal browser security hardening remain required.

## Non-decisions

This record does not define backend token semantics, endpoint payloads, enum
serialization, runtime authority strings, deployed URLs, CORS policy, or error
responses. Their current evidence status is recorded in
`docs/contracts/AUTH_CONTRACT_STATUS.md`.

## Implementation mapping

- Device identifier and auth-tab ownership are implemented in
  `src/shared/auth/device-lease.ts`.
- The only persisted auth-related value is the device UUID under the exact
  localStorage key `qrhub.device-key.v1`.
- Single-tab auth ownership uses the exact exclusive Web Lock name
  `qrhub:auth-owner:v1` with `ifAvailable: true`.
- Live auth fails closed when the Web Locks API, secure UUID generation, or
  device storage is unavailable. There is no fallback lock or storage.
- Private RAM session lifecycle is implemented in
  `src/shared/auth/session-controller.ts`. Token pairs are replaced atomically;
  `authEpoch` and `tokenRevision` reject stale async results.
- A session remains `bootstrapping` until `get-me` supplies a valid profile and
  never exposes tokens through its public snapshot.
- Access refresh is request-driven, single-flight per epoch/revision, and has
  no background timer or automatic refresh retry.
- Logout is local-first and remote best-effort. Logout, reset, terminal refresh
  failure, and session replacement cancel auth work and clear injected
  auth-scoped cache state.
- Auth-tab lease ownership transfers from the login flow into the session
  controller and is released on logout completion, reset, terminal auth
  failure, replacement, or disposal.
- Login and PIN-reset state orchestration is implemented in
  `src/shared/auth/login-controller.ts`; session creation begins only from an
  explicit user action and is protected by a controller-level pending guard.
- Login and reset endpoint branches remain distinct. Successful set-PIN and
  reset-set-PIN responses return to PIN entry and do not authenticate.
- Only check-PIN `done` transfers the owned auth-tab lease and token pair to the
  session controller; private UI remains governed by session `get-me`
  bootstrap, not by login-controller completion.
- Restart, flow switching, disposal, and lease transfer invalidate prior login
  responses so stale POST results cannot advance the current stage.
- Live React composition is implemented by `AuthProvider`/`useAuth`; its public
  context exposes only token-free session/login snapshots and actions. Provider
  cleanup disposes the login controller, session controller, and device lease.
- `LiveRoot` uses the fail-closed auth factory before mounting the provider or
  live router. An invalid/missing auth base or unverified production wire
  contract renders the integration-unavailable boundary with no auth request.
- Session cache cleanup is connected to TanStack Query through the live-only
  key namespace `['live', sessionScopeId, feature, ...]`; credentials and phone
  values are not query-key material.
- The separate live router exposes only `/login`, `/account`, `/403`, and the
  not-found boundary. The account route requires authenticated state plus
  `profile.read`; absent verified authority mapping therefore denies access.
- Profile refresh stays inside `SessionController`, replaces the complete
  profile snapshot, clears live private cache when identity or permission data
  changes, and drops prior grants on a 403 response.
- Development demo mode exposes a lazy `/dev/auth` manual verification surface
  backed by a normalized in-memory `AuthApi` and the real login/session
  controllers. It never uses the HTTP transport or production decoder.
- Auth preview ownership and persistence use only
  `qrhub:auth-preview-owner:v1` and `qrhub.preview-device-key.v1`; preview cache
  cleanup is restricted to the `auth-preview` query namespace.
- Refresh preview controls require the user to complete check-PIN and get-me
  bootstrap manually. Scenario selection never creates an authenticated
  baseline, and preview access remains an explicit demo source rather than a
  live authority grant.
- The auth preview module is lazy-loaded only from the development demo router;
  `LiveRoot` has no dependency on the simulator or preview UI.
