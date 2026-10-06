# QRHUB FRONTEND CODE AUDIT

Audit date: 2026-10-06 (Asia/Tashkent)  
Repository: `D:/QR projects/qrhub-merchant-frontend`  
Mode: audit only; production source, API contracts, dependency declarations and existing tests were not changed.

Evidence scope: the current working tree, including its pre-existing modified/deleted tests and simulator changes. No AGENTS.md was found in the repository or checked ancestor directories. Installed dependencies were used; no install, upgrade, dependency fix, backend request or deployment was performed. This is a source audit with local validation and focused controller reproductions, not browser profiling, a penetration test or staging acceptance.

## 1. Executive Summary

The application has sound foundations: explicit endpoint contracts, runtime response decoders, session-scoped query keys, capability gates, protected reads, one-dispatch mutations, exact minor-unit formatting, Tashkent date presets, and lazy production routes. Most complexity in auth and mutation controllers protects real invariants and should remain.

The most consequential defects sit at the boundary between durable action controllers and temporary UI panels. Local cleanup resets a pending assignment, while retained unassign and P5 controllers capture obsolete selection/query dependencies. Four focused reproductions confirm these controller/data-flow failures, including refetch failures incorrectly classified as successful refreshes.

| Dimension | Score | Basis |
|---|---:|---|
| Overall code health | 7 / 10 | Clean baseline and extensive contracts; several lifecycle defects remain. |
| Architecture quality | 8 / 10 | Clear feature/shared/app separation; feature HTTP orchestration and retained closures need attention. |
| Performance quality | 7 / 10 | Server pagination and lazy routes are good; large chart payload and unstable chart configuration remain. No runtime timings measured. |
| Maintainability quality | 7 / 10 | Testable pure helpers, but repeated permission/scope/transport orchestration and stale documentation. |
| Test quality | 6 / 10 | Strong controller/contract coverage; mocked hooks and SSR leave actual React lifecycle and focus behavior unverified. |
| Production safety / risk control | 6 / 10 | No proven P0 or financial corruption; three P1 lifecycle defects and dependency advisories need review. Higher means safer. |

Findings: **0 P0, 3 P1, 8 P2, 4 P3, 2 P4**. No mass refactor, new state library or UI redesign is justified.

## 2. Baseline Verification

Commands executed from the repository root against installed dependencies:

| Check | Exact command | Result |
|---|---|---|
| Lint | `npm run lint` | Exit 0. Two `react(only-export-components)` warnings: button.tsx:66 and badge.tsx:48. |
| Typecheck | `npm run typecheck` | Exit 0; `tsc -b --pretty false`. |
| Tests | `npm test -- --reporter=dot` | Exit 0; **185 files, 1,496 tests passed**, 90.71s. |
| Production build | `npm run build` | Exit 0; `tsc -b && vite build`. Vite transform/build 2.88s, 3,741 modules. Chart chunk size warning. |
| Diagnostic strict compilation | `npx tsc --project tsconfig.app.json --strict --noEmit --pretty false` | Exit 0, zero diagnostic lines. No configuration change. |
| Focused audit reproductions | `npx vitest run docs/audit/audit-evidence.test.ts --reporter=verbose` | **4 tests passed**. Tests assert current defects, not desired fixed behavior. |
| Dependency inventory | `npm ls --depth=0` | Exit 0. |
| Dependency advisories | `npm audit --json` | Exit 1: 11 vulnerable package entries: 1 critical, 8 high, 2 moderate. Reachability separately assessed below. |
| Dependency paths | `npm explain shadcn micromatch brace-expansion fast-uri ip-address` | Exit 0; paths retained. |
| Production demo marker scan | `rg -l 'DEMO-QR-\|D5-MGMT-DEMO-ONLY\|D6-P5-DEMO-ONLY\|AUTH-PREVIEW\|dashboard-analytics.fixture' dist/assets -g '*.js'` | No matches; this bounded scan does not prove absence of every conceivable debug artifact. |

Logs and reproductions are in `D:/QR projects/qrhub-merchant-frontend/docs/audit/`. The strict diagnostic log is intentionally empty. Lint output is recorded above. Original baseline logs remain separate from the added audit evidence tests.

Actual installed stack (not merely package.json ranges): React/React DOM **19.3.0**, React Router **8.3.1**, TanStack Query **5.102.8**, TypeScript **6.0.3**, Vite **8.3.0**, Vitest **5.0.0**, Oxlint **1.82.0**, Tailwind **4.3.3**, Radix UI **1.6.7**, Ant Design Plots **2.6.8**, qrcode.react **4.2.0**.

TypeScript uses ES2023, bundler resolution, noEmit and unused-symbol checks; strict mode is currently absent. Vitest has no separate checked-in configuration and runs the default Node environment. Vite enables React and Tailwind plugins and the @ source alias. Oxlint configuration explicitly enables Rules of Hooks and Fast Refresh checks.

## 3. Architecture Map

```text
index.html
  inline guarded theme bootstrap
src/main.tsx
  StrictMode -> ThemeProvider
    DEV + demo only -> dynamic import dev/DemoRoot -> AppRouter + preview roots
    otherwise -> LiveRoot
      validated auth registration/base URL or IntegrationUnavailablePage
      AppProviders -> module-owned QueryClient
        AuthProvider
          LoginController + SessionController + AuthDeviceLease
          private token memory + versioned localStorage persistence
          ProtectedReadContext + AuthContext + AccessProvider
            ReadProvider
              live read API / endpoint decoders / query policies
              session + source + permission revision
              scoped action registry + P5 reset port
                LiveRouter / route permission and registration gates
                  LiveShellLayout / Header / ShellNavigation
                  lazy account, dashboard, dynamic QR, static QR,
                       terminals, bank accounts, cashiers, P5, create, export
Features
  pages -> local drafts/applied filters + useQuery -> read runtime
  columns/results/dialogs -> mapped readonly models
  pure page-state/contract/controller helpers
  feature mutations -> protectedMutation -> one-dispatch controller
Shared
  api: JSON transport, XLSX bridge, safe errors, query keys, action registry
  auth: lease/login/session/access/persistence
  contracts: endpoints + read/lookup DTO validation and mapping
  money/date/presentation: exact formatting + explicit date representations
  table-columns: versioned/validated browser preferences
  ui: pagination/filter drawer/row actions/details/async states
```

State ownership is mostly sensible: TanStack Query owns server state; forms/pages own drafts, applied filters and selections; session controllers own tokens/auth transitions. Column and trend preferences persist UI settings, not credentials or financial responses. There is no Redux/Zustand and no need to introduce either.

Authentication and permission decisions are frontend availability gates; backend authorization is still required. The dev router, fixtures and synthetic preview components are reachable in development and must not be mistaken for unused production architecture.

## 4. Critical & High Findings

No P0 finding was established.

### [F01] Closing assignment clears the pending intent and permits duplicate dispatch

**Severity:** P1  
**Confidence:** HIGH  
**Category:** Async / State / React

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/AssignTerminalsPanel.tsx:80
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/AssignTerminalsPanel.tsx:98
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/assign-terminals.ts:93
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CashierTerminalsDialog.tsx

