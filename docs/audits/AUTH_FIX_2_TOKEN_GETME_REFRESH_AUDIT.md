# AUTH.FIX.2 — Token issuance, GET_ME 401 and refresh DB_ERROR

Date: 2026-10-13 (Asia/Tashkent). **AUDIT ONLY; implementation NONE.**

**Status: PARTIAL diagnosis; focused source investigation complete, incident root cause not yet confirmed.**

The user-supplied authorized staging observation establishes successful CHECK_PASSWORD/PIN authentication and token issuance, followed by **GET_ME HTTP 401**, then a refresh response carrying **DB_ERROR / 10007**. The first failed boundary is **GET_ME_AUTHENTICATION**, not Dashboard routing or an observed GET_ME403.

One independent backend defect is confirmed in the inspected local generation logic: refresh tokens have no unique per-issuance identifier, and same-second issuance can generate identical signed token strings and hashes. A synthetic offline check reproduced this. Combined with the schema's unique token_hash constraint, it is a precise candidate for the refresh insert failure. **It does not explain the earlier GET_ME401, and its occurrence in staging is not confirmed without the SQL exception/constraint and timing evidence.**

No frontend defect was found in the relevant source/header/refresh/bootstrap paths. The actual browser-to-upstream bearer delivery remains unverified. No application code, token storage, grant, database, cache or staging configuration was modified.

## 1. Evidence and reconciliation with prior reports

Read:

- `AUTH_CASHIER_LOGIN_AUDIT.md`
- `RBAC_PERMISSION_AUDIT.md`
- `AUTH_FIX_1_STAGING_DIAGNOSIS.md`

Their source findings remain useful, but their runtime NOT_RUN conclusions were historical. The new user-observed sequence supersedes those runtime limits for this cashier attempt. The earlier missing-GET_ME/403 hypothesis is **not the observed failure** and must not be promoted to root cause.

| Stage | New staging evidence supplied by user | What it establishes / does not establish |
|---|---|---|
| POST `/web/login/session` | success true; OTP | Auth session creation succeeded; no frontend lease snapshot was supplied |
| POST `/web/login/send-otp` | success true; CHECK_PASSWORD | Known-device/PIN path reached; no OTP verification was required in this sequence |
| POST `/web/login/check-pin` | success true; DONE; access and refresh tokens issued; TTL 10 minutes / 15 days | Credentials accepted and backend returned tokens; no token values inspected |
| GET `/user/get-me` | HTTP 401; UNAUTHORIZED; generic full-authentication-required message | First protected request failed authentication; no valid profile/roles/permissions returned |
| POST `/token/refresh` | success false; code 10007; tag DB_ERROR | Refresh fallback failed; its HTTP status was **not supplied** |
| Recovery screen | Observed by user | Application did not reach authenticated readiness/landing |

The agent did not repeat login, OTP, refresh or protected staging requests. These are accepted user-reported observations, not an agent-captured request trace. No raw auth payload, token, phone, OTP/PIN or Authorization value is included. Correlation IDs, elapsed issuance-to-refresh time, replica IDs and deployed versions were not supplied. Administrator/ROLE_MERCHANT runtime control remains unavailable.

**Not confirmed:** actual staging role assignment/grants/cache contents, exact SQL failure, bearer arrival at upstream, JWT parser result, deployed filter behavior, GET_ME schema, session readiness or landing. Issued tokens do not prove successful protected authentication.

## 2. Repository baseline and evidence scope

| Repository | Branch / HEAD | Initial status |
|---|---|---|
| Frontend `D:\QR projects\qrhub-merchant-frontend` | main / `9758dbe58c748c84f38f73b5c2280b19fc5f8cc4` | No tracked changes; three existing untracked reports in docs/audits |
| Backend `D:\QR projects\qrhub-merchant-service` | feature/dashboard-analytics / `894663f7337da1946c21d2003cb19018b128eb55` | Existing modified `.gitignore`, `qh-merchant-web-api/pom.xml`; existing untracked `BACKEND_FRONTEND_CONTRACT_AUDIT.md`, `DYNAMIC_QR_STATS_AUDIT.md`, `qh-merchant-web-api/src/test/` |

All pre-existing work was preserved. Only this report is added. Local source and cached dependencies are evidence of local mechanisms, not proof of deployed binaries. No runtime backend logs or staging database/cache connection was supplied; no auth/token Java test was found in the inspected backend tree. No backend build, service startup, dependency installation or database query was performed.

