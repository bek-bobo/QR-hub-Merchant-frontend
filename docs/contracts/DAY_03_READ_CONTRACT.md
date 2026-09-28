# Day 03 Read Contract

**Checkpoint:** D3.2–D3.6 read implementation; Day 04 carry-over review  
**Backend:** `D:\QR projects\qrhub-merchant-service` (read-only)  
**Runtime verification:** Not performed  
**Shared artifacts:** `qh-lib-model:1.0.77`, `qh-lib-shared:1.0.77`

This document records the exact checked-in contract for the three Day 03 read
features. Controller-relative paths are used. A deployed gateway prefix and web
base URL remain external configuration.

All three endpoints are protected by the web service JWT filter and return
`QrHubResponseDTO<T>`. The active 1.0.77 envelope is
`{ success, requestId, timeZone, error, data }`; successful decoders require
`success=true` and the endpoint-specific `data`. Actual user grants still come
only from get-me/DB permissions.

## 1. Dashboard

### Request and permission

| Property | Confirmed contract |
| --- | --- |
| Endpoint | `GET /dashboard/transactions` |
| Authentication | `Authorization: Bearer <access token>` |
| Required authority | `GET_DASHBOARD` |
| `fromDate` | required `LocalDate`, ISO `YYYY-MM-DD`, inclusive |
| `toDate` | required `LocalDate`, ISO `YYYY-MM-DD`, inclusive |
| `terminalId` | optional `String`; omitted means all terminals assigned to the current user |
| Invalid range | `fromDate > toDate` produces a business error |
| Terminal ownership | supplied terminal must have an active current-user assignment |

Evidence: `DashboardResource`, web `SecurityConfig`, `DashboardServiceImpl`,
and `TerminalRepositoryImpl.existsByUserIdAndTerminalId`.

### Top-level response

`TransactionDashboardResDTO` is a Java record, so the default wire names are
the record component names.

| Wire field | Java type | Nullability | Normalized target |
| --- | --- | --- | --- |
| `summary` | `TxSummaryDTO` | constructed, required | `DashboardView.metrics` |
| `pieStats` | `PieStatDTO` | constructed, required | `DashboardView.pie` |
| `chartGroupBy` | `ChartGroupBy` | constructed, required | `DashboardView.chartGroupBy` |
| `chartStats` | `List<ChartStatDTO>` | repository list, required; may be empty | `DashboardView.buckets` |

### Summary mapping

Every count and amount below is primitive Java `long`, therefore required.
Every growth field is `Double` and may be `null` when the corresponding
previous-period value is zero. Growth is
`(current - previous) / previous * 100`; it is not rounded by the service.

| Outcome | Wire count / amount | Wire growth fields | Normalized target |
| --- | --- | --- | --- |
| total | `totalCount`, `totalAmount` | `totalCountGrowth`, `totalAmountGrowth` | `metrics.total` |
| success | `successCount`, `successAmount` | `successCountGrowth`, `successAmountGrowth` | `metrics.success` |
| processing | `processingCount`, `processingAmount` | `processingCountGrowth`, `processingAmountGrowth` | `metrics.processing` |
| failed | `failedCount`, `failedAmount` | `failedCountGrowth`, `failedAmountGrowth` | `metrics.failed` |

SQL status membership is exact: success is `50`, processing is `0` or `10`,
and failed is `5` or `20`. Total includes every status. Consequently a row
with another status (`25` is rejected and display-only in the frontend) is
included in total but excluded from the three categorized counts/amounts. The
frontend decoder does not invent a category or enforce a false equality among
those values.

Day 04 presentation reconciliation compares the total with all three category
counts and amounts using exact integer arithmetic. If counts differ, the status
panel keeps the server counts/amounts but suppresses category percentages and
explains the missing coverage. Amount mismatch gets a separate note. The
backend percentage formula and status categorization are unchanged.

### Pie mapping

`pieStats` has exact object fields `success`, `failed`, and `processing`. Each
segment contains required primitive fields `count: long`, `amount: long`, and
`percent: double`. Percent is count-based, rounded to two decimals; processing
percent is calculated as `100 - successPercent - failedPercent`. For zero total
count all three percentages are zero.

### Chart mapping

`chartGroupBy` serializes as `DAY`, `WEEK`, `MONTH`, or `YEAR`. Selection is
based on inclusive range length: at most 7 days → `DAY`, 30 → `WEEK`, 365 →
`MONTH`, otherwise `YEAR`.