**Evidence:** The registry retains the assignment controller by scope/result/row key. The panel's effect cleanup calls controller.invalidate(), which resets its action and visible intent. The enclosing dialog permits close while assignment is pending. Reopening the same unchanged result obtains the same now-idle controller. Audit reproduction dispatches twice before either request resolves.

**Problem:** Temporary panel lifetime resets a durable one-dispatch guarantee.

**Runtime impact:** On slow networks, close/reopen/reselect can send another assignment while the first is in flight. The first settlement becomes stale and may skip confirmed-result invalidation. Backend idempotency and resulting database effects are NOT_PROVEN.

**Why it matters:** Duplicate mutation attempts and lost outcome tracking undermine the app's explicit uncertainty handling.

**Recommended change:** Preserve pending/unknown intent across panel teardown; cleanup subscriptions locally and invalidate durable actions only for real scope/intent replacement. Keep an explicit status recheck/new-intent policy.

**Behavior risk:** MEDIUM

**Tests required:** Actual modal mount/close/reopen with a deferred response; assert one dispatch, retained pending/unknown state, eventual invalidation and logout cleanup. Retain assign-terminals.test.ts.

**Complexity:** MEDIUM  
**Expected benefit:** HIGH

### [F02] Reopened unassign controller retains an obsolete selection epoch

**Severity:** P1  
**Confidence:** HIGH  
**Category:** React / State / Async

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CashierPage.tsx:83
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CashierPage.tsx:90
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/UnassignTerminalPanel.tsx:43
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/UnassignTerminalPanel.tsx:72
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/unassign-terminal.ts:89

**Evidence:** The controller factory captures currentTarget(), which captures the first panel's isSelected callback. CashierPage increments selectedEpochRef on close/reselection. The registry key includes row/query/data timestamp but no selection epoch, and getOrCreate returns the first controller. The new panel checks current selection with its new closure, but controller.isCurrentSelection() uses the old one. Reproduction confirms the retained controller cannot arm confirmation.

**Problem:** Retained business intent and replaceable selection dependencies have incompatible lifetimes.

**Runtime impact:** Select a terminal, cancel or close, then select that same terminal without refetching: the panel reports obsolete selection instead of permitting a valid confirmation.

**Why it matters:** Routine cancellation breaks a working destructive-action flow.

**Recommended change:** Rebind current selection through a stable owner-managed dependency, while preserving pending/unknown dispatch state. Do not simply add random keys that allow replay of unresolved mutations.

**Behavior risk:** MEDIUM

**Tests required:** Cancel/reselect, close/reopen, switch terminal, stale row, permission loss and unresolved dispatch cases with real React mounting; retain unassign-terminal.test.ts.

**Complexity:** MEDIUM  
**Expected benefit:** HIGH

### [F03] Retained P5 controller resolves rows from a previous filter query

**Severity:** P1  
**Confidence:** HIGH  
**Category:** State / API / React

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/p5/P5Page.tsx:72
- D:/QR projects/qrhub-merchant-frontend/src/features/p5/P5Page.tsx:80
- D:/QR projects/qrhub-merchant-frontend/src/features/p5/p5-reset.ts:49
- D:/QR projects/qrhub-merchant-frontend/src/features/p5/p5-reset.ts:163

**Evidence:** The reset registry key is session/access/device only. Its factory captures currentRow from ScopedP5Results, including that component's queryKey. After another filter query displays the same device, the retained controller still reads the old key. request(row) requires current === row; the new query's row has a different identity. Reproduction obtains the same controller and confirms rejection of the new row.

**Problem:** Device-wide durable state captures query-local row ownership.

**Runtime impact:** Open and dismiss reset, switch filters so the same device is present, then request reset: nothing opens, or the action becomes unusable if the previous cache is gone/invalidated.

**Why it matters:** A common management workflow fails without an explanatory error.

**Recommended change:** Keep one durable dispatch ledger per device, but explicitly bind the current query/eligible row when initiating a fresh, safe intent. Preserve pending/unknown behavior across query changes.

**Behavior risk:** MEDIUM

**Tests required:** Same device under two query keys, cancelled/confirmed/unknown/pending outcomes, refetch identity changes, cache eviction and changed device eligibility. Retain p5-reset.test.ts and P5Page.test.tsx.

**Complexity:** MEDIUM  
**Expected benefit:** HIGH

## 5. Medium Findings

### [F04] Refetch failures are classified as successful refreshes

**Severity:** P2  
**Confidence:** HIGH  
**Category:** API / Error handling / Test

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/shared/api/one-dispatch-action.ts (invalidateAfterConfirmed)
- D:/QR projects/qrhub-merchant-frontend/src/features/p5/p5-reset.ts:122
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/create-cashier.ts:74
- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/create-invalidation.ts:19

**Evidence:** invalidateAfterConfirmed recognizes refresh failure only through a rejected promise. Real QueryClient.invalidateQueries defaults to resolving despite a query refetch failure. The reproduction uses a subscribed QueryObserver, verifies query status error, and still receives 'updated'. P5's failed-refresh toast therefore lacks that signal. Existing tests emulate a rejecting invalidation adapter rather than this library behavior.

**Problem:** A fulfilled invalidation promise is treated as proof of successful data refresh.

**Runtime impact:** A confirmed mutation is followed by failed reads, but refresh feedback can say updated or omit a required failure message. Some screens independently display query errors; mutation success itself is not corrupted.

**Why it matters:** Feedback promises current state while server state remains unverified.

**Recommended change:** Use supported throwOnError behavior for the relevant refetches or inspect the resulting query states. Keep confirmed mutation and failed refresh separate.

**Behavior risk:** LOW

**Tests required:** Real QueryClient with active failing/successful queries, mixed outcomes and stale scope; assert confirmation remains confirmed.

**Complexity:** SMALL  
**Expected benefit:** HIGH

### [F05] P5 uncertainty is presented as definite non-delivery

**Severity:** P2  
**Confidence:** HIGH  
**Category:** Error handling / Product correctness

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/p5/P5ResetDialog.tsx:18
- D:/QR projects/qrhub-merchant-frontend/src/features/p5/P5ResetDialog.tsx:38

**Evidence:** unknown, rejected and not-sent are grouped as failed. Unknown uses the title 'Reset OTP yuborilmadi' and description instructing retry, while the detail says the result was not confirmed and another reset will send a new request.

**Problem:** The same notification asserts both definite failure and uncertainty.

**Runtime impact:** A merchant can conclude no OTP was sent after a timeout even when the server sent it.

**Why it matters:** Accurate uncertainty communication is part of safe destructive-action handling.

**Recommended change:** Render an explicit unknown outcome title/description. Preserve the existing explicit acknowledgement/confirmation policy and confirmed OTP wording.

**Behavior risk:** LOW

**Tests required:** Separate unknown/rejected/not-sent/confirmed messages and new-intent acknowledgement in P5ResetDialog.test.tsx.

**Complexity:** SMALL  
**Expected benefit:** MEDIUM

### [F06] TypeScript strict checking is not enforced despite a clean strict diagnostic run

**Severity:** P2  
**Confidence:** HIGH  
**Category:** TypeScript / Build

**Files:**

- D:/QR projects/qrhub-merchant-frontend/tsconfig.app.json
- D:/QR projects/qrhub-merchant-frontend/tsconfig.node.json

