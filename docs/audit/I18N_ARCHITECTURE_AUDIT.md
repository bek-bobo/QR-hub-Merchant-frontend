# QRHub Merchant: internationalization architecture audit

Date: 2026-10-08. Audited revision: `b4d78b8`.

**Recommendation:** introduce i18next/react-i18next behind a QRHub-owned, typed, guarded presentation API; keep locale-neutral routes and domain contracts; use Uzbek as the canonical catalog and production fallback; bundle all three initial languages and domain namespaces. A fallback language alone does not prevent identifiers from appearing in the UI. Enforce resource validation before builds, prohibit direct engine calls outside the adapter, and retain an independent emergency presentation path.

This deliverable is an audit and design only. No packages, application code, components, financial logic, tests, or backend contracts were changed. The attached request stops partway through Step 29, after “table heading”; all visible requirements are addressed below. No browser session, backend verification, layout experiment, performance measurement, or test execution is claimed. Versions are from the lockfile, implementations from source. Historical handoffs are context, not authority where current source differs. No applicable AGENTS.md was found in the inspected repository/ancestor locations.

The companion `docs/audit/i18n-text-inventory.md` indexes 1,393 candidate occurrences in 168 files, extracted across all 265 non-test TS/TSX files. It is a searchable migration aid, **not** 1,393 confirmed translation keys: repetitions, diagnostics, template fragments, and preview data are included. Source-wide searches plus implementation reads underpin the findings below.

## 1. Current architecture and integration points

| Area | Verified implementation | Localization implication |
| --- | --- | --- |
| Runtime | React/React DOM 19.3.0 locked; package ranges start at 19.2.8. Vite 8.3.0; TypeScript 6.0.3 locked, declared `~6.0.2`; React Router 8.3.1 | Client SPA, no SSR locale reconciliation needed now; prove chosen engine version against TS 6 during foundation work |
| Bootstrap | `src/main.tsx`: async bootstrap, StrictMode, ThemeProvider surrounding LiveRoot or DEV-only dynamic DemoRoot | Locale initialization/provider must be above both roots and above integration-unavailable screens, not solely inside AppProviders |
| Live providers | LiveRoot → AppProviders/QueryClient → AuthProvider → ReadProvider → LiveRouter; unavailable auth returns early | Shared UI/theme/error recovery must receive locale independently of auth readiness |
| TypeScript/Vite | Strict ES2023, bundler resolution, `@/*`, React JSX, no emit; React and Tailwind Vite plugins; no explicit `resolveJsonModule` option | JSON imports/type generation need a deliberate typecheck proof; no macro/extraction plugin exists |
| State | TanStack Query 5.102.8 server cache; React state/reducers/context; auth controllers exposed through useSyncExternalStore; scoped action registry | Use one locale service with React subscription. Do not put locale in auth controllers or use QueryClient as locale state |
| Modules | `app`, `features`, `shared`, `components`, `dev`; auth/account/dashboard/dynamic-qr/static-qr/terminals/bank-accounts/cashiers/p5 | Resources can follow actual feature ownership; shared runtime should not import app/features |
| UI/layout | Tailwind 4.3.3, shadcn-style components, Radix 1.6.7, Lucide; LiveShellLayout desktop sidebar/mobile Sheet; Header profile menu | Localize labels in both desktop/mobile and portal content; preserve navigation/focus state |
| Routes | BrowserRouter with explicit paths, access/readiness gates, React.lazy feature pages, Suspense; separate AppRouter for previews | Keep `/dashboard`, `/dynamic-qrs`, `/account`, etc. stable. Route fallback copy belongs to eager resources |
| API | HTTP transport, endpoint registry, explicit response decoders, protected-read bridge, confirmed refresh and one-dispatch actions | Locale changes must not alter DTOs, dispatch, permissions, retries, invalidations, session scope, or query keys |
| Auth/session | LoginController + SessionController + device lease; access roles/permissions; localStorage token persistence | A locale switch must not recreate these controllers or clear authentication |
| Persistence | Guarded theme storage `qrhub:theme:v1`, table prefs `qrhub:table-columns:v2`, dashboard series prefs; auth token/device storage | Reuse guarded storage-adapter conventions with a separate locale key; never blanket-clear storage on logout |
| Forms | Local controlled state, FormEvent handlers, FormField ARIA wiring, dedicated boolean/normalization validators, action controllers | No React Hook Form/Formik architecture. Zod 4.6.2 is installed but source search found no production imports; do not build a schema migration around assumed Zod use |
| Notifications | ResultToast uses Radix Toast, portals, durations, action labels; many pages hold messages in string state | Localize viewport/provider/close labels too. Store outcome identifiers and render text on subscription |
| Tables | Handwritten tables, static typed column metadata, ID-based order/visibility preferences, TableScrollRegion, PaginationBar | No TanStack Table/grid runtime found. Translate labels without changing column IDs or persisted preferences |
| Charts | @ant-design/plots 2.6.8, lazy plot renderers, custom trend/donut presentation and accessible summaries | Rebuild presentation/config on locale changes; engine canvas/tooltip content and HTML alternatives both need coverage |
| Errors | SafeApiError kind/status/code/tag, generic safe copy; route AppRecoveryBoundary reload UI; async state components | Preserve sanitized error policy; emergency boundary must work even if localization fails |
| Tests | Vitest 5.0.0; 208 `*.test.*` files; static markup and direct React DOM/act with per-file happy-dom 20.14.5 directives | Reuse these patterns; isolate locale instances per test. No snapshot calls found by source search; no checked-in E2E/CI workflow discovered |
| Existing locale code | `<html lang="uz">`, hardcoded `uz-UZ` Intl calls, Uzbek calendar arrays, bilingual poster; no i18n engine/catalogs found | Formatting is partially internationalization-aware, but has no shared active locale |

`AppProviders.tsx` supplies a QueryClient only; it is not the universal bootstrap boundary. `AppRecoveryBoundary.tsx` intentionally leaves live providers above route failures. Retain that behavior. The early integration-unavailable branch and DEV roots must not bypass locale initialization.

## 2. User-facing text inventory and ownership

