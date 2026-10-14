# AUTH.FIX.3 — Backend runtime evidence and root cause confirmation

Date: 2026-10-13 (Asia/Tashkent). **Diagnosis only. Implementation NONE.**

**STATUS: PARTIAL — ACCESS_REQUIRED for backend runtime investigation.** Browser-side bearer presence is now confirmed by the user's Chrome DevTools observation. No authorized gateway/auth-service logs, staging database/cache connection or incident exception summary was supplied or identified through the available access paths. No underlying backend root cause has been confirmed.

**Earliest observed failed boundary: GET_ME_AUTHENTICATION, HTTP401. Earliest confirmed internal backend failure: NOT_IDENTIFIED.** A 401 response identifies the failed request, but not where gateway forwarding, JWT validation, principal lookup or context establishment failed.

## 1. Updated incident evidence

The four preceding reports were read:

- `AUTH_CASHIER_LOGIN_AUDIT.md`
- `RBAC_PERMISSION_AUDIT.md`
- `AUTH_FIX_1_STAGING_DIAGNOSIS.md`
- `AUTH_FIX_2_TOKEN_GETME_REFRESH_AUDIT.md`

They remain historical records. This report supersedes AUTH.FIX.2's browser-header uncertainty with the new user-observed fact, without changing earlier documents or relabeling source hypotheses as runtime findings.

| Established incident fact | Evidence provenance | Current conclusion |
|---|---|---|
| CHECK_PASSWORD → DONE; tokens issued | User's authorized staging observation | PIN authentication/token issuance PASS; protected authentication not proven |
| Failing GET `/user/get-me` includes Authorization with Bearer scheme in Chrome DevTools | New user confirmation | **GET_ME_BEARER_PRESENT: YES at browser** |
| GET_ME returns HTTP401 with generic full-authentication-required message | User's staging observation | GET_ME authentication failed; valid profile unavailable |
| POST `/token/refresh` returns success=false, DB_ERROR10007 | User's staging observation | Recovery failed; exact exception/operation and refresh HTTP status not supplied |
| Frontend readiness/recovery fails | User's staging observation | No successful authenticated landing established |

No token/header value was inspected, copied, decoded or logged. No browser reinspection, login, OTP/PIN, refresh or protected staging request was performed. Browser absence of a bearer header is no longer a candidate for this observed request. Header stripping/rewriting after the browser, wrong upstream/chain, JWT validation failure, missing/unreadable principal and masked original exceptions remain unverified candidates.

**Missing GET_ME permission alone does not explain the observed 401.** The prior source audit found that an authenticated principal without GET_ME normally gets authorization denial/403, whereas this incident has not established an authenticated backend context.

## 2. Access availability and preservation

| Available-access check | Actual result | Limit |
|---|---|---|
| Local backend runtime/incident artifact filenames | No `.log`, incident, runtime or diagnosis artifact found by the targeted filename inventory | Not proof that remote logs do not exist; local source/prior audits are not runtime logs |
| Callable tools | No connected QRHub gateway, server-log, staging SQL or Redis service identified | Generic shell availability is not staging authorization/access |
| Kubernetes configuration inventory | Zero configured contexts; default kubeconfig absent | No cluster context selected or network request made |
| SSH host configuration inventory | Default SSH host config absent; no target/session supplied | No SSH connection attempted; keys/credentials were not searched |
| Observability plugin discovery | Datadog log/trace capability exists but `installed:false`; QRHub's logging provider unspecified | No connection/installation made, no Datadog data queried; an available plugin does not imply access to QRHub logs |
| Incident correlation metadata | Request IDs/time window/replicas not supplied | An operator must locate the existing requests using internal correlation; no new login needed |

**ACCESS_REQUIRED:** an authorized DevOps/backend operator must supply the sanitized incident results below or identify an already authorized read-only connection to the actual gateway/auth-service log platform and staging cache/database. No evidence suggests those access rights are available to the agent in this session. This is an access limitation, not a newly observed backend failure.

