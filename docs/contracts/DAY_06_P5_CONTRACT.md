# Day 06 P5 contract — final D6.7 ledger

**Checkpoint:** D6.7 final closeout  
**Review mode:** source ledger plus final local evidence reconciliation  
**Local verification:** `USER_REPORTED PASS`  
**Live/staging verification:** `NOT_RUN / STAGING_PENDING`  
**Frontend baseline:** Day 05 remains `DAY_05_FRONTEND_COMPLETE_STAGING_PENDING`  
**Backend:** `D:\QR projects\qrhub-merchant-service`, read-only

This ledger separates source evidence, frontend decisions, user-reported local evidence and deployed/runtime evidence. It does not reopen resolved Day 05 work, does not treat staging S-01 through S-04 as frontend blockers, and does not claim live or staging success.

## Classification

| Area | Classification | Decision |
| --- | --- | --- |
| P5 list | `SOURCE_CONFIRMED` | Endpoint, authority, parameters, SQL, ordering, ownership scope, DTO projection and page shape are implemented and locally verified. Staging is `NOT_RUN`. |
| P5 reset | Request and eligibility `SOURCE_CONFIRMED`; live transport `CONTRACT_GATED` | Endpoint, grant, row identity, membership and status-0 eligibility are confirmed. The controller/dialog/lifecycle and injected DEV normalized port are locally verified, but D6-01 proves merchant success cannot establish remote success. Production reset transport remains closed; staging is `NOT_RUN`. |
| Account/profile | `SOURCE_CONFIRMED`; `COMPLETE_WITH_NARROW_POLISH` | Existing authenticated-session policy is preserved. Day 06 added only `min-w-0` and `break-words` wrapping safety; user-reported account/responsive checks passed. |

## Actual backend source inventory

All paths below are relative to `D:\QR projects\qrhub-merchant-service`.

| Responsibility | Actual path and symbol |
| --- | --- |
| Merchant controller | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/resource/P5Resource.java` — `P5Resource` |
| Merchant service interface | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/service/P5Service.java` — `P5Service` |
| Merchant service | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/service/impl/P5ServiceImpl.java` — `P5ServiceImpl` |
| Merchant repository interface | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/repository/P5Repository.java` — `P5Repository` |
| Merchant repository | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/repository/impl/P5RepositoryImpl.java` — `P5RepositoryImpl` |
| Row DTO | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/domain/custom/P5DTO.java` — record `P5DTO` |
| Page DTO | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/dto/PageResponse.java` — `PageResponse<T>` |
| Merchant security | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/config/SecurityConfig.java` — `PERMISSIONS`, `apiChain` |
| External REST config | `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/config/RestConfig.java` — bean `merchantP5RestServiceUtil` |
| External P5 controller | `qh-merchant-p5-api/src/main/java/uz/wt/qh/merchant/p5/api/resource/ResetPinController.java` — `ResetPinController.resetPin` |
| External P5 reset service | `qh-merchant-p5-api/src/main/java/uz/wt/qh/merchant/p5/api/service/impl/IotP5ResetPinServiceImpl.java` — `resetPin` |
| External P5 repositories | `qh-merchant-p5-api/src/main/java/uz/wt/qh/merchant/p5/api/repository/impl/IotP5RepositoryImpl.java`, `IotP5SessionRepositoryImpl.java` |
| SMS client | `qh-merchant-p5-api/src/main/java/uz/wt/qh/merchant/p5/api/service/IotP5SmsService.java` — `sendOtp` |
| MQTT client | `qh-merchant-p5-api/src/main/java/uz/wt/qh/merchant/p5/api/config/mqtt/MqttPublisher.java` — `publish` |
| Schema | `qh-merchant-auth-api/src/main/resources/db/migration/V1__initial_schema.sql`, `V2__p5_iot_auth.sql` |
| Shared envelope | `uz.wt.qh.lib.shared.QrHubResponseDTO<T>` from `qh-lib-shared:1.0.77`; existing evidence in `AUTH_CONTRACT_STATUS.md` and `DAY_05_MANAGEMENT_CONTRACT.md` |

No separate P5 request body or merchant reset response DTO exists. Both reset controllers use a `String` path variable and `QrHubResponseDTO<Void>`.

## P5 list contract — SOURCE_CONFIRMED

### Endpoint and authority

- Method/path: `GET /p5/get-all`, relative to the web service.
- App context: `/qh-merchant-web-api`; a deployed gateway prefix remains S-01.
- Exact authority: `GET_P5`, from `SecurityConfig.PERMISSIONS`.
- Authentication: bearer/JWT through the existing web chain; `anyRequest().denyAll()` is the fallback.