Path legend for subsequent references:

- **A** = `D:\QR projects\qrhub-merchant-service\qh-merchant-auth-api\src\main\java\uz\wt\qh\merchant\auth\api`
- **W** = `D:\QR projects\qrhub-merchant-service\qh-merchant-web-api\src\main\java\uz\wt\qh\merchant\web\api`
- **M** = `D:\QR projects\qrhub-merchant-service\qh-merchant-auth-api\src\main\resources\db\migration`
- **S** = cached `C:\Users\Asus\.m2\repository\uz\wt\qh\libs\qh-lib-shared\1.0.77\qh-lib-shared-1.0.77.jar`
- **L** = corresponding `qh-lib-model\1.0.77\qh-lib-model-1.0.77.jar`

Shared implementation source was not available in the workspace/source JARs. `javap -c -p` / `javap -v -p` inspected actual cached class implementations and annotations. Auth `pom.xml:21` declares shared/model 1.0.77 and Spring Boot 3.3.1. Cached Spring Security 6.3.1 and JJWT 0.12.6 implementations were also inspected. Their deployed versions remain unverified.

Artifact fingerprints, for safe comparison with an operator's deployed artifact metadata:

| Cached artifact | SHA-256 |
|---|---|
| qh-lib-shared-1.0.77.jar | `4DCB0A47511727084EA021D21C0E361F7A4595F8898DF5CEDDF8C5E252C29853` |
| qh-lib-model-1.0.77.jar | `6E9A226AE31D4C68D31687A0BD7001C4E3D6A8BC2BCAC877363797C9D906C940` |

These are library fingerprints, **not token or secret fingerprints**.

## 3. Token issuance lifecycle and prerequisites

`A/service/impl/WebLoginServiceImpl.java:264` (`checkPin`) executes:

1. Resolve session key and `QpUserSessionRepositoryImpl.findByPkey`; require CHECK_PASSWORD and unexpired session (`resolveAndValidateSession`).
2. Find active user by the session's phone (`QpUsersRepositoryImpl.findByPhone`, SQL status=0); explicitly check active user.
3. Load session device; require PIN-attempt count below limit; compare entered PIN hash.
4. `QpDeviceRepositoryImpl.registerDevice`: update device user_id, reset PIN-attempt count.
5. `QpUserSessionRepositoryImpl.updateColumns`: set session stage DONE.
6. `JwtComponent.generateTokens(user, session.pkey, device.deviceType)`.
7. Return successful DONE/TokenResponse.

There is **no role branch** and no merchant terminal or GET_ME authority prerequisite in checkPin. The top-level checkPin method is not transactional; individual repository writes are. Update return/counts are not all checked. Under the inspected code, returning DONE means token generation did not throw, but does not independently prove later cache visibility or transaction/deployment consistency.

`A/config/JwtComponent.java:43` (`generateTokens`) executes in this order:

1. `buildCurrentUser` → `QpUserRolePermissionRepositoryImpl.findRolesAndPermissions`.
2. Construct immutable distinct roles/permissions lists and principal fields: identity, sessionId, deviceType.
3. Compute cache key from user ID and session ID using `UserSessionUtil.genarateUserSessionKey`.
4. Obtain cache named `JwtClaims.MERCHANT_USER_SESSION_CACHE_MAP_NAME`; if non-null, `cache.put(key, principal)`. **Null cache silently skips principal publication.**
5. Generate signed refresh JWT, hash it in memory and INSERT refresh-token record.
6. Generate signed access JWT; return both with configured TTLs.

Successful DONE therefore implies the initial role query and refresh INSERT completed if the deployed path matches this source. Empty role/grant query results still produce a principal and tokens. A missing cache can still permit issuance because of the null-check; a thrown cache-write error would normally prevent successful DONE. A successful cache.put does not prove that another replica uses the same cache database/namespace/serializer or can later read it.

**Key alias verified:** cached S/UserSessionUtil exposes both spellings; `genarateUserSessionKey` delegates to `generateUserSessionKey`. Both produce `<user-id>:<session-id>`. The spelling difference between issuer and filter is **not a local key mismatch**. No actual user/session key was inspected.

`A/config/CacheConfig.java:26` uses RedisCacheManager, GenericJackson2JsonRedisSerializer and access-token TTL for `merchant-user-sessions`. `JwtComponent` uses that same named constant; S/UserSessionProvider.getMerchantUserSession reads `merchant-user-sessions` by key and expected MerchantCurrentUser type. Provider has no database fallback.

