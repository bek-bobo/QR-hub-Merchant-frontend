# DYNAMIC_QR.AMOUNT_UX.1

## Pre-change audit

Inspected CreateQrDialog/CreateQrContent, shared Select/Input/MoneyInput, money-input-edit, parseCreateAmount, createAmountBounds, buildCreateQrRequest, controller, live adapter/port, amount/create/i18n tests, all three dynamicQr catalogs and DAY_04_ACTION_CONTRACT.md before modifying behavior.

The repository contract records backend DTO amount as tiyin, integer JSON number in 100000..2000000000. No backend checkout was inspected; the confirmed source audit is the authority. Terminal lookup bounds are intersected with service limits. parseCreateAmount uses BigInt decimal arithmetic; the mapper converts only the bounded integer to Number and checks safe integer. The live port rechecks current permissions, lookup membership and limits. Server results remain authoritative.

Helper examples 12 500.50 and 12 500,50 both parse to 1250050 tiyin. Range matches confirmed rules; no conflicting copy or business limits were found. Parser accepts ungrouped digits or ASCII spaces in groups of three, optional dot/comma with one or two fractional digits, outer whitespace and leading zeros. Zero, negative numbers, exponents, letters, mixed separators, trailing separators and excess precision are invalid. MoneyInput groups digits, preserves decimal separator and leading zeros, and refuses malformed edits (including negatives/excess precision), preserving the prior value. Its space normalization also repairs grouping before parsing; this existing editing policy remains unchanged. Money output uses exact minor-unit formatting and localized copy in uz/ru/en.

Gaps: no selection-to-input focus handoff; no green valid state; empty direct submission gives generic action feedback rather than associated field feedback. Invalid errors previously depended on terminal bounds being present. Submit button and controller already guard invalid drafts. No helper copy correction is needed.

## Implementation and verification

The existing parseCreateAmount and createAmountBounds remain the canonical parser and range source for field feedback, request enablement, controller validation and exact payload mapping. No parser, range, wire format or money arithmetic was changed. The form now also guards against bypassing its disabled submit button. A direct invalid controller call remains blocked independently.

MoneyInput exposes its real input through a stable ref while preserving its internal formatting/caret ref. Select provides an optional selection-close callback, invoked only after explicit popup selection. Radix's close autofocus event transfers focus after the popup focus scope releases it; no application timeout or render-driven effect is used. The caret moves to the end without selecting, clearing or replacing the amount. Initial render, lookup resolution, locale changes and Escape cancellation do not transfer focus. A closing/unmounted form cannot focus a disconnected input. Shared Select behavior for other consumers retains default Radix focus restoration.

Touch policy: a touch selection retains terminal trigger focus, avoiding unsolicited software keyboard opening. Mouse/keyboard selection focuses amount, including on devices with an attached keyboard. DOM tests exercise both policies; physical mobile keyboard behavior requires the next local browser checkpoint. The previous modal used default Radix trigger focus restoration for every device.

States: untouched or cleared empty is neutral until attempted submission; nonempty canonical/in-range input is green; invalid nonempty or attempted-empty input is red. Native existing formatter rejects malformed edits, retaining the prior valid value rather than displaying a false error for rejected input. Clearing after a submit attempt retains required feedback. New-intent reset clears attempted state. Required feedback is translated in uz/ru/en; existing example/range copy is unchanged.

FormField supplies aria-invalid, an error alert and aria-describedby including both help and error IDs. Amount exposes aria-required. Disabled button, form submit guard, controller validation and live-port permission/current-context validation all remain enforced. The primary CTA remains red. No success toast is added.