### Request parameters

| Parameter | Java type | Required/default | Backend validation | Repository predicate / use |
| --- | --- | --- | --- | --- |
| `merchantId` | `Long` | optional | No annotation or explicit range validation | `t.merchant_id = :merchantId` when non-null |
| `terminalId` | `String` | optional | No annotation or trim/format validation | `p.terminal_id = :terminalId` when non-null |
| `status` | `Integer` | optional | No annotation or enum/range validation | `p.status = :status` when non-null |
| `search` | `String` | optional | No trim, length or escaping validation | Non-null input becomes `%<input>%`; `p.id ILIKE :search OR t.name ILIKE :search` |
| `page` | primitive `int` | default `0` | No min/max validation | Offset is `page * size` |
| `size` | primitive `int` | default `10` | No min/max validation | `LIMIT :size`; total pages are `ceil(total / size)` |

Frontend decisions for D6.1:

- Serialize only these six names; do not add sort/date/region/deviceStatus parameters.
- Omit blank optionals. Search help may promise device ID and terminal name only.
- Preserve `%` and `_` as backend SQL wildcard input; do not call it literal-substring-only search.
- Use existing sizes `10 | 25 | 50`, a nonnegative safe page, and page zero after apply/clear/size changes. These are frontend guards, not claimed backend validation.
- Preserve `status=0`; do not drop it as falsy.

### SQL, ownership and ordering

`P5RepositoryImpl.FROM` is:

```sql
FROM qp_iot_p5 p
JOIN qp_terminals t            ON t.pkey = p.terminal_id
JOIN qp_merchants m            ON m.id = t.merchant_id
LEFT JOIN qp_static_qrs sq     ON sq.terminal_id = p.terminal_id AND sq.status = 0
JOIN qh_join_user_terminal jut ON jut.terminal_id = t.pkey
WHERE jut.user_id = :userId
  AND jut.status = 0
  AND (:merchantId::bigint IS NULL OR t.merchant_id = :merchantId)
  AND (:terminalId::text   IS NULL OR p.terminal_id = :terminalId)
  AND (:status::int        IS NULL OR p.status = :status)
  AND (:search::varchar    IS NULL OR p.id ILIKE :search OR t.name ILIKE :search)
ORDER BY p.created_at DESC
LIMIT :size OFFSET :offset
```

The current user ID comes from `SecurityUtil.getMerchantCurrentUser().getUserId()`. Visibility requires the user's active (`jut.status=0`) terminal membership. `merchantId` and `terminalId` narrow that scoped set; neither grants ownership. The list has no separate merchant-owner predicate.

Ordering is only `p.created_at DESC`; equal timestamps have no source-defined tie-breaker. Preserve server order.

### Count and cardinality

`COUNT_FROM` repeats user/membership and all filter/search predicates, but omits merchant and static-QR joins. Checked schema constraints resolve structural multiplicity:

- `qp_iot_p5.id` is a primary key.
- `qh_join_user_terminal` has `UNIQUE (user_id, terminal_id)`.
- `qp_static_qrs` has `UNIQUE (terminal_id)`.
- Each terminal has one non-null merchant foreign key.

Thus one visible device yields at most one page row, and the omitted static/merchant joins cannot inflate the page under the checked schema. Page/count predicates agree for a stable snapshot. They are separate queries without a surrounding transaction, so concurrent writes can still cause transient content/metadata drift. Preserve server rows/metadata; do not deduplicate or recalculate totals.

### P5DTO fields and nullability

| Wire field | Java type | SQL source | Source-backed nullability |
| --- | --- | --- | --- |
| `deviceId` | `String` | `p.id` | non-null |
| `description` | `String` | `p.description` | nullable |
| `deviceStatus` | `Short` | `p.status` | non-null in schema; defensive frontend null/unknown stays reset-ineligible |
| `terminalId` | `String` | `t.pkey` | non-null for returned inner-join rows |
| `terminalName` | `String` | `t.name` | non-null |
| `terminalType` | `String` | `t.terminal_type` | non-null |
| `merchantName` | `String` | `m.name` | non-null |
| `staticQrId` | `String` | `sq.id` | nullable due to left join |
| `staticQrLink` | `String` | `sq.link` | nullable due to left join |
| `staticQrStatus` | `Short` | `sq.status` | nullable due to left join |
| `createdAt` | `LocalDateTime` | `p.created_at` | non-null; offsetless local datetime |

No local JSON renaming annotation or serializer is present on `P5DTO`; record component names are the source-level wire names. Static QR fields are presentation-only here; `staticQrStatus` is not device status or reset eligibility.

### Device ID semantics

