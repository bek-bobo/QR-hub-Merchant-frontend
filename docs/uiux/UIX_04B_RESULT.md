# UIX.4B — Uzbekistan +998 phone input UX result

Date: **2026-09-29**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_BROWSER_GATE**

## Confirmed contract audit

### Login

- The previous form stored a progressively formatted complete number including `998`.
- `normalizePhone` accepts exactly `998` plus nine digits after removing a leading `+` and harmless spaces, parentheses, dots, or hyphens.
- `LoginController.startLogin` normalizes again and passes the canonical phone to `AuthApi.sendOtp`; the HTTP adapter sends `{ phone }` unchanged.
- Confirmed wire representation: `998XXXXXXXXX` as a string, without a leading `+` or presentation separators.

### Cashier Create

- The previous form stored raw input and asked the user to type the full `998...` value.
- `normalizeCashierPhone` trims outer whitespace, removes at most one leading `+`, and otherwise requires exactly `998` plus nine digits. It deliberately rejects internal separators, local-only digits, wrong prefixes, extra characters, and wrong lengths.
- `buildCashierCreateRequest` writes that canonical string to the existing three-field request DTO.
- Confirmed wire representation: `998XXXXXXXXX` as a string, without a leading `+` or presentation separators.

The two backend boundaries remain explicit and unchanged even though the forms now share one editing UX.

## Shared input behavior

- Added `UzbekPhoneInput`, a controlled presentation-only input with a fixed, non-editable `+998` prefix and one editable `tel` field.
- Form state contains only zero to nine local subscriber digits. The visible local value is derived as `XX XXX XX XX`.
- Empty state displays `+998` while the logical value stays empty. The prefix alone cannot produce a request phone.
- Supported unambiguous paste forms are local subscriber digits, a complete `998...` form, and a complete `+998...` form. Spaces, hyphens, parentheses, and dots are harmless separators.
- Alphabetic content, wrong country prefixes, and overlength values are rejected. Extra digits are not truncated into a different number.
- Sequential typing, selection replacement, backspace, and clearing operate on one controlled local-digit value; no masking engine or phone dependency was added.

## Canonical boundary and validation

- `parseUzbekPhoneInput` converts supported editable text to local digits only.
- `formatUzbekLocalPhone` derives the readable local display without changing state.
- `toUzbekPhoneWire` returns `998XXXXXXXXX` only for exactly nine local digits; empty or incomplete values return `null`.
- Login converts local digits immediately before `actions.startLogin`; the controller still performs its existing canonical validation before auth requests.
- Cashier Create converts local digits before constructing `CashierCreateDraft`; the existing request mapper, permission checks, current-terminal validation, one-dispatch protection, and transport remain unchanged.
- Login feedback remains connected through `aria-describedby`. Cashier Create now uses `FormField` so incomplete phone feedback is connected to the phone input with `aria-invalid` and `aria-describedby`.

## Accessibility, responsive, and theme behavior

- Both surfaces retain visible associated labels and one keyboard-focusable input.
- The visible prefix is excluded from the editable value and is described to assistive technology as the Uzbekistan country code.
- The input requests `type="tel"` and `inputMode="tel"`.
- The component uses `w-full`, `min-w-0`, and a shrinking input beside a non-shrinking prefix, so it does not require fixed width at 390px or 320px.
- Prefix, border, background, focus, invalid, and disabled presentation use existing semantic theme tokens, including current dark-mode tokens.

## Preserved behavior

- Login phone/PIN/OTP sequencing, auth endpoints, device lease, session bootstrap, safe-return behavior, RAM-only authentication, loading, and error handling are unchanged.
- Cashier permissions, merchant/session scope, terminal lookup validation, request dispatch, one-dispatch safeguards, outcomes, and runtime-issue classification are unchanged.
- Account phone display continues to use the UIX.4A formatter. Its data flow was not changed.
- No auth persistence, international selector, OTP/PIN behavior, pagination, FilterDrawer, backend, or deployment work was introduced.

## Focused tests

- Extended the shared phone tests with empty/progressive formatting, local/full paste forms, harmless separators, wrong prefix, alphabetic input, overlength rejection, incomplete values, and canonical wire output.
- Added shared input markup tests for fixed `+998`, local-only editable value, `tel` semantics, empty-prefix behavior, and invalid feedback association.
- Login controller coverage now explicitly asserts that `AuthApi.sendOtp` still receives the unchanged canonical phone string.
- Cashier request coverage now explicitly proves that local editing converts to the unchanged canonical request phone.
- All fixtures are synthetic. Codex did not run tests or other prohibited npm/browser commands.

## Gates

- `USER_COMMAND_GATE = PENDING`
- `USER_BROWSER_GATE_390 = PENDING`
- `USER_BROWSER_GATE_320 = PENDING`
- UIX.4B is not marked complete until user command and browser verification are supplied.