**Evidence:** Neither compiler configuration sets strict, strictNullChecks or noImplicitAny. The application passes a separate --strict diagnostic compilation with no errors.

**Problem:** The normal baseline allows future implicit-any and nullability mistakes which current explicit models could prevent.

**Runtime impact:** This is a prevention gap, not a proven existing null crash.

**Why it matters:** DTO, nullable-money, auth and action unions lose part of their compile-time protection.

**Recommended change:** Enable strict in the app config, then independently assess the small node config. Consider noUncheckedIndexedAccess separately; it was not included in the diagnostic and is not an automatic requirement.

**Behavior risk:** LOW

**Tests required:** Normal typecheck/build plus existing runtime tests. No mirrored unit test for compiler flags.

**Complexity:** SMALL  
**Expected benefit:** HIGH

### [F07] React hook mocks and SSR tests miss lifecycle behavior

**Severity:** P2  
**Confidence:** HIGH  
**Category:** Test / React / Accessibility

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CreateCashierContent.test.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CashierPage.row-actions.test.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendPlotViewport.test.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/PlotLoading.test.tsx
- D:/QR projects/qrhub-merchant-frontend/package.json

**Evidence:** Several tests replace useState/useEffect/useSyncExternalStore and invoke component functions directly; TrendPlotViewport tests suppress useEffect entirely. Other tests use renderToStaticMarkup or raw source assertions. These protect emitted markup and pure orchestration but do not execute real effect cleanup, portals, focus transfer, subscriptions or rerender timing.

**Problem:** 1,496 passing tests do not establish browser lifecycle coverage.

**Runtime impact:** F01-F03 survive the baseline; modal focus, actual AntV tooltips and caret behavior remain unverified.

**Why it matters:** Refactors can pass the suite while breaking actual interaction.

**Recommended change:** Keep pure tests; add a small real DOM/browser integration layer for the identified critical boundaries. A test runtime/browser runner dependency is defensible only if required for these cases.

**Behavior risk:** LOW

**Tests required:** Real StrictMode mount/unmount, slow mutation close/reopen, focus return/keyboard dismissal, date apply, query switch, money caret and actual chart renderer smoke coverage.

**Complexity:** MEDIUM  
**Expected benefit:** HIGH

### [F08] Feature presentation owns repeated protected HTTP orchestration

**Severity:** P2  
**Confidence:** HIGH  
**Category:** Architecture / API / Duplication

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/CreateQrContent.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/static-qr/StaticQrPage.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/CreateCashierContent.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/AssignTerminalsPanel.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/UnassignTerminalPanel.tsx
- D:/QR projects/qrhub-merchant-frontend/src/shared/api/protected-read.ts

**Evidence:** Features independently validate VITE_WEB_API_BASE_URL, construct transports, read exact permission strings, guard session/scope/cache state and classify protectedMutation outcomes. XLSX uses a separate native fetch path. Existing live-create-port.ts and the P5 port show a usable feature adapter boundary.

**Problem:** Genuine architecture debt: security/correctness orchestration repeats inside form/panel components, contributing to captured-dependency mistakes.

**Runtime impact:** Future changes can diverge among features; XLSX timeout/abort exceptions normalize to generic contract errors rather than JSON transport's distinct classes. No current retry/security bypass is proven.

**Why it matters:** Forms are difficult to test without replacing hooks, transports and session APIs together.

**Recommended change:** Extract feature-specific live ports and lookup option builders with explicit current-state dependencies. Share only proven repeated scope/transport mechanics. Preserve different JSON and binary body handling and exact API field names.

**Behavior risk:** MEDIUM

**Tests required:** Current wire-body/query contracts, malformed/empty responses, 401/403, timeout/abort, no mutation replay and permission recheck after refresh.

**Complexity:** MEDIUM  
**Expected benefit:** HIGH

### [F09] Fresh chart configs reset tooltip interaction on unrelated renders

**Severity:** P2  
**Confidence:** HIGH  
**Category:** React / Performance / Accessibility

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.tsx:70
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendPlotViewport.tsx:27
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.ts

**Evidence:** TrendChart builds a new plot config and new data on every render. TrendPlotViewport's [config] effect calls hide(), resets the active keyboard bucket and emits tooltip:hide. Dashboard draft/query updates rerender its children even when view/mode/series/theme are unchanged. Config construction also repeatedly scans buckets and formats exact values; availableTrendSeries is recalculated inside the series filter.

**Problem:** Object identity is used as a signal for meaningful chart change.

**Runtime impact:** Unrelated dashboard updates can clear the active tooltip/keyboard position and repeat chart preparation. Actual engine repaint cost and millisecond savings are NOT_PROVEN.

**Why it matters:** There is a concrete interaction cost and a substantial renderer boundary, unlike trivial callback memoization.

**Recommended change:** Hide only for meaningful dataset/mode/series changes. Stabilize the chart preparation boundary using actual semantic dependencies, and compute available series once. Keep exact accessible summaries. Narrow memoization here is defensible after verifying dependencies.

**Behavior risk:** LOW

**Tests required:** Real keyboard navigation survives unrelated parent updates; changing data/mode hides appropriately; count/amount scale, series, theme and resize cases remain correct.

**Complexity:** SMALL  
**Expected benefit:** MEDIUM

### [F10] Lazy route failures lack an application recovery boundary

**Severity:** P2  
**Confidence:** HIGH  
**Category:** Reliability / Error handling

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/app/LiveRouter.tsx
- D:/QR projects/qrhub-merchant-frontend/src/app/LiveRoot.tsx
- D:/QR projects/qrhub-merchant-frontend/src/main.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/PlotViewportBoundary.tsx

**Evidence:** Feature routes use lazy and Suspense. The only source error boundary found is PlotViewportBoundary; it covers charts, not lazy routes or the shell. Suspense handles pending imports but is not an exception boundary.

**Problem:** A chunk load rejection or unexpected feature render error has no route-level recovery UI.

**Runtime impact:** A deployment/cache mismatch or network failure loading a feature chunk can unmount the application UI. Frequency in the current deployment is NOT_PROVEN.

**Why it matters:** Existing API error handling cannot recover import/render failures.

**Recommended change:** Add one meaningful route/app boundary with safe recovery messaging and an explicit reload action for chunk failures. Preserve session/logout behavior and avoid infinite automatic reload loops.

**Behavior risk:** LOW

**Tests required:** Reject a lazy import and throw during feature render; verify recovery UI, no private error disclosure and a working explicit recovery action.

**Complexity:** SMALL  
**Expected benefit:** MEDIUM

### [F17] Dependency scan reports vulnerable tooling packages

**Severity:** P2  
**Confidence:** HIGH  
**Category:** Security / Dependencies / Build

**Files:**

- D:/QR projects/qrhub-merchant-frontend/package.json
- D:/QR projects/qrhub-merchant-frontend/package-lock.json
- D:/QR projects/qrhub-merchant-frontend/src/index.css:3
- D:/QR projects/qrhub-merchant-frontend/docs/audit/dependency-audit.json
- D:/QR projects/qrhub-merchant-frontend/docs/audit/dependency-paths.log