`qp_iot_p5.id` is `VARCHAR(20) NOT NULL PRIMARY KEY`; controller, services and repositories use Java `String`. No regex, UUID, hex or numeric parser exists.

- Treat `deviceId` as opaque, non-empty text with source-backed DB maximum length 20.
- Preserve case and leading zeroes; no numeric normalization or safe-integer concern.
- Do not infer UUID/hex format.
- Equality is exact SQL `=`; list search is case-insensitive `ILIKE`.
- A later adapter must encode it as one URL segment. Backend internal concatenation does not justify raw browser interpolation.

### Device status evidence

The list's `deviceStatus` and reset eligibility both read `qp_iot_p5.status`. V1 declares `INT2 NOT NULL DEFAULT 0`. V2 documents, and P5 auth/reset services enforce, `0 = active`; PIN exhaustion writes `1`, described as inactive/admin flag. Status 0 is confirmed reset eligibility and 1 is inactive in this audited flow. No DB check constraint or exhaustive shared enum was found, so other codes stay neutral/unknown and reset-ineligible.

## P5 reset contract — SOURCE_PARTIAL

### Endpoint, authority and request

- Method/path: `POST /p5/reset-pin/{deviceId}`.
- Authority: `RESET_P5_PIN`.
- `deviceId`: Java `String` path variable.
- Body: absent. Query: absent.
- Response type: `QrHubResponseDTO<Void>`.

### Ownership and eligibility

`P5ServiceImpl.resetPin` gets current JWT user ID and calls `findStatusByUserIdAndDeviceId`. Its query requires:

```sql
p.id = :deviceId
AND jut.user_id = :userId
AND jut.status = 0
```

No match throws `IOT_DEVICE_NOT_FOUND`; status other than 0 throws `IOT_DEVICE_NOT_ACTIVE`. There is no merchantId/terminalId input, lookup-grant check or separate merchant-owner predicate. Server authority is current-user active terminal membership plus device status 0.

That status is the same column exposed as `P5DTO.deviceStatus`. Exact 0 on a current visible row is therefore a safe local prerequisite, but never replaces the backend recheck. Null/unknown/stale/conflicting state closes reset only.

| Eligibility question | Answer |
| --- | --- |
| A. Is reset row-based? | Yes: one opaque `deviceId` from a current P5 row. |
| B. Must `GET_P5` target be current/visible? | Backend does not require a prior GET; frontend policy does. No manual-ID bypass. |
| C. Current-user ownership/membership? | Active terminal membership (`jut.user_id`, `jut.status=0`); not a separate merchant-owner predicate. |
| D. Status 0 required? | Yes, `qp_iot_p5.status == 0`. |
| E. Same field as `P5DTO.deviceStatus`? | Yes. |
| F. Can frontend use row status? | Yes, exact 0 on the current row, fail-closed; backend remains authoritative. |
| G. Is reset grant independent? | Yes, `RESET_P5_PIN` is independent from `GET_P5`. |
| H. Does frontend still require GET? | Yes; target must come from the list. |
| I. Are lookup grants required? | No; merchant/terminal lookups are optional filters. |
| J. Do unknown/null/conflicting states close reset? | Yes; list remains usable. |

### External call chain and success meaning

1. Merchant web validates current membership and device status 0.
2. It synchronously calls `merchantP5RestServiceUtil.postData("/p5/reset-pin/" + deviceId, null, QrHubResponseDTO<Void>)`.
3. External P5 API authenticates with its API-key filter and invokes `IotP5ResetPinServiceImpl.resetPin`.
4. P5 reloads the device, requiring status 0, a terminal and owner phone.
5. It clears `pin_hash` and resets `pin_fail_count`.
6. It expires all non-expired device sessions.
7. It checks OTP rate limits, creates/stores an OTP verification session, and calls the SMS HTTP client.
8. It attempts a QoS-1 MQTT publish of OTP-verification state. MQTT exceptions are caught/logged and do not fail the response.
9. P5 returns `createdOk(null)`; merchant returns its own `createdOk(null)` after `postData` returns.

Merchant waits for the external HTTP call; this is not local fire-and-forget. A normal return from the external P5 service itself occurs after its local PIN/session/OTP mutations and an SMS gateway HTTP call completed without throwing. It does **not** prove SMS handset delivery, MQTT device delivery/acknowledgement, reboot, a new PIN value, or completed device-side PIN setup. MQTT may fail while that external service still returns success.

