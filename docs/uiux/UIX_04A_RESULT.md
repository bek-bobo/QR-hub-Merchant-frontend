# UIX.4A — Account phone display formatting

Date: **2026-09-28**  
Status: **IMPLEMENTED_PENDING_USER_COMMAND_GATE**

## Implemented scope

- Added the shared presentation-only `formatUzbekPhoneDisplay` helper.
- Formatted valid `998XXXXXXXXX` and `+998XXXXXXXXX` values as `+998 XX XXX XX XX` using string operations only.
- Preserved malformed values after trimming and returned an empty string for empty or nullish input.
- Migrated only the visible phone value on the authenticated Account page.
- Added focused formatter and Account rendering coverage without snapshots.

## Preserved contracts

- The source profile phone value is not mutated.
- API and wire values are unchanged.
- Profile fetching, refresh, logout, account state, labels, and auth/session behavior are unchanged.
- Login and cashier-create phone input behavior are unchanged.

## Deferred work

- Login and cashier phone-prefix/input UX remains deferred.
- Phone masking and normalization changes remain deferred.
- Dark mode and theme switching remain deferred.

## Verification state

Codex did not run lint, typecheck, tests, build, browser automation, or API requests for UIX.4A. User verification is required:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

UIX.4A is not marked PASS until the user supplies command and browser evidence.
