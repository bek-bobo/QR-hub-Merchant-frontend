# I18N.0 — Foundation implementation report

Date: 2026-10-09. Scope: internationalization infrastructure only. I18N.1 has not started.

Checkpoint status: **PARTIAL**. Implementation and all automated checkpoint verification are complete. The request also requires human-reviewed initial strings; independent human review of the authored UZ/RU/EN copy has not been verified, so full checkpoint completion is not claimed. The reviewable catalogs are committed-work candidates listed below. No implementation verification is outstanding.

## Architecture and audit reconciliation

Source of truth: `docs/audit/I18N_ARCHITECTURE_AUDIT.md` (the actual uppercase filename) and `docs/audit/i18n-text-inventory.md`. Both were present as untracked user-provided documents before implementation and were preserved. Current source confirms the audited shared bootstrap, live provider chain, DEV dynamic root, integration-unavailable early return, independent route recovery, and guarded storage conventions. Installed versions are React/React DOM 19.3.0, TypeScript 6.0.3, Vite 8.3.0, Vitest 5.0.0, happy-dom 20.14.5. The existing linter is **oxlint**, not ESLint.

The implementation follows the proposed shared runtime/app bootstrap split. Intentional adjustments: only `common` is enabled; `shell` and `auth` are planned rather than artificial empty catalogs. The central registry and namespace manifest use JSON so the validator and application share the same configuration. Generated runtime metadata accompanies the generated declarations. Hooks/context/recovery notice have separate files following the repository's React Fast Refresh convention. An AST import-boundary checker uses the already-installed TypeScript compiler and is integrated into lint and build; no extra lint dependency is installed.

All enabled resources ship in the application bundle. There is one application-owned i18next instance, explicit I18nextProvider integration, a locale external store, and QRHub-owned React/non-React message facades. No translation HTTP loader, browser detector, backend locale field, route-language prefix, or production switcher is introduced.

## Files created

- `.gitattributes` — preserve LF for deterministic generated files across Windows checkouts.
- `scripts/validate-locales.mjs`
- `scripts/check-i18n-boundary.mjs`
- `src/shared/i18n/languages.json`
- `src/shared/i18n/namespaces.json`
- `src/shared/i18n/registry.ts`
- `src/shared/i18n/locale-resolution.ts`
- `src/shared/i18n/resources.ts`
- `src/shared/i18n/runtime.ts`
- `src/shared/i18n/messages.ts`
- `src/shared/i18n/emergency-copy.ts`
- `src/shared/i18n/generated.d.ts`
- `src/shared/i18n/metadata.generated.ts`
- `src/shared/i18n/LocaleContext.ts`
- `src/shared/i18n/LocaleProvider.tsx`
- `src/shared/i18n/LocaleRecoveryNotice.tsx`
- `src/shared/i18n/useLocale.ts`
- `src/shared/i18n/useMessages.ts`
- `src/shared/i18n/locale-resolution.test.ts`
- `src/shared/i18n/runtime.test.ts`
- `src/shared/i18n/catalog-validation.test.ts`
- `src/shared/i18n/LocaleProvider.test.tsx`
- `src/shared/i18n/messages.typecheck.ts`
- `src/app/i18n/bootstrap.ts`
- `src/app/i18n/bootstrap.test.tsx`
- `src/locales/uz/common.json`
- `src/locales/ru/common.json`
- `src/locales/en/common.json`
- `docs/i18n/I18N_0_FOUNDATION_REPORT.md`

## Files modified

- `package.json` — pinned runtime dependencies and integrity/boundary scripts.
- `package-lock.json` — npm-generated dependency resolution; original dependencies retained.
- `tsconfig.app.json` — enable JSON resource imports.
- `src/main.tsx` — initialize locale before rendering and wrap both root pathways above ThemeProvider.

No existing feature, API, auth, query, financial, filter, route, XLSX, or poster implementation was edited. No existing test was weakened or changed.

## Dependencies

Installed with `npm install --save-exact i18next@26.4.2 react-i18next@17.0.16`. npm registry peer metadata for react-i18next 17.0.16 accepts React >=16.8, i18next >=26.2.0, and TypeScript 5/6/7. Typecheck and the production build prove compatibility with this repository. Only these two runtime packages were requested; their necessary transitive dependencies are lockfile-managed.