User-supplied `javap -c -p` evidence for the exact `qh-lib-shared:1.0.77` `RestServiceUtil` closes the prior bytecode question. `postData` calls `RestTemplate.exchange` with POST. It returns the body only for exact HTTP 200 with a body; non-200/no-body returns null. `URISyntaxException` and `RestClientException` are caught, logged and converted to null. `postDataTimeOut` has the same material return behavior. Neither method rethrows these failures, and neither inspects `QrHubResponseDTO.success` before returning an HTTP-200 body.

The merchant service ignores both the returned body and null, then emits its own `createdOk(null)`. Therefore the merchant response shape is source-confirmed, but its remote-success propagation is **untrustworthy by source**: `success:true,data:null` can be emitted without proving that the remote P5 reset succeeded. This is static source/bytecode evidence, not an observed deployed failure. D6-01 is a source-confirmed backend behavior gap, and the production/live reset transport must remain closed until backend correction or authoritative evidence supplies a trustworthy remote outcome.

### Partial failure and replay

There is no service-wide `@Transactional` reset boundary; repository calls have their own transaction boundaries.

- PIN/session mutation precedes the rate-limit check.
- OTP session storage precedes SMS.
- SMS failures become `SMS_SEND_FAILED` after earlier mutations may persist.
- MQTT failure is swallowed and success still returns.
- No compensation is visible.
- No reset idempotency key, duplicate lookup or replay guarantee exists. Repeated POSTs can start another OTP flow.

Frontend must dispatch at most once per explicit intent, never auto-replay after 401/timeout/abort/unknown, and require a fresh explicit intent after rereading (D6-02).

### Reset success envelope

Both services return `QrHubResponseDTO.createdOk(null)`. Existing exact 1.0.77/Jackson evidence from Day 02/05 supports source-level:

```json
{
  "success": true,
  "data": null
}
```

Other nullable envelope fields may appear; order is not contractual. Missing `data`, `data:undefined`, non-null data, `success:false`, transport failure or malformed JSON must not confirm. Deployed samples remain S-04, not a source-contract failure.

For source-thrown `QrHubCoreException`, the already resolved shared handler shape is `success:false`, `error:{code,tag,text}`, `data:null` (normally HTTP 200 for `MerchantErr`). This reset chain names `IOT_DEVICE_NOT_FOUND`, `IOT_DEVICE_NOT_ACTIVE`, `IOT_TERMINAL_NOT_FOUND`, `USER_NOT_FOUND`, `SMS_SEND_FAILED` and possible rate-limit errors; MQTT errors are swallowed inside the external reset service. Exact P5 numeric codes, localized text, deployed null emission and the merchant shared client's propagation of the remote error envelope are not established here. The frontend therefore has no source-proven reset business-error classifier and must not expose raw error text or convert arbitrary failures to REJECTED.

No repeat `javap` is needed. The user-supplied `RestServiceUtil` bytecode evidence is recorded without claiming Codex executed the command.

## Exact frontend binding decisions

No registry code changes in D6.0.

| Concern | Binding | Decision |
| --- | --- | --- |
| List capability | existing `p5.read` | Map to `GET_P5` in D6.1; no alias. |
| Reset capability | `p5.resetPin` | D6.3 maps only `RESET_P5_PIN`. It remains independent from `p5.read`; reset alone never opens `/devices`, and production/live transport stays closed under D6-01. |
| List descriptor | proposed `endpoints.p5List` | `web`, `GET`, `/p5/get-all`, bearer, body none. |
| Reset request contract | `buildP5ResetRequest(deviceId)` | Injected/test/DEV-only contract: `POST`, one exactly encoded `/p5/reset-pin/{deviceId}` segment, `body === undefined`, no query or extra IDs. It is not registered in production live transport. |

`GET_P5` and `RESET_P5_PIN` are independent. Optional `merchant.lookup / GET_DROPDOWN_MERCHANTS` and `terminal.lookup / GET_DROPDOWN_TERMINALS` are filter aids, not reset requirements.

## Frontend reuse inventory