| Category | Concrete sources/examples | Treatment |
| --- | --- | --- |
| A: JSX literals | AccountPage “Hisob ma’lumotlari”; LoginForm button text; LiveRouter 404; CreateCashierContent | Translate entire semantic messages |
| B: props | AuthStepHeader title/subtitle; PageHeader; search placeholders; FormField help/error text | Localize at presentation owner; shared defaults use common namespace |
| C: configuration | TREND_SERIES/TREND_GROUP_LABELS; ThemeModeSelect compactModePresentation; QR_POSTER lines | Stable IDs + message references; poster policy separate |
| D: navigation | Both navigationItems and liveNavigationItems; LiveRouter pageTitle/featurePresentation; ShellNavigation tooltips | Recompute localized view models per render; leave routes/capabilities alone |
| E: table headings | `columns.tsx` in dynamic/static QR, terminals, bank accounts, cashiers, p5; dashboard recent-qr columns | Translate header labels and status cells; retain IDs/default order |
| F: filters | Feature filter controls, DateRangeQuickFilter, GranularityControl, lookup empty/loading/prerequisite copy | Translate UI options; keep ISO dates, IDs, numeric status and granularity values |
| G: modals | DetailsDialog, QR display/details, cancel confirmation, cashier assign/unassign/create, P5 reset, FilterDrawer | Translate title/body/actions/accessible close controls; preserve action semantics |
| H: forms/validation | LoginForm local errors + LoginController messages; create QR amount/currency hints; cashier phone requirements | Typed reason + parameters; labels resolved at render |
| I: toast/notifications | ResultToast internals; ExportButton stored message; copy/download/result feedback | Localize every slot and announce current-language copy without restarting unrelated actions |
| J: API errors | SafeApiError; auth tag mapping; ReadProvider readiness reasons passed into DashboardReadPage ErrorState | Stable error descriptor mapped to approved localized copy; no raw arbitrary error translation |
| K: empty | AsyncState defaults; feature Results/Table components; missing account full name | Meaning-specific messages; `—` remains a neutral missing-value symbol |
| L: loading | LiveRouter Suspense/FullPageLoading; dashboard skeleton ARIA; lookup/query/loading states | Eager common/auth/shell text; never wait for a lazy namespace to explain its own failure |
| M: statuses | presentQrStatus, presentActiveStatus, cashier terminal mapping, presentP5Status | Domain-specific code → semantic message ID + tone |
| N: metrics/charts | MetricCards, StatusDonut, TrendChart, trend/donut-presentation, PlotViewportBoundary | Localize labels, axis/tooltips, warnings, hidden descriptions; stable series identifiers |
| O: downloads | ExportButton; QrPosterDownloads; qr-poster canvas; XLSX disposition filename | UI feedback translates; export bytes/filenames/poster content follow explicit product policy |
| P: accessibility | PaginationBar page announcement; LookupFilterSelect clear-label composition; TableColumnPreferences announcements; Sheet default “Close”; toast labels; phone prefix description; Header/sidebar | Translate user-readable ARIA/hidden/tooltips. Keep ARIA role tokens, element IDs, data attributes and `aria-controls` references technical. Decorative `alt=""` stays empty |
| Q: dates | date-time.ts, date-range-calendar.ts, DateRangeQuickFilter, trend-presentation, API period labels | Format by temporal type; localize calendar headings/week names |
| R: numbers | fixed `toLocaleString('uz-UZ')` throughout Results/dashboard/pagination | Central Intl presentation, raw counts unchanged |
| S: money | shared/money/minor.ts; create amount bounds; dashboard preview formatter | Exact value formatter with locale input; currency/scale are domain data |
| T: percentages | presenters.formatGrowth, MetricCards and StatusDonut manually add `%` | Format declared percentage semantics, avoiding 100× changes |
| U: dynamic sentences | “Jami … ta …”, page announcements, “Telefon: …”, chart summaries, theme/column accessibility labels | Full translation templates with named parameters/plural count |
| V: backend content | names, bank names, device descriptions, region/district lookup names, roleDisplay, profile roles, bucket.label | Preserve business content. Only verified code/enum fields map to frontend labels; unresolved display strings cannot be reliably reverse-translated |
| W: debug/demo | DEV simulator names, fixtures, “Yangi intent”, integration details/reasons, preview route notices | Keep internal fixture/scenario identifiers technical. Some developer-sounding labels occur in **live** UI and require approved copy/localization; do not exclude them just because of wording |

Brand names QRHub/QRHub Merchant and acronyms QR, UZS, XLSX, PIN, RRN, MFO remain identifiers/brands; surrounding explanations and expansion labels can translate. Phone mask `XX XXX XX XX`, `+998`, account numbers, terminal IDs, tax identifiers and copied payment links are exact data. API paths, authority strings, status codes, CSS classes, resource names, storage keys, `HOUR`/`AUTO`/`CREATED_AT` are never translated. English “Light”, “Dark”, “System”, “Close”, “Merchant workspace” are also user-facing copy; Uzbek-only searches miss them.

## 3. Construction anti-patterns requiring special migration

| Finding | Evidence | Required migration handling |
| --- | --- | --- |
| Quantity sentences and page suffixes | DynamicQrPage:402; TerminalResults:98; BankAccountResults:91; CashierResults:110; P5Results:114; StaticQrResults:53; PaginationBar:58–64,97,130+ | Whole plural templates, numeric `count` plus independently formatted count if needed; do not substitute nouns into one generic grammatical template |
| Concatenated accessible phrases | LookupFilterSelect:39; ThemeModeSelect:32–33; TableColumnPreferences:108,129,148,159; MetricCards:52 | Full messages with label/count parameters, or context-specific messages where inflection is needed |
| Static presentation frozen at module evaluation | navigation.ts; all columns.tsx; TREND_SERIES; calendar/date formatter instances | Store typed message references and pass current locale/translator into presentation factories; no top-level `t()` |
| Text retained in business/action state | LoginSnapshot.message; lease result messages; AuthProvider refresh/logout messages; one-dispatch-action reason; CreateQrContent actionMessage; ExportButton message | Store semantic outcome/reason + params, render using current locale. Avoid injecting engine into domain controllers |
| Label used as a behavioral discriminator | TableColumnPreferences:292 compares triggerLabel with “Jadval ustunlari” | Replace with explicit presentation flag, e.g. accessible-name behavior; comparing translations would change behavior |
| Chart identity coupled to text | trend-presentation: colorField `type`, color domain of labels, tooltip sort compares label to item.name; donut colorField `type` | Stable series key owns colors/order; localized label owns tooltip/legend. Identical translated labels must not merge series |
| Manual dates and calendar labels | date-time.ts dot format; trend-presentation shortDate/fullDate/month arrays/“haftasi”; date-range-calendar monthLabels; DateRangeQuickFilter weekdays | Central date presentation and complete week/interval messages, preserving calendar/offset semantics |
| Manual money/percent display | minor.ts groups digits/adds currency; presenters.formatGrowth and StatusDonut `%`; preview tiyin /100 | Preserve exact money algorithm; locale only formats output. Percent adapter states whether input is ratio or percentage points |
| Backend display labels used directly | bucket.label appears in hidden TrendChart summary and datum period; cashier roleDisplay; LiveRouter raw profile roles | Prefer derived localized period label from existing boundaries; role display remains backend content unless a stable code contract is verified |
| Locale embedded outside presentation | PreviewQrTable/read simulator search uses uz-UZ lowercasing; cashier initials use uz-UZ uppercasing | Review locale-sensitive search/initials separately. Live API search wire semantics must not change with UI language |

No existing `language === 'uz'` switching branches or comparisons against “Faol”/payment labels were found in the searched production source. No explicit gender-dependent message logic was found; future templates should use neutral wording or supported grammatical context. This is not proof that every future translation avoids gender issues.

## 4. Domain/UI boundary assessment

The strongest existing boundaries are explicit decoders and stable filter/action values. Dynamic QR classification keeps raw statusCode and maps 0/new, 5/expired, 10/processing, 20/cancelled, 25/rejected, 50/success, unknown otherwise. Tone mapping is presentation. Permissions use capabilities mapped to verified authority strings; locale must never change permission decisions. AccountPage displays profile data, not an invented account status enum.

Management active mapping deliberately recognizes **0 only**; all other values are unknown. Cashier-terminal mapping recognizes 0 active and 1 inactive. P5 distinguishes 1 as “Faol emas / administrator belgisi”. Do not combine these into one global `0/1` active map: their current semantics differ. Keep each domain's verified mapping, share only message references when meanings match. Status filters continue to send raw codes; custom P5 code entry remains numeric.

