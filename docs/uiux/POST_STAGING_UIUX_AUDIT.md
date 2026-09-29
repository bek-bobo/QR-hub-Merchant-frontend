# QRHub Merchant — Post-staging UI/UX audit

Checkpoint: **UIX.0**  
Date: **2026-09-25**  
Scope: **source and presentation audit only**

## 1. Executive summary

The production frontend has a sound functional base: permission/capability checks, protected reads and mutations, one-dispatch mutation handling, current-session query scoping, loading/empty/error primitives, and horizontal table overflow are already present and should be preserved. The audit found no P0 presentation defect.

### UIX.1 implementation status — 2026-09-25

UIX.1 source and focused tests have been implemented, with command verification intentionally left **unverified** for the user command gate. The checkpoint introduced exact grouped minor-unit presentation, a caret-preserving grouped Dynamic QR amount input, separate shared offsetless/instant time formatters, a styled native Select, and a FormField association pattern. Current money displays plus the existing Dynamic QR/dashboard/P5 timestamp cells were migrated; Dynamic QR create proves the Select/FormField pattern. API requests, request bodies, minor-unit conversion, auth architecture, pagination, filters, headings, and gated actions were not changed. See `docs/uiux/UIX_01_RESULT.md` for the scoped file and guarantee record.

### UIX.2A implementation status — 2026-09-25

UIX.2A source and focused tests have been implemented, with command verification intentionally left **unverified** for the user command gate. Authenticated production pages now own their primary `h1` through a shared `PageHeader`; the shell route label is compact non-heading context. Dashboard, Dynamic QR list/create/export, Static QR, Terminals, Bank Accounts, Cashiers, Cashier Create, P5, Account, and authenticated unavailable/forbidden states were migrated. The persistent navy sidebar remains at `lg` and above, while narrow layouts use an accessible Radix Sheet with a labelled trigger, close control, Escape/outside dismissal, explicit focus return, active-route presentation, and the exact same filtered navigation model as desktop. Route policy, capability filtering, action gates, queries, pagination, filters, API/auth contracts, `Yangi kassir`, and `STG-ISSUE-CASHIER-01` remain unchanged. See `docs/uiux/UIX_02A_RESULT.md` for the scoped record and deferred checkpoint boundaries.

### UIX.2A-R1 correction status — 2026-09-25

The user subsequently reported the UIX.2A command gate PASS (lint, typecheck, 601/601 tests, and build) and manually confirmed mobile/desktop routing, but found the compact shell route context still visibly duplicated the page-owned title. UIX.2A-R1 removes that authenticated route-name text and its `shellTitle` plumbing while preserving the page `h1`, mobile trigger and Sheet relationships, identity/logout controls, persistent `lg+` desktop sidebar, filtered navigation, routing/access policy, and all functional contracts. The optional Header title remains only for the non-production demo shell. Desktop sidebar collapse is deferred as `UIX-FUTURE-DESKTOP-SIDEBAR-COLLAPSE`; the page-size selector remains unchanged and deferred to UIX.2C. The user later confirmed UIX.2A-R1 complete with its scoped command and browser evidence.

### UIX.2A-R2 visual-polish status — 2026-09-26

UIX.2A-R2 tightened the shared page-header spacing and typography without changing heading ownership or feature behavior. `PageHeader` gained a small generic meta slot and a compact responsive grid; Dashboard uses that slot to place `Oxirgi yangilanish` beside its descriptive context while the existing refresh button remains the sole action. The existing timestamp formatter, refresh/query behavior, loading/disabled state, permissions, routes, mobile navigation, desktop sidebar, filters, pagination, API/auth contracts, and staging gates remain unchanged. The user subsequently confirmed UIX.2A-R2 complete with its command and browser gate.

### UIX.2B-R1 implementation status — 2026-09-28

The initial inline-collapse implementation passed its command gate but was superseded before browser acceptance. UIX.2B-R1 now uses one compact `Filtrlar` button per migrated page to open a shared right-side `FilterDrawer`. The existing Radix Sheet owns focus trapping, Escape/overlay dismissal, and focus restoration. Current controls render vertically in one scrolling body, while a non-scrolling footer exposes `Qayta tiklash` and `Qo‘llash`. Close never applies; successful local Apply closes; validation failure stays open; Reset delegates to each page’s prior immediate behavior and stays open. Dashboard, Dynamic QR list/export, Static QR, Terminals, Bank Accounts, Cashiers, and P5 are migrated. The numeric active-filter count is deferred because defaults and dependent lookup states make a uniform count ambiguous. Filter/query/API behavior remains unchanged. See `docs/uiux/UIX_02B_RESULT.md`.