| Existing path | Actual reuse |
| --- | --- |
| `src/shared/auth/access.ts` | `capabilities`, `verifiedAuthorityMap`, `can(context, capability, allowDemo, authorityMap?)`; D6.1 maps exact `p5.read -> GET_P5`. |
| `src/shared/contracts/endpoints.ts` | `EndpointDescriptor { service, method, path, auth, body }`, `endpoints`; D6.1 adds only the P5 GET descriptor. |
| `src/app/live-route-policy.ts` | `liveFeatureRouteDefinitions`, `decideLiveFeatureRoute`, `isLiveRouteAccessible`; capability plus registration readiness. |
| `src/app/LiveRouter.tsx` | `LiveFeatureRoute` composition; D6.2 adds lazy production `/devices` behind exact P5 read policy. |
| `src/app/navigation.ts` | D6.2 promotes the single existing `/devices` destination into `liveNavigationItems`; `getLiveNavigationItems` enforces exact access/readiness. |
| `src/app/safe-return-to.ts` | `resolveSafeReturnTo`, `resolveSafeReturnToState`; D6.2 allowlists exact `/devices` only. |
| `src/app/read/ReadProvider.tsx` | synchronous `getCurrentState`, scoped `source/sessionScopeId/accessRevision`, `getCurrentScope`, `requiredCapabilities`, query cleanup and scoped action registry. |
| `src/app/read/createLiveReadApi.ts` | `ReadApiRegistrations`, `MerchantReadApi`, `LiveReadApi`, `createLiveReadApi(options)`; protected GET registration. |
| `src/app/read/read-runtime.ts` | `createReadRuntime`, `ReadRuntime`, `cleanupReadQueries`; readiness/access precheck and late scope rejection. |
| `src/shared/api/read-keys.ts` | `readKeys`, `isReadQueryKey`; feature key at index 3 drives lifecycle cleanup. |
| `src/shared/auth/session-controller.ts` | `protectedRead<T>` may bounded-refresh/replay a safe read after 401; `protectedMutation<T>` refreshes before dispatch and never replays a sent write. |
| `src/shared/api/protected-read.ts` | `ProtectedReadBridge.get<T>` via `SessionController.protectedRead`. |
| `src/shared/api/one-dispatch-action.ts` | `createOneDispatchAction`, `createActionRegistry`, `invalidateAfterConfirmed`. |
| `src/app/read/useScopedActionRegistry.ts` | invalidates retained controllers on source/session/access-revision change and unmount. |
| `src/shared/contracts/management-read.ts` | `decodeMerchantOptions` plus shared page/safe decoder patterns. |
| `src/shared/contracts/management-filters.ts` | exact omission/apply/clear/page/size/dependent lookup patterns reused by the D6.1 P5 status-aware filter module. |
| `src/shared/contracts/terminal-lookup.contract.ts` | `decodeTerminalOptionsResponse`; `createLiveReadApi.terminalsForMerchant(merchantId, signal)` is the existing scoped lookup. |
| `src/features/account/AccountPage.tsx`, `src/shared/auth/AuthProvider.tsx` | scoped profile snapshot, manual refresh and logout. |

The AC-01 navy shell, red accent, production/demo isolation, RAM-only credentials and SessionController ownership remain unchanged.

## Read registration impact for D6.1

D6.1 implementation status: the defensive P5 page decoder, exact list-filter serializer, `p5.read -> GET_P5` authority mapping, inert endpoint descriptor, live read registration, session/access-revision-scoped query key, stale-result rejection and dependent terminal-lookup gate are implemented. Optional merchant and merchant-scoped terminal lookups reuse the existing independent capabilities and ports. No `/devices` route/page, reset descriptor/port, account change or Day 06 simulator is part of D6.1.

Latest user-run D6.1 verification: typecheck PASS; tests PASS 501/501 in 66/66 files; lint PASS with 0 errors and only the two accepted existing shadcn warnings in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx`; build PASS. These results verify the D6.1 baseline only.

D6.2 implementation status: `/devices` route/navigation/exact safe return, P5 filter page, optional lookup presentation, authoritative paginated results, neutral/source-backed statuses, offsetless datetime presentation, and RAM-only scoped row selection are complete. Latest user-run D6.2 evidence: targeted tests `28/28` in `2/2` files PASS; full tests `517/517` in `69/69` files PASS; typecheck PASS; lint PASS with 0 errors and only the two accepted existing shadcn warnings in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx`; build PASS. These results verify D6.2 only.

## D6.3 reset frontend status