**Evidence:** npm audit reports 11 vulnerable entries, including critical proxy-addr, high brace-expansion/braces/source-map-js and affected parent entries. npm explain traces shadcn's CLI/MCP/glob dependencies. shadcn is also needed by the existing CSS import, so deleting it as unused would break the current build.

**Problem:** Confirmed dependency hygiene debt; advisory severities are not equivalent to frontend finding severities.

**Runtime impact:** Tooling consuming malicious patterns/maps or exposed tooling servers may meet advisory preconditions. A remotely exploitable browser path, deployed Express server or production auth compromise is NOT_PROVEN.

**Why it matters:** The dependency graph includes vulnerable tooling and should be assessed before production maintenance work.

**Recommended change:** Review compatible patched resolutions and actual usage, update only justified versions and rerun validation. If separating CLI tooling from CSS/runtime dependencies, confirm supported package exports first. Do not run audit fix --force; the report proposes a major downgrade to shadcn 1.0.0 for some paths.

**Behavior risk:** MEDIUM

**Tests required:** Clean install from the revised lock, audit comparison, lint/typecheck/tests/build and CSS/browser smoke checks; tool exposure assessment.

**Complexity:** MEDIUM  
**Expected benefit:** MEDIUM

## 6. Low / Cleanup Findings

### [F11] Read context memoization is defeated by freshly allocated scope/access values

**Severity:** P3  
**Confidence:** HIGH  
**Category:** React / Performance

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/app/read/ReadProvider.tsx:60
- D:/QR projects/qrhub-merchant-frontend/src/app/read/ReadProvider.tsx:89
- D:/QR projects/qrhub-merchant-frontend/src/app/read/ReadProvider.tsx:156
- D:/QR projects/qrhub-merchant-frontend/src/shared/auth/AuthProvider.tsx

**Evidence:** getCurrentState creates a new scope, access object and permission Set on every invocation. The render result is used as a dependency of the memoized context value and scope cleanup effect. AuthContext includes pending/messages/login state, so changes unrelated to read identity can trigger this work.

**Problem:** The context memo does not retain identity across unchanged read state; the cleanup effect executes and performs a scope comparison again.

**Runtime impact:** Read consumers rerender on unrelated auth notifications. Query keys remain stable by value; duplicate backend requests or a major bottleneck are NOT_PROVEN.

**Why it matters:** Avoidable provider churn obscures the intended ownership boundary.

**Recommended change:** Stabilize the rendered scope/access snapshot from semantic session/profile/revision inputs while keeping imperative current-state checks fresh. Profile before splitting contexts.

**Behavior risk:** LOW

**Tests required:** Render-count check for unchanged read identity plus existing permission revision/cache cleanup tests.

**Complexity:** SMALL  
**Expected benefit:** LOW

### [F12] QR status presentation belongs to a domain boundary, not dashboard

**Severity:** P3  
**Confidence:** HIGH  
**Category:** Architecture / Readability

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/presenters.ts:63
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/recent-qr-columns.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/columns.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/QrDisplayDialog.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/DynamicQrDetailsSheet.tsx

**Evidence:** Dynamic QR imports its status labels from dashboard/presenters, whose other exports handle dashboard filters/growth/reconciliation. classifyQrStatusCode separately expresses the same known status domain.

**Problem:** The dependency direction misrepresents ownership; this is localized architecture debt.

**Runtime impact:** No proven bug or material bundle overhead; future status changes require discovering the dashboard dependency.

**Why it matters:** Both features present the same QR domain.

**Recommended change:** Move only shared QR status presentation to a precise domain/shared presentation module, preserving known labels and unknown-code behavior. Do not consolidate unrelated P5/terminal/cashier status meanings.

**Behavior risk:** LOW

**Tests required:** Existing status, column and dialog tests, especially codes 25 and unknown values.

**Complexity:** SMALL  
**Expected benefit:** MEDIUM

### [F13] Unreferenced scaffold artifacts remain alongside active implementation

**Severity:** P3  
**Confidence:** HIGH  
**Category:** Dead code / Dependencies

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/App.tsx
- D:/QR projects/qrhub-merchant-frontend/src/App.css
- D:/QR projects/qrhub-merchant-frontend/src/assets/react.svg
- D:/QR projects/qrhub-merchant-frontend/src/assets/vite.svg
- D:/QR projects/qrhub-merchant-frontend/src/assets/hero.png
- D:/QR projects/qrhub-merchant-frontend/package.json

**Evidence:** Global repository reference searches find no active import of App/App.css or these assets. main.tsx selects LiveRoot/DemoRoot directly. No application import of zod was found, although shadcn has transitive zod requirements.

**Problem:** Obsolete entry/assets and an apparently unused direct dependency complicate navigation and dependency ownership.

**Runtime impact:** Unimported source assets are already excluded from bundle execution; removing them is not a performance breakthrough. Direct zod removal may leave transitive installation.

**Why it matters:** Cleanup clarifies the actual entry point without changing architecture.

**Recommended change:** Remove proven unreferenced source scaffold files in a separate small commit. Assess zod direct declaration against tooling intent before changing package/lock files.

**Behavior risk:** LOW

**Tests required:** Typecheck/build and whole-repository reference check; no new test mirroring file deletion.

**Complexity:** SMALL  
**Expected benefit:** LOW

### [F14] README describes a superseded production boundary

**Severity:** P3  
**Confidence:** HIGH  
**Category:** Documentation / Operations

**Files:**

- D:/QR projects/qrhub-merchant-frontend/README.md
- D:/QR projects/qrhub-merchant-frontend/.env.example
- D:/QR projects/qrhub-merchant-frontend/src/app/LiveRoot.tsx
- D:/QR projects/qrhub-merchant-frontend/src/shared/contracts/auth.contract.ts

**Evidence:** README states Day 01 integration is unavailable and production preview must always show the integration-unavailable page. Current LiveRoot accepts validated configured auth and mounts the live app. .env.example exposes auth/web base URLs and a stats flag.

**Problem:** Operational instructions describe an old scaffold rather than conditional live configuration.

**Runtime impact:** Operators/testers can misinterpret working live integration as a failed production boundary.

**Why it matters:** Production setup and verification should match source behavior.

**Recommended change:** Document configured-live versus unset/invalid fail-closed outcomes, current auth persistence decision, stats flag and exact validation commands. Retain demo-marker checks with their limited scope.

**Behavior risk:** LOW

**Tests required:** Cross-check instructions against runtime/config tests; no new runtime test for prose.

**Complexity:** SMALL  
**Expected benefit:** MEDIUM

## 7. Optional Improvements

### [F15] Measure chart bundle cost before changing renderer dependencies

**Severity:** P4  
**Confidence:** HIGH  
**Category:** Bundle / Performance

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/LazyPlotRenderers.ts
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/PlotRenderers.tsx
- D:/QR projects/qrhub-merchant-frontend/vite.config.ts
- D:/QR projects/qrhub-merchant-frontend/docs/audit/baseline-build.log

**Evidence:** PlotRenderers is 1,459.74 kB minified / 427.69 kB gzip; entry index is 421.34 / 129.14 kB. Routes and plots are already lazy.

**Problem:** A measurable payload cost exists, but perceived dashboard latency and dominant modules were not profiled.

**Runtime impact:** First chart load transfers/parses a large renderer chunk; actual user delay is NOT_PROVEN.

