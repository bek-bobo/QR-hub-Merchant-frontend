# Day 02 Manual Verification

**Frontend root:** `D:\QR projects\qrhub-merchant-frontend`  
**Recorded:** 2026-09-15  
**Evidence owner:** user-performed local verification

## Final passing evidence

- Lint: **PASS**, zero errors and two warnings only.
- The warnings are the existing generated shadcn Fast Refresh warnings
  in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx`.
- No Day 02 source lint warning remains.
- Typecheck (`npm run typecheck`): **PASS**, `tsc -b --pretty false` with no
  errors.
- Unit tests (`npm test`): **PASS**, 7 files / 50 tests.
- Production build (`npm run build`): **PASS**, Vite 8.3.0 with 2101 modules
  transformed.

The final test distribution was validation 5, access 7, runtime 2, device
lease 6, login controller 10, HTTP 5, and session controller 15.

The earlier double-submit failure was a test timing bug, not a production bug.
Its assertion ran before the awaited lease-acquisition boundary reached
`createSession`. The final test uses a deterministic `createSessionStarted`
deferred with no sleep or timer and verifies one lease acquisition, one create
session call, one send-OTP call, no duplicate session/retry, and final OTP
phase.

## D2.5 browser scenarios

The user manually verified the development-only auth preview and reported
**PASS** for:

- boundary and always-visible development labeling;
- first login / first PIN;
- existing PIN and known-device direct PIN;
- reset PIN;
- wrong OTP and wrong PIN;
- OTP expiry and resend;
- refresh success and refresh failure;
- logout during an in-flight refresh;
- second-tab preview ownership;
- storage isolation; and
- Day 01 demo regression behavior.

## Production isolation and preview

- Production bundle isolation: **PASS**. Searches under `dist/assets` found no
  `AUTH-DEMO-ONLY`, `DEMO-QR-`, `qrhub:auth-preview-owner:v1`, or
  `qrhub.preview-device-key.v1` marker.
- Production preview: **PASS**. It showed QRHub Merchant and “Xizmat hozircha
  mavjud emas.” No demo dashboard or auth preview rendered.
- This unavailable boundary is expected while
  `productionAuthContractRegistration` remains unavailable.

## Storage evidence

The user observed only `qrhub.preview-device-key.v1` as QRHub preview
persistence. No QRHub access token, refresh token, session key, OTP ID, PIN,
OTP, profile, or permissions were persisted. Unrelated localhost storage from
other applications is outside this evidence.

## Final frontend status

`DAY_02_FRONTEND_COMPLETE_LIVE_BLOCKED`

## Live integration boundary

`LIVE_CONTRACT_BLOCKED`

No live auth request or runtime wire verification is recorded. Production auth
remains fail closed while stage/device serialization, runtime authority values,
deployed URLs, CORS, and deployed error/null behavior are unverified.