- `RESET_FRONTEND_FLOW`: `IMPLEMENTED` against an injected reset-port interface.
- `RESET_LIVE_TRANSPORT`: `CLOSED / CONTRACT_GATED`; production registers no reset POST port, endpoint descriptor, flag or bypass.
- Exact authorization is `p5.resetPin -> RESET_P5_PIN`; `/devices` continues to require only `p5.read -> GET_P5` and the P5 list registration.
- Reset requires an exact-zero current visible row, current list/reset grants, unchanged source/session/access revision, same opaque device identity and an available injected port. Null, unknown, nonzero, stale, duplicate/conflicting or missing targets fail closed before dispatch.
- Intent identity is source + session scope + access revision + `p5.reset` + device ID. The scoped action registry retains pending/UNKNOWN state across dialog or component replacement and prevents parallel same-device dispatch.
- The controller reuses `createOneDispatchAction`, `SessionController.protectedMutation` through the injected protected-port adapter, `useScopedActionRegistry` retention and `invalidateAfterConfirmed`.
- Opening/cancelling is not a dispatch. Explicit confirmation dispatches at most once. Ambiguous post-dispatch failures stay `UNKNOWN`; there is no replay, optimistic device-status change or read-based outcome inference. A fresh attempt after UNKNOWN requires explicit acknowledgement.
- Injected exact `success:true,data:null` confirmation invalidates current-scope `p5-list` variants only. Refetch failure does not downgrade `CONFIRMED`.
- The dialog displays only device ID, optional description, optional terminal name and conservative reset intent/outcome copy. It has no PIN/OTP/password/SMS fields or remote-device completion claim.
- Latest user-run D6.3 evidence: targeted tests `66/66` in `6/6` files PASS; full suite `534/534` in `71/71` files PASS; typecheck PASS; lint PASS with 0 errors and only the two accepted existing shadcn warnings in `src/components/ui/button.tsx` and `src/components/ui/badge.tsx`; build PASS. D6.3 is complete. No browser, API or staging reset evidence is claimed, and the production reset live gate remains closed.

`D6-01`: `BACKEND_BEHAVIOR / SOURCE_CONFIRMED_GAP`.

`D6-02`: `SOURCE_PARTIAL`.

Every exhaustive typed construction must be updated when a P5 read member is added:

- Production/type surface: `src/app/read/createLiveReadApi.ts` — interface, unavailable registrations, invalid-base stub, configured registrations and live implementation.
- Provider/runtime: `src/app/read/ReadProvider.tsx`, `read-runtime.ts`, `useReadRuntime.ts`.
- Policy consumers: `src/app/live-route-policy.ts`, `navigation.ts`, `login-landing.ts` when route readiness changes.
- Typed test fixtures: `src/app/navigation.test.ts`, `live-route-policy.test.ts`, `login-landing.test.ts`, `read/read-runtime.test.ts`.
- Legacy DEV read implementation/context: `src/dev/read/read-simulator.ts`, `ReadPreviewRoot.tsx`.
- Day 05 DEV implementation/context: `src/dev/day5/simulator.ts`, `Day5PreviewRoot.tsx`.

Actual `LiveReadApi` object implementations needing a member are `createLiveReadApi.ts`, `src/app/read/read-runtime.test.ts`, `src/dev/read/read-simulator.ts`, and `src/dev/day5/simulator.ts`. Older DEV surfaces receive inert unavailable/false P5 registration/capability only; no live P5 transport or grant.

## Account D6.4 audit

- Displays `profile.fullname` (trim/fallback `Ko‘rsatilmagan`) and `profile.phone` (`+` prefix). User ID, roles and permissions are not shown.
- `AccountRoute` handles bootstrapping/terminating loading, login redirect and exact `profile.read / GET_ME` access denial.
- `AccountPage` returns `null` without a profile. Authenticated state is published only after a validated profile, so there is no separate account empty fetch state.
- Refresh failure is a status message while existing profile remains visible. Refresh/logout have pending controls.
- No mount-time get-me: get-me runs during `establishSession`, then only on explicit `Ma’lumotni yangilash`.
- Profile lives in SessionController, not cross-user query cache. Replacement clears profile/scope before next get-me; logout/reset/dispose clears local state/cache; late refresh commits only for the same epoch/scope.
- No P5 reset or login-PIN reset is mixed into AccountPage.
- Name and phone value cells now use `min-w-0`, and their `<dd>` elements use `break-words`, preventing unusually long unbroken values from forcing outer-page horizontal overflow without truncating or altering the factual values.
- `ACCOUNT_D6_4`: `COMPLETE_WITH_NARROW_POLISH`. No account behavior, API, provider, session flow, permission mapping, storage or test was changed. The D6.4 command counts (`534/534`, `71/71` files) remain historical checkpoint evidence. Final D6.6 user-reported browser evidence confirms long fullname/phone wrapping, no outer overflow and usable synthetic refresh/logout actions.

## D6.5 DEV verification surface

