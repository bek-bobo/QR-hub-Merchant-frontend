# I18N.6 — Completeness & Hardening

Date: 2026-10-09 (Asia/Tashkent). **Technical checkpoint COMPLETE.** Production release is **not approved**. Independent language approval, real-backend verification, actual assistive technology and real 200% browser zoom remain unverified. I18N.7 was not started; no deployment or commit was performed.

## 1. Baseline and preservation

Branch: `feature/dashboard-analytics`. HEAD: `b4d78b84fcb793ac3b99af2bb15180a6c07f6206`, unchanged at completion. The expanded initial status contains **218 modified tracked paths and 215 untracked paths** (433 entries). These are earlier work, not this checkpoint's diff. Exact paths are in [baseline-status.txt](i18n6-evidence/baseline-status.txt). A SHA-256 snapshot covers 761 existing source/script/document/configuration files in [baseline-hashes.json](i18n6-evidence/baseline-hashes.json). The evidence directory was created immediately before that snapshot; its baseline-status file is audit bookkeeping rather than inherited application work.

Baseline `npm test`: **exit 0; 225 files / 2,100 tests; 47.75 s**. See [baseline-tests.log](i18n6-evidence/baseline-tests.log).

The incremental inventory compares the final working tree with these initial hashes, not HEAD: **8 existing files changed, 8 new implementation/test/report files**, with separate evidence artifacts. No baseline file was removed. `package-lock.json`, API/contracts, auth/session/device leases, controllers, query/cache policies, financial helpers, date boundaries, routes, QR payload generation, poster artwork and binary download helpers retain their baseline contents. No reset, stash, clean, revert, dependency modification, generated-file hand edit or automatic commit occurred. Temporary review HTML/TSX files were created under unique checkpoint names and removed after use; the browser viewport was reset, tab closed and dev server stopped.

No applicable AGENTS.md or CI workflow was found in repository searches. The architecture audit, historical text inventory and I18N.0–5 reports informed ownership review. They were reconciled against actual code: all 11 namespaces are now enabled, Dynamic QR still defaults to **one Tashkent day**, and the QR sibling-key warning remained present before this checkpoint. Historical approval limitations were not silently converted into approvals.

## 2. Fresh inventory and reachability

[text-inventory.json](i18n6-evidence/text-inventory.json) records **293 non-test/non-typecheck TS/TSX modules**, **254 modules in the production import closure**, **12,830 string/template literal occurrences** (10,771 in that closure), and **284 high-confidence UI text candidates** (38 in production modules). These counts do not count JSON catalog leaves or classify every literal as a defect. The historical 1,393-candidate inventory was not used as completeness evidence.

The TypeScript AST scanner starts at `src/main.tsx`, follows local/alias imports, re-exports and literal lazy imports, and excludes dynamic imports inside a proven positive `import.meta.env.DEV` conjunction. It does not exempt files by name. Router lazy pages, integration-unavailable bootstrap, recovery boundaries, shared UI, charts, details/modal portals, table metadata, loading/empty/error and export surfaces are included. It conservatively includes whole imported modules: exported DEV functions or overridden legacy labels can remain in a production module without being rendered by live callers. Four unresolved edges refer only to the generated declaration module through named type imports; there are no unresolved executable local imports.

Module absence from the closure is distinguished from a runtime condition: DemoRoot/AppRouter/legacy DashboardPage and their scenarios are DEV/unreachable, while configured, denied and integration-unavailable live paths remain production surfaces. Staging environment registrations do not introduce a separate localized UI graph.

High-confidence candidates cover JSX text, direct/nested expression text, literal/template title/placeholder/alt/aria-label/aria-description attributes, and obvious label/title/description/heading/caption/message configuration properties. A broader literal inventory and targeted source reads reviewed Uzbek/English prose, internal error reasons, semantic feedback whitelists, fixed poster text, direct formatting calls, defaults, status adapters and data passed through shared components. Backend/user data, IDs, brand names, technical constants, caller-owned text, already-guarded labels, fixed documents, DEV/test text and deliberate emergency fallback are recorded separately in the exception report.

## 3. Confirmed findings and fixes

**Five untranslated catalog captions and two runtime/presentation defects were confirmed; all seven were fixed.** No confirmed ordinary production frontend copy remains untranslated outside a documented exception.