Frontend baseline: `main`, HEAD `9758dbe58c748c84f38f73b5c2280b19fc5f8cc4`; no tracked modifications, four pre-existing untracked reports under docs/audits. Merchant backend HEAD remains `894663f7337da1946c21d2003cb19018b128eb55`; pre-existing modified `.gitignore` and web-api pom.xml plus previously recorded untracked audits/tests were preserved. Only this report is added. No code, environment, role/grant, database, Redis, token storage or deployment change occurred. No instrumentation was added or deployed.

## 3. Phase A — GET_ME authentication evidence ledger

The runtime verification sequence starts immediately after the confirmed browser header. Entries below are **NOT_VERIFIED**, not negative results. Stop active investigation at the earliest confirmed failure; do not infer later stages passed or failed from that failure.

| Order / boundary | Runtime result now | Exact safe check for operator | Safe result to return |
|---|---|---|---|
| 1. Browser bearer present | **YES — CONFIRMED** | Already supplied by user; do not inspect token again | Browser bearer presence YES |
| 2. Gateway forwards header to correct upstream auth service | NOT_VERIFIED | Correlate existing GET_ME at gateway and upstream; establish header presence and preserved recognized scheme, selected upstream/replica and safe route path. Do not enable full-header logging. | Forwarded YES/NO; upstream bearer-present YES/NO; scheme-recognized YES/NO; service/replica alias |
| 3. Upstream JwtAuthenticationFilter recognizes bearer | NOT_VERIFIED | Inspect existing filter/security trace or safe debugger evidence for resolveToken outcome; do not return extracted token | Recognized YES/NO; missing/unrecognized-prefix category if applicable |
| 4. Correct JWT security filter executes | NOT_VERIFIED | Establish selected SecurityFilterChain, doFilterInternal execution, exclusion decision, servlet path and REQUEST/ERROR dispatch. Compare deployed app/shared-library versions with inspected code. | Executed YES/NO; skipped/missing/wrong-chain/context-loss category; dispatcher type |
| 5. Signature and expiry valid | NOT_VERIFIED | Read existing parser outcome/original exception category. Compare effective signing-key configuration/version agreement and clocks across issuing/validating replicas internally. | Validation PASS/FAIL; SIGNATURE/EXPIRY/MALFORMED category; key-config-compatible YES/NO; no JWT data |
| 6. Type/device/service configuration compatible | NOT_VERIFIED | Check deployed security-service and device configuration and existing validator outcome internally; do not inspect/export claim values | Token-type-valid YES/NO; device-compatible YES/NO; service-type-correct YES/NO |
| 7. Principal published by check-pin token issuance | NOT_VERIFIED | Use existing issuance/cache evidence to establish cache availability and successful publication. DONE alone is insufficient: inspected issuer skips publication if cache is null. | Publication attempted YES/NO; succeeded YES/NO; safe cache error category |
| 8. Redis principal present and readable by validating service | NOT_VERIFIED | Authorized internal inspection of the same logical principal entry, entry existence/TTL and application's typed lookup/deserialization result; no key/principal/value dump | PRESENT/MISSING; readable YES/NO; expiry/missing/type/serializer/connection category; TTL only if available |
| 9. Cache namespace/serializer/backend consistent | NOT_VERIFIED | Compare effective issuing/validating cache configuration and key algorithm internally across replicas | Namespace/key-algorithm/backend/serializer match booleans; no secrets/connection credentials/key identifiers |
| 10. Authentication context established and retained for GET_ME authorization | NOT_VERIFIED | Existing trace/debugger establishes trusted Authentication immediately before resource authorization and whether context was lost between filters | PRESENT/ABSENT; authenticated YES/NO; context-loss category |
| 11. Generic error dispatch hides original exception | NOT_VERIFIED | Correlate REQUEST and ERROR dispatch in existing logs; inspect original exception internally and return only category/class. Do not treat final entrypoint message as original cause. | Masked YES/NO; original exception class/category; no raw stack/log/parameters |

