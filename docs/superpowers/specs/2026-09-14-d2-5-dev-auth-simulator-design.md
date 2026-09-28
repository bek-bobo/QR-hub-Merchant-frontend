# D2.5 Dev Auth Simulator Design

**Status:** Approved in chat; awaiting written-spec review  
**Date:** 2026-09-14  
**Scope:** Development-only auth lifecycle preview for QRHub Merchant

## Goal

Provide a `/dev/auth` manual verification surface that drives the real
`LoginController` and `SessionController` through synthetic, normalized auth
responses without using the backend, HTTP transport, production decoder, or
live authority mapping.

## Boundaries

- The preview is available only when Vite development mode and explicit demo
  mode have selected `DemoRoot`.
- `LiveRoot` never imports the preview or simulator.
- D2.6 unit tests, Day 03 APIs, production auth decoding, runtime authority
  mapping, and real backend requests are outside this scope.
- The simulator contains the exact marker `AUTH-DEMO-ONLY` for production
  bundle inspection.

## Architecture

### Dev-only runtime harness

`src/dev/auth/auth-simulator.ts` owns the non-React preview runtime:

- a normalized in-memory `AuthApi` implementation;
- a scenario state machine;
- an injected controllable clock;
- safe call counters and lifecycle status;
- controlled deferred refresh completion;
- a Web Locks based preview-only device lease;
- real `LoginController` and `SessionController` instances;
- preview-scoped cache cleanup and complete disposal.

`src/dev/auth/AuthPreviewPage.tsx` owns only the manual verification UI and
React subscriptions. It creates one stable harness per selected scenario,
projects controller snapshots into a token-free auth context, and disposes the
harness on scenario replacement or unmount.

The production `AuthProvider` receives no preview-only props, controller
callbacks, clock controls, or controller escape hatches.

### Routing and bundle isolation

`src/app/AppRouter.tsx` adds `/dev/auth` through a lazy import guarded by
`import.meta.env.DEV`. `AppRouter` is reachable only through `DemoRoot`, which
`src/main.tsx` dynamically imports only for:

```text
import.meta.env.DEV && VITE_APP_MODE === "demo"
```

The Day 01 `/dashboard`, `/dev/ui`, persona selector, scheduled navigation,
and demo fixtures remain unchanged. `LiveRoot` has no dependency on the
preview module.

## Shared auth context boundary

The shared auth context source discriminator becomes `"live" | "demo"`.
`AuthProvider` continues to emit only `source: "live"`. The preview provider
emits `source: "demo"` and nests a demo-only `AccessProvider` value.

Preview profile permissions are never passed to the authenticated/live access
variant and are never compared through `verifiedAuthorityMap`. Any optional
preview grants are explicit demo grants scoped to the preview subtree. The
production verified authority map remains empty.

The auth context and preview snapshot never expose access tokens, refresh
tokens, login session keys, OTP IDs, PINs, or OTP values.

## Synthetic credential policy

Synthetic token pairs are private opaque strings without dots or JWT-like
structure. They exist only in the simulator and `SessionController` RAM. They
are never rendered, logged, persisted, included in query keys, or copied into
React context.

The login session key and OTP ID are likewise private normalized values used
only between the simulator and real controllers.

## Preview lease and storage

The preview uses exactly:

- Web Lock: `qrhub:auth-preview-owner:v1`
- localStorage key: `qrhub.preview-device-key.v1`

It never reads or writes the production names:

- `qrhub:auth-owner:v1`
- `qrhub.device-key.v1`

Acquisition order is feature detection, exclusive non-waiting lock acquire,
ownership confirmation, then preview storage read/validate/create. A busy tab
performs no storage or simulator API operation. Release and disposal are
idempotent. No spinlock or fallback ownership mechanism is introduced.

The second tab receives a safe busy state. Its retry action resets the login
flow so ownership is attempted again only on the next explicit login submit.
After the owning tab logs out or disposes, the second tab can retry.

## Scenario model

The selector provides these scenarios:

1. First login / first PIN
2. Existing PIN
3. Known device / direct PIN
4. Reset PIN
5. Wrong OTP
6. Wrong PIN
7. OTP expired
8. Device blocked
9. Unknown stage / contract error
10. Profile 403
11. Refresh success
12. Refresh failure

Changing a scenario creates a fresh harness. No scenario automatically creates
an authenticated session.

For successful paths, any format-valid OTP or PIN is accepted; the UI does not
publish a fixed correct secret. Wrong-OTP and wrong-PIN scenarios reject the
first format-valid relevant submission with a safe business error and allow a
manual retry. They do not report a guessed remaining-attempt count.

The unknown-stage scenario returns a type-valid normalized stage that is
unexpected for the current controller transition. It uses no unsafe cast and
cannot commit a token or grant.

## Login flows

### First login