UIX.2C is now implemented pending user command/browser/staging gates. Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, and P5 use a shared zero-based `PaginationBar` with one-based visible labels, authoritative `Jami` totals, deterministic numbered-page windows, and non-actionable ellipses. Their production defaults use the shared `DEFAULT_PAGE_SIZE = 20`; the visible 10/25/50 selectors and production size-mutation paths were removed. Existing filter page resets and feature-owned out-of-range policies remain unchanged, and rendering does not auto-request a corrected page. `STAGING_SIZE_20_VERIFICATION` remains pending. See `docs/uiux/UIX_02C_RESULT.md`.

### UIX.4A Account phone-display status — 2026-09-28

UIX.4A adds a shared string-only Uzbekistan phone display formatter and applies it only to the authenticated Account page. Supported `998XXXXXXXXX` and `+998XXXXXXXXX` values render as `+998 XX XXX XX XX`; malformed values remain visible after trimming, and nullish values render neutrally. The source profile value, API/wire contracts, profile fetching, refresh/logout behavior, and auth/session logic remain unchanged. At the UIX.4A handoff, Login and cashier phone-input UX remained deferred; UIX.4B below supersedes that input status. UIX.4A command and browser verification are pending and are not marked PASS. See `docs/uiux/UIX_04A_RESULT.md` for the scoped record.

### UIX.4B editable phone-input status — 2026-09-29

UIX.4B locally adds a shared `UzbekPhoneInput` with a fixed `+998` prefix, nine local subscriber digits, derived `XX XXX XX XX` grouping, and explicit local-to-wire conversion. Login and Cashier Create both continue to send the confirmed `998XXXXXXXXX` string; their controller/DTO validation boundaries remain unchanged. Local, full `998...`, and full `+998...` paste forms are supported with harmless separators, while alphabetic, wrong-prefix, and overlength input is rejected without truncation. Command and 390px/320px browser gates remain pending. See `docs/uiux/UIX_04B_RESULT.md`.

### UIX.5A column-preferences foundation status — 2026-09-29

UIX.5A locally implements a pure stable-ID order normalizer, the shared versioned `qrhub:table-columns:v1` storage adapter, a small React state bridge, and an accessible Up/Down preferences Sheet. Dynamic QR is the only production pilot: its exact seven-column default remains unchanged, and one feature-owned resolved definition sequence now renders both headers and cells. Explicit moves update immediately and use latest-payload read-modify-write persistence; current-table reset preserves other valid table entries, and unavailable or malformed storage is nonfatal. `TableScrollRegion`, filters, pagination, queries/API behavior, row order, permissions, and the cancel gate are unchanged. The remaining six tables stay deferred to UIX.5B/UIX.5C. Command and manual browser gates are pending; UIX.5 is not complete. See `docs/uiux/UIX_05A_RESULT.md`.

The main polish work is cross-cutting rather than a collection of isolated CSS fixes. Money, phone, offsetless date/time, page headings, filters, pagination, status presentation, long identifiers, and table definitions need small shared foundations before page-by-page migration. Refresh-after-reload is deliberately separate: it is an `AUTH_SESSION_PERSISTENCE_DECISION`, not a visual fix.

Recommended defaults and decisions:

- Use grouped display amounts and a caret-safe grouped amount input while preserving exact `bigint` minor-unit serialization.
- Use a shared Uzbekistan phone field with a non-editable visual `+998` prefix and nine editable local digits; normalize the final wire value to `998XXXXXXXXX`.
- Adopt a fixed frontend page size of **20**, subject to a small staging verification. Backend web list resources accept an integer `size`; the current `10 | 25 | 50` restriction is frontend-owned.
- Format backend `LocalDateTime`-style values lexically as `dd.MM.yyyy HH:mm`; do not pass offsetless values through `Date`.
- Let each page own its primary `h1`; the shell header should render route context as non-heading text.
- Introduce column metadata before attempting reordering. Persist a versioned order per table in `localStorage`; offer keyboard move controls and reset-to-default, with drag as an enhancement.
- Do not persist tokens until senior/backend/security stakeholders approve the browser threat model and storage mechanism.