| Source / approximate line | Rendered surface / former copy | Classification / owner / severity | Final correction |
|---|---|---|---|
| `src/locales/uz/dynamicQr.json:138`; DynamicQrDetailsSheet technical card | `Status code` | Frontend-owned untranslated caption; dynamicQr; P2 | `Holat kodi` |
| `src/locales/uz/dynamicQr.json:139`; same card | `Distribution status` | Frontend-owned untranslated caption; dynamicQr; P2 | `Tarqatish holati` |
| `src/locales/uz/dynamicQr.json:140`; details link section | `QR / link` | Frontend-owned mixed-language caption; dynamicQr; P2 | `QR / havola` |
| `src/locales/uz/staticQr.json:60`; StaticQrDetailsSheet link card | `Redirect URL` | Frontend-owned untranslated caption; staticQr; P2 | `Yo‘naltirish URL manzili` |
| `src/locales/uz/staticQr.json:61`; technical card | `Status code` | Frontend-owned untranslated caption; staticQr; P2 | `Holat kodi` |
| `src/features/dynamic-qr/QrPresentation.tsx:45–46` | Link and download siblings shared the same `original` key | Shared QR runtime warning; QR presentation; P2 | Distinct `link:` / `downloads:` key prefixes; still keyed by exact original link |
| `src/app/layout/Header.tsx:148` | Noncompact logout remained visually enabled when critical logout caption was unavailable | Critical fallback affordance inconsistency; shell/auth; P2 | Disabled state now includes `!canLogout`, matching the guarded handler and compact menu |

Existing keys and meaningful RU/EN equivalents were retained; no namespace migration was needed. `locales:generate` was explicitly executed after caption changes. Declarations/metadata are byte-identical because key/interpolation structure did not change; freshness was checked, never generated as a side effect of build. Real mounted portal tests assert corrected Uzbek copy, live language changes and unchanged raw link/key-like backend data. QR tests exercise locale/link changes, exact payload input and absence of sibling-key warnings. Fault injection asserts unavailable logout is disabled and cannot dispatch.

## 4. Catalog integrity and linguistic review

The enabled manifest is exactly `common, shell, auth, account, dashboard, dynamicQr, staticQr, terminals, bankAccounts, cashiers, p5`. All 33 catalogs validate. There are **771 logical keys per locale**; physical leaves are UZ 773, RU 777, EN 773 (2,323 total). Different Russian plural forms are expected, not parity defects.

| Namespace | Logical keys |
|---|---:|
| common | 69 |
| shell | 64 |
| auth | 55 |
| account | 9 |
| dashboard | 108 |
| dynamicQr | 155 |
| staticQr | 60 |
| terminals | 59 |
| bankAccounts | 27 |
| cashiers | 92 |
| p5 | 73 |

[catalog-review.json](i18n6-evidence/catalog-review.json) contains aligned UZ/RU/EN leaves, Russian-only plural categories, logical/physical counts, repeated Uzbek copy and possible usage-review keys. Structural comparison examines all enabled content; targeted linguistic review checks untranslated English matches, Uzbek Latin copy, terminology, status meaning, interpolation grammar and critical unknown/rejected/not-sent warnings. It found and fixed the five captions above. Shared loan terminology such as Merchant, Terminal, Status, Bank and Dashboard and acronyms QR ID/RRN/MFO/MCC/PIN remain established terminology. This is static engineering review, **not independent native-speaker approval or a guarantee of naturalness for every sentence**.

Duplicate labels are retained with namespace/context ownership. Static usage absence is not proof of an unused key: granularity/growth keys use typed factories, cancellation keys occur in runtime-gated presentation, shell navigation uses dynamic metadata, and foundation greeting/items/save support guard fixtures. No keys were deleted, renamed or consolidated.

Prioritized language/product review queue:

| Priority | Namespace/key/context | Review concern / suggested wording | Disposition |
|---|---|---|---|
| P1 | p5 `status.inactive` | `Inactive / administrator flag` / `Неактивно / отметка администратора`: verify with domain owner that the administrator qualification is understood; preserve code 1 mapping | Human/domain review; no invented semantics |
| P1 | dynamicQr `cancel.warning`; p5 `reset.warning`; cashiers `unassign.warning` | Confirm safety consequences and imperative clarity in all three languages; retain distinct sent/unknown/rejected/not-sent outcomes | Human review before release |
| P2 | p5 `reset.*` Uzbek | Mixed borrowed `reset` wording; proposed terminology for review: `PINni tiklash so‘rovi`, `Tiklash natijasi tasdiqlanmadi`, `Tiklash uchun OTP yuborildi` | No blanket rewrite of established copy |
| P2 | dynamicQr `details.statusCode/distributionCode/linkSection`; staticQr `fields.redirect/statusCode` | Review newly corrected `Holat kodi`, `Tarqatish holati`, `QR / havola`, `Yo‘naltirish URL manzili` | Fixed; native approval pending |
| P3 | staticQr `details.links`; multiple `Merchant` labels | `Linklar` versus `Havolalar`, `Merchant` versus product-approved Uzbek term | Terminology decision; retained existing wording |
| P3 | common/table/error helper phrases; p5 `states.contractHelp` | Russian/English contract-error explanations are accurate but technical; consider plainer wording with support/product owners | Human review; semantic intent retained |

## 5. Enforceable regression gates

`npm run i18n:literals` is now part of **both lint and production build**. It checks production reachability and accepts only exact file + AST surface + literal text entries in `scripts/i18n-literal-exceptions.json`, each with owner and reason. There are **36 distinct exact matches covering 38 occurrences**: 19 guarded legacy/adapter cases, 9 technical/brand/mask cases, 8 DEV-only branches/exports. Stale exceptions fail. New literals in another file, a changed text, a changed surface, missing reason or missing owner fail. There is no directory-wide or generic text regex exemption. Tests inject new JSX/config/accessibility/template strings and verify positive DEV guards do not hide production `!DEV`, `DEV === false` or `DEV || ...` cases.

Detection limits: this is a maintainable high-confidence check, not full data-flow/language inference. Arbitrary helper-returned prose, translated text frozen in custom state, concatenations outside targeted locations, nonliteral import paths and custom configuration property names need review. Whole-module reachability overapproximates export usage. Exact legacy exceptions need caller review when those APIs acquire new live callers. Catalog English-match review remains a separate audit; a resource can be structurally valid yet linguistically wrong, as this checkpoint demonstrated.

The existing AST engine/catalog import boundary and negative translation type tests remain enforced. No production feature imports catalogs or calls raw `i18next.t()`. No new translation occurs during module evaluation. `scripts/i18n-release-check.mjs` provides an executable fail-fast gate via `npm run i18n:release-check`: validate → lint → typecheck → full test → production build → diff check. Windows uses fixed npm command arguments through cmd; no user input enters shell command text. There is no configured CI workflow; CI should invoke this existing release gate, without regeneration or deployment infrastructure.

## 6. Guard, state and domain verification

Requested locale → canonical Uzbek → independent emergency presentation is exercised by runtime/catalog/DOM tests. Fault injection covers requested/canonical key loss, missing namespaces, empty/object/number/array/null translations, identifier copy, malformed/wrong/missing interpolation, invalid parameters/counts/plural variants, duplicate catalog keys, resource preparation/engine initialization/changeLanguage/t failures, unsupported locale, stale generated declarations and metadata. The new runtime test corrupts a Russian plural variant, removes requested/canonical namespaces and checks ordinary emergency versus critical unavailability. Backend strings resembling keys/placeholders remain literal data.

Cancellation, cashier unassignment and P5 reset critical title/warning/confirm fault tests withhold dispatch. Existing tests retain their click-time guard and one-dispatch assertions. Header fault injection now also verifies disabled presentation. Portals, labels, accessible summaries, chart presentation and emergency rendering are covered by the existing mounted regression suites. No ordinary raw key leakage was detected in these tested paths; this is not a claim about arbitrary unobserved data.

Semantic copy/filter/export/create/assignment outcomes remain descriptors translated at render. No controller, mutation port, action registry or backend reason was translated. UZ → RU → EN → UZ tests rerun actual Login/PIN/OTP, Header/account, Dashboard, Dynamic QR and five management pages. They retain auth/query/cache identity, route/history, device lease, form/caret/date drafts, terminal/filter/page/column preferences, open dialogs/focus, chart choices and pending/unknown outcomes. Settled locale-neutral reads add zero calls; mutations and XLSX handoffs do not replay. Exact controller/request assertions remain unchanged.