Target flow: **DTO/raw value → domain classifier → presentation descriptor `{messageId, params, tone}` → guarded localized output**. A controller should emit `permissionDenied`/`outcomeUnknown` reasons, not `common.actions.save` and not Uzbek prose. Central presentation maps those reasons to catalog IDs. This keeps language and resource structure out of business logic.

Status presentation is already centralized in several places, but labels are baked into helpers and repeated chart mappings. Controllers, error constructors, readiness configuration and message string state are the main boundary violations. Migrate those interfaces in bounded phases, with existing dispatch/scope tests preserved.

## 5. Technology comparison and recommendation

| Requirement | i18next + react-i18next | React Intl / FormatJS | Lingui | Custom dictionary + Intl |
| --- | --- | --- | --- | --- |
| React/runtime | Hooks/provider + non-React engine | Provider/hooks/imperative formatter | Provider/hooks + compiled catalogs | Own subscription/provider required |
| TS/DX | Resource-based namespace/key typing; selector support | Typed message IDs possible; ICU parameter contracts need additional typing/tooling | Extraction/macros reduce manual IDs; build integration required | Fully own keys/parameters/return types |
| Organization | Native domain namespaces | Split/merge messages in application loader | Catalogs and configurable splitting | Entire resource contract is custom |
| Grammar | CLDR plurals, interpolation/context; optional richer ICU approach | ICU plural/select/rich messages and integrated formatting | ICU messages compiled ahead of runtime | Intl provides plural selection, but not a complete message system |
| Fallback/missing | Configurable locale fallback/hooks; key return still needs guarding | Default messages/error hooks; can ultimately return ID | Default/source message and missing hooks depend on catalog setup | Every failure path must be implemented |
| Loading/detection | Resource adapters/dynamic import; optional detector | Application-owned catalog loader/detector | Dynamic catalog activation | Own all loaders and resolution |
| Testing | In-memory isolated engine instances; namespace failure injection | Isolated intl instances/provider tests | Compiled catalog/provider tests | Unit tests plus responsibility for all grammar edge cases |
| Bundle | Runtime + React binding + catalogs; optional plugins avoidable | Runtime/ICU formatting + catalogs; optional polyfills | Runtime + compiled catalogs and build tooling | Small initial code, growing maintenance cost |
| Fit here | Explicit key/config/presenter design aligns with repo; minimal Vite changes | Good alternative if ICU-first content and unified formatting dominate | Good if extraction/translator workflow outweighs toolchain changes | Too much custom responsibility for strict financial-app requirements |

Recommend i18next/react-i18next because domain namespaces, explicit resources, current typed metadata/presenters, and non-React presentation factories fit this repository. Do not install detection or HTTP-backend plugins initially. Do not select a version from memory: pin and prove compatible releases in Phase 0, including React 19 and TS 6, before migration. Exact bundle sizes require that later build experiment; no kilobyte claims are made here.