## 2. User-reported items

### UIX-01 — Money / amount visual grouping

- **Classification / priority:** `UX_FRICTION`, P1.
- **Source:** global display formatter in `src/shared/money/minor.ts`; create input parsing in `src/features/dynamic-qr/create-amount.ts`; create/result/list views in `CreateQrPage.tsx`, `CreateQrResult.tsx`, and `DynamicQrTable.tsx`; dashboard views in `DashboardReadPage.tsx`, `MetricCards.tsx`, and `TrendChart.tsx`.
- **Current behavior:** `formatMinorUnits` performs exact `bigint` scaling but emits an ungrouped whole part such as `100000.00 UZS`. The create field stores raw text and `parseCreateAmount` converts the decimal business amount to exact minor units. Terminal create limits reuse the ungrouped display formatter. No other currently rendered management table contains an amount field.
- **Desired behavior:** display whole digits with stable space grouping while retaining the contract scale; show a grouped, caret-safe business-amount input; serialize exactly the same integer minor units as today.
- **Contract/API impact:** none. Input formatting, display formatting, and wire conversion must remain separate. `1000.00 UZS` must still serialize as `100000` minor units.
- **Accessibility / responsive:** do not make separators part of the semantic label; keep a clear currency label and decimal keyboard. Grouping materially improves scanning on narrow screens.
- **Tests:** exact positive/negative/zero, very large string amounts, scales 0/2, decimal comma/dot, paste with grouping, caret edits, min/max validation, and unchanged create request payload.
- **Complexity / reuse:** medium. Add `MoneyDisplay`/grouping utility and a focused `MoneyInput` adapter; keep `parseCreateAmount` or its exact equivalent as the wire boundary.
- **Checkpoint:** UIX.1 foundation and UIX.3 table reuse locally implemented; command/browser gates pending.

### UIX-02 — Uzbekistan phone prefix UX

- **Classification / priority:** `UX_FRICTION`, P1, with accessibility impact.
- **Source:** login presentation/normalization in `src/features/auth/LoginForm.tsx` and `validation.ts`; login flow validation in `src/shared/auth/login-controller.ts`; cashier creation in `src/features/cashiers/CreateCashierPage.tsx` and `create-cashier.ts`.
- **Current behavior:** UIX.4B locally implements a visible, non-editable `+998` prefix with nine editable local digits for Login and Cashier Create. Both derive `XX XXX XX XX`, tolerate unambiguous local/`998...`/`+998...` paste, and retain the final `998XXXXXXXXX` wire value.
- **Desired behavior:** implemented locally; user command and 390px/320px browser gates remain pending.
- **Contract/API impact:** none if normalization remains at the component boundary. Login/reset stages reuse the already captured number; there is no separate reset phone input.
- **Accessibility / responsive:** expose the prefix as part of the accessible field name/value guidance, retain `type="tel"`/`inputMode="tel"`, associate errors, and avoid a placeholder-only label.
- **Tests:** typing, paste variants, excess/non-digit input, selection/backspace, autofill, screen-reader label/error association, and exact login/cashier request values.
- **Complexity / reuse:** implemented with one shared `UzbekPhoneInput` and small pure parsing/formatting/wire helpers. No masking dependency was added.
- **Checkpoint:** UIX.4B locally implemented; verification gates pending.

### UIX-03 — Browser tab / app identity

- **Classification / priority:** `VISUAL_POLISH`, P2.
- **Source:** `index.html`, `public/favicon.svg`, `public/icons.svg`, and `src/assets`.
- **Current behavior:** the title is already `QRHub Merchant`, but the favicon is still the purple Vite mark. Unused `react.svg` and `vite.svg` assets remain. No manifest exists, and none is required for this scope.
- **Desired behavior:** a small QRHub-compatible favicon/mark, consistent `QRHub Merchant` naming, and an optional useful `theme-color` matching the navy shell. Remove default identity assets only after confirming they are unreferenced.
- **Contract/API impact:** none.
- **Accessibility / responsive:** favicon changes are neutral; preserve the document language (`uz`) and a meaningful title.
- **Tests:** static metadata assertion and manual browser-tab checks at 16/32 px and light/dark browser chrome.
- **Complexity / reuse:** low; no PWA expansion.
- **Checkpoint:** UIX.4.

### UIX-04 — Refresh causes logout