Green borders/rings use existing theme status-success-border tokens (#16a34a light, #4ade80 dark); invalid feedback uses existing destructive tokens with explicit full-opacity dark border. State selectors preserve feedback during focus. Existing modal layout, responsive classes and themes are retained. DOM assertions verify feedback classes and accessibility associations; visual contrast, responsive layout and real mobile keyboard behavior have not been browser-verified in this task.

## Verification results

- Typecheck: npm run typecheck — PASS.
- Lint: npm run lint — PASS; existing Fast Refresh export warnings in button.tsx and badge.tsx.
- Focused Dynamic QR, shared select, money, auth and RBAC tests: 58 files, 473 tests — PASS (maxWorkers=4).
- Full frontend: npm test -- --maxWorkers=2 — 236 files, 2213 tests PASS. A concurrent run timed out in the existing translation-engine boundary subprocess test; the final run passes with lower worker concurrency and unchanged test timeouts.
- Production: npm run build — PASS; existing large-chunk advisory remains.
- git diff --check — PASS.
- Added 21 regressions: keyboard focus/immediate typing/preserved caret and amount; real portaled dialog mouse selection; touch selection policy; loading/cancel no focus theft; canonical bounds and exact decimal payload cases; neutral/attempted-empty accessible errors; rejected malformed edits; seven direct-controller invalid submission cases. Existing tests cover range intersection, money parsing/formatting, lookup/current-permission checks, dropdown arrow navigation and language changes.
- Theme source review: existing light/dark success colors against popover surface have calculated contrast ratios 3.30:1 and 9.89:1 respectively. These token calculations and DOM class checks are not a rendered browser screenshot check.

## Exact changed paths

- docs/audits/DYNAMIC_QR_AMOUNT_UX_VALIDATION.md
- src/components/ui/select.tsx
- src/shared/money/MoneyInput.tsx
- src/features/dynamic-qr/CreateQrContent.tsx
- src/features/dynamic-qr/dynamic-qr.i18n.test.tsx
- src/features/dynamic-qr/create-qr.test.ts
- src/locales/uz/dynamicQr.json
- src/locales/ru/dynamicQr.json
- src/locales/en/dynamicQr.json
- src/shared/i18n/generated.d.ts
- src/shared/i18n/metadata.generated.ts

The pre-existing edit to docs/audits/FRONTEND_RBAC_LOCAL_STAGING_E2E.md was preserved and is not part of this change. No backend, DB, Redis or permissions were changed. No commit, deployment or live create request was performed.

## Remaining uncertainties

No conflicting create-amount contract remains based on the repository's confirmed backend audit. Dynamic per-terminal policy beyond lookup/service-limit intersection is not inferred. No live backend or Core behavior was independently retested. Local browser verification is still required for visual contrast and physical mobile software-keyboard behavior.


## Final checkpoint

CHECKPOINT: DYNAMIC_QR.AMOUNT_UX.1
STATUS: COMPLETE (implementation and automated verification; local browser checkpoint pending)
TERMINAL_TO_AMOUNT_FOCUS: PASS (mouse/keyboard)
IMMEDIATE_TYPING: PASS
EXISTING_AMOUNT_PRESERVED: PASS
VALID_GREEN_BORDER: PASS (state/CSS; rendered visual check pending)
INVALID_RED_BORDER: PASS (state/CSS; rendered visual check pending)
EMPTY_NEUTRAL_STATE: PASS
CANONICAL_VALIDATOR_REUSED: YES
HELPER_TEXT_CONTRACT: MATCH
EXACT_MONEY_CONVERSION: PASS
ACCESSIBILITY: PASS (DOM/keyboard evidence; assistive-technology manual review pending)
MOBILE_BEHAVIOR: PASS (touch policy DOM test; physical keyboard behavior pending)
TYPECHECK: PASS
LINT: PASS (existing warnings)
FOCUSED_TESTS: 473/473, 58 files
FULL_TEST_SUITE: 2213/2213, 236 files
BUILD: PASS (existing chunk-size warning)
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
FILES_CHANGED: exact paths listed above
NEXT_STEP: Local browser verification of terminal selection and amount entry, including light/dark appearance and touch keyboard behavior.