Inspection may correlate issuance, cache and request facts out of chronological order, but the causal conclusion must identify the earliest failed prerequisite supported by **runtime** evidence. If only a downstream failure is confirmed while earlier steps remain unknown, explicitly retain that limit.

Existing safe signatures to search internally, based on the cached shared implementation examined in AUTH.FIX.2: `JWT token expired`, `Invalid JWT token`, `Invalid token type`, `Invalid device type`, `Invalid session data in token`, `User session expired or not found`, and unsupported security-service-type category. Return only the constant category and exception class. Existing exception logs may contain sensitive cause details; do not paste them unfiltered or enable broad request/response logging.

The generic full-authentication-required message is compatible with an anonymous/context failure at authorization. It is not proof of gateway stripping, invalid JWT, missing Redis principal or masked error dispatch. No earliest internal cause can be selected from the currently supplied evidence.

## 4. Phase B — refresh DB_ERROR evidence ledger

This investigation is independent of GET_ME401. The known local same-second collision remains a candidate, **not** a confirmed occurrence in this incident.

| Required runtime evidence | Result |
|---|---|
| Matching existing refresh DataAccessException found | NOT_VERIFIED — ACCESS_REQUIRED |
| Exception class | NOT_VERIFIED |
| Nested cause class | NOT_VERIFIED |
| SQLSTATE, if SQL-related | NOT_VERIFIED |
| Affected table/constraint | NOT_VERIFIED |
| Repository method | NOT_VERIFIED |
| Operation SELECT/UPDATE/INSERT/COMMIT/cache | NOT_VERIFIED |
| Transaction committed/rolled back/unknown | NOT_VERIFIED |
| QpRefreshTokenRepositoryImpl.save failed | NOT_VERIFIED |
| SQLSTATE23505 and qp_refresh_token_unique | NOT_VERIFIED |
| Incident old/new refresh hashes equal internally | NOT_VERIFIED; no TRUE/FALSE evidence supplied |
| TOKEN_COLLISION_INCIDENT | **NOT_CONFIRMED** |

Operator procedure, using the original request:

1. Locate the corresponding event with constant log signature `Database exception` from ZalandoExTranslator.handleDatabaseException. Correlate it with refresh, not another concurrent database error.
2. Inspect the cause chain internally. Return exception class, nested cause class, SQLSTATE if present, safe table/constraint names, repository method, operation type and transaction outcome. Do not return SQL parameter values, token hashes, error DETAIL, personal data or a raw stack trace.
3. Determine the failing method among findStatusByTokenHash, QpUserSessionRepositoryImpl.findByPkey, QpUsersRepositoryImpl.findById, logout, findRolesAndPermissions, cache.put, save or commit. DB_ERROR10007 is a broad DataAccessException envelope; a Redis data-access failure need not have an SQLSTATE.
4. **Only if** save failed with SQLSTATE23505 and constraint qp_refresh_token_unique: verify old/new refresh-token hash equality internally and return only TRUE/FALSE. Also confirm the deployed token-generation implementation/constraint. Do not query/export raw hashes or retry refresh to reproduce it.
5. Equality TRUE plus the matching INSERT exception supports confirming the collision. FALSE or a different method/constraint requires investigating that actual failure; the local synthetic reproduction does not override runtime evidence. If historical equality cannot be established safely, leave the collision NOT_CONFIRMED.

Known source locations rechecked read-only:

- Merchant auth `src/main/java/uz/wt/qh/merchant/auth/api/repository/impl/QpRefreshTokenRepositoryImpl.java:21`: save INSERT; :35 findStatusByTokenHash; :49 logout UPDATE.
- Auth `src/main/resources/db/migration/V1__initial_schema.sql:159`: qp_refresh_token_unique UNIQUE(token_hash).
- Auth `config/JwtComponent.java:145`: local refresh generation without per-issuance jti; :43 token generation; :51 cache.put.
- AUTH.FIX.2 records the cached translator mapping and offline same-second hash-equality probe. Those are local mechanism evidence, not newly acquired staging logs.