**Why it matters:** This is the only clearly large optional dependency boundary.

**Recommended change:** Measure cold dashboard load and inspect renderer submodules. Consider supported narrower imports or dependency trimming only if the result is material. Chunk splitting alone does not eliminate total payload.

**Behavior risk:** MEDIUM

**Tests required:** Actual line/pie rendering, tooltip, resize, theme and cold-load measurements. Preserve fallback/accessibility summaries.

**Complexity:** MEDIUM  
**Expected benefit:** MEDIUM (conditional)

### [F16] URL persistence for applied filters is a product choice

**Severity:** P4  
**Confidence:** HIGH  
**Category:** State / Navigation

**Files:**

- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/DynamicQrPage.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/ExportQrPage.tsx
- D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/DashboardReadPage.tsx
- D:/QR projects/qrhub-merchant-frontend/src/app/LiveRouter.tsx

**Evidence:** Applied filters/page live in local state; dashboard-to-list transfer uses location.state. Reload does not reconstruct those filters from query parameters.

**Problem:** Shareable/restorable reporting views are not currently supported. This is not a proven requirement defect.

**Runtime impact:** Reload resets view filters, which may be intentional.

**Why it matters:** Relevant only if merchants need deep links or browser history for reporting.

**Recommended change:** Decide the intended product behavior before implementing URL serialization. Preserve Apply semantics, parse untrusted input, exclude sensitive values and revalidate dependent selections.

**Behavior risk:** MEDIUM

**Tests required:** Only if approved: reload/back/forward, malformed URL, defaults, permission loss and dependent filters.

**Complexity:** MEDIUM  
**Expected benefit:** LOW (until required)

## 8. Dead / Duplicate Code Candidates

Paths in this table are relative to the exact repository root stated above; finding file lists give absolute paths.