Allowlisted non-sensitive local settings agree with the supplied TTLs: auth context `/qh-merchant-auth-api`, Redis cache, bearer filter enabled, security-service-type QRHUB_MERCHANTS, required device-type BOTH, access TTL 10 minutes and refresh TTL 15 days. Production resource override also declares Redis cache. Secret/connection values were neither displayed nor compared. Runtime profile/environment overrides and deployment consistency remain unverified.

### JWT claims

`JwtComponent.generateAccessToken:129` and `generateRefreshToken:145` use subject from the user identity, issuer `qh-merchant-auth-api`, audience `qh-merchant`, iat, exp, user_id, token_type, session_id and device_type. Access and refresh differ in token_type and expiry. No role/grant array is embedded and **no jti or random per-issuance claim is generated**. The signing key comes from AppProperties bearer-token secret, Base64-decoded or raw-byte fallback. The shared TokenProvider uses the same property/encoding convention locally; verify effective settings across replicas without exposing key material.

To authenticate a newly issued access token, the request must carry a resolvable bearer credential, reach the appropriate running JWT filter, pass signature/time/claim/device checks, find a readable cached principal in the proper namespace, and install authenticated security context before endpoint authorization. The principal then needs GET_ME for the GET_ME resource. These are two distinct boundaries.

## 4. GET_ME authentication and HTTP 401 candidates

### Actual filter/chain behavior

`A/config/SecurityConfig.java:99` configures Swagger Basic-auth chain first, then stateless API JWT chain. Login/token refresh endpoints are public and excluded from JWT filtering; `/user/get-me` is not excluded. JWT filter is installed before UsernamePasswordAuthenticationFilter. `/user/get-me` requires exact GET_ME; unmapped requests denyAll; JwtAuthenticationEntryPoint produces raw HTTP 401 JSON.

S/BearerTokenFilterAutoConfiguration creates the filter when `app.bearer-token.filter-enabled=true`, AppProperties/UserSessionProvider exist and no overriding JwtAuthenticationFilter bean exists. A different deployed bean/version can change these mechanisms. The local source has no explicit FilterRegistrationBean configuration; effective servlet/security registration order should be verified if filter execution/context loss is suspected, not assumed broken.

S/JwtAuthenticationFilter:

- `shouldNotFilter` matches servlet path against excluded patterns.
- `resolveToken` reads Authorization and requires exact case-sensitive prefix `Bearer `, then trims the suffix. No usable token → chain continues without constructing authenticated context.
- `doFilterInternal` parses the token; validates claims; builds authentication from cached principal; sets context for the request; clears context in finally.
- `validateTokenClaims` requires access_token type, recognized device_type compatible with required type (BOTH accepts WEB/MOBILE), and nonempty user_id/session_id.
- `buildAuthenticationFromClaims` chooses merchant/billing cache by **security service type**, not role; missing principal throws `User session expired or not found`.
- `buildMerchantAuthentication` builds authorities from nonblank permissions and uses the three-argument UsernamePasswordAuthenticationToken constructor. That constructor marks the authentication trusted even with an empty authority collection (cached Spring Security 6.3.1 inspection). Roles are not used to reject the principal.

S/TokenProvider.parseToken verifies signed claims and expiration using the configured key. It logs safe constant signatures `JWT token expired` or `Invalid JWT token` on parse failure. It does not explicitly require issuer/audience values in the inspected parser; these claims are issued but an issuer/audience rejection would require a different deployed parser/gateway policy. Signature mismatch, malformed token and invalid time claims remain possible runtime causes.

**Message-specific inference:** the supplied generic full-authentication-required message is constructed by cached Spring Security ExceptionTranslationFilter when an access denial sees anonymous/remember-me authentication. This favors checking bearer delivery and effective filter/context execution first. It does not reveal a particular JWT/cache failure. The inspected JWT filter has no direct catch-and-entrypoint conversion for its own parsing/cache exceptions; an error dispatch to denied `/error` can mask an earlier exception with a generic 401. That masking is a hypothesis requiring dispatcher/original-exception evidence, not a confirmed runtime path.