Each `chartStats` item maps exactly:

| Wire field | Java type | Meaning |
| --- | --- | --- |
| `label` | `String` | SQL-rendered display label |
| `periodStart`, `periodEnd` | `LocalDate` | ISO calendar bounds for the SQL bucket |
| `totalCount`, `successCount`, `failedCount`, `processingCount` | `long` | same status membership as summary |
| `totalAmount`, `successAmount`, `failedAmount`, `processingAmount` | `long` | same status membership as summary |

Rows are ordered by `period_start` ascending. Only buckets containing rows are
returned; the backend does not synthesize missing periods. Week/month/year
labels and `periodEnd` describe the full SQL bucket and may extend beyond the
requested range, while counts still come only from the requested inclusive
range.

### Dashboard money and date semantics

Repository comments, DTO documentation, the core request model, and export
formatting agree that `amount` is UZS tiyin. The normalized value is
`{ minorUnits: canonical integer string, currency: "UZS", scale: 2 }`. This is
an endpoint-specific mapping, not a generic `/100` rule.

Java `long` is emitted as a JSON number. Every count and amount must pass
`Number.isSafeInteger`; an already lossy number is rejected rather than
stringified. Large aggregate values can exceed JavaScript's safe range even
when individual rows do not, so this remains a backend wire-format risk.

Dashboard filtering uses PostgreSQL `created_at::date BETWEEN fromDate AND
toDate`. The DB profile config initializes the connection time zone to
`Asia/Tashkent`. Runtime DB/JVM configuration has not been exercised.

**DASHBOARD_READINESS:** `CONTRACT_CONFIRMED` for static decoding and semantics;
live base/CORS/data remain unverified.

## 2. Dynamic QR list

### Request and permission

| Property | Confirmed backend contract | Day 03 frontend policy |
| --- | --- | --- |
| Endpoint | `GET /dynamic-qrs/get-all` | same |
| Authentication | Bearer JWT | same |
| Required authority | `GET_DYNAMIC_QRS` | exact capability mapping |
| `merchantId` | optional `Long` | omit |
| `bankAccountId` | optional `Long` | omit |
| `terminalId` | optional `String` | send only when applied |
| `fromDate`, `toDate` | optional ISO `LocalDate` | required by normalized Day 03 filters |
| `status` | optional `Integer` | send selected `0/5/10/20/50`; never send `statusCode` |
| `distributionStatus` | optional `Integer` | omit |
| `search` | optional `String` | trimmed non-empty input only |
| `page` | `int`, default `0` | zero-based |
| `size` | `int`, default `10` | frontend policy restricts to `10/25/50` |

No backend validation or maximum for `page`/`size` was found; this absence is
not a claim that arbitrary values are supported. Offset is `page * size`.
There is no `sort` request parameter. SQL orders by `created_at DESC`; equal
timestamps have no confirmed tie-breaker.

`status=0` is preserved because Java uses nullable `Integer` and SQL tests
`status IS NULL` before equality. Search becomes `%search%` and uses
case-insensitive `ILIKE` against terminal name only. It does not search pkey,
merchant, bank account, or RRN. Current-user ownership is enforced by an active
`qh_join_user_terminal` row.

### Date and time

The service converts `fromDate` to `atStartOfDay()` and `toDate` to
`atTime(23,59,59)`, then SQL uses `created_at >= from` and `created_at <= to`.
Fractional timestamps after `23:59:59` on the end date are therefore excluded;
the frontend must not silently widen the interval.

`createdAt` is database `TIMESTAMP NOT NULL` mapped to Java `LocalDateTime` and
serialized as an ISO local date-time string without offset. The decoder accepts
seconds and optional fractional precision, does not append `Z`, and performs no
browser-time-zone conversion. DB connections are configured for
`Asia/Tashkent`, but deployed DB/JVM consistency is not runtime-verified.

### DynamicQrDTO wire mapping