Money: BigInt division/remainder formatting remains the established grouping/dot-decimal/ISO-code policy; huge `900719925474099301` minor units remain `9 007 199 254 740 993.01 UZS`. Zero/null/negative/scales/safe-integer rejection and percentage-point formatting are covered by shared money/dashboard tests. Ordinary counts use the selected registry locale; account/MFO/TIN/QR/device IDs and raw Static QR limits are not grouped or coerced. No payload, sort, filter or calculation acquired locale as identity.

Dates: selected-locale calendar presentation uses UTC carriers, offsetless wall time retains `23:59`, instant labels use Asia/Tashkent, wire dates remain ISO, cross-midnight periods preserve half-open boundaries, and unfinished drafts remain intact. Dynamic QR still uses `getTashkentDatePreset(1)`; the requested one-month default is a **separate product follow-up**, not changed here.

Status mappings remain Dynamic QR 0/5/10/20/25/50/unknown; general management active only 0; assignment 0 active/1 inactive/other unknown; P5 0 active/1 inactive-administrator/other unknown; embedded P5 static QR uses the separate general active classifier. Tones, permissions, eligibility and wire values do not inspect localized labels. Legacy source labels are replaced by guarded adapters in live presentation.

## 7. Browser and accessibility evidence

A temporary localhost harness reused existing synthetic DEV ports and actual production components. It did not contact merchant backends. **128 measured samples** cover eight preview destinations × UZ/RU/EN/UZ × 390/1280px × light/dark. [browser-measurements.json](i18n6-evidence/browser-measurements.json) records document overflow, main-content button naming and sampled counters. No document horizontal overflow or unnamed main buttons were detected. Mobile clipping candidates were intentional `sr-only` search submit buttons; later measurements excluded these and found no visible button clipping. Management/P5 sampled request counters remained stable during locale cycles.

Actual screenshots/keyboard/portal review includes Russian mobile login/dark, English desktop login/light, Russian mobile calendar with localized weekdays/month/day names, Russian P5 reset warning/footer and Escape dismissal, and Dashboard error/empty copy switching RU→EN. Browser console sampling found no error/warning entries. Screenshots are in `i18n6-evidence/*.jpg`. DOM `document.lang` followed all measured locale selections. Reset confirmation was inspected without dispatch.

Limits: the existing Static QR/Cashier DEV previews mount result/action compositions, not every live page path. Account/shell preservation and real live page state are verified by mounted automated tests, not a new full-browser shell session. Browser DOM matrix measurements are not 128 independent visual approvals. Pending/unknown mutation/download states, all toasts, native chart hover retention and every dialog were not exhaustively replayed in the browser. The final five caption fixes were verified by real mounted detail-portal tests; they were not revisited in the already-closed browser harness. Full-production backend E2E, actual screen reader testing and actual 200% browser zoom are **NOT_RUN**; viewport resizing is not claimed as zoom. Localized roles/IDs/reference attributes were not translated. Focus and keyboard behavior retain automated lifecycle coverage; no screen-reader certification is inferred from accessible names.

## 8. Exact command results

All commands ran in `D:\QR projects\qrhub-merchant-frontend`. Each required command was executed by the release-check script, with fail-fast exit propagation.

| Command | Exit | Result / evidence |
|---|---:|---|
| Baseline `npm test` | 0 | 225 files / 2,100 tests, 47.75 s |
| `npm run locales:generate` | 0 | Explicit regeneration after five caption fixes; generated structure unchanged |
| `npm run locales:validate` | 0 | UZ/RU/EN; 11 namespaces |
| `npm run lint` | 0 | Boundary + literal check + oxlint; two inherited Fast Refresh warnings |
| `npm run typecheck` | 0 | Includes validation/freshness and negative type contracts |
| `npm test` (final) | 0 | **227 files / 2,120 tests**, 76.85 s |
| `npm run build` (final) | 0 | Validation, boundary, literal gate, TypeScript, Vite; 1.31 s |
| `git diff --check` | 0 | No whitespace errors; inherited Windows LF/CRLF notices |
| `npm run i18n:release-check` (final) | 0 | All six required commands; [release-check-final.log](i18n6-evidence/release-check-final.log) |
| Focused changed-module command | 0 | **65 files / 501 tests**, 44.68 s; [changed-modules-final.log](i18n6-evidence/changed-modules-final.log) |
| Focused cross-feature/contracts command | 0 | **27 files / 331 tests**, 21.55 s; [contracts-switching-final.log](i18n6-evidence/contracts-switching-final.log) |
| `node scripts/check-i18n-literals.mjs --inventory`; `npm run i18n:literals` | 0 | Fresh inventory and strict exact-exception gate |
| `node scripts/audit-i18n-catalogs.mjs` | 0 | Aligned all enabled catalogs; no key deletion |