| Candidate / rank for verification | Source mechanism and fit | Required safe evidence |
|---|---|---|
| G1 — missing/unrecognized bearer at upstream | resolveToken returns null; protected authorization sees anonymous. Fits generic message. Frontend source constructs correct header; actual delivery unknown. | Header-present boolean and recognized-scheme boolean at browser and upstream; gateway forwarding yes/no; no header values |
| G2 — filter/route/chain/deployment/context mismatch | Wrong upstream, servlet path, excluded pattern, overriding filter, dispatch/registration order or lost context can leave request anonymous. Public login working does not exercise protected filter. | Upstream service/replica, effective chain/filter execution, safe servlet path/dispatcher type, authenticated-before-authorization boolean, app/shared revisions |
| G3 — missing/expired/unreadable principal | Provider reads cached principal only; null cache during issuance can skip write; wrong Redis namespace/database/replica configuration, eviction, expiry or serialization mismatch can fail lookup. | Cache write attempted/succeeded, same logical key/namespace boolean, entry-present/type-readable booleans, TTL, effective cache backend/profile match; no principal dump |
| G4 — signature/token/claim/time mismatch | TokenProvider verifies signature and exp; filter checks type, user/session presence and device enum. Multi-replica key/config drift could reject fresh token. | Safe parser result/exception class, constant error category, key configuration version/match boolean, claim-validity booleans and clock offset; no token/key/claim identity values |
| G5 — device/security-service mismatch | Filter selects cache family by QRHUB_MERCHANTS/BILLING and device compatibility. Local settings QRHUB_MERCHANTS/BOTH agree with web token, so local mismatch not found. | Effective enums on issuing/validating replicas and compatible-device boolean |
| G6 — revoked/expired server state | DB session logout alone is not checked by cached filter; principal eviction/missing cache can cause rejection. JWT expiry checked separately. A new login can replace device sessions. | Safe session-stage/cache-entry/TTL status and event ordering; no session identifier in report |
| G7 — database/grant principal failure | GET_ME filter/provider do **not** query grants/DB directly. SQL construction failure would normally prevent initial DONE, or occur during refresh reconstruction. GET_ME200 schema handling was never reached. | Original upstream exception/dispatcher details if different deployed provider or cache failure suspected |
| G8 — missing GET_ME grant alone | A successfully authenticated principal without GET_ME receives authorization denial, normally 403. It is not rejected merely for empty grants. | Only inspect grant if authenticated context is established or a real 403 occurs; no grant additions as diagnosis |

Ranking is based on message/source fit and distinguishes local defaults from deployed possibilities. It does not assign an incident root cause. Fresh 10-minute TTL alone does not prove key/cache/header/time validity. No raw token analysis is needed.

## 5. Refresh DB_ERROR / 10007 — exact operation trace

`A/resource/TokenResource.java:36` accepts public POST `/token/refresh`; DTO requires nonblank refreshToken. `A/service/impl/TokenServiceImpl.java:34` wraps refresh in `@Transactional`. It is not protected by GET_ME authority and does not require an access bearer header.

| Order | Method and operation | Expected normal failure versus possible DB_ERROR |
|---|---|---|
| 1 | JwtComponent.parseRefreshToken:83: verify signature/exp, require refresh token type, extract identity/session/device/expiry | Invalid JWT/type normally REFRESH_TOKEN_INVALID; not DB_ERROR |
| 2 | QpRefreshTokenRepositoryImpl.findStatusByTokenHash:35: `SELECT status FROM qp_refresh_token WHERE token_hash=:tokenHash`; optional single result; enum conversion | Missing row → REFRESH_TOKEN_INVALID; non-ACTIVE → REFRESH_TOKEN_ALREADY_USED. SQL connection/schema/permission/cardinality failure → DataAccessException possible. Bad enum is IllegalArgumentException, distinct mapping. |
| 3 | Compare parsed JWT expiration with local time | Expired → REFRESH_TOKEN_INVALID. Despite comment mentioning DB expiry, this code does not read/compare stored expires_at in this SELECT. |
| 4 | QpUserSessionRepositoryImpl.findByPkey:122: `SELECT * FROM qp_user_session WHERE pkey=:pkey AND deleted_at IS NULL`, row mapper | Missing/deleted/non-DONE → SESSION_NOT_FOUND. SELECT/column/type/cardinality errors can be DataAccessException. Session expires_at/device row are not revalidated here. |
| 5 | QpUsersRepositoryImpl.findById:51: `SELECT * FROM qp_users WHERE id=:id`, row mapper; require status=0 | Missing/inactive → USER_NOT_FOUND/USER_NOT_ACTIVE; SQL/type/connection errors possible. Null status would cause a different Java exception, not itself DB_ERROR. |
| 6 | QpRefreshTokenRepositoryImpl.logout:49: `UPDATE qp_refresh_token SET status=:status,logout_at=:logoutAt,updated_at=now() WHERE token_hash=:tokenHash` | Update/lock/trigger/connection/schema error can map DB_ERROR; affected row count not validated; no SELECT FOR UPDATE/CAS use-once transition here |
| 7 | JwtComponent.buildCurrentUser:171 → QpUserRolePermissionRepositoryImpl.findRolesAndPermissions:29 | Valid no-grant result is an empty list, not DB_ERROR. Missing relation/column, SQL privileges, connectivity etc can throw DataAccessException. |
| 8 | JwtComponent.generateTokens:43 → Redis cache.put | May fail if cache infrastructure/serialization errors; some cache exception classes can also belong to Spring DataAccessException. DB_ERROR does not prove PostgreSQL unless nested cause identifies it. |
| 9 | QpRefreshTokenRepositoryImpl.save:21: `INSERT INTO qp_refresh_token(token_hash,user_id,session_id,status,expires_at)` | Strong source-specific candidate: identical newly generated hash violates qp_refresh_token_unique. FK, not-null, sequence/trigger/schema/privilege/connection errors are other candidates, not established. |
| 10 | Generate access token, return pair, transaction commit | Commit-time database failures also possible; inspect transaction manager/commit frames. No new pair committed to frontend on observed API failure. |