Official behavior references: [I18nextProvider](https://react.i18next.com/latest/i18nextprovider), [i18next plurals](https://www.i18next.com/translation-function/plurals), [interpolation](https://www.i18next.com/translation-function/interpolation). Implementation verifies their behavior with isolated instances rather than relying solely on documentation.

## Registry and namespaces

`SupportedLocale` derives from the keys of `languages.json`; enabled language iteration derives from registry metadata. Uzbek is canonical, default, and fallback.

| Code | Native name | Intl locale | Direction | Explicit aliases |
| --- | --- | --- | --- | --- |
| uz | O‘zbekcha | uz-UZ | ltr | uz, uz-UZ, uz-Latn, uz-Latn-UZ |
| ru | Русский | ru-RU | ltr | ru, ru-RU |
| en | English | en-US | ltr | en, en-US, en-GB |

Tags are validated/canonicalized with Intl before exact alias matching. Unsupported regional/script tags remain unsupported; `uz-Cyrl` and `uz-Cyrl-UZ` never map to Latin Uzbek. Case variants normalize; whitespace and malformed tags are rejected.

Enabled namespace: `common`, complete in all three languages. Logical keys: `actions.save`, `actions.cancel`, `states.unavailable`, `locale.changeFailed`, `greeting`, `items`. The last two exercise named interpolation/plural behavior without migrating pages. Russian includes one/few/many/other; Uzbek/English include one/other.

Planned namespaces: shell, auth, account, dashboard, dynamicQr, staticQr, terminals, bankAccounts, cashiers, p5. Planned means no enabled catalog and no usable facade namespace. Existing hardcoded UI remains legacy Uzbek regardless of the foundation's selected locale. Completeness applies to the six foundation messages, not whole-app translation coverage.

## Resolution and persistence

Precedence: valid explicit runtime selection → valid persisted preference → first supported entry in navigator.languages → uz. Bootstrap reads persisted/browser preference once; explicit service selection thereafter is authoritative. No profile synchronization or cross-tab storage subscription is added.

Storage uses only `qrhub:locale:v1`, with the **plain canonical code**, following the existing theme storage convention. JSON is not the storage format: JSON strings, objects, invalid JSON, unsupported codes, and missing values are rejected safely. Access to the localStorage getter and reads/writes is guarded. Bootstrap does not write preference; only successfully committed user selections persist. Failed storage leaves memory usable. Existing token persistence clears only its own token keys, and the logout test verifies the locale preference survives. No sensitive data is stored.

## Translation API and import boundary

React usage (examples only; no production feature migrated):

```tsx
import { useMessages } from '@/shared/i18n/useMessages'
import { useLocale } from '@/shared/i18n/useLocale'

const { message, critical } = useMessages('common')
message('actions.save')
message('greeting', { name: merchantDisplayName })
message('items', { count: 0 })
const confirmation = critical('actions.cancel')
const { locale, ready, switchLocale } = useLocale()
await switchLocale('ru')
```

Non-React presentation factories receive the guarded source from their composition owner:

```ts
import { createMessages, type MessageSource } from '@/shared/i18n/messages'

export function createSavePresentation(source: MessageSource) {
  return { label: createMessages(source, 'common').message('actions.save') }
}
```

Call factories when presentation is needed, not at module evaluation; recompute on locale subscription changes. The source exposes guarded resolution, never the engine. Hook consumers receive no engine. The application runtime is created by app bootstrap; tests use isolated factories.

The AST boundary checker prohibits static imports, re-exports, literal dynamic imports, CommonJS require, and import-equals access to i18next/react-i18next outside `runtime.ts` and `LocaleProvider.tsx`. It also prohibits runtime/resources/context/metadata internals and direct catalog imports from ordinary consumers, resolving both `@/` and relative paths. Exact adapter owners and `src/app/i18n/bootstrap.ts` are allowed; test/typecheck fixtures are exempt. `useMessages`, `createMessages`, `useLocale`, and registry normalization are the public boundary. Both `npm run lint` and normal `npm run build` enforce it. This is a code-quality boundary, not a sandbox against deliberately obfuscated runtime imports or generated code.

Plain string output only; React escapes interpolation data at rendering. Do not insert output into raw HTML. Rich text is deliberately not implemented: catalog HTML/nesting is rejected. Future rich text requires a separate guarded node/slot API, keeping the same failure policy rather than bypassing it through Trans.

## Missing copy, interpolation, and critical content

Layer A: generated namespace/key/parameter types reject static misuse. Layer B: catalog validation runs before typecheck/build. Layer C: guard checks known namespace/key, exact named parameters, finite numeric counts (zero accepted), source structure and interpolation metadata, engine string type, and exact expected rendering. Layer D: independent emergency copy.

Resolution is requested-language copy → canonical Uzbek copy → unavailable result. `message` turns unavailable into `Matnni ko‘rsatib bo‘lmadi.`; `critical` retains `{ status: 'unavailable', reason }`. Reasons are stable internal categories, never merchant-facing diagnostics. The critical fixture renders a recovery panel and withholds its action button; its dispatch spy stays untouched. No real destructive/payment workflow was edited.

Interpolation values are passed as engine replacement data, not options or keys. Unknown/missing variables, wrong types and nonfinite numbers are rejected before engine access. Source metadata is checked before rendering; exact-output comparison also catches engine misbehavior. Literal user strings such as `{{name}}`, `$t(actions.save)`, HTML, `undefined`, and internal-looking identifiers remain literal **data**, not recursively evaluated templates. The guard does not falsely reject user data with a final-output regex. Missing parameters cannot generate undefined or unresolved templates. Catalog-authored raw identifiers are rejected.

`emergency-copy.ts` has no engine dependency. LocaleRecoveryNotice renders independent section recovery text if initialization fails, while leaving legacy children mounted. Message failures also have independent text. Existing AppRecoveryBoundary stays unchanged and is tested with a broken engine and route.

## Type generation and catalog release validation

Selected workflow: **A — check generated declarations and metadata into Git; fail if stale**. `npm run locales:generate` is an explicit authoring step; validation/typecheck/build never silently regenerate. Generation is deterministic from canonical Uzbek resources. Generated files use LF via `.gitattributes`. Negative compile fixtures use narrowly scoped `@ts-expect-error` assertions to prove the compiler rejects bad namespace/key/missing/extra/type parameters; unused assertions themselves fail compilation.

Validator checks registry/aliases, unique enabled/planned namespace declarations, namespace coverage, unsupported locale directories, unexpected/planned resource files, nonempty nested-object/string structure, missing/extra logical keys, placeholder parity, syntax, catalog identifiers, unsupported nested/rich text, and stale output. A token-based JSON walk catches duplicate keys including escaped equivalents before they can be discarded. Plural comparison uses Intl.PluralRules categories and logical base keys, not raw key equality between Russian and Uzbek. Required locale forms must exist; optional zero overrides may omit the displayed count but must preserve other interpolation names. Runtime independently verifies target resources before switching.

Temporary catalog tests cover valid catalogs and missing/extra/empty/number/array/null/object/duplicate/malformed-placeholder/nesting/HTML/identifier/plural/stale/unsupported failures. They never corrupt committed catalogs. Diagnostics include the file and affected key where applicable. Generation tests compare exact output with committed generated files.

## Bootstrap and switch lifecycle

`main.tsx` awaits `bootstrapLocale()` before selecting/rendering LiveRoot or dynamically importing the DEV-only DemoRoot. Stable LocaleProvider wraps ThemeProvider and both root pathways, including the LiveRoot integration-unavailable branch. AuthProvider, SessionController, ReadProvider, QueryClient and routers remain in their original locations. No locale-based React key, reload, navigation, auth storage mutation, query-key change, or action dispatch exists in switching.

Initialization caches one promise outside React. StrictMode never initializes engines or adds engine event subscriptions. useSyncExternalStore owns React subscription cleanup; provider supplies the explicit react-i18next instance without global singleton registration. Engine failure resolves initialization as false, selects safe Uzbek root attributes, and renders independent recovery copy alongside existing children. No developer exception message reaches merchants.

Switch requests validate locale and the complete target catalog, then serialize engine mutations. An increasing intent token rejects stale asynchronous preparations and rolls back stale in-flight engine changes before subsequent transactions. Presentation reads the committed locale explicitly throughout a pending mutation. Failure retains prior snapshot/root/preference; a rollback engine failure does not prevent explicit-locale translation against the previous bundled resources. Successful commit updates subscribers and root lang/dir and attempts preference persistence. Storage failure does not undo a usable in-memory selection. Arrays passed to i18next are copied because the engine's resource-store removal API can mutate its namespace list; isolated tests caught and now cover this.

## Test coverage and verification

Focused tests cover normalization/resolution/storage; all initial locales; isolated/idempotent initialization; RU/EN/UZ round trips; persisted and blocked storage; auth-key isolation and logout retention; corrupt/missing resources; rejected engine changes; out-of-order preparations and in-flight switches; root attributes; parameter and plural validation; canonical/emergency fallback; critical fixture; failed engine/route recovery; real authenticated provider/query/router/form lifecycle; main production/development-live/development-demo entry paths; and actual integration-unavailable LiveRoot. The integration-unavailable test explicitly injects unavailable integration so local `.env.local` cannot change its meaning.

| Exact command | Result |
| --- | --- |
| `npm install --save-exact i18next@26.4.2 react-i18next@17.0.16` | PASS; package-lock updated by npm |
| `npm run locales:generate` | PASS; deterministic declaration/metadata authoring |
| `npm run locales:validate` | PASS; uz/ru/en, common |
| `npm run lint` | PASS; boundary check and oxlint; two existing Fast Refresh warnings in button.tsx/badge.tsx |
| `npm run typecheck` | PASS; catalog validation and TypeScript including negative fixtures |
| `npx vitest run src/shared/i18n src/app/i18n` | PASS; 5 files, 95 tests |
| `npm test` | PASS; final rerun: 214 files, 1,950 tests, 47.33 seconds; output captured in ignored i18n-full-tests.log |
| `npm run build` | PASS; locale validation, import boundary, TypeScript and Vite production build; 3,792 modules transformed |
| `git diff --check` | PASS; no whitespace errors |

Initial implementation checks exposed a mutable namespace-array problem and a fixture type issue; both were fixed. A root test initially inherited a configured local integration and was made deterministic via test-only injection. No existing tests were changed. No failed command is counted as PASS; the table records final results after repairs.

## Regression assessment and limitations

The lifecycle test runs actual AppProviders/AuthProvider under StrictMode, restores an authenticated session, and switches locale while checking stable auth context/session evidence, QueryClient identity/cache, unchanged token persistence, get-me request count, edited input DOM/state, route/history state, effect lifecycle, and one unchanged dispatch count. Existing full-suite coverage remains the evidence for domain behavior, rather than invented locale-aware changes to those domains.

Legacy pages and presentation helpers are intentionally still Uzbek, including existing Intl formatting, XLSX bytes and posters. Root lang describes the selected foundation locale; during migration a legacy page can therefore still contain Uzbek text. No production selector, rich text, remote loader, backend profile preference, cross-tab preference synchronization, locale formatting migration, RTL layout QA, live backend exercise, or manual browser UX review is claimed. Initial strings are meaningful authored UZ/RU/EN copy; independent native-speaker review has not been performed. Automated tests are not a substitute for that review before broader translated UI rollout.

npm install reported six high-severity dependency audit findings. This checkpoint did not run broad audit fixes or change unrelated dependencies; attribution and remediation are outside this implementation. The successful Vite build still reports its >500 kB chunk warning (PlotRenderers is about 1.46 MB minified); chart splitting was not changed. Existing linter warnings remain at the unchanged button/badge component exports.

## HOW TO ADD A FOURTH LANGUAGE

1. Add its canonical code to `src/shared/i18n/languages.json` with nativeName, Intl locale, direction, explicit aliases and enabled status. During drafting keep it disabled. Choose an explicit script policy; do not alias incompatible scripts.
2. Create `src/locales/<code>/<enabled namespace>.json` for every namespace listed in `namespaces.json.enabled`. Translate every logical canonical key with identical named placeholders; include the locale's Intl cardinal plural categories and optional zero override. Do not enable unfinished planned namespaces.
3. Add its bundled JSON imports and resource-map entry in `resources.ts`. The map's registry-derived type detects coverage gaps once the registry changes.
4. Finish native-speaker review, enable the registry entry, then run `npm run locales:generate`. Canonical keys should not change solely because another language is added; review generated output anyway.
5. Run locale validation, lint, typecheck, focused tests, full suite, and build. Add alias/plural/switch tests for the new locale. RTL needs dedicated layout review before shipping.

SupportedLocale, enabled iteration, root attributes, normalization, resolution, and runtime support then derive from the registry. Existing feature components need no language-code branches or changes.

## Remaining I18N.1 work

I18N.1 — SHARED UI LOCALIZATION: migrate approved shared states/buttons/dialogs/pagination/accessibility labels using the facade; audit memoized/stored presentation text; define guarded rich slots only when necessary; add native translation and layout review. Enable additional namespaces only when their real scoped catalogs are complete. Later shell/auth/domain migrations must separately preserve authority/dispatch/query/money contracts. This checkpoint stops at the foundation.