- **Classification / priority:** `SECURITY_OR_ARCHITECTURE_DECISION`, P1.
- **Source:** `src/shared/auth/session-controller.ts`, `AuthProvider.tsx`, `device-lease.ts`, `login-controller.ts`, `src/shared/api/auth-api.ts`, and auth contracts; read-only backend references in `TokenResource`, `TokenServiceImpl`, and token DTOs.
- **Current behavior:** `SessionController.tokenState` holds both access and refresh tokens only in RAM. `AuthProvider` creates a fresh anonymous controller on application startup and has no persisted-session bootstrap. The local-storage-backed device lease stores a device UUID/ownership coordination value, not credentials. Therefore a full reload necessarily loses the token pair and routes to login.
- **Desired behavior:** only after an approved security decision, startup may reacquire the device lease, use a persisted refresh capability, rotate it through `/token/refresh`, establish the in-memory session, call `GET_ME`, and clear persisted state on terminal refresh failure/logout.
- **Contract/API impact:** the current backend can technically support client-managed restoration because `/token/refresh` accepts a refresh token in a JSON body and returns a rotated access/refresh pair. The inspected backend does not expose an HttpOnly-cookie refresh flow. A materially safer cookie design therefore requires backend/gateway, CORS, SameSite, and CSRF work.
- **Accessibility / responsive:** not a visual or device-width concern; failure/recovery messaging must remain understandable and keyboard reachable.
- **Tests:** reload bootstrap success/failure, single-use refresh rotation, stale-token replay, concurrent tabs/device lease, cache isolation, logout, revoked/expired token, network ambiguity, and no token leakage in logs/errors.
- **Complexity / reuse:** high and security-sensitive. Keep out of cosmetic checkpoints.
- **Checkpoint:** UIX.AUTH only after explicit decision approval.

Detailed decision answers:

1. **Why reload logs out:** all credential and profile/session state is RAM-only; startup has no credential from which to bootstrap.
2. **Frontend or backend:** the present logout is caused by frontend architecture. The safest remediation mechanism is backend-contract dependent.
3. **Can existing APIs restore:** technically yes, if the browser persists a valid refresh token. Refresh returns a rotated pair; the frontend can then establish a session and run `GET_ME`. That is not automatically “safe” merely because it is possible.
4. **What must persist:** at minimum the current refresh token plus a schema/version and enough expiry/session metadata to reject obviously stale state. Access tokens and profile/query data need not be persisted. Device lease acquisition must precede adoption.
5. **Storage consequences:**
   - `localStorage`: survives restarts and is simple, but any same-origin XSS can steal a long-lived bearer refresh token; multi-tab synchronization and explicit cleanup are required.
   - `sessionStorage`: still readable by XSS, but is tab-scoped and normally ends with the tab; it does not provide restart persistence and complicates multi-tab behavior.
   - HttpOnly `Secure`, appropriately `SameSite` cookie: hides the token from JavaScript and is the preferred browser direction, but needs server cookie issuance/rotation, credentialed requests, CSRF analysis, and CORS alignment.
   - “Encrypted” browser storage: encryption whose key is available to the same JavaScript origin is mainly obfuscation against storage inspection, not protection from active XSS. A user-held/OS-bound key would be a different product flow.
   - No persistence: strongest current protection against token-at-rest theft and simplest lifecycle, but guarantees relogin after reload/restart.
6. **Current safer backend option:** no HttpOnly-cookie mechanism was found. The server does have single-use refresh-token rotation and server-side status/revocation, which is useful but does not remove browser storage risk.
7. **Why Flutter differs:** a native client can store refresh credentials in OS-backed Keychain/Keystore and its process lifecycle differs from a browser document reload. That security/storage model cannot be copied directly to web storage.
8. **Required confirmation:** security/backend/product owners must approve the threat model, acceptable persistence duration, cookie feasibility, refresh rotation/reuse response, revocation/logout semantics, CSRF/CORS rules, tab/device ownership behavior, and recovery UX before implementation.

### UIX-05 — Remove page-size control from filters