The refresh path has **no direct QpDeviceRepository call**. Device type is taken from the signed refresh claim and used during regenerated tokens. User-session relation and cached principal binding matter; an invented refresh device lookup is not a source-supported SQL candidate.

`M/V1__initial_schema.sql:149` defines qp_refresh_token_unique on token_hash, FK session_id→qp_user_session.pkey and FK user_id→qp_users.id, with non-null token_hash/user_id/session_id/status/expiry. Later local migrations do not remove the unique constraint. Deployed constraints/triggers/migration history are unverified.

### Exact error mapping

S/ZalandoExTranslator.handleDatabaseException accepts **org.springframework.dao.DataAccessException**, logs constant `Database exception` with its throwable, and returns success=false, CoreErr.DB_ERROR tag/code using ResponseEntity.ok. CoreErr stores DB_ERROR ordinal status 7; getStatus adds 10000 → **10007**. Thus the supplied error is compatible with a caught data-access failure, not a particular constraint.

The supplied refresh HTTP status remains unknown; **local mapper would use HTTP 200** for this envelope. Distinguish it from an HTTP401 authentication response. The mapper covers DataAccessException subclasses, including certain cache/Redis failures depending on actual exception type. Do not assume every DataAccessException is an SQL integrity failure. Invalid enum/argument and generic exceptions have separate INVALID_ARGUMENT/INTERNAL_ERROR mappings in the inspected translator.

Because initial DONE and refresh generation share grant query/cache/INSERT operations, a stable schema/permission failure affecting those shared operations would normally have blocked initial issuance too, if the same replica/source/database was used. Refresh introduces the existing-token UPDATE and insertion of another hash for the **same** user/session. This makes rotation-specific failure a better source candidate; deployment differences or transient failure can still affect any step.

### Confirmed local token-uniqueness defect; unconfirmed incident linkage

JwtComponent.generateRefreshToken uses deterministic identity/session/device/type claims and a deterministic HMAC signing process, with no random jti. JJWT 0.12.6 `io.jsonwebtoken.impl.lang.JwtDateConverter.applyTo` serializes Date.getTime()/1000. Two calls for the same identity/session/device/key/TTL whose iat and exp fall in the same seconds can produce **identical** refresh JWTs; their SHA-256 hashes are identical. The next refresh INSERT then conflicts with the existing row regardless of that row being marked LOGOUT: uniqueness applies to every row, not only ACTIVE ones.

Offline synthetic probe (no database/network, no real identity/key, no raw token/hash output): same claims/key, fixed issuance instants 800ms apart within one second, 15-day TTL; compare in memory. Output:

```text
SYNTHETIC_SAME_SECOND_TOKEN_EQUAL=true
SYNTHETIC_SAME_SECOND_HASH_EQUAL=true
SYNTHETIC_NEXT_SECOND_TOKEN_EQUAL=false
```