| Wire field | Java/DB type and nullability | Normalized use |
| --- | --- | --- |
| `pkey` | `String`; DB `VARCHAR(32) NOT NULL` | `DynamicQrRow.pkey` |
| `createdAt` | `LocalDateTime`; DB `TIMESTAMP NOT NULL` | validated local calendar string |
| `terminalName` | `String`; joined terminal name `NOT NULL` | `terminalName` |
| `merchantName` | `String`; joined merchant name `NOT NULL` | `merchantName` |
| `amount` | `Long`; DB `INT8 NOT NULL` | exact UZS `Money` |
| `currencyAmount` | `Double`; DB `FLOAT8`, nullable after V3 | omitted from Day 03 row |
| `currencyCode` | `String`; DB `VARCHAR`, nullable after V3 | omitted; not the currency of `amount` |
| `statusCode` | `Integer`; DB `INT4 NOT NULL` | preserved safe integer |
| `rrn` | `String`; nullable DB `VARCHAR` | `string | null` |
| `rate` | `Double`; nullable | omitted |
| `serviceFeeAmount` | `Double`; nullable | omitted |
| `distributionStatus` | `Integer`; DB non-null default `0` | omitted; no Day 03 semantics |

The DTO additionally exposes terminal type/id, merchant and bank-account IDs,
bank-account name, link, and updated time. They are not required by the Day 03
row model.

### Dynamic QR money

`amount` originates from a core request whose `merchantCurrency` defaults to
`UZS`; its model comment says tiyin, the create limits pair `100000` with
`1000 UZS`, and export divides this exact field by 100. Therefore the Day 03
display amount is `amount` as UZS minor units at scale 2.

`currencyCode` is the requested/core-returned conversion currency, not the
currency of `amount`. V3 explicitly permits `currencyAmount` and
`currencyCode` to be null for UZS. `currencyAmount` originates as Core
`BigDecimal` but is stored as `FLOAT8` and exposed as `Double`; its exact scale
and presentation semantics are not established. None of these conversion
fields are displayed in Day 03.

`amount` is a JSON number from Java `Long` and must pass
`Number.isSafeInteger`. Numeric strings are not accepted because this source
does not emit them. The current create endpoint limits new amounts to two
billion minor units, but the read schema itself is `INT8` and does not prove
all existing rows fit that create constraint.

### Status mapping

| Response `statusCode` | Source-confirmed meaning | Dashboard category |
| ---: | --- | --- |
| `0` | new/active | processing |
| `5` | expired | failed |
| `10` | processing | processing |
| `20` | cancelled | failed |
| `25` | rejected; display-only | not categorized by dashboard SQL and not a selectable filter |
| `50` | successful/used | success |

The Day 03 filter policy exposes only `0/5/10/20/50`, matching the requested
scope. Any other safe integer response remains representable and receives the
neutral normalized classification `unknown`; it is never guessed as success or
failure. No distribution-status business meaning is added.

### PageResponse

The success `data` object contains exactly:

| Wire field | Java type | Required decoder rule |
| --- | --- | --- |
| `content` | `List<DynamicQrDTO>` | array required; empty page is `[]`, not null |
| `totalElements` | `long` | non-negative safe integer |
| `totalPages` | `int` | non-negative safe integer |
| `page` | `int` | non-negative safe integer; zero-based |
| `size` | `int` | positive safe integer |

`totalPages` is `ceil(totalElements / size)`. Malformed or nullable pagination
is rejected rather than normalized into a synthetic empty page.

**DYNAMIC_QR_READINESS:** `CONTRACT_CONFIRMED` for displayed Day 03 fields;
conversion-money and fractional end-of-day limitations are recorded but do not
block this row model.

## 3. Terminal lookup

| Property | Confirmed contract |
| --- | --- |
| Endpoint | `GET /dropdown/terminals` |
| Authentication | Bearer JWT |
| Required authority | `GET_DROPDOWN_TERMINALS` (not `GET_TERMINAL`) |
| `merchantId` | optional `Long`; Day 03 omits it |
| Response data | `List<TerminalDropdownDTO>` |
| Ordering | terminal `name` ascending |

The service obtains the current user ID and queries only terminals with active
user-terminal assignment (`jut.status=0`) and active terminal (`t.status=0`).
When `merchantId` is omitted, the SQL null predicate returns active assigned
terminals across the user's merchants.

`TerminalDropdownDTO` exposes `id`, `name`, `minAmount`, and `maxAmount`.
`id` maps from non-null terminal `pkey`; `name` maps from non-null terminal
name. Day 03 normalizes only `{ id, name }`; create/edit amount limits are not
part of lookup semantics. The success list must be an array and each ID/name
must be a non-empty string.

**TERMINAL_LOOKUP_READINESS:** `CONTRACT_CONFIRMED` statically; live grants and
transport remain unverified.

## 4. Authority registrations