- `D6_5_DEV_SURFACE`: `COMPLETE / USER_REPORTED PASS`.
- The DEV-only lazy `/dev/day6/*` branch exposes `/dev/day6/devices` and `/dev/day6/account` only while `import.meta.env.DEV` is true. It is not part of live navigation, safe return, `LiveRouter` or production feature definitions.
- `/dev/day6/devices` composes the real normalized P5 read runtime, `P5Page`, `P5Results`, `P5ResetDialog`, scoped action registry and D6.3 reset controller with in-memory normalized ports. It does not replace global fetch, create a credential, write storage or register a production adapter.
- The scenario selector covers read/reset/lookup independence, empty/error/delayed/contract states, lookup and target loss, exact confirmation, synthetic rejection, malformed/unknown outcomes, double-submit, refetch failure, scope/access invalidation and the closed action-contract gate. Delays use manually released promises, not timers.
- Fixtures provide 12 deterministic rows across multiple merchants/terminals, status 0/1/777, nullable optional fields, long wrapping values and offsetless `createdAt` values. Fixture IDs use the Day 06 DEV prefix.
- Independent `p5List`, `merchantLookup`, `terminalLookup` and `resetPin` counters are visible. Counter reset does not mutate fixtures; scenario change reconstructs fixtures, counters, scope, gates and retained action state.
- `/dev/day6/account` was necessary because the existing `/dev/auth` surface renders `LoginPage`, not `AccountPage`. The new child route renders the real account component with a RAM-only long synthetic profile and inert actions.
- Same-device duplicate ambiguity and retained intent behavior remain covered by D6.3 controller tests and are documented rather than duplicated in the simulator dataset.
- Manual commands, the full scenario/counter matrix, account wrapping check and production-boundary checks are recorded in `docs/verification/DAY_06_MANUAL_CHECKS.md`. The earlier `549/550` and `72/73` pre-stabilization result is historical only. Final user evidence is: typecheck PASS; tests `551/551` in `73/73` test files PASS; lint PASS with 0 errors and only the two accepted existing shadcn warnings; build PASS with 2179 modules transformed; all seven D6.6 browser blocks PASS; no real backend calls.

## Final D6.7 contract disposition

- `P5_READ`: `SOURCE_CONFIRMED`; exact authority `GET_P5`; frontend implemented and locally verified; staging `NOT_RUN`.
- `P5_RESET_PIN`: request/predicate `SOURCE_CONFIRMED`; exact authority `RESET_P5_PIN`; frontend controller/dialog/lifecycle locally verified through the injected DEV normalized port; live transport `CLOSED / CONTRACT_GATED`; staging `NOT_RUN`.
- `OPTIONAL_LOOKUPS`: exact authorities `GET_DROPDOWN_MERCHANTS` and `GET_DROPDOWN_TERMINALS`; optional filter aids only; unfiltered P5 list is independent; locally verified; staging `NOT_RUN`.
- `ACCOUNT_READ_ONLY`: existing `GET_ME`/session policy preserved; only narrow wrapping polish; locally verified; staging `NOT_RUN`.
- `D6-01`: `BACKEND_BEHAVIOR / SOURCE_CONFIRMED_GAP`. Merchant `success=true, data=null` is not remote-success proof. `RESET_LIVE_GATE: CLOSED / CONTRACT_GATED`.
- `D6-02`: `SOURCE_PARTIAL`. There is no global atomic/idempotent/replay-safe guarantee; one explicit dispatch, no automatic replay and conservative `UNKNOWN` remain required.
- Browser refresh returning to phone/PIN login is expected under the existing RAM-only auth/session design. No persistence architecture changed.
- Dynamic QR create staging connection remains `NOT_RUN`; local D4 smoke is not staging evidence.

## Question ledger