Exact focused changed-module command: `npx vitest run src/features/dynamic-qr src/features/static-qr src/app/layout/Header.test.tsx src/app/layout/Header.profile-menu.test.tsx src/app/i18n6-hardening.test.tsx src/shared/i18n scripts/check-i18n-literals.test.mjs --maxWorkers=2`.

Exact focused cross-feature command: `npx vitest run src/app/shell-auth-account.i18n.test.tsx src/app/read/management.i18n.test.tsx src/features/dashboard/dashboard.i18n.test.tsx src/features/dynamic-qr/dynamic-qr.i18n.test.tsx src/features/dynamic-qr/dynamic-qr.locale-queries.test.tsx src/features/static-qr/static-qr.i18n.test.tsx src/features/terminals/terminals.i18n.test.tsx src/features/bank-accounts/bank-accounts.i18n.test.tsx src/features/cashiers/cashiers.i18n.test.tsx src/features/p5/p5.i18n.test.tsx src/shared/i18n src/shared/money src/shared/presentation src/shared/filters --maxWorkers=2`.

Non-passing attempts are retained, not reported as PASS: initial hardening test selected the theme button rather than logout (1 failed / 65 passed); the selector was corrected to the actual final logout button. A focused cross-feature run during concurrent browser work hit three existing 5-second timeouts and a subsequent storage assertion failure (4 failed / 327 passed). With the harness closed and two workers, the same tests passed; timeout limits/assertions were not changed. These failures are consistent with host load and timed-out cleanup, but no definitive root-cause claim is made. Final default-worker full suite and build passed after fixes. Temporary harness Fast Refresh warning occurred only before cleanup; final lint contains only the inherited button/badge warnings.

## 9. Exceptions, risks and readiness

[I18N_6_TRANSLATION_EXCEPTIONS.md](I18N_6_TRANSLATION_EXCEPTIONS.md) contains **44 rows**: 21 already guarded localized cases/groups, 10 technical, 9 DEV/test/legacy, 1 caller-owned, 1 backend/user data, 1 fixed bilingual poster/document, 1 independent canonical emergency copy. Each has source, reachability, owner, reason, disposition and release-blocking flag. The gate uses only the 36 exact literal entries; broad documentation boundary groups do not bypass it.

The QR sibling-key warning is fixed. Two inherited button/badge Fast Refresh warnings and main/PlotRenderers chunk-size advisories remain documented, without suppression or unrelated bundle work. Extreme-value table cells remain a manual readability risk; no unrelated layout redesign was attempted. Native-speaker review and real-backend verification remain release prerequisites. Screen-reader and real zoom/manual chart-tooltip checks remain NOT_RUN; no production release readiness is inferred solely from passing automated checks.

**No known technical I18N.6 blocker remains.** I18N.7 — Release Verification is the recommended next checkpoint for independent language/product approval, backend E2E and remaining manual accessibility/visual checks. It has not begun.

## 10. Incremental files

Changed baseline files: `package.json`, `src/app/layout/Header.tsx`, `src/features/dynamic-qr/QrPresentation.tsx`, `src/features/dynamic-qr/dynamic-qr.i18n.test.tsx`, `src/features/static-qr/static-qr.i18n.test.tsx`, `src/locales/uz/dynamicQr.json`, `src/locales/uz/staticQr.json`, `src/shared/i18n/runtime.test.ts`.

New implementation/test files: `src/app/i18n6-hardening.test.tsx`, `scripts/check-i18n-literals.mjs`, `scripts/check-i18n-literals.test.mjs`, `scripts/i18n-literal-exceptions.json`, `scripts/i18n-release-check.mjs`, `scripts/audit-i18n-catalogs.mjs`. New deliverables: this report and the exceptions report. Exact evidence/incremental inventory: [incremental-files.json](i18n6-evidence/incremental-files.json).