The web `SecurityConfig` maps the exact paths to
`MerchantBillingPer.GET_DASHBOARD`, `GET_DYNAMIC_QRS`, and
`GET_DROPDOWN_TERMINALS`, then calls
`hasAuthority(String.valueOf(permission))`. D3.0's exact 1.0.77 bytecode
inspection proved direct final-enum construction with no `toString()` override
or constant-specific subclasses. The required strings therefore equal those
enum names.

Registered mappings:

- `dashboard.read -> GET_DASHBOARD`
- `dynamicQr.read -> GET_DYNAMIC_QRS`
- `terminal.lookup -> GET_DROPDOWN_TERMINALS`
- `profile.read -> GET_ME` (D3.0)

No mapping aliases `terminal.lookup` to `GET_TERMINAL`.

## 5. Source evidence

Targeted evidence is limited to:

- web `SecurityConfig`, `DashboardResource`, `DynamicQrResource`, and
  `DropdownResource`;
- `DashboardServiceImpl`, `DynamicQrServiceImpl`, and `DropdownServiceImpl`;
- `TransactionDashboardResDTO`, `TxSummaryDTO`, `PieStatDTO`, `ChartStatDTO`,
  `ChartGroupBy`, `DynamicQrDTO`, `PageResponse`, `DropdownDTO`, and
  `TerminalDropdownDTO`;
- `TransactionQrsRepositoryImpl`, `TerminalRepositoryImpl`, and their directly
  used interfaces;
- `CreateTransactionQrRequestDTO`, `QhTransactionQrResponseDTO`,
  `TransactionQrSaveDto`, and the read/export mapping needed for money meaning;
- transaction/terminal schema migrations and web Jackson/DB-profile settings;
  and
- the already documented 1.0.77 response and authority bytecode evidence.

No backend file was changed. No runtime API, query hook, provider, page, table,
or DEV simulator is part of D3.1.

## 6. D3.2 protected read runtime

D3.2 reuses `SessionController.protectedRead` through
`src/shared/api/protected-read.ts`. The bridge supplies bearer credentials only
inside the protected transport callback, forwards both session and TanStack
Query cancellation, and preserves the Day 02 single-flight refresh, 403
non-refresh behavior, and at-most-one safe GET replay. Tokens are not exposed
through read context, query hooks, query keys, or feature adapters.

Read query identity is `[source, sessionScopeId, accessRevision, feature, ...]`.
The live source uses the existing authenticated `sessionScopeId` and a small
content-equality permission revision; token refresh alone cannot change query
identity. Each of dashboard, dynamic QR, and terminal lookup has independent
configured/unavailable readiness and its own exact capability gate.

The existing `SessionCache` lifecycle and `ReadProvider` scope-change effect
cancel and remove only dashboard, dynamic-QR, and terminal-lookup query keys.
Logout, session replacement, permission-content change, and source/scope change
therefore cannot expose old read data, while unrelated query namespaces remain
untouched. D3.2 adds no page, route, table, chart, polling, prefetch, placeholder,
or DEV read simulator.

## 7. Remaining unknowns

- Authoritative deployed web base/gateway composition and browser CORS.
- Actual account grants for the three authorities.
- Deployed response samples and production DB/JVM time consistency.
- A lossless representation for Java `long` values beyond JavaScript's safe
  integer range.
- Exact display semantics/scale for `currencyAmount`, `rate`, and
  `serviceFeeAmount`; these are outside the Day 03 read row.
- Stable ordering for dynamic QR rows sharing the same `created_at`.
- Backend correction or acceptance of the `23:59:59` fractional-second gap.

## 8. D3.3 dashboard read presentation

The dashboard screen keeps draft filters separate from applied filters. Its
default applied range is the current `Asia/Tashkent` calendar day plus the
previous six calendar days; 1-, 7-, and 30-day presets use explicit calendar
subtraction. Invalid or reversed draft ranges never become query input.

Metric cards and the status section consume only `DashboardView.metrics` and
`DashboardView.pie`. The trend consumes backend `DashboardView.buckets` in
their returned order without synthesizing missing periods. Loading is shown as
placeholders rather than invented zero values; actual backend zero values stay
visible as data, and nullable growth remains unavailable rather than becoming
zero.

The recent dynamic-QR panel is an independent, separately gated query using the
applied dashboard dates and terminal with `page=0`, `size=10`, blank search,
and no status. `dataUpdatedAt` is presented only as client fetch/update time.
D3.3 adds no token-bearing UI, query key, component prop, or router state and
does not change the D3.2 protected-read or refresh boundary.