## 5. Phase C — role and permission verification deferred

GET_ME authentication has not been understood, so no staging role/grant/database investigation was attempted ahead of Phase A. All of the following remain NOT_VERIFIED:

- Actual ROLE_MERCHANT_USER relationship and active role status.
- Actual active GET_ME permission and existing role-permission relationship.
- Server principal permissions.
- Frontend-visible permission identifiers after successful GET_ME.

Once Phase A is understood, an authorized read-only operator can return relationship-exists/active booleans, grant status and permission identifiers only. In the inspected schema the join relationship has no separate active-status column; verify relationship existence together with active role/permission status rather than inventing a join status field. Do not dump personal principal fields or change grants. Successful GET_ME evidence is needed before claiming any frontend-visible permission list; no valid profile has been supplied for this incident.

## 6. Independent corrections and confirmation gates

No incident-specific backend correction is justified as a confirmed fix yet. Apply none during this diagnostic task.

| Independent issue | Minimal correction after runtime verification | Confirmation gate |
|---|---|---|
| Gateway drops/rewrites bearer or routes to wrong protected upstream | Preserve the existing browser bearer header and correct the verified upstream route | Gateway/upstream presence/scheme/routing evidence establishes that failure |
| JWT filter/chain/context wrong | Correct only the proven deployed filter registration, exclusion, chain or context-loss behavior | Existing filter/dispatcher/context trace identifies cause |
| JWT configuration/validation mismatch | Align the proven incompatible signing/device/service/time configuration across relevant replicas | Safe parser result and internal configuration agreement checks establish mismatch |
| Principal absent/unreadable | Correct the proven publication, shared-cache namespace/backend or serializer issue; do not return successful tokens without required principal publication | Cache write/read/config evidence establishes first failure |
| Refresh collision | Add a unique random per-issuance refresh-token jti while preserving token_hash uniqueness and one-time rotation | Incident claim requires matching save/23505/qp_refresh_token_unique and equality evidence. Local design recommendation remains valid independently, but is not a confirmed incident fix. |
| Other refresh data-access failure | Correct the exact method/operation/schema/connection/cache/transaction defect shown by sanitized exception evidence | Matched cause class/SQLSTATE or non-SQL category, with transaction outcome |
| GET_ME authority absent after trusted authentication | Review intended cashier GET_ME policy and correct only an independently verified approved grant mismatch | Phase A understood and real trusted-principal/grant evidence; absence does not explain the existing401 |

The GET_ME401 cause and refresh failure may be separate. Fixing token uniqueness must not be represented as fixing the earlier401 without independent validation. Do not remove constraints, broaden cashier privileges, disable guards/refresh, clear Redis, alter database records or deploy new instrumentation as a workaround.

## 7. Exact work performed and limitations

Read the four reports and accepted the user's new browser-header observation without requesting or inspecting the header value. Recorded frontend/backend baseline, inventoried local runtime artifact filenames and access capabilities, checked Kubernetes context/default SSH configuration existence without connecting, and searched observability integrations. Rechecked relevant source locations for GET_ME authority/filter registration, principal publication and refresh operations/unique constraint.

No backend runtime request/log/SQL/Redis data was retrieved. No actual token/claim/cache/header contents were examined. No network probe, login or refresh retry was made. No new tests, instrumentation, build or deployment was performed. Existing auth tests and offline collision probe from AUTH.FIX.2 were not repeated: they cannot supply the missing runtime evidence. Previous report hashes were recorded for preservation verification.

**Final finding:** browser bearer presence YES; GET_ME401 and refresh DB_ERROR10007 remain established incident observations; gateway delivery, filter/validation/context/cache and refresh exception details require authorized operator evidence. GET_ME_ROOT_CAUSE NOT_CONFIRMED; TOKEN_COLLISION_INCIDENT NOT_CONFIRMED. Implementation NONE.
