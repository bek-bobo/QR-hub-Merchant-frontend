# D2.5 Dev Auth Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a development-only `/dev/auth` manual verification surface that drives the real login and session controllers through normalized synthetic scenarios without contacting a backend.

**Architecture:** A dev-only simulator implements `AuthApi`, a controlled clock, refresh deferreds, and a preview-namespaced Web Lock lease. A dev-only runtime composes those dependencies with the real `LoginController` and `SessionController`; the React page projects only safe snapshots/actions into the shared auth context and exposes lifecycle controls.

**Tech Stack:** React 19, TypeScript 6, React Router 8, TanStack Query 5, Web Locks API, existing QRHub auth controllers.

**Spec:** `docs/superpowers/specs/2026-09-14-d2-5-dev-auth-simulator-design.md`

## Global Constraints

- Do not run npm, npx, lint, typecheck, test, build, dev server, backend, Maven, Docker, or real API commands.
- Do not add unit tests; focused tests are D2.6.
- Do not change `verifiedAuthorityMap`, production auth decoding, or Day 03 APIs.
- Keep `LiveRoot` free of every `src/dev/auth` import.
- Keep synthetic tokens, refresh tokens, session keys, OTP IDs, PINs, and OTPs out of UI, logs, storage, context, and query keys.
- Use exact preview names `qrhub:auth-preview-owner:v1` and `qrhub.preview-device-key.v1`; never touch the production auth namespaces.
- Keep the exact simulator marker `AUTH-DEMO-ONLY`.

---

### Task 1: Safe demo auth-context discriminator

**Files:**
- Modify: `src/shared/auth/useAuth.ts`

**Interfaces:**
- Consumes: existing `AuthContextValue` used by `AuthProvider`, `LoginPage`, and live routing.
- Produces: `AuthSource = 'live' | 'demo'` while preserving `AuthProvider`'s literal `source: 'live'`.

- [ ] Change only the source type:

```ts
export type AuthSource = 'live' | 'demo'

export interface AuthContextValue {
  readonly source: AuthSource
  // existing safe fields remain unchanged
}
```

- [ ] Read back `AuthProvider.tsx` and confirm it still emits `source: 'live'` and no live access behavior changes.

### Task 2: Preview-only Web Lock lease

**Files:**
- Create: `src/dev/auth/preview-device-lease.ts`

**Interfaces:**
- Consumes: `LoginOwnerLease` and `AuthDeviceLeaseResult`.
- Produces: `createPreviewAuthDeviceLease(): PreviewAuthDeviceLease`, `PREVIEW_AUTH_OWNER_LOCK_NAME`, and `PREVIEW_DEVICE_KEY_STORAGE_KEY`.

- [ ] Implement exact constants:

```ts
export const PREVIEW_AUTH_OWNER_LOCK_NAME = 'qrhub:auth-preview-owner:v1'
export const PREVIEW_DEVICE_KEY_STORAGE_KEY = 'qrhub.preview-device-key.v1'
```

- [ ] Implement a private deferred lock lifetime and idempotent `acquire()`, `release()`, and `dispose()` methods.
- [ ] Enforce acquisition order: feature detection → `navigator.locks.request(..., { mode: 'exclusive', ifAvailable: true })` → non-null ownership → preview localStorage read/validate/create.
- [ ] Return the existing safe busy message when the lock is unavailable; do not read storage in that branch.
- [ ] Use `crypto.randomUUID()` only inside the owned-lock callback and persist only the preview UUID.
- [ ] Read back the file and confirm neither production namespace string appears.

### Task 3: Normalized scenario simulator

**Files:**
- Create: `src/dev/auth/auth-simulator.ts`

**Interfaces:**
- Consumes: `AuthApi`, normalized auth models, safe error factories, and injected clock.
- Produces:

```ts
export type AuthPreviewScenario =
  | 'first-login'
  | 'existing-pin'
  | 'known-device'
  | 'reset-pin'
  | 'wrong-otp'
  | 'wrong-pin'
  | 'otp-expired'
  | 'device-blocked'
  | 'unknown-stage'
  | 'profile-403'
  | 'refresh-success'
  | 'refresh-failure'

export interface AuthSimulatorSnapshot {
  readonly refreshCalls: number
  readonly getMeCalls: number
  readonly logoutCalls: number
  readonly refreshPending: boolean
}

export interface AuthSimulator {
  readonly api: AuthApi
  getSnapshot(): AuthSimulatorSnapshot
  subscribe(listener: () => void): () => void
  waitForRefreshStart(): Promise<void>
  settleRefresh(): void
  dispose(): void
}
```

- [ ] Put `export const AUTH_DEMO_ONLY_MARKER = 'AUTH-DEMO-ONLY'` in the simulator.
- [ ] Implement request-abort checks for ordinary simulated methods and keep refresh controllable until `settleRefresh()` or disposal.
- [ ] Implement normalized stage sequences:

```text
first-login: phone -> otp -> set-pin -> pin -> done -> get-me
existing-pin: phone -> otp -> pin -> done -> get-me
known-device: phone -> pin -> done -> get-me
reset-pin: phone -> pin -> reset-otp -> set-pin -> pin -> done -> get-me
```

- [ ] Return no token from set-PIN/reset-set-PIN; return an opaque non-JWT token pair only from successful check-PIN.
- [ ] Accept every format-valid secret in success scenarios without rendering a canonical secret.
- [ ] Reject only the first relevant valid submission for wrong-OTP/wrong-PIN using `safeBusinessError`; allow the next manual submission.
- [ ] Implement blocked device with `DEVICE_BLOCKED`, profile denial with `safeHttpError(403)`, and unknown stage with a type-valid but transition-invalid normalized stage.
- [ ] Implement refresh success/failure as a single controlled deferred and expose safe counters only.
- [ ] Ensure `dispose()` invalidates the simulator revision, settles pending deferred work safely, and clears listeners.

### Task 4: Real-controller preview runtime

**Files:**
- Create: `src/dev/auth/auth-preview-runtime.ts`

**Interfaces:**
- Consumes: `AuthSimulator`, `PreviewAuthDeviceLease`, `LoginController`, `SessionController`, and an injected `SessionCache`.
- Produces:

```ts
export interface AuthPreviewRuntimeSnapshot {
  readonly login: LoginSnapshot
  readonly session: SessionSnapshot
  readonly simulator: AuthSimulatorSnapshot
  readonly protectedReadCalls: number
  readonly controlPending: boolean
  readonly statusMessage: string | null
}

export interface AuthPreviewRuntime {
  getSnapshot(): AuthPreviewRuntimeSnapshot
  subscribe(listener: () => void): () => void
  getAuthContextValue(): AuthContextValue
  expireOtpNow(): void
  runParallelProtectedReads(): Promise<void>
  runLogoutDuringRefresh(): Promise<void>
  logout(): Promise<void>
  restartLogin(): void
  dispose(): Promise<void>
}
```

- [ ] Create one real login controller and one real session controller per runtime.
- [ ] Inject a mutable preview clock into both controllers; use one-minute synthetic access TTL and advance the clock into the refresh threshold only when a refresh control is invoked.
- [ ] Build a token-free `source: 'demo'` auth context value whose actions delegate to the real controllers.
- [ ] Keep preview access separate: React will receive `{ kind: 'demo', grants: new Set() }`, never `{ kind: 'authenticated', permissions: ... }`.
- [ ] `runParallelProtectedReads()` must require an authenticated snapshot, advance the clock, start two `protectedRead()` calls, await refresh start, settle it once, await both results, and publish only safe statuses/counters.
- [ ] `runLogoutDuringRefresh()` must require authentication, start one protected read, await refresh start, invoke real logout, settle the old refresh afterward, await both operations, and publish anonymous/no-profile outcome.
- [ ] Refresh failure must produce one refresh attempt, no retry, terminal local clear, and re-login-required safe status.
- [ ] `expireOtpNow()` advances the clock beyond the current controller deadline and emits a safe snapshot update.
- [ ] `dispose()` marks the runtime stale before disposing login/session/simulator/lease and clearing listeners so late callbacks cannot publish.