```text
phone -> OTP -> set PIN -> check PIN -> get-me -> authenticated
```

Set-PIN returns the normalized PIN stage without a token. Only check-PIN
returns a synthetic token pair. Authentication is not visible until real
`SessionController.establishSession()` completes get-me bootstrap.

### Existing PIN

```text
phone -> OTP -> PIN -> check PIN -> get-me -> authenticated
```

### Known device

```text
phone -> PIN -> check PIN -> get-me -> authenticated
```

The direct-PIN response contains no OTP ID or deadline.

### Reset PIN

```text
PIN -> forgot PIN -> reset OTP -> reset verify -> new PIN
    -> check PIN -> get-me -> authenticated
```

Login and reset API methods remain distinct. Reset set-PIN returns to PIN and
does not authenticate.

## Error and expiry scenarios

- Wrong OTP throws a safe `OTP_CODE_INVALID` business error once.
- Wrong PIN throws a safe `PIN_INVALID` business error once.
- Blocked device throws a safe terminal `DEVICE_BLOCKED` business error and
  does not rotate the preview device UUID or restart automatically.
- Profile 403 makes get-me throw a safe HTTP 403. The real session controller
  removes tokens/profile/grants, releases the lease, clears preview cache, and
  exposes access-denied without a refresh loop.
- OTP expiry uses the injected clock. “Hozir expire qilish” advances the clock
  beyond the current deadline and causes the existing LoginForm countdown and
  resend rules to govern the next action; no real minute-long wait is needed.

Product-like UI displays only safe Uzbek status copy and controller phases. It
does not render backend class names, raw exception serialization, or stack
traces.

## Refresh scenarios

Refresh controls remain disabled until the user manually completes the real
login flow and the session snapshot is `authenticated`. A safe hint explains
that login and get-me bootstrap must finish first.

The control advances the injected clock so the current token is near expiry.
No authenticated baseline is created behind the user's action.

### Refresh success

“Parallel himoyalangan so‘rovlar” starts at least two real
`SessionController.protectedRead()` calls before the controlled refresh is
resolved. Both callers observe the same refresh flight, the simulator refresh
counter becomes exactly one, the pair is atomically replaced, and both reads
continue safely. Only counters and result statuses are rendered.

### Refresh failure

The same protected-read trigger produces one refresh rejection, no retry,
terminal local session clear, lease release, and a re-login-required state.

### Logout during refresh

“Refresh paytida chiqish” starts a protected read and waits until the
simulator reports that refresh has begun. It then invokes real session logout
before resolving the old refresh. The late result cannot restore the session
because the controller epoch/revision no longer matches. The final safe state
is anonymous with no profile/grants and a released preview lease.

## Query cache isolation

The preview session cache adapter only cancels and removes keys beginning with:

```text
['auth-preview', runtimeId, ...]
```

It never uses token, phone, PIN, OTP, session key, or OTP ID as key material.
Scenario reset and disposal clear only the `auth-preview` namespace and do not
clear Day 01 dashboard/persona cache.

## React lifecycle and cleanup

Each scenario runtime is stable for its mounted lifecycle. React render does
not start login, get-me, refresh, logout, storage, or network work.

Scenario switch, explicit reset, and real unmount:

1. invalidate and abort the pending login command;
2. dispose the login controller;
3. dispose/reset the session controller and clear private token state;
4. invalidate and reject/settle controlled deferred refresh state;
5. release the preview lease;
6. cancel and remove only preview-scoped cache entries;
7. prevent late callbacks from publishing state into the replacement runtime.

StrictMode synthetic effect cleanup must not destroy the retained runtime; the
same deferred lifecycle-revision pattern used by the live provider will
distinguish an immediate re-setup from a real unmount.

## Preview UI

The page always displays:

> Auth sinov muhiti — backendga ulanmagan

It includes:

- a clear development-only badge;
- scenario selector and scenario reset;
- the real `LoginPage`/`LoginForm` under the safe preview auth context;
- safe login/session phases;
- refresh and protected-read call counters;
- “Hozir expire qilish” where applicable;
- “Parallel himoyalangan so‘rovlar”;
- “Refresh paytida chiqish”;
- safe ownership retry guidance/action.

Controls that require authentication remain disabled until the session is
actually authenticated through check-PIN and get-me.

## Documentation and verification boundary

`docs/architecture/AUTH_SESSION_DECISION.md` receives a minimal mapping for
the preview route, normalized simulator, separate preview namespaces, cache
scope, and production isolation.

No unit test is added in D2.5. Codex does not run npm, npx, lint, typecheck,
test, build, dev server, backend, Maven, Docker, or real API commands. Manual
verification after implementation will include lint, typecheck, build, the
development scenarios, second-tab ownership, and production bundle marker
inspection. D2.6 remains the focused core-correctness test stage.
