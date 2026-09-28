# QRHub Merchant Frontend — Day 03 Result

**STATUS:** `DAY_03_FRONTEND_COMPLETE_LIVE_BLOCKED`

**LIVE_READINESS:** `LIVE_CONTRACT_BLOCKED`

Day 03 frontend implementation and its deterministic development verification
surface are complete. Deployed backend integration has not been runtime
verified, so this result does not claim live readiness or `DAY_03_COMPLETE`.

## Implemented

- **D3.0:** Closed the Day 02 review items, configured the statically confirmed
  auth decoder, and registered exact `profile.read -> GET_ME` authority
  handling while keeping actual grants runtime/DB-managed.
- **D3.1:** Confirmed dashboard, dynamic-QR, and terminal-lookup contracts and
  registered `GET_DASHBOARD`, `GET_DYNAMIC_QRS`, and
  `GET_DROPDOWN_TERMINALS` without aliases or role inference.
- **D3.2:** Added the normalized protected-read bridge, independently gated
  read registrations, session/access-scoped query keys, stale-scope rejection,
  and read-cache cleanup through the existing auth/session lifecycle.
- **D3.3:** Added the dashboard read presentation with applied date/terminal
  filters, endpoint-provided metrics and pie data, unsynthesized chart buckets,
  and an independently gated recent dynamic-QR panel.
- **D3.4:** Added the dynamic-QR read list with server-side filters,
  zero-based backend pagination, one-based UI presentation, exact UZS amounts,
  terminal validation, and neutral unknown-status handling.
- **D3.5:** Mounted live `/dashboard` and `/dynamic-qrs` routes behind exact
  capability and independent feature-readiness guards; added matching live
  navigation visibility and an exact safe return-to allowlist.
- **D3.6:** Added a DEV/demo-only deterministic simulator using the same
  normalized read boundary, fixed Tashkent clock, 23-row fixture, scenario
  matrix, abort-aware delays, independent request counters, and manual browser
  verification support.

The terminal lookup remains an optional auxiliary feature. Its absence does
not block dashboard or dynamic-QR core reads when no terminal filter requires
validation.

## Final verification

The user reported the following final evidence:

- lint `PASS`;
- typecheck `PASS`;
- tests `PASS`;
- build `PASS`;
- all D3.6 browser scenarios `PASS`;
- dashboard-to-dynamic-QR router state `PASS`;
- 390px and desktop responsive checks `PASS`; and
- production marker scan and both DEV read-route isolation checks `PASS`.

No exact test count was included in the final D3.7 evidence, so none is claimed
here.

## Security and data boundaries

- Access and refresh tokens remain owned by the in-memory auth/session layer.
  They do not enter query keys, router state, page props, or the DEV simulator.
- Protected reads reuse the existing single-flight refresh path. HTTP 403 is
  non-refreshable, and a safe protected GET is replayed at most once after a
  refreshable HTTP 401.
- Exact get-me permission membership is the only live authorization input; no
  role, wildcard, substring, alias, or enum-role shortcut is used.
- Denied or statically unavailable reads remain disabled before request
  execution. Dashboard, dynamic QR, and terminal lookup retain independent
  gates and counters.
- Session replacement, logout, access-content revision, and read-scope changes
  cancel/remove read cache entries and reject results from obsolete scopes.
- Dashboard metrics come only from the dashboard endpoint in live mode and are
  never aggregated from a dynamic-QR page. Amounts remain exact UZS tiyin,
  nullable growth remains unavailable rather than zero, and chart buckets are
  not synthesized.
- Dynamic-QR filters and pagination remain server-side. `status=0` is
  preserved; no `sort`, `statusCode`, `merchantId`, `bankAccountId`, or
  `distributionStatus` request input is invented. Backend page numbers remain
  zero-based while the UI is one-based.
- Offsetless `LocalDateTime` text is preserved without adding a zone, and
  unrecognized response statuses use a neutral presentation.
- Terminal lookup uses only `GET_DROPDOWN_TERMINALS`; no `GET_TERMINAL` alias
  exists.

## Day 03 scope exclusions

Day 03 did not add dynamic-QR creation, cancellation, export, static QR, P5,
payment actions, refunds, settlement, profile editing, notifications, or
backend changes. Those areas are not implied by this result.

## Remaining live blockers

- Authoritative deployed auth and web base URLs, including gateway prefixes.
- Deployed browser CORS and gateway behavior for bearer and auth-specific
  headers.
- Actual account permission/role assignments observed through deployed get-me
  responses or representative authorized accounts.
- Runtime verification of deployed auth, refresh, logout, dashboard,
  dynamic-QR list, and terminal-lookup responses.
- A deployed serialization guarantee or lossless representation for relevant
  Java `long` values outside JavaScript's safe-integer range.
- Confirmed business/display semantics for currently undisplayed conversion
  fields such as `currencyAmount`, `rate`, and `serviceFeeAmount`.
- Resolution or explicit acceptance of the dynamic-QR fractional end-date
  boundary at `23:59:59`.
- A stable pagination tie-breaker for rows with equal `created_at` values.
- A product/backend decision for dashboard statuses outside the categorized
  `0/5/10/20/50` set.

Until those deployed/live items are resolved, the correct readiness remains
`LIVE_CONTRACT_BLOCKED`.