## 9. D3.4 dynamic QR list presentation

The dynamic QR screen sends only applied server-side filters. Draft date,
terminal, status, search, and size edits do not change the query until apply;
apply trims search and resets the zero-based backend page to zero. Clear resets
to the Tashkent seven-day range, all terminals, all statuses, blank search,
page zero, and size 10. Selectable status values remain `0/5/10/20/50`, with
zero preserved as `status=0`; status 25 remains display-only under the verified
response mapping.

Pagination uses the response `page`, `totalPages`, `totalElements`, `size`, and
content. The UI presents `page + 1`, never derives totals from the current page,
and offers one explicit first-page transition for an empty higher page. No page
amount is presented as an aggregate.

Terminal lookup remains independently gated. An applied terminal that cannot
be confirmed after lookup loss, error, or permission change disables the list
and requires an explicit filter reset; it is never silently widened to all
terminals. Dashboard router state is structurally revalidated and may seed only
dates and a provisional terminal ID; status, search, page, size, and extra data
are ignored.

Rows display exact normalized IDs, offsetless `createdAt` text, exact UZS minor
units through `formatMoney`, nullable fallbacks, and known or neutral unknown
status labels. D3.4 adds no payment, cancel, refund, export, edit, or row-detail
actions and does not mount a route or navigation item.

## 10. D3.5 live routes and readiness integration

Live `/dashboard` and `/dynamic-qrs` routes now use a shared route policy before
their read pages mount. The policy resolves session bootstrap first, then exact
capability membership, then the relevant feature registration. Anonymous users
return through the login route, authenticated users without the required
capability reach the existing 403 behavior, and statically unavailable feature
registrations receive a feature-specific unavailable surface rather than a
permission or network error. Because the read page is not mounted until the
policy returns `allowed`, its dashboard, recent-QR, list, and auxiliary terminal
queries cannot start before these gates resolve.

Live navigation uses the same exact capability and independent registration
facts. Dashboard and dynamic-QR links are hidden unless their own capability is
granted and their own registration is configured; the existing account link
continues to depend on `profile.read`. Navigation remains discovery only, and
direct URLs run the same route policy. Terminal lookup remains auxiliary and
does not hide or block either core route.

The default post-login landing remains `/account`. Router return state accepts
only the exact internal paths `/account`, `/dashboard`, and `/dynamic-qrs`;
external, protocol-relative, DEV, and unknown targets fall back to `/account`.
Dashboard-to-dynamic-QR navigation state remains in router state and is still
revalidated by the D3.4 receiver. Global auth configuration failure remains at
`LiveRoot`, while dashboard and dynamic-QR configuration failures stay local to
their respective routes. The existing single `ReadProvider` and `QueryClient`
composition is unchanged.

## 11. D3.6 DEV-only deterministic read simulator

The demo-only lazy route boundary now exposes `/dev/read/dashboard` and
`/dev/read/dynamic-qrs`. Its simulator implements the same normalized
`LiveReadApi`/`MerchantReadApi` boundary consumed by `createReadRuntime` and
renders the actual `DashboardReadPage` and `DynamicQrPage`. It does not replace
fetch globally, alter the production endpoint registry, or provide synthetic
tokens.

The simulator clock is fixed at `2026-09-15T07:00:00Z`, producing the Tashkent
business date `2026-09-15` and default inclusive range `2026-09-09` through
`2026-09-15`. A deterministic whole-dataset model contains 23 newest-first
dynamic-QR rows across two terminals. Dynamic-list filters and pagination run
against the complete matching fixture set; dashboard metrics, pie values, and
returned date buckets are derived from the complete date/terminal selection,
never from the current list page.

The preview defines `NORMAL`, `EMPTY`, `DELAYED`, `ERROR`, `DASHBOARD_ONLY`,
`LIST_ONLY`, `LOOKUP_DENIED`, `ALL_DENIED`, `UNKNOWN_STATUS`,
`NULLABLE_GROWTH`, and `ZERO_CHART`. Each scenario declares exact permissions
and independent feature registrations. Dashboard, dynamic-QR, and terminal
lookup calls have separate observable/resettable counters, and delayed calls
honor `AbortSignal`.

`D3-READ-DEMO-ONLY` and `D3-QR-DEMO-` are production-isolation markers. The
DEV read tree is reachable only through the existing development/demo dynamic
import boundary; the production live router contains no DEV read route or
import. Production output must be searched for both markers during manual
verification and is not considered isolated until that check is run.
