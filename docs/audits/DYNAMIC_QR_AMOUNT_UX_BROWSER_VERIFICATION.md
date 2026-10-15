# DYNAMIC_QR.AMOUNT_UX.2 — Local browser UX verification

Date: 2026-10-15, Asia/Tashkent. **STATUS: PARTIAL**. Core amount focus, immediate typing, preservation, validation visuals, themes and responsive layout pass in the real browser. Two accessibility/validation interaction gaps remain. No feature code was changed.

## Actual environment

- Repository: D:/QR projects/qrhub-merchant-frontend; existing uncommitted changes preserved.
- Windows host; Codex In-app Browser (real browser tab, not happy-dom or a test renderer), controlled through the documented CUA browser API. Browser build/version was not separately established.
- Checked listening ports before startup: no Vite listener on 5173/5174/4173; the only listener in 4000..5999 was unrelated port 5040.
- Started existing local configuration with npm run dev -- --host 127.0.0.1 --port 5173 --strictPort. Vite 8.3.0 reported ready. Server left running for final local review.
- Actual page: http://127.0.0.1:5173/dynamic-qrs. Active .env.local uses VITE_APP_MODE=live; no environment file was modified.
- Existing staging integration: auth https://test-merchants.qrhub.uz/api/qh-merchant-auth-api; web https://test-merchants.qrhub.uz/api/qh-merchant-web-api. Existing authenticated browser session was reused; no credentials were read, entered or changed.
- Initial navigation briefly exposed the fallback 404, then the existing session resolved to /dashboard. Subsequent navigation and dialog interactions worked. No authentication workaround was used.
- Measured desktop viewport: 916×676 CSS px. Explicit responsive overrides: 390×844 and 390×480. Override reset afterward to 916×676. Original English locale and Dark preference restored; dialog closed.
- Used actual available terminals GOIPOV SIDDIK OTA HK, Hayotbank terminal N4 and Siddiq ota web terminal. Actual displayed permitted range was 1 000.00–20 000 000.00 UZS. No fixture terminals or substituted limits were used.

## Browser observations

| Check | Actual observation | Result |
| --- | --- | --- |
| Initial focus and neutral | Dialog opens with Close focused, empty amount neutral; lookup resolution does not transfer focus | PASS |
| Desktop mouse | Click Terminal, click GOIPOV SIDDIK OTA HK; popup closes and amount becomes document.activeElement | PASS |
| Immediate mouse typing | Typed into current focus without amount click: 12345 became 12 345; first digit retained | PASS |
| Keyboard selection | Enter opens selector; Down and Return choose next terminal and return focus to amount | PASS |
| Preservation/caret | Switching GOIPOV to Hayotbank preserved 12 345, collapsed caret [6,6] at end; typing 6 produced 123 456 | PASS |
| Fresh keyboard typing | Fresh light dialog: keyboard selected terminal; 12500,50 immediately became 12 500,50, caret [9,9] | PASS |
| Valid feedback | Green border and visible green focus ring; no aria-invalid; Create QR enabled but never activated | PASS |
| Invalid feedback | 999.99 and 20 000 000.01 render red border/focus ring, associated error and disabled Create QR | PASS |
| Clearing | Clearing invalid input returns neutral, removes aria-invalid and error association | PASS |
| Empty Enter | Selected terminal, empty amount, press Return: remains neutral; no required error appears | FAIL — B02 below |
| Popup Escape | Escape closes popup and focuses terminal trigger; no amount focus theft | PASS |
| Dialog tab cycle | Invalid amount → Cancel → Close → Terminal → Amount → Cancel; all observed focus stayed in dialog | PASS |
| Dialog close focus | Both Close click and dialog Escape leave document.activeElement on BODY after settling | FAIL — B01 below |
| Error semantics | aria-invalid=true; aria-describedby includes help and error IDs; error exists with role=alert | PASS for nonempty error |
| Required error announcement | Not reachable with normal empty Enter/disabled CTA; no screen reader testing performed | NOT_VERIFIED / interaction gap |
| Themes | Valid/invalid focus colors clearly distinct; helper text readable and dialog layout consistent in light/dark | PASS |
| Responsive 390×844 | Terminal choices usable, amount editable, text wraps within modal, stacked CTAs visible | PASS |
| Responsive 390×480 | Modal top=12, bottom=468; clientHeight=454, scrollHeight=605, overflow-y=auto; scrollTop reached ~150.4 and both CTAs became visible | PASS |
| Localization | English and Uzbek modal/helper/error copy rendered; Uzbek error wraps within 390px modal | PASS for observed locales |
| Physical touch/keyboard | Desktop browser viewport testing only; no physical touch device/software keyboard available | PHYSICAL_MOBILE_NOT_VERIFIED |

Read-only DOM inspections measured active element, value, caret, validation data, ARIA relationships, computed border/ring and modal scroll geometry. All edits/selection were real browser UI interactions. No synthetic submit dispatch, forced enabled button or application-state injection was used.