- **Classification / priority:** `UX_FRICTION`, P2.
- **Source:** six list pages and their page-state/contracts: Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, and P5. Dashboard recent items also request size 10 but do not expose a selector.
- **Current behavior:** UIX.2C implementation uses one shared production default of 20 and removes the visible selectors and their production mutation handlers from all six target lists. Legacy size literals remain compatible only for unrelated fixtures/contracts.
- **Desired behavior:** remove selectors and use one `DEFAULT_PAGE_SIZE = 20` for the six lists; keep dashboard preview sizing separately intentional. Twenty is the more conventional balance for a desktop merchant table. Backend resource parameters accept integer `size`, use SQL `LIMIT`, and show no 10/25/50 enum restriction; verify 20 once in staging before rollout.
- **Contract/API impact:** no backend change expected, but frontend types/query guards and fixtures must be migrated together. Pagination page resets remain unchanged.
- **Accessibility / responsive:** removes a control and vertical density, especially on mobile. Page navigation must still announce current/total pages.
- **Tests:** all query serializers, defaults, page-reset behavior, result fixtures, empty/last-page navigation, and one staging request per endpoint during the implementation checkpoint.
- **Complexity / reuse:** low-to-medium because the value is duplicated widely. Centralize list pagination configuration and a shared pagination control.
- **Checkpoint:** UIX.2C implemented pending command/browser gates and required staging verification for `size=20`.

### UIX-06 — Created date/time presentation

- **Classification / priority:** `UX_FRICTION`, P1.
- **Source:** `formatOffsetlessDateTime` in `src/features/dashboard/presenters.ts`; Dynamic QR, dashboard recent QR, and P5 result tables. Static/terminal/bank/cashier contracts contain timestamps in backend DTOs, but their current frontend row contracts/tables do not render them.
- **Current behavior:** the shared function only replaces `T` with a space, leaving seconds and fractional precision. Separately, client-side query update times use `Intl.DateTimeFormat` on epoch milliseconds and include seconds.
- **Desired behavior:** strictly validate and lexically format offsetless backend values as `dd.MM.yyyy HH:mm`, retaining the original value or a safe placeholder on unsupported input. Keep client epoch update times as a separate “instant” formatter. Do not append `Z` or construct a `Date` from backend `LocalDateTime` text.
- **Contract/API impact:** presentation only; server sorting/filtering and raw contracts remain unchanged. Read-only backend DTOs use Java `LocalDateTime`, confirming the absence of an offset in these list values.
- **Accessibility / responsive:** use `time` only if its `dateTime` value accurately represents the offsetless source; compact output helps narrow tables. An accessible full-precision value is optional, not required for routine reading.
- **Tests:** fractional/no-fraction inputs, leap dates, malformed values, no timezone shift under multiple test timezones, and unchanged raw query data.
- **Complexity / reuse:** low. Move the formatter out of the dashboard feature into shared presentation code, optionally wrapped by `DateTimeDisplay`.
- **Checkpoint:** UIX.1 foundation and UIX.3 table reuse locally implemented; command/browser gates pending.

### UIX-07 — Collapsible filter panels

- **Classification / priority:** `UX_FRICTION`, P1.
- **Source:** filter cards on Dashboard, Dynamic QR, Static QR, Terminals, Bank Accounts, Cashiers, P5, and the separate export page.
- **UIX.2B-R1 implementation:** one shared `FilterDrawer` gives all eight real filter surfaces a compact `Filtrlar` trigger and right-side Sheet. The prior inline-collapse presentation was removed before browser acceptance.
- **Terminology:** shared headings use `Filtrlar`; the audited `Filterlar` and `Filterlash` presentation copy was normalized without rewriting grammatical helper phrases such as `terminal filtri`.
- **Contract/API impact:** none. Sheet open/close never applies, clears, or refetches. Successful explicit Apply may close locally; validation failure remains open; Reset preserves each page’s established contract.
- **Accessibility / responsive:** the semantic trigger and existing Sheet provide keyboard activation, visible focus, focus trap/restoration, Escape/overlay dismissal, a labelled close control, viewport-safe width, one scrolling body, and a reachable footer.
- **Tests:** shared closed-trigger terminology plus pure open/close, Apply-success, Apply-failure, close-without-Apply, draft-retention, and Reset-delegation behavior. Existing feature tests continue to own filter/query semantics.
- **Complexity / reuse:** medium. One shared Sheet owns presentation state and action delegation; page-specific fields and all feature behavior remain local.
- **Checkpoint:** UIX.2B-R1 implemented pending user command gate.

### UIX-08 — User-reorderable table columns