i18next supports resource-driven typing and stricter key checks, but JSON cannot retain literal values for interpolation inference without generated declarations. Its selector API is evolving, so the QRHub facade should absorb that choice. [Official TypeScript documentation](https://www.i18next.com/overview/typescript).

React Intl is viable, but its fallback algorithm can ultimately yield a message ID; it also needs a guarded QRHub boundary to satisfy this task. [Official React Intl API](https://formatjs.github.io/docs/react-intl/api/). Lingui offers extraction/compilation and dynamic catalogs, with an additional workflow to introduce into this currently simple Vite build. [Lingui introduction](https://lingui.dev/introduction), [catalog loading](https://lingui.dev/guides/dynamic-loading-catalogs).

## 6. Target structure and resource ownership

Proposed files, **not created by this audit**:

```text
src/shared/i18n/
  registry.ts             # languages, canonical/default/fallback locale
  locale-resolution.ts    # normalization, precedence, persistence adapter
  resources.ts            # namespace/resource manifest; future loaders
  runtime.ts              # guarded engine and switching transaction
  LocaleProvider.tsx      # subscription and useLocale/useMessages
  messages.ts             # guarded plain/rich-text presentation API
  emergency-copy.ts       # independent startup/recovery copy
  generated.d.ts          # generated key/parameter contracts
src/app/i18n/
  bootstrap.ts            # composition for main.tsx, root lang/dir
  AuthLocaleBridge.tsx    # future profile preference integration
src/locales/{uz,ru,en}/
  common.json
  shell.json
  auth.json
  account.json
  dashboard.json
  dynamicQr.json
  staticQr.json
  terminals.json
  bankAccounts.json
  cashiers.json
  p5.json
scripts/validate-locales.mjs
```

Place reusable runtime under shared to allow theme/shared UI to depend on it without importing app. App composes bootstrap/auth behavior. Central catalogs offer one translator-visible location; feature teams own matching namespace files. Common owns shared states, pagination, validation/common errors and confirmed shared statuses. Domain-specific wording stays in its feature. Do not split one file per component or create a huge common dumping ground.

Option A, one JSON per language: simple start, but merge conflicts, ownership ambiguity and weak chunk boundaries. Option B, domain namespaces: modest extra manifest, matches ten feature areas plus shell/common and allows later loading. Feature-colocated catalogs: strong ownership, but scattered translator input and additional discovery/export work. Choose central domain namespaces now; loader ownership makes colocating later possible without changing callers.

Catalog hierarchy identifies meaning, not locale: namespace `dashboard`, message `metrics.totalAmount`; never `uz.dashboard.title` or `translation.dynamicQr...`. No translated values serve as map keys. Avoid implicit cross-namespace fallback, which can hide namespace mistakes. Reuse common messages explicitly, not via accidental same-name lookup.

## 7. Central language registry

Registry entry fields: canonical resource code, explicit accepted aliases, native label, optional localized display-name reference, Intl locale, text direction, enabled state if rollout needs it, resource-loader identity, and optional fallback overrides only for real linguistic variants. Derive `SupportedLocale` from registry keys. Initial mapping:

| Resource code | Native label | Intl locale | Direction | Fallback |
| --- | --- | --- | --- | --- |
| uz | O‘zbekcha | uz-UZ | ltr | uz |
| ru | Русский | ru-RU | ltr | uz |
| en | English | en-US | ltr | uz |

One global canonical/default/fallback constant is `uz`. Resource discovery/manifest verifies every enabled registry entry has every required namespace. A locale is not an arbitrary filesystem path. Native names allow choosing a language even when current text is unfamiliar; current language menu label is translated.

Do not put currency or account timezone into language entries: money carries its currency/scale and business dates use contractual timezone. Native Intl suffices for dates/numbers, so no date-library locale objects needed. Allow optional `dateIntlLocale`/`numberIntlLocale` overrides only if product actually needs differing regional formats; initially derive both from `intlLocale`.

A fourth language: register it, supply complete namespace resources including applicable plural forms, run integrity/type/format/smoke checks, enable it. Existing UI loops over the registry; no component locale branches, hardcoded menu options, or hand-maintained locale unions. RTL activation additionally requires layout QA; registering `dir` is not equivalent to shipping working RTL.

## 8. Deterministic locale resolution

**Now:** valid explicit session selection → valid persisted local preference → first supported `navigator.languages` entry → default uz. Read storage/browser preferences once in the service, not in components. Re-resolve only on deliberate preference updates or defined storage events.

Normalize with BCP 47 canonicalization and registry aliases, rejecting malformed values and handling access errors. `uz-UZ` → uz, `ru-RU` → ru, `en-US` and `en-GB` → en, with formatting initially using registry en-US. Case normalization is allowed; do not arbitrarily convert malformed `_` tags unless explicitly supported as legacy input. Regional tags may match a supported same-language/same-script entry. `uz-Cyrl` must not silently become Latin Uzbek: script mismatch skips that candidate. Unsupported stored values continue through browser choices/default; do not create arbitrary resources from them.

**Future, only after a profile contract exists:** selection made in this session → authenticated user's verified preference (including per-user persisted explicit preference while a save is pending) → browser/device preference → browser language → default. The present Profile has userId/phone/fullname/roles/permissions **and no locale field**. No locale API should be invented. A late profile response must not override a newer user selection; capture preference revision and user scope.

## 9. Persistence and auth lifecycle

Use one shared locale service/React provider, plus guarded localStorage key `qrhub:locale:v1` containing a validated canonical code/versioned payload. Component state alone loses refresh preference; React context alone does not persist. The existing React state/context pattern fits better than introducing a global state library.

Before login, resolve device/browser preference. After login today, keep it unchanged. Logout keeps the device preference and removes auth tokens through existing token persistence only. Switching users today retains device preference because no user-specific locale exists; describe this as device behavior, not account synchronization. If storage is blocked, selection works in memory and resets to resolved browser/default on reload; persistence cannot be guaranteed when storage is unavailable.

Future user preferences should be keyed by validated user identity and reconciled only inside that user's session scope. On logout discard user-scoped override and return to device preference; a late previous-user save/load cannot update the next user's language. Tokens/permissions never enter the locale storage record. Cross-tab storage updates are optional now; if included, validate and use the same switching transaction, without write-back loops.

Cookies offer no current SSR benefit; locale URL/query parameters add route state complexity; backend storage requires a contract. None is necessary for the initial implementation.

## 10. Switcher behavior

One reusable behavior component in the public auth surface and authenticated header/profile controls; optional account entry uses that same component. No visual design is specified here. Options derive from enabled registry entries and show native labels.

`setLocale(candidate)` validates → prepares required resources → checks request revision → commits active locale/formatters/root lang/dir → persists successful selection → React subscribers rerender. With bundled catalogs this is immediate; no full reload. Do not key/remount the app, provider tree, form, dialogs, or QueryClient by locale. Preserve typed PIN/OTP, draft filters, pending mutation/outcome, page number, table preferences and selected chart series.

During future async loading, keep previous working locale/UI, expose pending state, ignore stale UZ→RU→EN completions, then commit only verified newest resources. Failure keeps previous locale and storage; show localized “Could not change language. Try again.” in the previous language. On initial startup failure use verified Uzbek fallback or emergency recovery if it too is unavailable. Never show RU as selected when EN/UZ is actually active.

Keyboard: existing Select supports keyboard options; provide a localized accessible name, current selection, pending/error announcements, focus retention, and native names with suitable `lang` metadata. Language switch should not repeatedly announce every changed live region or restart toast timers; announce selection once. Required inaccessible/missing labels use safe fallback/blocked controls as described below.

## 11. Missing translation safety: enforceable layered contract

**Invariant:** every frontend-owned localized output passes a QRHub guard. No engine-returned key, object, unresolved template or error diagnostic becomes normal production UI. This is a contract for the proposed implementation, not a claim the current code enforces it.

| Failure | Development | Build/test | Production behavior |
| --- | --- | --- | --- |
| Missing/mistyped key | Type error; guard reports namespace/key/callsite, descriptive dev marker or strict-test exception | Compile checks + unknown-ID checks fail | Canonical same message if it exists; otherwise safe unavailable-content presentation |
| Namespace absent/wrong | Explicit namespace error; no common-namespace guessing | Manifest/callsite mismatch fails | Verified same namespace in uz; essential screen unavailable if it cannot be recovered |
| Selected locale unsupported | Normalize/reject and report reason | Registry resolution tests | Device/browser/default resolution; unsupported language never activated |
| One locale omits message | Guard warns even if fallback succeeds | Logical parity fails release | Uzbek version of that message; deduplicated diagnostic |
| Empty/null/object instead of text | Contract violation | Leaf-type and nonblank checks fail | Treat as unusable; same fallback chain |
| Catalog inconsistent/malformed | Reject resource bundle atomically | Parse, duplicate-key, schema, placeholder/rich-tag/plural checks fail | Keep previous validated resources; fallback without rendering partial corrupt catalog |
| Missing interpolation variable | Report invalid call, strict test throws | Generated parameter typing + runtime tests | Do not show template/undefined or invent values; render safe unavailable presentation |
| Locale or lazy fetch fails | Failed-loading diagnostic | Failure-injection tests | Previous working UI for switch; startup/routes use eager Uzbek fallback/recovery |
| Engine throws/init fails | Report; recovery remains reachable | Inject failure before provider/route render | Independent emergency-copy panel and safe retry; no engine invocation in that fallback |

Fallback chain for **valid** messages: requested locale and explicit supported variants → same namespace/message in eager canonical Uzbek → approved emergency presentation. Missing parameters cannot be fixed by changing language; fallback is usable only if its required parameters are present and validated. Production telemetry reports failures rather than making fallback silently invisible to maintainers.

Exact user output at the final layer:

- Nonessential display/description: independent literal Uzbek “Matnni ko‘rsatib bo‘lmadi.” (“Text could not be displayed.”), optionally matched to one of the known initial locale emergency copies. Unknown locales use Uzbek. It is not fetched through `t()`.
- Missing action meaning, destructive confirmation, form requirement, or important financial explanation: **disable/withhold the affected action**, retain safe navigation/logout where possible, and show an independent panel “Ushbu bo‘limni ko‘rsatib bo‘lmadi. Qayta urinib ko‘ring.” (“This section could not be displayed. Try again.”). Do not label a destructive action with a generic “Unavailable” and leave it enabled.
- General error when no approved specific message exists: human-readable retry text consistent with today's SafeApiError policy; retain technical kind/code/tag only in diagnostics.
- Missing numeric/date/money presentation: `—` in a display cell with localized “Value unavailable” accessible explanation; required calculation/confirmation UI must not proceed with a guessed value.

The guard operates on known catalog identities and verified lookup results, not a global regex stripping dots from all rendered text. Merchant data might legitimately contain `example.com` or a key-like name; do not erase backend business content to satisfy a screenshot heuristic. Catalog validation rejects a translated leaf that literally equals its full/relative key or unresolved placeholder unless explicitly approved as technical content.

Suggested engine settings include explicit supportedLngs, fallbackLng uz, explicit namespaces, returnNull false, returnEmptyString false, returnObjects false, no appended namespace, no saveMissing/upload in production. `parseMissingKeyHandler` can supply safe text as defense in depth. `missingKeyHandler` is not a display guarantee and depends on saveMissing; neither it nor missingInterpolationHandler replaces the guard. [Official configuration options](https://www.i18next.com/overview/configuration-options), [fallback behavior](https://www.i18next.com/principles/fallback).

The guard prevalidates registered logical key/namespace and required params, checks usable resource resolution, then formats under try/catch. It returns a discriminated resolved/unavailable result for critical UI, with a convenience safe string for ordinary text. Rich text must use the same policy; raw Trans/direct engine APIs cannot bypass it. Root recovery gets literal emergency copy even when the provider cannot start.

Development: console errors include internal IDs, visible `[Translation unavailable]` marker is distinct from UI, strict tests can throw. Production: deduplicate diagnostics by locale/namespace/message/reason/release; do not log PINs, OTPs, tokens, user-entered interpolation values or full financial payloads. No telemetry service exists for this design yet; define an injectable reporter, whose own failure is harmless.

## 12. Type-safe translation API

Use canonical Uzbek JSON as source of message identity; generate literal resource declarations plus a parameter contract from templates. Generated types infer namespaces/logical keys and mandatory parameter names/types; count keys require numeric count. Resource key typing alone does **not** ensure interpolation parameters or translated resource parity.

Recommended facade shape conceptually: `useMessages('dynamicQr')` returns a typed lookup accepting that namespace's message keys and required parameters. Configuration stores typed message IDs, resolved by factories at render time. Broad dynamic string construction (`t('status.' + code)`) and `as any` escapes are prohibited; unknown statuses use an explicit unknown descriptor. Use native engine module augmentation internally and strict key checking; isolate string/selector engine syntax in this facade. If adopting current selector API, use regular selector mode initially; optimized huge-catalog mode and plural tooling should be a later measured choice, not a hidden dependency.

Generation should be deterministic: either check generated declarations into Git and fail on stale output, or generate before typecheck from a clean checkout. The simpler team-visible choice is checked-in generated declarations + validation of freshness. Enable/prove JSON module typing in the implementation phase; do not assume current tsconfig already specifies it. No separate hand-maintained union of every key and every language.

For interpolations use a small contract: default text parameters are string; count/min/max numeric where declared. Dates and money supplied as already formatted text through explicit formatter adapters. Future rich text carries an allowlisted component schema rather than arbitrary HTML. A generated TS declaration is justified here by strict parameter requirements; a bespoke runtime language/compiler is not.

## 13. Resource consistency and release gates

One deterministic Node validation script invoked by future typecheck/build/CI is the least fragile release gate; reusable integrity tests supplement it. No current CI workflow was found, so a standalone CI-only check is insufficient. Run validation before `tsc -b && vite build`; CI runs the same script plus tests when introduced.

Validate registry entries/namespaces; JSON duplicate properties before normal parsing; string-only nonblank leaves; missing/extra logical IDs; unknown namespaces; invalid key conventions; placeholder set/type agreement; invalid/unbalanced template syntax; allowlisted rich tags/components; no arbitrary nesting/unescaped-HTML syntax; no key-equal values; generated-type freshness. Extra IDs fail unless an explicit temporary, expiry-tracked migration exemption exists. Incomplete languages stay disabled.

**Plural parity is logical, not byte-for-byte leaf parity.** Russian legitimately needs forms that differ from English/Uzbek. Normalize plural variants to one logical message ID; require locale-specific categories from supported Intl.PluralRules plus optional explicit zero/ordinal contracts. Compare parameter sets and compatible message kind across variants. Do not demand identical `_one/_few/_many/_other` raw filenames/keys in every language. A missing Russian `few` is a failure even if Uzbek has no such form.

TypeScript verifies calls, not translator completeness. JSON schema verifies shape, not all semantics. Regex lint catches suspicious new literals/imports, not grammatical correctness. Validation script + typed callers + runtime guard + human translation review each have a separate job. During staged migration enforce the literal rule for migrated scopes first with a baseline; do not make untranslated legacy scopes impossible to build before they are migrated.

## 14. Date localization without contract drift

Three temporal classes exist:

1. Calendar dates: fromDate/toDate are ISO `YYYY-MM-DD`; Tashkent presets use fixed timezone and en-CA formatToParts to construct canonical wire dates. Calendar grid uses UTC as an implementation anchor. Keep these algorithms and Monday-first behavior initially; language must not change range boundaries.
2. Offsetless local timestamps: management/QR decoders accept local date-times; formatOffsetlessDateTime manually emits `DD.MM.YYYY HH:mm`. They are wall clocks, not instants. Parse validated components and format them with a neutral UTC carrier/timeZone UTC to preserve those exact components; never let browser timezone reinterpret them.
3. Instants/offset boundaries: formatInstantTime accepts epoch milliseconds, currently defaults locale uz-UZ with optional timezone; dashboard verifies Asia/Tashkent range and explicit offset boundaries. Format actual instants with the contractual/product timezone, separate from locale. Preserve nanosecond boundary precision and existing half-open intervals even if labels display fewer digits.

Propose `formatCalendarDate`, `formatWallClockDateTime`, `formatInstant`, `formatPeriodLabel` in shared presentation with locale and explicit temporal type/options. Use Intl.DateTimeFormat; cache formatter instances by locale/options/timezone. Do not let formatters create API query dates. Day/month/weekday names and accessibility day labels use current locale; UTC carriers prevent calendar day shifts. Avoid assuming `new Date(offsetlessString)` is safe.

Calendar widgets are custom DateRangeQuickFilter/date-range-calendar, not an installed date-picker library. Preserve UTC grid and draft/hover semantics. Dashboard/week/interval messages require templates around formatted boundaries. Derive chart period text from periodStart/periodEnd/group rather than trying to translate backend bucket.label. API label can remain in domain/debug data; replace its user-facing uses under a verified period presenter.

## 15. Numbers

Native Intl.NumberFormat is sufficient for current counts, numeric metrics and chart axes. Replace fixed module instances/uz-UZ calls with cached locale-aware presentation adapters. No localized number goes into queries, DTOs, sorting or calculations. Preserve null/unknown vs zero. IDs, account numbers, phone digits and custom status codes are strings/technical values and must not receive grouping or digit conversion.

Compact notation is acceptable for approximate chart axes; accessible/table exact values remain exact. Grouping spaces may be nonbreaking/narrow spaces; tests should verify semantic parts and explicit expected presentation, not assume ASCII spaces in every locale.

## 16. Money and percentage semantics

`shared/money/minor.ts` is the production center: it rejects unsafe numeric integers, accepts canonical integer strings, uses BigInt, validates scale 0–20 and uppercase currency codes, groups exact whole digits, preserves all fractional digits, and appends currency. Dynamic/dashboard decoders normalize UZS tiyin into the Money model. `parseCreateAmount` uses BigInt and scale 100, accepts ASCII spaces and dot/comma with up to two decimals and exact bounds; MoneyInput keeps caret-aware grouped ASCII draft text. Locale work must preserve these contracts.

Add a **presentation-only** locale/options argument or adjacent adapter for exact minor-unit formatting; keep existing public/domain semantics until migrated explicitly. Do not implement `Number(minorUnits)/100` for production money. Exact whole digits can be localized with Intl/BigInt and formatToParts; derive sign, grouping, decimal separator/digits and currency placement, append the exact scale-preserving fractional digits using a thoroughly tested adapter. If using modern Intl decimal-string formatting instead, first prove exact support in the supported browsers; do not assume casting BigInt to Number is safe. Retain the current exact formatter as canonical fallback.

Currency comes from Money, never selected language. Do not let Intl's UZS default fractional digits override declared scale. Proposed initial policy: preserve all scale digits and ISO currency code in all locales, changing separators/placement only. “so‘m”/“сум” naming, currency-symbol display and fraction suppression require product approval; examples in the request are alternatives, not an instruction to change financial display semantics.

Chart adapters currently convert to approximate Number only at plotting boundary and retain exact tooltip amounts. Preserve that separation. `dashboard/format.ts` is preview-only formatting and must not become the production financial formatter. Amount-input syntax localization is a separate scope: retain current accepted dot/comma/ASCII space grammar now and translate hints. Reject ambiguous grouping rather than expand parsing casually to every locale.

Growth/pie inputs are percentage points (e.g. 12.5 means 12.5%). Intl percent style expects a ratio: adapt explicitly `12.5/100` for presentation or preserve numeric formatting + localized percent parts. Tests must prove 12.5 stays 12.5%, negative growth keeps sign and null remains unknown. Locale cannot alter reconciliation calculations.

## 17. Pluralization

Use engine/Intl plural rules, never manual count===1 checks. Pass numeric `count`; whole messages cover found QR totals, terminal/account/cashier/device counts, pagination results, assignment selections and any future quantity-based notices. Fixed “PIN 4–8 digits”, “OTP 6 digits”, and “9 local digits” are validation templates, not necessarily plural APIs; translators can write complete correct phrases.

Use Uzbek/English one/other and Russian one/few/many/other as applicable to the supported runtime rules; Russian fractional counts generally require other even when current result counts are integers. Test 0/1/2/5/11/21/22/25 and decimals where allowed, not only singular/plural pairs. Engine plural behavior requires `count` and relies on Intl rules. [Official plural documentation](https://www.i18next.com/translation-function/plurals).

## 18. Interpolation and rich text

Complete messages own order/punctuation: total count, phone heading, calendar range, amount bounds, column move/visibility announcements, theme label/next mode and chart summary. Named parameters avoid fragment concatenation; translators should not compose inflected Russian nouns from arbitrary localized label fragments if a dedicated grammatical phrase is needed.

Plain React text is escaped by React; the guarded React adapter may disable engine HTML escaping to avoid double escaping. Never use that output in innerHTML. Keep escaping appropriate at non-React sinks: canvas drawText receives text only; any future HTML attribute/HTML export must use its own safe API. [Official interpolation guidance](https://www.i18next.com/translation-function/interpolation).

Rich content uses allowlisted React components through a guarded rich-message adapter, with routes/href/actions controlled by code. No translator-supplied arbitrary links/HTML and no bypass through direct Trans. Missing/null required parameters are rejected before formatting. An empty parameter may be valid only where its contract allows it; 0 is valid count. Money/date formatters supply text, engine never performs financial conversions. Unknown/missing variables must not produce `undefined`, `{{amount}}`, or guessed zeros. User text is data, never a key or template.

## 19. Backend errors and technical diagnostics

Current transport preserves HTTP status and header metadata, decodes envelopes, and normalizes unsafe/unknown errors. SafeApiError exposes kind/status/code/tag but a safe generic message; response `error.text` is not blindly displayed. Auth contract accepts numeric code/nonempty tag and Profile has no locale. LoginController already uses stable tags: OTP_CODE_INVALID, PIN_INVALID, OTP_EXPIRED, OTP_NOT_EXPIRED_YET, DEVICE_BLOCKED, PIN_MAX_ATTEMPTS_EXCEEDED, SESSION_EXPIRED, OTP_MAX_ATTEMPTS_EXCEEDED, RATE_LIMIT_EXCEEDED.

Map verified tags/codes **in service/operation context** to semantic frontend error descriptors, then translate in presentation. Preserve current auth transitions and protected operation behavior. Unknown code/tag → generic localized failure, not engine lookup using arbitrary backend tag. Keep technical information in a sanitized reporter. Configuration issues should retain an issue identifier; currently SafeApiError stores only their localized message, so adding a descriptor in a later migration is needed to preserve differentiated presentation without parsing prose.

The example code 10009 is not verified in this frontend and must not be assigned an invented service-fee meaning. Create/cancel/P5/assignment paths have specialized envelope and one-dispatch semantics; some collapse outcomes into unknown/rejected reasons. Do not globally retrofit “retry” on a possibly dispatched mutation. Unknown outcome copy must continue warning that the action may have succeeded. Preserve all raw backend contracts.

ReadProvider readiness uses English technical reasons, and DashboardReadPage can display readiness.dashboard.reason. Translate a readiness reason descriptor, not internal exception prose. ReadAccessError/StaleReadScopeError diagnostics stay technical and should not become merchant-facing content.

## 20. Validation messages

Auth validators return booleans/normalized phone; LoginForm and LoginController duplicate language-specific explanations. Cashier/QR builders return null on invalid selection/data, with prose attached by UI/controller paths. No established schema returning localization identifiers was found.

Keep pure domain validation unchanged where practical; add typed `{reason, field?, params?}` presentation results at the appropriate boundary. Required/min/max/format/OTP/PIN mismatch/date-range reasons map to message IDs centrally or in feature presenters. Recompute displayed errors on locale change without revalidating/submitting/mutating a form. Controller snapshots store semantic reasons. If Zod later enters forms, map its structured issues or build localized presentation outside a globally language-frozen schema; do not introduce it merely for this task.

Server field errors require a verified field/code contract. Unknown server messages are generic failures, never translations of arbitrary text. Do not invent fields from backend text or loosen phone/PIN/amount/date rules because another language is selected.

## 21. Status/enum presentation

Retain existing shared QR/active maps and feature P5/cashier-terminal maps, returning message references/tone/active flags. QR statuses appear in list/details/dashboard recent rows and filter labels; chart outcomes are aggregate semantic categories, not necessarily one-to-one QR statuses. Keep separate aggregate mapping and share approved wording where appropriate.

Known numeric enum IDs/capabilities/granularities remain API values. Unknown status uses a localized unknown message plus approved technical code detail if useful. Backend roleDisplay is currently arbitrary nullable text; known auth role codes can have a verified display map, but unknown role display should use a neutral localized role label or raw detail only if product intends to expose it. Never infer access from a translated role name. No general account-status mapping exists to migrate.

## 22. Table, filter and export interaction

Provide localized column factories/view models with stable definitions: id/defaultVisible/hideable/reorderable remain canonical; localized labels passed to TableColumnPreferences and headings. Cell renderers receive current presentation adapters rather than closing over a startup translator. Persist only table/column IDs and order/hidden arrays; locale cannot reset, migrate or rename existing preference keys.

Translate search/filter labels, page navigation/size text, totals, empty/results/loading notices, hidden table region names and movement announcements. Numeric values, IDs and draft vs applied filter lifecycle remain stable. Search is current backend request text; switching UI language must not rewrite it or dispatch another read because labels changed.

XLSX is fetched as server-generated bytes via protected bridge/classifyXlsxResponse. Filename comes from sanitized Content-Disposition or `dynamic-qrs.xlsx`; front end does not own exported column names. Keep bytes/query/filename policy unchanged initially. Product/backend must decide whether contents follow UI locale, fixed language, or a separate export language. A future locale request parameter/header requires a verified export contract and appropriate cache/scope handling; do not add it silently.

QR poster intentionally renders Uzbek top lines and Russian bottom lines on a fixed 620×877 canvas shared by preview/PNG/PDF. Treat it as approved payment collateral until product chooses fixed bilingual vs UI-localized vs separate download-language behavior. PNG/PDF naming and font/layout wrapping need separate decision/testing. Localize download buttons/errors now; keep copied/encoded payment links exact.

## 23. Chart localization

Cover MetricCards labels/share ARIA, growth indicators, donut center/legend/count/amount tooltip fields, trend titles/mode/granularity, axis periods, tooltip titles/coverage/partial/future notices, series settings, chart loading/recovery and hidden exact-value summaries.

Change series-color/sort identity to stable `total/success/processing/failed/uncategorized` keys in a future migration. Translate labels only at chart config/view-model boundaries; engine sort and color assignments cannot depend on distinct translated text. Rebuild prepared chart data/config when locale/formatting revision changes; update memo dependency lists. Backend bucket.label cannot remain the only screen-reader period label while visible axes are localized.

Trend interactionKey currently includes values/coverage/partial but not all title/label text. Include locale/presentation revision in interaction reset policy so a pinned/keyboard tooltip cannot retain old-language content. Preserve current visibility preferences, exact money tooltips, future bucket nulls and reconciliation safeguards. Approximate axes must never replace exact accessible summaries. Engine loading errors use eager common fallback resources.

## 24. Routing

Keep locale-neutral routes. This authenticated merchant SPA has no demonstrated SEO/shareable locale URL requirement; locale prefixes would multiply access/return-to/login-landing/root-route and test cases. Language switches preserve current pathname/location state. safe-return-to and verified route policies remain untouched. If a future support/share-link language override is required, introduce it at central resolution with explicit behavior and tests, not an incidental path rewrite.

## 25. RTL readiness

Registry includes `dir: 'ltr' | 'rtl'`; root updates document.documentElement.lang/dir on successful commit. Current source has physical left/right padding, sidebar markers, Sheet side left, right-positioned toast/menus, chart alignment and direction-specific icons. Setting dir alone will not make these correct. Plan logical CSS properties, Radix direction propagation for portals, calendar keyboard direction and chart/table QA when an RTL language is actually added. No speculative layout rewrite now.

## 26. Test design (no tests created)

| Test family | Required evidence |
| --- | --- |
| Resource integrity | Every enabled locale/namespace and logical message; plural categories; placeholders/tags; blank/type/extra/duplicate violations; stale generated declarations |
| Type contracts | Misspelled key/namespace and omitted/wrong params fail compiler; valid configuration IDs and count messages compile |
| Switching | UZ→RU→EN updates header/nav/shared UI/table/status/chart tooltip/hidden labels; retains route, form drafts, filters, cache, sessions and pending actions |
| Persistence | Reload resolves selected code; invalid/unsupported storage continues resolution; throwing storage getter/read/write keeps app usable; logout/user rules |
| Concurrency/loading | Failed catalog/namespace fetch, rejected change/init, corrupt resources, quick out-of-order switches, previous-user preference response cannot commit |
| Fallback | Missing requested key falls back to Uzbek; missing both yields literal emergency UI; critical confirmation/action disabled; no unhandled formatting exception |
| Formatting | Calendar/offsetless/instant types across UTC/Tashkent/browser TZs; leap day/offset day boundary; numeric counts/percent signs/null; exact large negative/fractional money and scale |
| Domain contracts | Same scope/filters/status/currency/minor-unit body/authority/query values before/after switching; no extra protected mutation/read or action replay |
| Plural/interpolation | Russian integer categories and fractional where allowed; zero values; null/missing variable rejection; escaped user input; whole grammatical sentences |
| Accessibility | Nonempty translated accessible names, lang/dir, focus/keyboard behavior, portal labels, hidden summaries/announcements, safe failure presentation |
| Rendering | Production-mode missing typo/namespace/resource/object/template cases render neither requested ID nor unresolved templates in DOM, portals, charts/tooltips or downloadable owned text |
| Layout | Browser review at small widths/zoom, Russian/English long labels, sidebar/header/dialog/pagination/table/calendar/chart/Posters as relevant |

Use isolated engine/service instances in Vitest; do not mutate a process-global locale between tests. Wrap static markup/direct DOM test fixtures in explicit locale providers or inject factory translators. Existing select test helper chooses `data-value` rather than visible labels—retain that useful stable contract. Behavioral tests should rely on stable IDs/roles/values with explicit locale; retain separate expected-language assertions so switching actually proves translation rather than merely comparing `t()` output to itself.

No-key rendering tests check known failed IDs and unresolved-template artifacts on frontend-owned text; a broad dotted-text regex is supplementary only. Fault injection is necessary: three complete catalogs on happy paths cannot prove the fallback guarantee. Happy-dom cannot prove real chart canvas/overflow/focus behavior; add browser smoke coverage or documented manual checks when implementation starts.

## 27. Bundle/performance plan

**Now:** statically bundle all enabled initial language namespaces with release-pinned application code, eagerly initialize before rendering, no HTTP catalog dependency/detector, no new locale Suspense boundaries. Keep feature components/charts lazy as they are today. Measure compressed catalogs/engine addition after implementation; string inventory is not a bundle size estimate.

**Later:** if measured catalog size/language count warrants it, keep canonical Uzbek resources and common/auth/shell/emergency copy eagerly available; dynamically import selected-language feature namespaces using a build-generated/import.meta.glob manifest. Preload required namespaces at route/switch boundaries, verify completeness, then commit. Versioned immutable asset URLs align resources with code; no mutable remote latest catalog. Route chunk failures and locale chunk failures have distinct recoveries. Adding loaders must not modify translation callsites.

Loading a new namespace must never expose IDs during a Suspense gap. For initial selected-language fetch failure, use canonical resources; for user-driven switch, keep previous working language. If even canonical required content cannot render, fail with emergency panel rather than auto-retrying a business mutation. Cache formatter instances by locale+options; presentation memo dependencies include locale revision. Avoid adding locale to current server QueryClient keys when backend data is language-neutral.

## 28. Staged migration plan and independent acceptance

| Phase | Repository-derived scope | Acceptance before next phase |
| --- | --- | --- |
| 0: foundation | Registry, resolver/storage, shared runtime/typed guard/emergency copy, resource manifest/type generation/validator; main bootstrap and isolated test harness | Fault-injection no-key guarantee, typings, parity/build gate, blocked storage and switching race tests pass. Existing app lifecycle untouched |
| 1: shared/global | AsyncState, ResultToast, PaginationBar, DetailsDialog, FilterDrawer, lookup clear labels, TableColumnPreferences, phone description, sheet default Close, theme selector; shared formatting adapters | UZ remains equivalent; RU/EN defaults/accessibility update; preferences use same IDs; label-comparison anti-pattern removed |
| 2: shell/auth/account | Navigation/page-title metadata, Header/LiveShellLayout, route statuses/recovery/integration UI, LoginForm/AuthPresentation, auth reason descriptors/controllers/lease, profile-refresh/logout copy | Switch before/after login/reload/logout without auth reset. OTP/PIN/lease/permission and recovery tests remain valid |
| 3: dashboard | Metrics/growth/donut/trend/calendar/recent QR; stable chart series identifiers; backend period presentation | Same reconciliation/calculations/requests; correct labels and exact values in canvas/HTML; tooltip resets on locale |
| 4: dynamic QR | Lists/details/filters/columns, create/cancel outcomes, result/copy/display/export UI, money bounds display | DTO/date/amount/currency unchanged; pending/unknown mutation semantics remain; no duplicate dispatch |
| 5: static QR + management | Static QR, terminals, bank accounts, cashiers/create/assign/unassign, P5/reset; own status mappings | Raw status/IDs/read scope remain; confirmation forms/errors/ARIA switch without remount or action replay |
| 6: completeness | Remaining shared/feature reason descriptors, validation hints, missing values, accessibility, DEV production-reachable copy, literal-baseline cleanup | No translated prose stored in migrated business state; all enabled catalogs complete; intentionally technical literals approved |
| 7: product artifacts + release | Product-decided poster/export/role/currency policies; three-locale browser/manual QA, fault injection, bundle measurements and release checks | End-to-end fallback/format/domain/accessibility evidence; translation review; no-key guard cannot be bypassed |

Formatting/error/validation safety tests start in Phase 0 and migrate with each affected feature; they are not postponed until cleanup. Each phase enables only completed namespaces/screens; untranslated legacy screens remain visibly original rather than half-configured engine keys. No uncontrolled mass replacement. Release each phase with existing functionality verified and all three catalogs complete for that scope. If a feature cannot meet parity/safety, keep it on original rendering until a bounded migration is complete.

## 29. Concrete regression risks and open product decisions

Highest risks: provider placement misses unavailable/preview/recovery trees; top-level translated metadata stays stale; stored Uzbek reasons remain after switches; locale-keyed remount loses secrets/drafts or repeats actions; shared 0/1 status mapping corrupts domain meaning; chart labels merge color domains/sort incorrectly; money Number conversion loses precision; percent formatting multiplies by 100; local dates shift by timezone; localized filters change backend values; an unknown mutation is relabeled as safe retry; keys escape through raw engine/rich-text use.

Test risk: Header.test expects “Ko‘rinish” and “System”; PaginationBar.test embeds Uzbek ARIA/page strings; ResultToast/DetailsDialog/LookupFilterSelect/TableColumnPreferences tests query translated accessible attributes; filter lifecycle tests find “Filtrlarni yopish”. Audit and migrate these alongside corresponding scopes, preserving explicit Uzbek assertions where intentional. Source search found no toMatchSnapshot/toMatchInlineSnapshot usage; do not claim snapshot regressions already exist. Static render tests may lack providers and need an explicit locale fixture.

Layout risk: Header truncates titles and reserves shrink-0 controls; sidebar width is 17rem; collapsed tooltips are nowrap; theme select max width 6.75rem; pagination size select w-28/w-32; tables/dialogs and calendar headings may wrap; poster uses fixed 31/33px canvas text. Russian/English expansion, mobile overflow, longer buttons/table headings, 200% zoom, toast wrapping and tooltip clipping need real-browser review. Existing min-w-0/flex-wrap/scroll regions help but are not evidence translated layouts pass.

| Decision | Safe initial default | Who resolves alternative |
| --- | --- | --- |
| Default/fallback locale | Uzbek canonical/default/fallback; browser match used when no explicit preference | Product can select another default without redefining canonical fallback |
| en regional formatting | en-US for both en-US/en-GB requests | Product can register regional variants later |
| Account language synchronization | Device-local only; no locale field/API exists | Backend/product contract owner |
| Money appearance | Preserve currency ISO code and exact declared scale | Finance/product for symbols/names/fraction suppression |
| Native input parsing | Preserve current ASCII/dot/comma rules and exact bounds | Separate UX/financial contract review |
| XLSX language/headings/filename | Preserve backend-generated content and sanitized filename | Export backend/product; no silent locale parameter |
| QR poster language | Preserve approved Uzbek/Russian bilingual collateral | Product/brand; translation/layout approval for variants |
| Roles/geographic names | Backend display content preserved; only verified code maps translate | Backend/product; do not reverse-map prose |
| Browser/cross-tab behavior | Current explicit preference persists; storage unavailable uses memory | Product for synchronization behavior; supported-browser QA for Intl |
| Observability | Injectable deduplicated safe reporter; no sensitive values | Team for monitoring service/release alert policy |

Release condition: every migrated frontend-owned text path uses the guarded adapter; every enabled resource passes integrity/type checks; all failure classes have production-mode tests; switching preserves domain contracts and session/action lifecycle; human translation and layout reviews pass. This is stronger than fallback configuration and scalable beyond the three initial languages without scattering language branches.

## Evidence navigation

Primary source anchors at the audited revision:

- [Bootstrap](<D:/QR projects/qrhub-merchant-frontend/src/main.tsx>), [live providers](<D:/QR projects/qrhub-merchant-frontend/src/app/LiveRoot.tsx>), [live routing](<D:/QR projects/qrhub-merchant-frontend/src/app/LiveRouter.tsx>), [recovery](<D:/QR projects/qrhub-merchant-frontend/src/app/AppRecoveryBoundary.tsx>).
- [Navigation](<D:/QR projects/qrhub-merchant-frontend/src/app/navigation.ts>), [Header](<D:/QR projects/qrhub-merchant-frontend/src/app/layout/Header.tsx>), [table preferences label comparison](<D:/QR projects/qrhub-merchant-frontend/src/shared/ui/TableColumnPreferences.tsx:292>).
- [Safe API errors](<D:/QR projects/qrhub-merchant-frontend/src/shared/api/errors.ts>), [auth messages/tags](<D:/QR projects/qrhub-merchant-frontend/src/shared/auth/login-controller.ts:62>), [profile decoder](<D:/QR projects/qrhub-merchant-frontend/src/shared/contracts/auth.contract.ts:209>), [action outcomes](<D:/QR projects/qrhub-merchant-frontend/src/shared/api/one-dispatch-action.ts>).
- [Exact money](<D:/QR projects/qrhub-merchant-frontend/src/shared/money/minor.ts>), [amount parser](<D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/create-amount.ts>), [date presentation](<D:/QR projects/qrhub-merchant-frontend/src/shared/presentation/date-time.ts>), [API date presets](<D:/QR projects/qrhub-merchant-frontend/src/shared/filters/date-range.ts>).
- [Chart identity/presentation](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/trend-presentation.ts>), [chart HTML summaries](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/TrendChart.tsx>), [donut mapping](<D:/QR projects/qrhub-merchant-frontend/src/features/dashboard/donut-presentation.ts>).
- [QR status mapping](<D:/QR projects/qrhub-merchant-frontend/src/shared/presentation/qr-status.ts>), [management active mapping](<D:/QR projects/qrhub-merchant-frontend/src/shared/presentation/active-status.ts>), [cashier-terminal mapping](<D:/QR projects/qrhub-merchant-frontend/src/features/cashiers/status-presentation.ts>), [P5 mapping](<D:/QR projects/qrhub-merchant-frontend/src/features/p5/page-state.ts>).
- [Server XLSX handling](<D:/QR projects/qrhub-merchant-frontend/src/shared/api/xlsx-download.ts>), [bilingual poster](<D:/QR projects/qrhub-merchant-frontend/src/features/dynamic-qr/qr-poster.ts>), [text candidate inventory](<D:/QR projects/qrhub-merchant-frontend/docs/audit/i18n-text-inventory.md>).