## Canonical amount cases observed

| Entered amount | Rendered amount | State |
| --- | --- | --- |
| 1000.00 | 1 000.00 | valid |
| 20000000.00 | 20 000 000.00 | valid |
| 999.99 | 999.99 | invalid |
| 20000000.01 | 20 000 000.01 | invalid |
| 12 500.50 | 12 500.50 | valid |
| 12 500,50 | 12 500,50 | valid |

The actual selected-terminal range was displayed before these checks. Existing parser/normalizer/range/payload code was not modified. Browser verification did not submit any of these values.

## Confirmed remaining defects

### B01 — Dialog does not restore opener focus

Reproduction: open New QR (mouse or Enter), select terminal, then close via Close or dialog Escape. After the dialog disappears and a subsequent observation settles, document.activeElement is BODY and New QR is not focused. This breaks expected keyboard continuation. Selector Escape itself restores the terminal trigger correctly. This report does not establish when B01 was introduced.

### B02 — Empty required feedback is inaccessible through the normal UI

Reproduction: select terminal, clear amount, press Return while the amount input is focused. The Create QR button is disabled and browser implicit submission is suppressed; the amount remains data-validation=neutral, aria-invalid absent, described only by help. The translated required error is therefore not shown or announced. Reproduced in English and Uzbek. UX.1's synthetic form-submit coverage does not establish this real-browser interaction. The submission-attempted clearing state could not be reached through the normal UI and was not simulated. Keep submission blocked; make attempted-empty feedback reachable in a follow-up fix.

No fixes were made in this verification-only checkpoint. No other layout, focus-transfer or money-validation defect was observed in the exercised cases. Physical mobile and assistive-technology behavior remain outside this browser evidence.

## Screenshots

Screenshots are real viewport JPEG captures. Background business list content is naturally blurred by the modal overlay; no credentials/tokens were captured.

1. [Dark desktop valid focus](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/01-dark-valid-desktop.jpg)
2. [Dark desktop invalid focus](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/02-dark-invalid-desktop.jpg)
3. [Light desktop valid focus](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/03-light-valid-desktop.jpg)
4. [Light desktop invalid focus](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/04-light-invalid-desktop.jpg)
5. [Light mobile untouched neutral](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/05-light-mobile-neutral.jpg)
6. [Light mobile valid](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/06-light-mobile-valid.jpg)
7. [Light short mobile scrolled to CTAs](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/07-light-mobile-short-scrolled.jpg)
8. [Dark mobile Uzbek invalid](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/08-dark-mobile-uz-invalid.jpg)
9. [Dark mobile Uzbek empty after Enter](evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/09-dark-mobile-uz-empty-enter.jpg)

## Safety and verification scope

No real QR creation was submitted. Enabled Create QR was never clicked or activated; Return was used for dropdown selection or on an empty amount only. No creation result appeared; the list continued to show its two pre-existing QR rows. A separate network request ledger was not available through the exercised browser API, so this is interaction-based evidence rather than an exported network trace.

No backend, PostgreSQL, Redis, RBAC grant, credential, contract, amount bound or application source was changed. No commit or deployment was performed. Prior code/audit edits were preserved. Typecheck/tests/build from UX.1 were not rerun because this task changes only the report and screenshot artifacts; this report records browser observations, not a replacement automated-test claim.

## Exact files created in this checkpoint

- docs/audits/DYNAMIC_QR_AMOUNT_UX_BROWSER_VERIFICATION.md
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/01-dark-valid-desktop.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/02-dark-invalid-desktop.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/03-light-valid-desktop.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/04-light-invalid-desktop.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/05-light-mobile-neutral.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/06-light-mobile-valid.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/07-light-mobile-short-scrolled.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/08-dark-mobile-uz-invalid.jpg
- docs/audits/evidence/DYNAMIC_QR_AMOUNT_UX_BROWSER/09-dark-mobile-uz-empty-enter.jpg

## Final checkpoint

CHECKPOINT: DYNAMIC_QR.AMOUNT_UX.2
STATUS: PARTIAL
DESKTOP_MOUSE_FOCUS: PASS
KEYBOARD_FOCUS: PASS
IMMEDIATE_TYPING: PASS
AMOUNT_PRESERVATION: PASS
VALID_GREEN_VISUAL: PASS
INVALID_RED_VISUAL: PASS
LIGHT_THEME: PASS
DARK_THEME: PASS
MOBILE_VIEWPORT: PASS
PHYSICAL_MOBILE_KEYBOARD: NOT_VERIFIED
ACCESSIBILITY: PARTIAL
REAL_QR_CREATED: NO
BACKEND_CHANGED: NO
STAGING_DEPLOYED: NO
FILES_CHANGED: exact report and nine screenshot paths listed above
NEXT_STEP: Final UX review; fix only confirmed B01/B02 browser defects, then repeat their browser checks. Physical mobile software-keyboard testing remains outstanding.