- **Classification / priority:** `UX_FRICTION`, P2.
- **Source:** Dynamic QR and dashboard tables use shared `Table` pieces but hardcode column JSX; Static QR, Terminal, Bank Account, Cashier, and P5 tables use hardcoded native tables. No column-model or drag dependency exists.
- **Current behavior:** presentation order is static. Server row order, sorting, filtering, and permissions are independent of column JSX.
- **Desired behavior / answers:**
  1. Current JSX cannot support reliable generic reorder until columns become metadata (`id`, label, cell renderer, width/priority, movable/visible flags).
  2. Start with Dynamic QR; then Static QR, Terminal, Bank Account, Cashier, and P5 after they share the table foundation. Dashboard recent QR may reuse the model but should keep a deliberately compact default.
  3. Client-only column order does not need to alter API queries or server row order.
  4. Persist a versioned array of column IDs in `localStorage`, per user/table where a stable non-sensitive user key is available; otherwise per table/device. Ignore unknown IDs and append newly introduced defaults.
  5. Provide “Standart tartibni tiklash” per table.
  6. Provide keyboard move-left/move-right controls (and clear announcements) as the baseline. Pointer drag must not be the only mechanism.
  7. On mobile, prefer a column chooser and priority defaults; do not require precision dragging in a horizontally scrolling grid.
  8. Selection/action columns should remain fixed at an edge. At least one identity column should stay visible; gated action columns must remain permission-controlled.
  9. Native HTML drag-and-drop is weak on touch and keyboard. After metadata migration, a small maintained drag library such as dnd-kit is justified only if pointer drag is still required; keyboard buttons can ship dependency-free first.
  10. Complexity is high across all tables, medium for a Dynamic-QR-only pilot.
- **Contract/API impact:** presentation only. Never feed preference order into API sort/filter/query construction.
- **Tests:** schema migration, malformed/stale storage, new/removed columns, reset, permissions, keyboard reorder, focus retention, mobile chooser, and unchanged request/query data.
- **Checkpoint:** UIX.3 readability foundation locally implemented without column metadata; column models and opt-in reordering remain deferred to UIX.5.

### UIX-09 — Duplicated page titles

- **Classification / priority:** `VISUAL_POLISH`, P1, with semantic-heading impact.
- **Source:** `src/app/layout/Header.tsx` renders the route title as `h1`; individual pages render the same label as `h2`. Route titles are supplied from `LiveRouter.tsx`.
- **Current behavior:** authenticated routes visually repeat titles and use the shell title as the document’s primary heading, while the actual page starts at `h2`.
- **Desired behavior:** page owns one visible `h1` through a shared `PageHeader`; shell header renders route context as plain text (or future breadcrumb), identity, and mobile navigation controls. Route metadata continues to supply the shell label. Error/unavailable routes also need one page-level primary heading.
- **Contract/API impact:** none.
- **Accessibility / responsive:** restores one clear primary heading per page and avoids duplicated announcements. Mobile shell context can stay compact without competing with content hierarchy.
- **Tests:** route-by-route heading count/order, unavailable/403/404 states, long title truncation, and narrow header layout.
- **Complexity / reuse:** medium because all routes migrate together.
- **Checkpoint:** UIX.2A.

## 3. Additional audit findings

