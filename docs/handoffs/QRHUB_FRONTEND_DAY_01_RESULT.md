# QRHub Merchant Frontend — Day 01 Result

**Status:** `DAY_01_COMPLETE`  
**Live readiness:** `LIVE_INTEGRATION_BLOCKED_BY_EXTERNAL_CONTRACTS`

## Target and scaffold

- Frontend root: `D:\QR projects\qrhub-merchant-frontend`
- Node baseline supplied by the user: 24.14.0; npm: 11.9.0
- Scaffold: React 19.3.0, React DOM 19.3.0, Vite 8.3.0, TypeScript 6.0.3
- UI: Tailwind CSS 4.3.3, shadcn 4.21.0, Radix UI 1.6.7, Lucide 1.45.0
- App libraries: React Router 8.3.1, TanStack Query 5.102.8, Zod 4.6.2
- Tooling: Vitest 5.0.0, Oxlint 1.82.0

Versions above are resolved values from `package-lock.json` (lockfile version 3).

## Implemented checkpoints

Day 01 delivered the Vite/React/TypeScript foundation; Tailwind CSS v4 with
shadcn/Radix; a fail-closed demo/live runtime boundary; QueryClient provider;
fail-closed access policy; responsive shell; synthetic personas; dashboard
preview with seven synthetic QR rows and local search/filter controls; shared
async UI states; an inert contract registry; two pure policy test files; and
the supporting architecture, contract-gap, verification, and handoff docs.

## Day 01 files changed or created

- Root/config: `.env.example`, `.gitignore`, `.nvmrc`, `README.md`, `components.json`,
  `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`,
  `tsconfig.app.json`.
- Bootstrap/theme: `src/App.tsx`, `src/index.css`, `src/main.tsx`.
- App: `src/app/AppProviders.tsx`, `src/app/AppRouter.tsx`,
  `src/app/navigation.ts`, `src/app/layout/AppShell.tsx`,
  `src/app/layout/Header.tsx`, `src/app/layout/Sidebar.tsx`.
- Access/config: `src/shared/auth/access.ts`, `src/shared/auth/access.test.ts`,
  `src/shared/auth/AccessContext.tsx`, `src/shared/auth/useAccessContext.ts`,
  `src/shared/config/runtime.ts`, `src/shared/config/runtime.test.ts`.
- Shared: `src/shared/contracts/endpoints.ts`, `src/shared/ui/AsyncState.tsx`,
  `src/shared/ui/SystemPages.tsx`, `src/lib/utils.ts`.
- Preview: `src/dev/DemoRoot.tsx`, `src/dev/dashboard.fixture.ts`,
  `src/features/dashboard/DashboardPage.tsx`,
  `src/features/dashboard/PreviewQrTable.tsx`,
  `src/features/dashboard/format.ts`, `src/features/dashboard/model.ts`.
- Generated shadcn UI: `badge.tsx`, `button.tsx`, `card.tsx`, `input.tsx`,
  `sheet.tsx`, and `table.tsx` under `src/components/ui`.
- Documentation: `docs/architecture/FRONTEND_FOUNDATIONS.md`,
  `docs/contracts/CONTRACT_GAPS.md`, and this report.

The workspace does not expose Git metadata at the frontend root, so this list is
reconstructed from the supplied Day 01 history and current scoped files.

## Scaffold adaptation

The Vite scaffold selected Oxlint, so Day 01 preserved it instead of migrating
to ESLint. Final user evidence reports **0 lint errors**. The remaining
`react(only-export-components)` warnings in generated shadcn `button.tsx` and
`badge.tsx` are non-blocking generated-source warnings. Generated files and the
lint rule remain unchanged.

## Verification evidence

| Check | Status | Runner/evidence |
| --- | --- | --- |
| ETAP 4 dashboard metrics and seven-row fixture | PASS | User browser verification |
| Search, status filter, reset, stable metrics | PASS | User browser verification |
| Permission separation and denied persona restore | PASS | User browser verification |
| Desktop behavior and 390px responsive/table-only scroll | PASS | User browser verification |
| Unknown/scheduled routes and mobile Sheet | PASS | User browser verification |
| Final lint | PASS | User: 0 errors; only non-blocking generated shadcn warnings in `button.tsx` and `badge.tsx` |
| Final typecheck | PASS | User-supplied result |
| Policy unit tests | PASS | User: 2 test files and 6 tests passed |
| Final production build | PASS | User-supplied result |
| Development server | PASS | User-supplied result |
| `/dev/ui` loading, empty, error/retry, no-access, unknown status | PASS | User browser verification |
| Production integration-unavailable screen | PASS | User: no demo toolbar or dashboard rendered |
| Production bundle `DEMO-QR-` marker search | PASS | User: demo fixture absent from production bundle |

## Contract gaps and Day 02 inputs

Day 02 requires authoritative shared qh-lib contracts, exact success/error
envelopes, enum/stage serialization, authority strings, role assignments,
deployed auth/web bases, browser CORS/transport evidence, an explicit auth
persistence architecture, dashboard field semantics, and confirmed currency,
cancel, and mutation replay semantics.

Auth design must account for device/session headers, known-device PIN branches,
set-pin followed by check-pin, attempt lockouts, atomic token-pair replacement,
single-use refresh coordination, and cross-tab/device behavior. No choice or
implementation is made by Day 01.

## Foundation rationale

Feature modules keep business presentation separate from shared infrastructure.
Design tokens preserve a consistent QRHub surface. QueryClient establishes one
server-state lifecycle. Distinct synthetic preview models prevent invented wire
contracts. Fail-closed capabilities prevent unknown roles or authority names
from silently granting access.
