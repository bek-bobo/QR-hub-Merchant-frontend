# QRHub Merchant Frontend — Day 04 additional changes

## AC-01 — LiveShellLayout desktop navy sidebar

The current `src/app/layout/LiveShellLayout.tsx` renders the live navigation in a navy `<aside>` beside the header/main workspace at desktop width (`lg:grid`, 15rem sidebar). It receives `navigationItems` from `LiveRouter` and renders their supplied paths and labels as `NavLink`s. The sidebar is a presentation change. Navigation item definitions, exact access policy, routing decisions and `LiveRouter` behavior were not changed by AC-01.

`src/app/layout/LiveShellLayout.test.tsx` checks that supplied navigation appears in the sidebar and header/main content stays in the workspace column. The latest user verification reported lint PASS (two accepted shadcn warnings), typecheck PASS, 385/385 tests in 53/53 files PASS, build PASS, desktop visual PASS and responsive sidebar PASS. Other D4.7B browser/manual and production-isolation checks were also reported PASS. These checks do not establish staging integration.

## Closeout boundary

This record documents the source-visible additional change and user evidence. It adds no feature behavior, does not assert staging integration, and starts no Day 05 work. Day 04 frontend status is `DAY_04_FRONTEND_COMPLETE_STAGING_PENDING`; staging is the next external integration milestone. Production deployment is out of scope.