This confirms the generation collision condition using cached JJWT 0.12.6, not a staging SQL exception. The user's timing does not establish same-second issuance. Inspect SQLSTATE/constraint/method first. If it is PostgreSQL unique violation SQLSTATE 23505 on qp_refresh_token_unique at QpRefreshTokenRepositoryImpl.save and an internal old/new-hash equality check is true, the refresh collision is confirmed for this incident. The operator must report only the equality boolean, not hashes/tokens or database error DETAIL values.

Transaction implication: under the declared transaction, failed replacement INSERT should roll back the old-token LOGOUT update, subject to actual deployment transaction manager. Redis cache.put happens before INSERT and is not part of that SQL transaction, so it may remain changed despite rollback. Do not blindly remove uniqueness, upsert/reuse the old token, delay frontend refresh or retry automatically to hide the defect. Concurrent refresh lacks an atomic ACTIVE→used lock/CAS check; review rotation invariants in a separate approved correction/test scope.

## 6. Cashier roles and grants — separate outcomes

W/service/impl/CashierServiceImpl.createCashier inserts active qp_users status 0, assigns role selected by name ROLE_MERCHANT_USER and assigns terminal relationships. Role lookup does not enforce active role status and creation does not create role-permission grants.

A/repository/impl/QpUserRolePermissionRepositoryImpl.java:17 inner-joins qp_join_user_role → qp_role → qp_join_role_permission → qp_permission and requires role/permission status '0'. There is no active flag on role-permission join in the inspected V1 schema; the relationship must **exist**. A role with no active permissions vanishes from both aggregated roles and permissions. This is not itself an SQL error.

| Missing/inactive cashier grants | Source-level consequence |
|---|---|
| Token creation | Empty rows still create principal/tokens; no role/GET_ME whitelist. A SQL/query error, rather than missing grant rows, can interrupt generation. |
| Authenticated principal construction | Cached principal plus empty permission set still constructs trusted Authentication. No rejection by merchant role. |
| GET_ME401 | **Not explained by missing GET_ME alone.** Requires absent/failed authenticated context, cache/credential/filter/config issue or different deployed behavior. |
| GET_ME403 | Correctly authenticated principal missing exact GET_ME can cause authorization denial. This is a possible distinct outcome, not the observed one. |
| Refresh DB_ERROR | Missing grant rows do not throw; grant reconstruction query can cause a data-access exception if SQL/infrastructure fails. Grant absence is not evidence of constraint failure. |

### Differential comparison

ROLE_MERCHANT and ROLE_MERCHANT_USER use the same web session/PIN/token/refresh/JWT/cache/query path. No branch in checkPin, TokenServiceImpl.refresh, JwtComponent or cached JWT filter compares these role names. Differences can arise from active identity data, granted authorities, device registration, existing session/refresh rows, cache presence and routing/replica config. Merchant-owner versus cashier terminal/merchant scope affects feature APIs after authentication, not a role-specific switch in these auth paths. A successful owner login would be a control observation, not proof that cashier role mapping is defective; none was provided for this incident.

## 7. Frontend behavior and lack of an established frontend defect

Source references:

- `src/shared/contracts/auth.contract.ts:118`: normalize DONE and decode nested TokenPair; require nonempty tokens and positive safe integer TTLs. JWT cryptographic validation is server-owned; frontend does not decode real claims or infer grants from token text.
- `src/shared/auth/login-controller.ts:296/:614`: valid DONE transfers tokens/lease to SessionController; enters completing.
- `src/shared/auth/session-controller.ts:302/:344`: put token pair in private memory and persist before GET_ME; enter bootstrapping. No authenticated snapshot until successful valid profile.
- `src/shared/api/auth-api.ts:248` and `src/shared/api/http.ts:186`: GET_ME uses access token as bearer; header construction is `Bearer ` plus access token. POST refresh at auth-api.ts:236 uses public credential and JSON `{refreshToken}`. Neither operation depends on a cached frontend profile/grant.
- Transport preserves configured service URL prefix, forbids redirects and sends `credentials:'omit'`; that does not omit an explicitly set Authorization header. Tests verify correct headers/prefixes with synthetic credentials. Actual runtime header arrival still needs safe confirmation.
- `session-controller.ts:129/:453`: raw 401 is refreshable; raw 403 returns access-denied without refresh. Default near-expiry threshold is 30 seconds, so immediate fresh 10-minute token does not by itself trigger refresh; the supplied preceding 401 explains the fallback.
- `session-controller.ts:409`: refreshFlight is keyed by auth epoch/token revision, shared by concurrent calls. A safe read replays at most once only after a successful refresh; a restored pre-expiry refresh cannot trigger a second bootstrap rotation.
- `src/shared/contracts/auth.contract.ts:232`: classify HTTP401/403 before body shape; business success=false/code/tag becomes a safe business failure. DB_ERROR refresh response does not become a valid replacement TokenPair.
- `session-controller.ts:744`: any refresh failure terminates current local session, aborts operations, clears durable tokens/private cache and releases lease; bootstrap-error handling prevents readiness. Controller maps resulting failed bootstrap to request/recovery feedback. No GET_ME replay occurs after failed refresh.