| Candidate | Files | Evidence | Safe to Remove? |
|---|---|---|---|
| Scaffold App and stylesheet | src/App.tsx, src/App.css | No active import; main mounts LiveRoot/DemoRoot. | Yes after final reference/build check. |
| Scaffold source assets | src/assets/react.svg, vite.svg, hero.png | No repository import/URL reference found. | Yes after reference/build check. |
| Old public assets | public/favicon.svg, public/icons.svg | Current index references qrhub-favicon.svg; old paths appear in historical docs. Public files can have external consumers. | Candidate; external URL usage NOT_PROVEN. |
| Direct zod dependency | package.json | No source import; tooling consumes zod transitively. | Conditional; confirm tooling ownership. |
| Column compatibility wrapper | src/shared/table-columns/useTableColumnOrder.ts | Test-only current reference plus historical design docs. | Conditional; compatibility removal decision, not automatic. |
| Growth indicator | src/features/dashboard/MetricGrowthIndicator.tsx | Current consumer is MetricCards.test.tsx, not live MetricCards. Growth fields still decoded. | No automatic deletion; reserved/product behavior NOT_PROVEN. |
| Preview dashboard and formatting | DashboardPage.tsx, PreviewQrTable.tsx, format.ts, model.ts | AppRouter/DEV preview uses them. | No; dev-only, not dead. |
| Demo router/layout/simulators | AppRouter.tsx, AppShell.tsx, src/dev/** | Dynamic DEV/demo call chain and boundary tests. | No. |
| One-line plot wrappers | PlotRenderers.tsx | Intentional lazy module boundary isolating large chart dependency. | No. |
| shadcn package | package.json, src/index.css | CSS import is active. | No blind deletion or move. |
| Scope comparisons | ReadProvider, create/result/export/P5/cashier adapters | Repeated source/session/revision checks. | Share carefully after lifecycle fixes; do not remove guards. |
| Lookup state orchestration | CashierPage/P5Page/BankAccountPage/filter-lookups | Repeated ready/denied/error/loading and parent-child evidence logic. | Small helper possible; different domain gating must remain. |
| Table width/column resolution | TerminalResults, CashierResults, P5Results, DynamicQrTable | Similar presentation mechanics, different columns/action invariants. | Intentional local duplication until a concrete shared change is needed. |

There is no evidence for deleting unknown-status fallbacks, explicit-null decoders, permission checks, dev previews or accessible chart data.

## 9. React Performance Findings

| Component | Current issue | Real impact | Recommendation |
|---|---|---|---|
| TrendChart / TrendPlotViewport | F09: fresh config/data and identity-dependent hide effect. | Active bucket reset; repeated bucket formatting. Engine time unmeasured. | Semantic interaction reset plus stable chart preparation. |
| ReadProvider | F11: fresh scope/access invalidate memo identity. | Extra provider propagation and guard comparisons; no proven new requests. | Stable rendered snapshot; retain live imperative checks. |
| Trend config builder | availableTrendSeries repeatedly scans buckets within series mapping. | Multiple O(bucket count) scans per config creation. | Compute available series once; no new cache needed. |
| StatusDonut builder | donutPlotData called for data and color domain. | Four-category work is trivial. | Optional local variable only; not a separate optimization finding. |
| Management tables | Current server pagination, max UI size 50; static columns. | Bounded cell rendering. No full-dataset performance problem found. | Preserve; no blanket virtualization/memoization. |

Existing memoization review: ThemeProvider callbacks/context, AuthProvider actions/access/bridge, transport/runtime factories and plot-theme computed styles have defensible stable ownership. useTableColumnPreferences callbacks are reasonable and low-cost. CreateQrContent's useCallback helps port construction but still closes over runtime; durable-controller dependency freshness must be solved by ownership, not more callbacks. Dialog changeOpen callbacks appropriately depend on pending/open callbacks. No React.memo blanket or global cache is recommended.

## 10. useEffect Review

This covers all non-dev production files containing useEffect, plus significant layout effects. Dev preview roots are excluded from production findings; their tests ran in the baseline.

| File | Effect purpose | Classification | Problem | Recommendation |
|---|---|---|---|---|
| features/auth/LoginForm.tsx | OTP countdown interval | VALID SIDE EFFECT | Cleanup exists. Whole form repaints once/second; small bounded UI. | Preserve timer/deadline semantics. |
| shared/auth/AuthProvider.tsx | Restore/dispose controllers with deferred lifecycle guard | VALID SIDE EFFECT | StrictMode replay intentionally guarded. | Preserve and test real mounting. |
| shared/auth/AuthProvider.tsx | Restart completed login after anonymous session | ACCEPTABLE AS-IS | Synchronizes external session/login controllers. | Do not derive away external transition. |
| app/read/ReadProvider.tsx | Cancel/remove previous-scope reads | VALID SIDE EFFECT | Fresh scope object causes extra runs, F11. | Stabilize semantic scope; preserve cleanup. |
| app/read/useScopedActionRegistry.ts | Invalidate on scope change / teardown | VALID SIDE EFFECT | Retention contract is necessary; real StrictMode interaction coverage absent. | Test registry/provider lifecycle before changing. |
| shared/theme/ThemeProvider.tsx | Apply DOM theme before paint | VALID SIDE EFFECT (layout) | No defect found. | Preserve bootstrap parity. |
| shared/theme/ThemeProvider.tsx | Subscribe system preference/storage | VALID SIDE EFFECT | Listener cleanup and storage guards exist. | Preserve. |
| features/bank-accounts/BankAccountFilterControls.tsx | Clear unavailable merchant draft | ACCEPTABLE AS-IS | Inline onChange identity reruns check; stale-only update bounds it. | Optional owner reconciliation; keep applied filters separate. |
| features/terminals/TerminalFilterControls.tsx | Reconcile draft with lookup evidence | ACCEPTABLE AS-IS | Callback identity can rerun; equality-guarded parent update. | Move only if consolidating owner lookup logic. |
| features/static-qr/StaticQrFilterControls.tsx | Reconcile lookup draft | ACCEPTABLE AS-IS | Same bounded synchronization. | Preserve fail-closed applied selection. |
| features/cashiers/CashierFilterControls.tsx | Reconcile draft | ACCEPTABLE AS-IS | Same pattern. | Optional lookup ownership simplification. |
| features/p5/P5FilterControls.tsx | Reconcile merchant/terminal draft | ACCEPTABLE AS-IS | No proven infinite loop. | Keep status validation. |
| features/dynamic-qr/DynamicQrAdvancedFilterFields.tsx | Reconcile draft | ACCEPTABLE AS-IS | Callbacks are fresh; updates occur only when reconciliation changes draft. | Do not replace with automatic applied-filter broadening. |
| features/cashiers/CreateCashierContent.tsx | Notify parent of pending controller state | VALID SIDE EFFECT | Durable intent can outlive submit handler. | Keep subscription-driven pending; avoid duplicated ownership during port extraction. |
| features/dynamic-qr/CreateQrContent.tsx | Notify pending/result mode | VALID SIDE EFFECT | Also notified in submit handlers, making two paths. | Prefer controller snapshot as authoritative UI state. |
| features/dynamic-qr/CreateQrContent.tsx | beginNewIntent for resetOnMount | ACCEPTABLE AS-IS | Mount policy can run twice in StrictMode; controller gates pending. | Preserve product policy; test unknown/pending reopening. |
| features/cashiers/AssignTerminalsPanel.tsx | Invalidate controller on panel cleanup | POTENTIAL BUG (confirmed F01) | Drops durable pending/unknown guard. | Remove UI lifetime authority over dispatched intent. |
| features/dynamic-qr/BrandedQrPoster.tsx | Async canvas/poster render | VALID SIDE EFFECT | Cancellation flag and animation-frame cleanup prevent stale state; async work may still complete. | Preserve; no request cache needed. |
| features/dashboard/TrendPlotViewport.tsx | ResizeObserver | VALID SIDE EFFECT | Disconnect cleanup exists. | Preserve. |
| features/dashboard/TrendPlotViewport.tsx | Hide on config identity change | POTENTIAL BUG (F09) | Identity changes without semantic chart change. | Depend on actual interaction-invalidating inputs. |
| features/dynamic-qr/ExportButton.tsx | Invalidate binary intent before keyed replacement | VALID SIDE EFFECT (layout) | Prevents stale download; keyed filter/scope policy is deliberate. | Preserve. |
| shared/money/MoneyInput.tsx | Restore edited caret after controlled value update | VALID SIDE EFFECT (layout) | DOM selection is external state, not derived React state. | Preserve and verify in browser. |

No production fetching effect was found that needs replacement by a new fetching hook: Query owns those reads already. No proven timer/subscription leak or infinite effect loop was established. Effect cleanup correctness needs actual mounting tests, not an exhaustive-deps-only conclusion.

## 11. State Ownership Problems

- **F01:** Pending assignment belongs to the registry/intent, not the dialog lifecycle.
- **F02:** Selection epoch belongs to current cashier selection; a retained controller cannot permanently capture its first callback.
- **F03:** P5 device intent may be durable, but visible query row evidence must track the current query.
- **F11:** Stable read identity and transient auth notifications are currently coupled in provider propagation.
- **Acceptable tradeoff:** Draft/applied filter states are intentional two-stage UX. Merging them would dispatch unfinished edits and remove Apply semantics.
- **Acceptable tradeoff:** Captured request/amount/terminal snapshots describe submitted intent and should not be recomputed from edited forms.
- **Local by design:** Modal selection, chart amount/count mode and pagination need no global store.
- **Persistent UI settings:** Table preferences and trend series use validation/versioned storage; no unsafe unguarded JSON parsing was identified.
- **Product choice F16:** URL persistence is optional, not an automatic state correctness fix.

## 12. API/Data Flow Problems

Confirmed problematic flows:

```text
Assign submit -> durable registry controller -> protectedMutation -> POST pending
close dialog -> panel cleanup invalidate -> same retained controller becomes idle
reopen -> second POST before first resolution                         [F01]

Unassign first mount -> retained controller captures selection epoch N
cancel/reselect -> parent epoch N+1 -> same registry key
new visible panel -> old controller tests epoch N -> rejected        [F02]

P5 device controller created under query A -> stored by device ID
filter query B displays same device -> registry returns controller A
controller compares row B against query A's row identity -> no dialog [F03]

confirmed mutation -> invalidateQueries -> active refetch errors
default promise resolves -> invalidateAfterConfirmed says updated    [F04]
```

Positive findings: JSON base URL validation forbids embedded credentials/query/hash and production insecure HTTP; credential kind/service/body constraints are checked; URLSearchParams serializes query values; requests are no-store, redirect-error and credentials-omit; JSON transport cleans up abort listeners/timers and has a finite timeout. Responses decode before becoming UI models. Reads may refresh/replay once through session policy; mutations do not replay after dispatch. Queries include source/session/access revision, filters and pagination.

Error trace: 401 protected reads may refresh then replay; repeated failure terminates session. 403 returns access-denied without refresh. Generic 404/409/422/5xx reads become safe HTTP errors; current views generally show generic retry states rather than source-unconfirmed field errors. Malformed successful JSON, unsupported envelopes and unsafe numbers fail closed. Timeout/network mutation results remain unknown. A proven business-rejection path exists for P5's explicit failure envelope; do not guess rejection from generic status codes.

Forms use controlled inputs, explicit wire validation and controller-level duplicate protection. QR amount parsing handles grouped decimals using BigInt and terminal bounds; cashier phone normalizes the +998 format. Assign/unassign close/reopen is the main proven gap. No blanket form library is needed.

Tables use backend pagination; search/filter/size changes reset page in dedicated helpers. Empty high pages provide navigation rather than silently broadening filters. There is no full server dataset being sorted/filtered for live table rendering. A few repeated class/column patterns are reasonable local presentation duplication.

## 13. Financial Correctness Risks

**NONE_FOUND** for proven arithmetic, request-money-unit or reporting-date corruption in inspected production paths.

Audited representations:

| Value | Representation / transformation | Assessment |
|---|---|---|
| QR/dashboard/stats API amount | safe integer tiyin -> Money { minorUnits: string, currency: UZS, scale: 2 } | Exact runtime validation; no silent major/minor conversion change justified. |
| Create QR input | decimal/grouped string -> BigInt tiyin -> terminal bounds -> safe integer API amount | Exact conversion; Number used only after safe-integer validation. |
| UI amount formatting | BigInt quotient/remainder in shared/money/minor.ts | Exact; preserve trailing scale and currency. |
| Dashboard reconciliation | BigInt sums of counts/amounts | Avoids unsafe JS aggregation; preserves server metrics. |
| Chart engine coordinates | Number(minorUnits)/100 | Approximate visual engine boundary; exact tooltip/accessibility amounts retained. |
| Preview amount display | numeric /100, preview-only | Not a production payment path. |
| Currency amount/rate/serviceFee detail | nullable finite raw numbers | Units are not inferred; displayed raw. Conversion/rounding policy NOT_PROVEN. |
| Presets/date filters | Asia/Tashkent calendar + UTC calendar arithmetic | Browser timezone does not shift reporting date presets. |
| Offsetless backend timestamps | Calendar/wall-clock strings formatted directly | No accidental browser timezone conversion. |
| Dashboard hourly boundaries | Offset-preserving validation + nanosecond BigInt comparisons | Fractional precision and offsets retained. |
| Updated-at UI time | Browser Intl instant time | Local refresh timestamp, not reporting filter boundary. |

Potential interpretation issue, **NOT_PROVEN**: dynamic QR stats queries intentionally include only dates and terminal; table filters also include merchant, bank, status, distribution and search. Summary totals can therefore differ from a narrowly filtered list. Existing query contract/tests support this narrower stats endpoint. Confirm intended labeling/scope with product/backend before changing parameters or claiming financial corruption.

Backend totals beyond JS safe integers are rejected rather than silently rounded. Supporting larger server numeric DTOs would require a separately confirmed wire contract. No financial correctness fix is proposed without that evidence.

## 14. Security Findings

**Confirmed:**

- F17: the installed dependency graph has advisory matches. Critical/high npm labels include transitive parent entries and are not proof of exploitable browser code.
- Both access and refresh tokens persist in localStorage. This is explicitly owner-approved in docs/architecture/AUTH_SESSION_DECISION.md and acknowledged there as readable by same-origin script. It is a known security limitation, not a newly proven XSS exploit and not authorization to replace auth.
- Tokens remain private to session internals, not public auth snapshots/query keys. PIN/OTP/profile/session-stage data is not intentionally persisted.
- The two inspected fetch paths reject redirects and omit cookies.

**Possible / NOT_PROVEN:**

- Effective production CSP and other response headers: vercel.json contains SPA rewrites but no header configuration; a gateway may provide them. Deployed headers were not inspected.
- Browser-bundle reachability or exposed tooling-server attack preconditions for npm advisories.
- Host allowlisting for backend canonical payment links: validation accepts safe HTTPS syntax and rejects credentials; a required fixed hostname contract was not established.
- Dependency/inline-theme-bootstrap hardening needs actual deployment topology and approved policy.

**Non-issues in inspected paths:**

- No dangerouslySetInnerHTML usage, raw HTML injection, token console logging or frontend environment secret was identified.
- JSX text rendering escapes backend names/IDs.
- Canonical links preserve exact original value after scheme/credential validation; unsafe javascript/data schemes are refused.
- safe-return-to restricts navigation instead of trusting arbitrary redirect strings.
- DEV/demo imports are guarded; bounded production marker search returned no matches.
- Frontend permission hiding is not claimed as backend security.
- The device UUID is not a bearer credential; single-owner lease is deliberate.
- Switching credentials: omit to include or changing to HttpOnly cookies requires backend/product work and must not occur as cleanup.

## 15. Testing Gaps

Ranked missing coverage:

1. **F01-F03 real lifecycle coverage:** close/reopen, cancellation, query changes, identity changes and retained controller dependencies.
2. **F04 real QueryClient failure behavior:** preserve confirmed mutation while accurately surfacing failed refetch.
3. **F05 outcome-specific uncertainty messaging:** avoid asserting non-delivery after ambiguous dispatch.
4. **F09 real renderer interaction:** keyboard active bucket through unrelated renders and actual G2 show/hide handling; current tests assert a mocked emitter protocol.
5. **F10 route chunk rejection/recovery:** pending Suspense tests alone do not cover errors.
6. **Browser-only boundaries:** Radix focus/portals/Escape, MoneyInput caret, Web Locks ownership/reload persistence, canvas/download and theme application.
7. **Dependency validation:** clean lockfile install and targeted tooling/bundle reachability after upgrades.

Existing auth, refresh concurrency, query scoping, DTOs, safe return-to, money conversion, date presets, lookup gating, create, P5 reset, export cancellation and destructive controllers have meaningful pure coverage. Keep it. Source assertions are useful boundary checks, but source spelling alone is not evidence that behavior executes correctly. No recommendation to disable isolation or weaken assertions to save test time.

Audit evidence file deliberately asserts current defective behavior. Convert its scenarios to desired-behavior regression tests during implementation; do not treat it as permanent acceptance that duplicate dispatch is correct.

## 16. High-ROI Simplifications

| Rank | Findings | Proposed simplification | Benefit / Risk / Effort |
|---:|---|---|---|
| 1 | F01-F03 | Separate durable dispatch/outcome ownership from current panel/query dependencies. | HIGH / MEDIUM / MEDIUM |
| 2 | F04-F05 | Explicit refresh-success and outcome-specific messages, avoiding contradictory state. | HIGH / LOW / SMALL |
| 3 | F06 | Enable the already-clean strict compiler mode. | HIGH / LOW / SMALL |
| 4 | F07 | Small real lifecycle integration suite instead of expanding hook emulation. | HIGH / LOW / MEDIUM |
| 5 | F08 | Feature ports with explicit current-state contracts; share exact scope mechanics. | HIGH / MEDIUM / MEDIUM |
| 6 | F09 | Prepare chart once per meaningful input; separate interaction reset identity. | MEDIUM / LOW / SMALL |
| 7 | F10 | One meaningful route recovery boundary. | MEDIUM / LOW / SMALL |
| 8 | F12/F14 | Correct status ownership and operational documentation. | MEDIUM / LOW / SMALL |
| 9 | F17 | Target compatible dependency fixes with reachability assessment. | MEDIUM / MEDIUM / MEDIUM |
| 10 | F11/F13 | Provider identity and proven scaffold cleanup. | LOW / LOW / SMALL |
| 11 | F15/F16 | Measured bundle work / approved filter URL behavior. | CONDITIONAL / MEDIUM / MEDIUM |

Classified complexity: auth/token rotation/one-dispatch uncertainty is domain-required; repeated inline transport orchestration is implementation-created debt; separate drafts/applied values are an acceptable UX tradeoff; generic table/store/hook replacements would be premature abstraction.

## 17. Recommended Implementation Plan

Each phase is independently reviewable and must preserve baseline contracts.

1. **Correct assignment lifetime (F01 + focused F07 coverage).**  
   Files: AssignTerminalsPanel.tsx, assign-terminals.ts, CashierTerminalsDialog.tsx, relevant lifecycle tests.  
   Dependencies: none; add the reproducing interaction test first.  
   Regression risk: MEDIUM; preserve uncertain outcome and one dispatch across teardown.  
   Expected benefit: HIGH; remove duplicate-attempt path.

2. **Rebind cashier unassign selection (F02).**  
   Files: CashierPage.tsx, UnassignTerminalPanel.tsx, unassign-terminal.ts, row-action/lifecycle tests.  
   Dependencies: phase 1's durable intent ownership policy.  
   Regression risk: MEDIUM; do not permit replay after destructive dispatch.  
   Expected benefit: HIGH; cancellation/reselection works again.

3. **Rebind P5 query evidence (F03).**  
   Files: P5Page.tsx, p5-reset.ts, P5 lifecycle/reset tests.  
   Dependencies: durable ledger/current evidence distinction established in phases 1-2.  
   Regression risk: MEDIUM; keep unique-row eligibility and unknown acknowledgement.  
   Expected benefit: HIGH; filter changes do not disable reset.

4. **Correct refresh outcomes and P5 wording (F04-F05).**  
   Files: one-dispatch-action.ts, p5-reset.ts, P5ResetDialog.tsx, create-invalidation.ts, create-cashier.ts and tests.  
   Dependencies: none; can be a separate small patch.  
   Regression risk: LOW.  
   Expected benefit: HIGH; truthful outcome/refresh feedback.

5. **Enforce compiler guarantees (F06).**  
   Files: tsconfig.app.json; assess tsconfig.node.json separately.  
   Dependencies: none; strict diagnostic already passes.  
   Regression risk: LOW.  
   Expected benefit: HIGH; prevent nullable/implicit-any regressions.

6. **Resolve dependency advisories (F17).**  
   Files: package.json/package-lock.json; src/index.css only if a supported CSS/tooling separation is needed.  
   Dependencies: advisory path/reachability assessment and compatible versions.  
   Regression risk: MEDIUM; avoid force downgrade.  
   Expected benefit: MEDIUM; cleaner tooling supply chain. Verify clean install/build/styles independently.

7. **Strengthen React integration tests and route recovery (F07/F10).**  
   Files: focused browser/DOM test setup, LiveRoot/LiveRouter recovery boundary and tests.  
   Dependencies: existing pure contracts retained; no broad suite rewrite.  
   Regression risk: LOW.  
   Expected benefit: HIGH for test confidence, MEDIUM for runtime recovery.

8. **Extract repeated live orchestration (F08/F12).**  
   Files: feature live ports/lookup builders, shared scope helper if justified, dashboard/presenters and QR status consumers.  
   Dependencies: phases 1-4 tests protecting lifetime semantics.  
   Regression risk: MEDIUM.  
   Expected benefit: HIGH; fewer scattered contracts and easier tests.

9. **Stabilize measured rendering boundaries (F09/F11).**  
   Files: TrendChart, TrendPlotViewport, trend-presentation, ReadProvider.  
   Dependencies: lifecycle/renderer tests from phase 7.  
   Regression risk: LOW.  
   Expected benefit: MEDIUM for interaction, LOW until provider profiling shows cost.

10. **Small cleanup/documentation patch (F13/F14).**  
    Files: proven scaffold artifacts and README; direct zod declaration only after tooling check.  
    Dependencies: final repository reference scan.  
    Regression risk: LOW.  
    Expected benefit: LOW-MEDIUM; no redesign.

11. **Optional measured/product work (F15/F16).**  
    Files: chart import/build boundary or feature filter/router state.  
    Dependencies: measured cold-load benefit or product-approved URL requirement.  
    Regression risk: MEDIUM.  
    Expected benefit: conditional; not part of automatic cleanup.

For each implementation phase: targeted relevant regressions, then lint/typecheck/tests/build as required before merging. Do not implement all phases in one change. No production edits were made during this audit.

## 18. DO NOT CHANGE

- OTP/PIN/new-PIN/reset stages, exact authority strings and backend endpoint/query/body field names.
- The source/session/access-revision query key boundary and permission rechecks before/after async work.
- Owner-approved token persistence and exclusive auth-device Web Lock policy without a new backend/product decision.
- Refresh single-flight, read-only replay rules and the no-replay-after-mutation-dispatch guarantee.
- Unknown versus not-sent/rejected/confirmed intent states; cancelling UI cannot undo an already dispatched server action.
- Explicit-null void success envelopes; do not accept missing data merely to simplify decoders.
- BigInt money parsing/formatting, UZS tiyin scale and safe integer API guards.
- Tashkent reporting calendars, offsetless backend wall-clock handling and nanosecond hourly comparisons.
- Server summary/pie percentages and reconciliation warnings; do not recompute guessed percentages or round server financial data.
- Distinct draft/applied filter semantics and paused dependent-selection queries; never silently widen stale filters to all merchants/terminals.
- Production cancellation gate for dynamic QR: eligibleRow=false and port=null are intentional until the backend eligibility contract is resolved.
- Dynamic stats feature flag and existing narrow stats query contract without backend/product confirmation.
- Backend pagination, supported sizes, empty-high-page recovery and exact terminal/cashier/P5 status distinctions.
- Existing route/plot lazy boundaries, plot wrappers, accessible exact chart summaries and fallback UI.
- Radix dialogs/menu semantics, aria labels, keyboard support, theme bootstrap and caret layout effect.
- Active shadcn CSS import, cn helper behavior and dev-only preview/test fixtures.
- Existing user working-tree edits, removed tests and milestone reports; audit results do not authorize reverting them.

## 19. Final Verdict

The baseline is green and the architecture merits targeted repairs rather than replacement. Prioritize durable-controller lifetime correctness, then strengthen real lifecycle verification. Arithmetic/reporting correctness issues were not proven. Deployment security, chart timings and staging acceptance remain outside the measured evidence.

```text
AUDIT_STATUS: COMPLETE_SOURCE_AUDIT_WITH_LOCAL_REPRODUCTIONS
PRODUCTION_CORRECTNESS: THREE_P1_LIFECYCLE_DEFECTS; NO_P0_PROVEN
PERFORMANCE: SERVER_PAGINATION_AND_LAZY_BOUNDARIES_GOOD; CHART_IDENTITY_AND_PAYLOAD_REVIEW
MAINTAINABILITY: TARGETED_PORT_AND_OWNERSHIP_SIMPLIFICATION_RECOMMENDED
ARCHITECTURE: SOUND_FOUNDATIONS; RETAIN_CORE_SESSION_QUERY_ACTION_CONTRACTS
TEST_CONFIDENCE: STRONG_PURE_CONTRACTS; LIMITED_REAL_REACT_BROWSER_LIFECYCLE

P0_COUNT: 0
P1_COUNT: 3
P2_COUNT: 8
P3_COUNT: 4
P4_COUNT: 2

SAFE_AUTOMATIC_CLEANUPS: PROVEN_UNREFERENCED_SOURCE_SCAFFOLD; README_UPDATE; STRICT_APP_COMPILATION
REQUIRES_CAREFUL_REFACTOR: F01_F02_F03_CONTROLLER_LIFETIMES; F08_PORT_BOUNDARIES; DEPENDENCY_UPDATES
DO_NOT_TOUCH_WITHOUT_PRODUCT_DECISION: AUTH_PERSISTENCE_COOKIE_CONTRACT; QR_CANCEL_GATE; STATS_SCOPE; URL_FILTER_BEHAVIOR; UNUSED_GROWTH_UI
RECOMMENDED_FIRST_IMPLEMENTATION_PHASE: F01_ASSIGNMENT_CLOSE_REOPEN_ONE_DISPATCH_REGRESSION_AND_FIX
```