| Question | Source path + symbol | Evidence | Frontend decision | Unresolved owner / closure evidence | Status |
| --- | --- | --- | --- | --- | --- |
| List endpoint/authority? | web `P5Resource.getMyP5Devices`; `SecurityConfig.PERMISSIONS` | GET `/p5/get-all`; `GET_P5` | `p5.read`; protected list | Actual staging grant is S-03 | `SOURCE_CONFIRMED` |
| Parameters/defaults? | `P5Resource.getMyP5Devices` | six exact parameters; page 0/size 10; no validation annotations | exact bounded serializer | None for implementation | `SOURCE_CONFIRMED` |
| Search? | `P5RepositoryImpl.FROM`, `toSearch` | `%input%`; device ID or terminal name via `ILIKE` | promise only those fields | None | `SOURCE_CONFIRMED` |
| Ordering? | `P5RepositoryImpl.FIND_ALL` | `created_at DESC`, no tie key | preserve server order | Backend stable secondary key/test | `SOURCE_PARTIAL`; read usable |
| List/count cardinality? | repository plus V1 constraints | static QR and user-terminal joins are unique; no structural multiplication | no dedupe/recount | Transactional snapshot/test for concurrent drift | `SOURCE_CONFIRMED` structurally |
| DTO shape/nullability? | `P5DTO`, mapper, V1 | eleven fields; optional description/static fields | defensive decoder; optional placeholders | Runtime sample is S-04 | `SOURCE_CONFIRMED` |
| Device ID format? | V1 schema plus String signatures | opaque VARCHAR(20); no format parser | preserve exact string; encode segment | None | `SOURCE_CONFIRMED` |
| Eligibility status? | mapper, reset SQL/service, V2 | same column; exact 0 required; 1 inactive/admin flag | exact-0 local gate; unknown closed | Exhaustive codes beyond 0/1 remain neutral | `SOURCE_CONFIRMED` for eligibility |
| Reset endpoint/grant? | web `P5Resource.resetPin`, `SecurityConfig` | bodyless/queryless POST, String path, `RESET_P5_PIN` | proposed `p5.resetPin` | Staging assignment S-03 | `SOURCE_CONFIRMED` |
| Reset ownership? | `findStatusByUserIdAndDeviceId` | active current-user terminal membership | require current row; backend rechecks | None | `SOURCE_CONFIRMED` |
| Merchant propagates remote success? | `P5ServiceImpl.resetPin`; user-supplied 1.0.77 `RestServiceUtil.postData` bytecode | Client returns null for HTTP/transport failures, returns an unchecked HTTP-200 body, and merchant ignores either value before its own success | Keep production/live reset port closed; merchant success is not remote-success proof | Backend must validate/propagate remote outcome, with focused tests or authoritative equivalent evidence | `SOURCE_CONFIRMED_GAP`, D6-01 |
| P5 reset effects? | external reset service/repositories | clears PIN, expires sessions, creates OTP session, invokes SMS, attempts MQTT; MQTT failure swallowed | no PIN/SMS-delivery/reboot/device-ack claim | Backend/product end-to-end contract | Sequence confirmed; outcome partial |
| Atomic/idempotent/replay-safe? | reset service/transactions | no global transaction/key; ordered partial writes; repeats possible | one dispatch; unknown/no replay | failure-injection/repeat tests or backend contract | `SOURCE_PARTIAL`, D6-02 |
| Reset success wire? | both services plus existing 1.0.77 evidence | `success=true`, explicit `data=null` | only explicit-null confirms | Deployed sample is S-04 | `SOURCE_CONFIRMED`; runtime not verified |
| Account fetch/scope? | `AccountPage`, `AuthProvider`, `SessionController` | no mount fetch; scoped session profile; stale commit rejected | no ownership/fetch change | D6.4 wrap check only | `SOURCE_CONFIRMED` |

## New D6 gaps

| ID | Scope / owner | Evidence and missing fact | Frontend mitigation | Closure evidence | Status |
| --- | --- | --- | --- | --- | --- |
| D6-01_P5_RESET_REMOTE_RESPONSE | Merchant remote outcome propagation / Backend-shared | User-supplied 1.0.77 bytecode proves `postData` returns null for non-200/no-body and caught URI/REST failures, returns an unchecked HTTP-200 body, and never rethrows those caught failures. Merchant ignores body/null and always emits its own success. | Production/live reset port closed. Later exact target/permission/eligibility/confirmation/one-dispatch/UNKNOWN UI, DEV and tests may proceed without live dispatch. List unaffected. | Backend validates the returned envelope and propagates remote failure, with focused failure tests; or authoritative replacement contract/evidence proves trustworthy outcome propagation. | `BACKEND_BEHAVIOR`; `SOURCE_CONFIRMED_GAP`; live reset `CONTRACT_GATED` |
| D6-02_P5_RESET_PARTIAL_REPLAY | External reset / Backend-P5/product | No global transaction/idempotency key; PIN/session changes precede later steps; SMS can fail after writes; MQTT failure is swallowed; repeats can start another OTP flow. | One dispatch, no auto-retry, ambiguity UNKNOWN, explicit reread/new confirmation, no device-receipt claim. | Authoritative retry/partial-failure contract with failure-injection/repeat tests, or transactional/idempotent design. | `SOURCE_PARTIAL`; conservative reset may proceed |

Existing D5-01 through D5-05 and S-01 through S-04 are carried unchanged. No list, device-ID, eligibility or account contract blocker is created.

## D6.0 acceptance review

- Read, reset and account are classified separately.
- Authorities, endpoint shapes, parameters, SQL search/order/count and DTO fields are source-backed.
- Cardinality is resolved against schema constraints; concurrent two-query drift is bounded.
- Reset membership/status map to the same field projected by `deviceStatus`.
- External mutations, SMS/MQTT, success meaning, partial failure and replay are separated.
- Existing envelope evidence and the user-supplied RestServiceUtil javap result are reused; Codex ran no javap/API/backend execution and read no secret values.
- Reusable signatures and exhaustive read-registration/API stub locations are inventoried.
- Account is inventoried without change.
- No backend, runtime mapping, route, page, decoder, filter, reset controller/dialog, simulator or verification artifact changed.