### Task 5: Auth preview page and scoped cache

**Files:**
- Create: `src/dev/auth/AuthPreviewPage.tsx`

**Interfaces:**
- Consumes: `createAuthPreviewRuntime`, `AuthContext`, `AccessProvider`, `LoginPage`, and `useQueryClient()`.
- Produces: default/named `AuthPreviewPage` for lazy routing.

- [ ] Define the full 12-entry scenario selector with safe Uzbek labels.
- [ ] Create an auth-preview `SessionCache` whose predicates match only `query.queryKey[0] === 'auth-preview'` and whose future keys follow `['auth-preview', runtimeId, ...]`.
- [ ] Create one stable runtime per `{scenario, resetRevision}` key and subscribe with `useSyncExternalStore`.
- [ ] Use a stable deferred lifecycle guard so StrictMode synthetic cleanup is invalidated by immediate setup, while real unmount disposes the runtime.
- [ ] Provide the runtime's safe `AuthContextValue` and an empty explicit demo `AccessProvider` grant set around the real `LoginPage`.
- [ ] Always render the exact visible label `Auth sinov muhiti — backendga ulanmagan` and a clear dev badge.
- [ ] Render safe login/session phases, refresh/get-me/logout/protected-read counters, scenario reset, OTP expire, parallel reads, logout-during-refresh, and local logout controls.
- [ ] Disable refresh controls unless `session.phase === 'authenticated'` and show a safe manual-login/get-me hint before that point.
- [ ] Ensure scenario change/reset changes the runtime key and therefore disposes the prior runtime without creating an authenticated baseline.

### Task 6: Lazy demo route and documentation

**Files:**
- Modify: `src/app/AppRouter.tsx`
- Modify: `docs/architecture/AUTH_SESSION_DECISION.md`

**Interfaces:**
- Consumes: existing demo-only `AppRouter` and dynamic `DemoRoot` boundary.
- Produces: guarded `/dev/auth` lazy route.

- [ ] Add a Vite-development-gated lazy import:

```tsx
const AuthPreviewPage = import.meta.env.DEV
  ? lazy(() => import('@/dev/auth/AuthPreviewPage'))
  : null
```

- [ ] Add `/dev/auth` only when `AuthPreviewPage` is non-null and wrap it in `Suspense` with an existing safe loading state.
- [ ] Leave `/dashboard`, `/dev/ui`, `/403`, Day 01 personas, and scheduled navigation behavior unchanged.
- [ ] Add minimal ADR mapping for `/dev/auth`, normalized simulation, preview-only lock/storage/cache namespaces, manual login requirement, and production isolation.

### Task 7: Static security and scope review

**Files:**
- Read only: all D2.5 modified/created files plus `src/main.tsx` and `src/app/LiveRoot.tsx`.

- [ ] Confirm no `fetch`, HTTP transport, backend URL, console logging, production decoder, guessed authority, JWT-shaped token, or unsafe stage cast exists in dev auth files.
- [ ] Confirm `AUTH-DEMO-ONLY`, both exact preview namespace strings, and the lazy `/dev/auth` route are present.
- [ ] Confirm production lock/device strings do not appear in dev auth files and `LiveRoot` has no dev import.
- [ ] Confirm refresh controls require a real authenticated session and scenario selection never calls `establishSession()` directly.
- [ ] Confirm all disposal paths abort login, clear session tokens, settle deferred refresh, release the preview lease, and clear only `auth-preview` queries.
- [ ] Do not claim lint, typecheck, test, build, runtime scenarios, second-tab behavior, or production bundle inspection passed; provide the exact manual commands/checks to the user.