Initial persistence is not proof of authenticated application readiness and does not cause the request to read an old token instead: GET_ME/refresh use SessionController's in-memory pair. Device/session binding: device UUID is sent during session creation; X-Session-Key during PIN stages; signed token carries user/session/device type for protected operations. Frontend intentionally does not add X-Device-Key or X-Session-Key to bearer GET_ME/public token-refresh requests; inspected server paths do not require those extra headers there.

The user-observed recovery screen agrees with this fail-closed path. **Do not change the one-refresh-on-401 policy to conceal a backend error.** No concrete frontend header/token selection/refresh duplication defect is established; unrelated findings from the full RBAC report are not automatically incident causes.

## 8. Exact safe evidence needed from an authorized backend operator

Use existing incident correlation/timestamps. Do not repeat authentication merely to collect evidence, dump Redis values, query/export token_hash values or transmit secrets. Existing logs may contain SQL parameter/exception DETAIL values; return a sanitized summary rather than raw logs/HAR/stack traces.

### GET_ME401 — highest-priority checks

1. Identify the GET_ME request's upstream auth service, replica, deployed app/shared versions, effective security chain and dispatcher type. Report whether filter ran and Authentication was present/trusted immediately before GET_ME authorization.
2. Confirm Authorization header **presence** and exact recognized bearer-scheme boolean at browser/gateway/upstream. Confirm proxy forwarded header unchanged as a boolean; never show its value.
3. Search existing safe constant signatures `JWT token expired`, `Invalid JWT token`, `Invalid token type`, `Invalid device type`, `Invalid session data in token`, `User session expired or not found`, or unsupported security-service-type category. Return original exception class/category, not raw token/claims.
4. Check issuance cache-write performed/succeeded, matching cache/key-generation algorithm, namespace/database configuration match, entry-present/readable-type booleans and TTL. Effective QRHUB_MERCHANTS and compatible WEB/BOTH settings may be reported; key/session/user identifiers and cached personal fields must not be exported.
5. If generic401 came from ERROR dispatch, inspect the **original** JWT/cache exception internally. The entrypoint message alone cannot identify it.
6. Compare effective signing-key **configuration/version agreement** and clock offsets across issuance/validation replicas using internal yes/no checks; do not disclose keys or real token data. If authentication succeeds but later authority denial occurs, only then inspect active GET_ME grant/role/relationship separately.

### Refresh DB_ERROR — pinpoint the exact operation

Locate the event logged by **ZalandoExTranslator: `Database exception`** for the refresh request. Return only:

- Exception class and nested cause class (e.g. data-integrity, connection, result-size, Redis connection/serialization).
- For an SQL cause: SQLSTATE, constraint/table/column name if safe, operation type SELECT/UPDATE/INSERT/COMMIT, and repository method/line from the stack. Do not return SQL bind values or error DETAIL.
- Issuing/refreshing replica and application/dependency revision; deployed migration/constraint confirmation.
- If method is QpRefreshTokenRepositoryImpl.save and constraint qp_refresh_token_unique: internal old/new refresh-hash equality boolean; issuance/refresh spacing and whether iat/exp landed in identical seconds, without token/claim contents or hash values.
- Transaction rollback/commit outcome and old-token status only (ACTIVE/LOGOUT), cache publication success/status; no record identifiers or payload dumps.

Methods to distinguish: findStatusByTokenHash → findByPkey → findById → logout → findRolesAndPermissions → cache.put → save → transaction commit. For empty-grant concerns, request grant identifiers/status/existence only, never personal identity fields or admin grant additions. No evidence justifies a staging database/cache write during this investigation.

## 9. Minimal corrections, conditional on established boundary