| ID | Finding | Category | Priority | Recommendation / checkpoint |
|---|---|---|---|---|
| AF-01 | `LiveShellLayout` renders the full sidebar as a normal block on small screens, and `LiveRouter` never supplies `Header.onOpenNavigation`; mobile users encounter the entire navigation before page content. | `RESPONSIVE` | P1 | Add an accessible sheet/drawer with focus return and keep the desktop sidebar at `lg`; UIX.2A. |
| AF-02 | Static QR, Terminal, Bank Account, and Cashier tables previously exposed raw numeric status codes while Dynamic QR/P5 used labelled badges. | `UX_FRICTION` | P1 | Theme 4/4P completed the confirmed `Faol` / `Noma’lum` mappings. UIX.3 preserves those presenters and semantic badges without exposing raw unknown codes. |
| AF-03 | Long QR/device/terminal IDs and account numbers previously used either `break-all` or ad-hoc visual truncation. | `UX_FRICTION` | P1 | UIX.3 locally implements shared `MetadataId`: short values remain unconstrained; long values are visually constrained while the exact selectable value remains in the DOM and native `title`. No copy-button system was added. User command/browser gates pending. |
| AF-04 | Several invalid fields are not programmatically associated with their error text: for example create-amount has `aria-invalid` without `aria-describedby`, and management filter alerts are often page-level only. | `ACCESSIBILITY` | P1 | Standardize field IDs, help/error IDs, and focus-on-submit-error behavior; UIX.1/UIX.2. |
| AF-05 | Five feature tables used native markup while newer tables used shared table components, producing inconsistent density. | `VISUAL_POLISH` | P2 | UIX.3 locally migrates Static QR, Terminal, Bank Account, Cashier, and P5 to the existing shared table primitive and one shared scroll-region presenter. No generic `DataTable` framework or column model was added. User command/browser gates pending. |
| AF-06 | The six server-paginated lists now share zero-based `PaginationBar` state, localized authoritative totals, numbered pages, and deterministic ellipses. | `UX_FRICTION` | P2 | Implemented in UIX.2C; command/browser/staging gates pending. |
| AF-07 | UIX.2B normalized filter headings to `Filtrlar` and the remaining audited `Filterlar`/`Filterlash` presentation copy to the same Uzbek root. | `VISUAL_POLISH` | P2 | Implemented pending the UIX.2B user command gate. |
| AF-08 | Native selects use ad-hoc `p-2` styling while shared inputs are `h-8`; form rows can have uneven control height, focus treatment, and disabled styling. | `VISUAL_POLISH` | P2 | Add/reuse a shared select control before filter migration; UIX.1. |
| AF-09 | `Yangi kassir` is a peer primary navigation item although it is an action subordinate to `Kassirlar`, increasing a long flat navigation list. | `UX_FRICTION` | P2 | Keep route/permissions unchanged; move the entry to a Cashiers page action or grouped subnavigation after STG cashier investigation; UIX.2, gated by `STG-ISSUE-CASHIER-01`. |
| AF-10 | `@fontsource-variable/geist` is installed but not loaded; CSS declares Inter without bundling it, so typography depends on client availability and can vary by OS. | `VISUAL_POLISH` | P2 | Choose and explicitly load one bundled product font or intentionally use a system stack; UIX.4. |

Positive/no-change observations:

- Shared `LoadingState`, `EmptyState`, `ErrorState`, and `NoAccessState` already provide a consistent base and should be extended rather than replaced.
- Button and input primitives have visible `focus-visible` rings and disabled styling.
- Data tables are generally inside focusable, labelled horizontal-scroll regions; retain this behavior during migration.
- Destructive and ambiguous mutations already use careful result language and one-dispatch protections. UI polish must not weaken those safeguards.
- Navy sidebar and red accent are coherent and need no redesign.

## 4. Shared-component opportunities

| Foundation | Pages affected / duplication removed | Risk | Migration order |
|---|---|---|---|
| `MoneyDisplay` + exact grouping utility | Dashboard, Dynamic QR list/create/result, terminal amount bounds | Medium: precision/scale regressions | Utility tests, displays, then caret-safe `MoneyInput` |
| `UzbekPhoneInput` + local/wire helpers | Login/reset flow and cashier create | UIX.4B locally implemented; paste/autofill/caret browser gate pending | Shared parser/formatter/component, then explicit feature wire boundaries |
| Shared offsetless and instant date formatters | Dynamic QR, dashboard, P5; future management timestamp cells | Low if kept lexical | Formatter tests, current cells, future cells |
| `Select` / `FormField` error association | All filter/create forms | Low-to-medium | Primitives first, then touched forms |
| `DEFAULT_PAGE_SIZE` + `PaginationBar` | Six paginated lists | Implemented locally; staging compatibility remains unverified | Verify `size=20` on every affected staging endpoint before completion |
| `FilterDrawer` | Dashboard and seven filter surfaces | Implemented: right Sheet, scrolling body, fixed footer, local presentation state | Shared primitive plus all eight real filter surfaces in UIX.2B-R1 |
| `PageHeader` and title ownership rule | All authenticated routes and error states | Medium: semantic regression if partial | Shell contract and all routes in one checkpoint |
| Shared `Table` + `TableScrollRegion` + `MetadataId` | All GET/list tables | UIX.3 locally implemented; command/browser gates pending | Existing shared primitive retained; simple read-only tables and action tables migrated without introducing column metadata |
| Domain status presenters | Static QR, terminals, bank accounts, cashiers; preserve existing Dynamic/P5 | High if mappings are guessed | Confirm mappings per domain, then migrate; unknown stays neutral/raw |
| Versioned column preferences | Eligible metadata-driven tables | High: accessibility/storage migration | Only after DataTable foundation; Dynamic QR pilot first |