1. **Confirmed local generation defect:** make each newly issued refresh JWT unique with a fresh cryptographically unpredictable per-issuance jti (for example a freshly generated UUID), included before signing in JwtComponent.generateRefreshToken. Preserve hashed storage, token_hash uniqueness and one-time rotation. This is a precise source-level recommendation, not implemented and not asserted to fix GET_ME401. If deployed logic differs, compare it first; tie incident DB_ERROR to the actual SQL cause before claiming it resolved.
2. **GET_ME header/filter/cache failure:** correct only the boundary that safe traces establish—forward the existing bearer header, route to the right protected auth service/chain, align effective key/device/security-service configuration, or publish/read the principal using the same available shared cache namespace/serializer. The local null-cache skip should fail closed before returning tokens if principal publication is required. No blanket grant changes or guard removal.
3. **Other refresh DataAccessException:** correct the exact schema/column/privilege/connectivity/row-mapping/transaction/cache defect indicated by the method/SQLSTATE. Do not remove unique/FK constraints or upsert tokens to hide an unknown error. Coordinate cache publication with successful persistence/commit if evidence exposes inconsistency.
4. **Grant change only after genuine authorization evidence:** if a trusted principal later gets GET_ME403, verify intended cashier GET_ME policy and active grants through authorized review. This is separate from the supplied 401/DB_ERROR sequence; never map cashier to administrator or grant unrelated features.

No delay, token-storage change, extra OTP attempt, retry loop or disabled 401 refresh is recommended as an incident workaround.

## 10. Verification performed and regression tests required

Existing frontend targeted tests, installed dependencies, exit **0**:

```text
npm test -- src/shared/api/http.test.ts src/shared/contracts/auth.contract.test.ts src/shared/auth/login-controller.test.ts src/shared/auth/session-controller.test.ts src/shared/auth/session-persistence.test.ts src/shared/auth/token-persistence.test.ts src/shared/auth/device-lease.test.ts
Test Files: 7 passed (7)
Tests: 71 passed (71)
Duration: 1.43s
```

Source/repository/schema inspection and cached class `javap` inspection were read-only. The in-memory JShell probe used cached JJWT 0.12.6 with Jackson 2.17.1, a synthetic key/identity/session and fixed same-second/different-second timestamps; only the three equality booleans above were emitted. No real token/key, storage, network or database was involved. No new project test or backend build was created/run. Frontend tests do not prove deployed header forwarding, backend DB/cache consistency or role acceptance.

Required regression cases after review:

- Generate/rotate refresh tokens twice in the same second for the same user/session/device; replacement differs and INSERT satisfies uniqueness. Test differing seconds as a control and stable expiry semantics.
- Transactional refresh success/failure: old token consumption once, replacement INSERT rollback, duplicate concurrent refresh denial, no misleading success, and cache publication consistent with committed persistence.
- Immediate newly issued web access token reaches GET_ME: matched signature/claims, shared principal hit, correct filter/chain execution and header forwarding. Missing principal or malformed token fails closed with preserved diagnostic cause; no need to log token values.
- Trusted empty/limited-grant principals: GET_ME missing authority yields 403, not role-based 401; intended cashier GET_ME succeeds without owner feature grants; compare ROLE_MERCHANT using the same infrastructure.
- Fresh DONE→GET_ME401→refresh business DB_ERROR: exactly one fallback, no replay after failed refresh, no ready profile/landing, local cleanup/recovery. Existing tests cover pieces; add this exact wire/provider sequence.
- Refresh status/enum/schema/cache exception classification; safe error summaries without SQL parameter/token/identity leakage.

## 11. Conclusion

**Confirmed incident boundary:** credentials/token issuance succeeded; GET_ME authentication returned HTTP401; refresh subsequently reported DB_ERROR10007; application readiness failed.

**Confirmed local backend defect:** refresh-token uniqueness is not guaranteed within the JWT time resolution; synthetic offline reproduction shows equal hashes. **Confirmed incident root cause: NOT_CONFIRMED.** The specific refresh database/cache exception and GET_ME bearer/filter/cache result are still required. They may be separate failures; do not use the refresh collision to retroactively explain the preceding 401.

**FRONTEND_DEFECT: NOT_FOUND in audited incident paths; runtime delivery NOT_VERIFIED. BACKEND_DEFECT: CONFIRMED local token-uniqueness defect; incident linkage and GET_ME cause NOT_VERIFIED.**

Implementation NONE. Existing reports remain historical evidence; this report records the newly supplied staging sequence and corrected incident priorities. Stop after this investigation.