## 5. Priority matrix

### P0

None identified within UI/UX presentation scope. Existing contract/backend gates must not be relabelled as UI P0s.

### P1

- UIX-01 money readability without wire changes — `UX_FRICTION`.
- UIX-02 phone-prefix input consistency — `UX_FRICTION`.
- UIX-04 session persistence decision — `SECURITY_OR_ARCHITECTURE_DECISION`.
- UIX-06 timestamp readability/semantics — `UX_FRICTION`.
- UIX-07 collapsible filters — `UX_FRICTION`.
- UIX-09 one primary page heading — `VISUAL_POLISH`.
- AF-01 mobile navigation — `RESPONSIVE`.
- AF-02 raw status codes — `UX_FRICTION`.
- AF-03 long identifiers — `UX_FRICTION`.
- AF-04 form error association — `ACCESSIBILITY`.

### P2

- UIX-03 browser identity — `VISUAL_POLISH`.
- UIX-05 fixed page size — `UX_FRICTION`.
- UIX-08 reorderable columns — `UX_FRICTION`.
- AF-05 through AF-10 as classified above.

## 6. Proposed checkpoint sequence

1. **UIX.1 — Presentation and form foundations:** exact grouped money display/input, offsetless/instant date formatting, shared select/form-field error associations; no API changes.
2. **UIX.2A — Page structure and responsive shell:** page-owned `h1`, mobile navigation drawer, and shared page headers.
3. **UIX.2B — Filter presentation:** compact `Filtrlar` trigger and right-side Sheet with explicit Apply/Reset while preserving all draft/applied query semantics.
4. **UIX.2C — Pagination only:** implemented locally with fixed page size 20 and shared pagination; command/browser gates and staging verification for `size=20` remain pending.
5. **UIX.3 — Table readability and metadata:** locally implemented with consistent identifiers, shared table/scroll presentation, existing date/money/status presenters, and management-table migration. Column models and reordering remain deferred; command/browser gates pending.
6. **UIX.4 — Phone and product identity:** UIX.4A display and UIX.4B Login/Cashier Create input work are locally implemented with verification gates pending; favicon/title/theme/font cleanup remains separate.
7. **UIX.5 — Column preferences and reordering:** versioned per-table preferences, reset, keyboard ordering, mobile chooser, then optional drag enhancement.
8. **UIX.AUTH — Session persistence decision:** architecture decision record and threat-model approval first; implementation only in a separately authorized checkpoint.
9. **UIX.FINAL — Regression and polish:** source tests plus authorized browser checks for responsive layout, keyboard/focus, screen-reader semantics, visual consistency, and unchanged request behavior.

## 7. Explicit deferred and gated items

- **B-08 — Static QR payload/presentation:** remains open and separate. UIX work may improve generic table chrome but must not infer missing Static QR semantics.
- **B-09 — Dynamic QR returned-link presentation:** remains open and separate. Do not expand link behavior during table/result polish.
- **Dynamic QR cancel:** `CONTRACT_GATED`; no enablement or indirect opening.
- **P5 reset:** `CONTRACT_GATED`; no enablement or indirect opening.
- **STG-ISSUE-CASHIER-01:** `BACKEND_RUNTIME`; UIX may style existing surfaces but must not claim to resolve runtime behavior.
- **Status mappings:** raw codes cannot become friendly labels until each domain mapping is confirmed; unknown values must remain visible and neutral.
- **Session persistence:** no token storage change without UIX.AUTH approval.

## 8. No-change areas to preserve

- Staging auth/login flow and exact auth API contracts.
- Dashboard and all current list reads.
- Dynamic QR real create transport and exact minor-unit payload.
- Dynamic QR export behavior.
- Exact permission/capability policy and route visibility.
- `protectedRead`/`protectedMutation`, refresh rotation, and one-dispatch mutation safety.
- Current-scope query keys, cache cleanup, invalidation, and stale-result rejection.
- DEV/production isolation.
- Server-side pagination, filtering, row ordering, and API data contracts.
- Accessible focus rings, labelled table scroll regions, and shared async-state behavior.

This document authorizes no production-source, backend, API-contract, or gated-action change.
