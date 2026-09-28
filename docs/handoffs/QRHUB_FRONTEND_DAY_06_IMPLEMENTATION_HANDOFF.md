# QRHub Merchant Frontend — Day 06 Implementation Plan / Handoff

> **For agentic workers:** Use `superpowers:executing-plans` if available. Work inline with one agent. Implement only the checkpoint requested by the user, report its result, then wait for the next checkpoint instruction. Codex reads/edits frontend source, writes focused tests and updates documentation; the user runs installs, generators, lint, typecheck, tests, builds, servers and browser checks. No backend edits, external API execution, commit, push or deployment. These user workflow constraints override skill defaults about delegation, execution and commits.

**Goal:** `/devices` orqali P5 qurilmalarini ko‘rish va source bilan tasdiqlangan qurilma PIN reset oqimini qo‘shish; mavjud `/account` sahifasida faqat aniqlangan UI/accessibility kamchiliklarini tugatish.

**Architecture:** Day 05 dagi exact permission policy, SessionController, scoped ReadProvider, query keys, action registry va one-dispatch controller qayta ishlatiladi. P5 read va reset mustaqil capability/contract sifatida ulanadi. Frontend completion, backend/product contract gaplari va staging verification alohida yuritiladi.

**Tech Stack:** Mavjud package/lockfile bo‘yicha React + TypeScript + Vite, React Router, TanStack Query, Zod, Tailwind/shadcn/Radix, Lucide, Vitest va Oxlint. Existing native-fetch transport va UI primitive’lar. Framework almashtirish, yangi majburiy dependency yoki upgrade talab qilinmaydi.

**Spec:** Ushbu handoffdagi qabul qilingan Day 06 scope; latest `QRHUB_FRONTEND_DAY_05_RESULT.md`, `DAY_05_MANAGEMENT_CONTRACT.md`, `DAY_05_MANUAL_CHECKS.md`, `CONTRACT_GAPS.md`; P5 uchun `BACKEND_FRONTEND_CONTRACT_AUDIT.md`; profil uchun existing Day 02 source/contract.

**Target:** `D:\QR projects\qrhub-merchant-frontend`. Backend reference: `D:\QR projects\qrhub-merchant-service`, faqat read-only. Quyidagi implementation pathlar frontend root’iga nisbatan. Ushbu handoff actual repo kodi yoki runtime’ni tekshirganlik da’vosi emas: u berilgan yakuniy hisobotlar va auditga asoslangan. D6.0 actual fayl/symbol/signaturelarni tasdiqlaydi.

**Planning date:** 2026-09-23. **Execution mode:** boshqa chatda D6.0 → D6.7, qadam-baqadam.

## 0. Boshqa chatni boshlash

Faylni repo ichida `docs/handoffs/QRHUB_FRONTEND_DAY_06_IMPLEMENTATION_HANDOFF.md` sifatida joylashtir. Boshqa chatga ushbu fayl bilan birga eng yangi Day 05 result, management contract, manual checks, contract gaps va original backend auditni ber. Yuklangan nomlardagi `(1)`/`(2)`/`(9)` nusxa suffixlari canonical repo nomi emas; hujjat ichidagi final status va dolzarb evidence ustun.

Boshlang‘ich prompt:

```text
QRHUB_FRONTEND_DAY_06_IMPLEMENTATION_HANDOFF.md bo‘yicha ishlaymiz.
Frontend: D:\QR projects\qrhub-merchant-frontend.
Backend: D:\QR projects\qrhub-merchant-service — read-only.

Day 05 CLOSED: DAY_05_FRONTEND_COMPLETE_STAGING_PENDING.
487/487 tests, 64/64 files; lint/typecheck/build/browser/regression/isolation PASS.
Lintda faqat 2 accepted shadcn warning bor. Resolved Day 05 ishlarini qayta ochma.

Day 06: P5 list, P5 device PIN reset, existing account UI bo‘yicha zarur polish,
exact permissions, scoped lifecycle, DEV scenarios va verification docs.
AC-01 navy sidebar va qizil accentlar saqlanadi.
Staging S-01..S-04 — alohida external milestone. Production deploy scope emas.

Hozir FAQAT D6.0 ni bajar. Actual source va mavjud reusable interface’larni
o‘qi, P5 contract va evidence jadvalini yoz. To‘liq re-audit yoki refactor qilma.
Keyingi D6.1 bosqichini mening navbatdagi xabarimgacha boshlama.

Bir agent bilan ishlagin. Codex source/test/docs yozadi; command gate va
browserni men bajaraman. Install/generator/lint/typecheck/test/build/server/
browser/API requestni ishga tushirma. Backendni o‘zgartirma; commit/push/deploy yo‘q.
Read-only file/search/git status/diff ishlari mumkin; secret qiymatlarini chiqazma.
Source-backed fakt, frontend implementation va runtime verificationni ajrat.
Oxirida qisqa o‘zbekcha checkpoint natijasi, changed files, kerakli user-run
commandlar va keyingi bosqichga ta’sir qiladigan gaplarni ber. PASSni taxmin qilma.
```

Agar boshqa chat faqat matn bilan ishlasa va repoga kira olmasa, D6.0 uchun kerakli aniq fayl/symbol qismlarini so‘rasin; butun repoga oid taxminiy code patch yozmasin. Mavjud hisobotdan olinadigan ishni tugatsin, yangi kontraktga bog‘liq qismini aniq ajratsin. Codex workspace’iga kira olsa, fayllarni o‘zi topadi.

Har checkpointdan keyin quyidagi format ishlatiladi:

```text
CHECKPOINT: D6.n
IMPLEMENTATION: COMPLETE | PARTIAL | CONTRACT_GATED | NOT_STARTED
CHANGED_FILES: actual paths
SOURCE_EVIDENCE: actual paths/symbols, brief finding
VERIFICATION: NOT_RUN | user-reported result
FRONTEND_REMAINING: exact unblocked work or NONE_FOUND
EXTERNAL_GAPS: IDs and affected feature only
NEXT: next checkpoint and its prerequisite
```

Keyingi bosqich prompti: `D6.0 natijasini hisobga olib, handoffdagi FAQAT D6.1 ni bajar. Oldingi yopilgan ishlarni qayta ochma. Xuddi shu execution cheklovlari saqlanadi.` Bosqich raqamini almashtirib davom et. Checkpoint davomida har kichik fayl uchun alohida tasdiq so‘ralmaydi.

## 1. Qabul qilingan baseline

| Band | Day 06 da saqlanadigan holat |
|---|---|
| Day 05 | `DAY_05_FRONTEND_COMPLETE_STAGING_PENDING`; D5.0–D5.7 COMPLETE |
| Command evidence | Lint PASS, 0 errors, 2 accepted shadcn warning; typecheck PASS; 487/487 tests, 64/64 files PASS; build PASS |
| Manual evidence | Day 05 browser, 390px, desktop, keyboard/focus, D2/D3/D4 regression, DEV no-real-backend-network va production isolation PASS |
| Frontend defects | Day 05 final audit: `NONE_FOUND`; bu yangi Day 06 kodining tekshirilganini anglatmaydi |
| Tayyor ekranlar | Dashboard/dynamic QR, supported D4 actions/static QR, terminals, bank accounts, cashiers/list/create/assign/unassign, existing auth/account |
| Design | AC-01 navy sidebar, light workspace, red primary accent, existing responsive/accessibility patterns |
| Staging | `NOT_RUN / STAGING_PENDING`; frontend completiondan alohida |
| Deployment | `OUT_OF_SCOPE; TEAM_LEAD_DECISION` |

Day 05’da assign ADDITIVE ekanligi source bilan tasdiqlangan. Uni yana noma’lum biznes qoida deb ochma. Cashier void-success conservative decoder, active membership unassign, route/nav/returnTo, optional lookup guards va DEV isolation tugagan. Eski intermediate hisobotlarni final statusga qarshi yangi vazifa sifatida ishlatma.

### 1.1 Carry-forward gaplar — yangi frontend vazifasi emas

| Gap | Saqlanadigan chegara |
|---|---|
| D5-01_TERMINAL_PAGE_CARDINALITY | Server rows/order/metadata saqlanadi; frontend dedupe yoki total qayta hisoblash yo‘q |
| D5-02_CASHIER_ACTIVE_FILTER | Filter match active membership isboti emas; unassign faqat current ACTIVE nested pair uchun |
| D5-03_ASSIGN_PARTIAL_OUTCOME | Bitta bulk dispatch; atomicity taxmin qilinmaydi; replay/optimistic bulk success yo‘q |
| D5-04_VOID_ERROR_WIRE | Explicit-null success konservativ talqin qilinadi; deployed wire/error behavior tasdiqlanmagan |
| D5-05_STATUS_LABELS | Per-entity to‘liq status vocabulary yo‘q; unknown kod neutral |
| S-01…S-04 | Gateway/base, CORS, actual account grants, runtime outcomes — external milestone |

Oldingi D4 gate’lar ham saqlanadi: currency schema C-01a resolved; Core currency semantics C-01b sabab live QR create port null; B-06 sabab production cancel gate yopiq; B-09 sabab live returned-link policy yopiq; B-08 sabab static QR preview/copy/link semantics ochilmagan. P5 permissioni bu actionlarni ochmaydi. D6’da yangi kod sabab aniq regression chiqsa, shu o‘zgarish doirasida tuzat; unrelated re-audit boshlama.

## 2. Day 06 scope va API chegarasi

| Feature | Route / endpoint | Authority | Natija |
|---|---|---|---|
| P5 list | UI `/devices`; `GET /p5/get-all` | `GET_P5` | Paginated device list, supported filters/search |
| P5 PIN reset | Row confirmation; `POST /p5/reset-pin/{deviceId}` | `RESET_P5_PIN` | Body yo‘q; auditda success envelope `data=null` |
| Merchant lookup | Existing `GET /dropdown/merchants` | `GET_DROPDOWN_MERCHANTS` | Optional list filter; reuse |
| Terminal lookup | Existing `GET /dropdown/terminals` | `GET_DROPDOWN_TERMINALS` | Optional merchant-scoped filter; reuse |
| Profil | Existing `/account`; `GET /user/get-me` | Existing `GET_ME` policy | Existing authenticated profile snapshot, read-only |

Endpointlar controller-relative. Existing web/auth base resolver ishlatiladi; gateway prefix hardcode qilinmaydi. Auth va web bazalarini almashtirma. External P5 API’ga brauzerdan bevosita murojaat yo‘q; uning API key’i backendda qoladi.

Ichki capability sifatida existing `p5.read` ishlatiladi; reset uchun actual naming’ga mos `p5.resetPin` qo‘shilishi mumkin. Bu frontend nomlari server authoritylarining o‘rnini bosmaydi. `GET_P5` va `RESET_P5_PIN` alohida exact grantlar; role nomidan huquq hisoblanmaydi.

Auditdagi list query: `merchantId?`, `terminalId?`, integer `status?`, `search?`, `page`, `size`; default page 0, size 10. DTO: `deviceId`, `description`, `deviceStatus`, terminal fieldlari, `merchantName`, static QR fieldlari, `createdAt`. D6.0 exact wire type/nullability, field nomlari va SQL predicatesni source’da tekshiradi.

Scope tashqarisi: device create/edit/delete/reboot, online telemetry/last-seen, bulk reset, yangi PIN kiritish/ko‘rsatish, device pairing, P5 API-key boshqarish, yangi QR preview/copy/link action, profile edit/password/authenticated login-PIN settings, role editor, notifications, refund/settlement, yangi analytics yoki full redesign. Day 07 implement qilinmaydi.

## 3. Global constraints

- Actual project instructions, package scripts, lockfile va user o‘zgarishlarini saqla. Repo mavjudligini tekshirmasdan git diff/commit dalili yozma; git init kerak emas.
- Mavjud `SessionController.protectedRead` safe GET uchun bounded refresh/replayni boshqaradi. `protectedMutation` write dispatchdan oldin refresh qiladi; yuborilgan write qayta yuborilmaydi. Yangi interceptor/refresh loop yaratma.
- Scope: existing `source + sessionScopeId + permission-content accessRevision`. Token rotationni permission revision deb hisoblama. Token, PIN, OTP, refreshToken query key, log, URL, DOM yoki storagega kirmaydi.
- Access/refresh tokenlar RAM-only. Existing device identity/lease storage istisnosini kengaytirma. P5 PIN yoki API key uchun frontend `.env`, `VITE_*`, browser storage yoki fixture yo‘q.
- Existing action registry va `createOneDispatchAction` ishlatiladi; boshqa mutation engine, offline write queue yoki persisted intent qo‘shilmaydi.
- Unauthenticated/bootstrapping/403/unavailable states existing policy bilan qoladi. Action yo‘qligi P5 readni, optional lookup yo‘qligi unfiltered readni bloklamaydi.
- Shared modullar feature/dev modullarini import qilmaydi. DEV data faqat DEV lazy boundary ichida. Live failure demo fallbackga o‘tmaydi.
- UI’dagi har qanday ma’lumot server/user scope bilan bog‘liq. Merchant/terminal tanlash ownership isboti emas; backend JWT va membership tekshiruvlari authoritative.
- New warning yoki runtime error tuzatiladi; faqat mavjud `button.tsx`/`badge.tsx`dagi ikki accepted warningni bartaraf qilish uchun unrelated refactor kerak emas.
- Source contract, frontend code completion, local verification va deployed evidence alohida. D5’dagi 487/64 sonlarini D6 verification deb ko‘chirma.

### 3.1 Existing fayl/interface xaritasi

Quyidagi existing pathlar Day 05/Day 02 hisobotlaridan olingan. D6.0 actual eksport va signaturelarni aniqlaydi, code ularni takror yaratmaydi.

| Existing joy | Qayta ishlatiladigan mas’uliyat |
|---|---|
| `src/shared/auth/access.ts` | `capabilities`, `verifiedAuthorityMap`, `can` — exact authority |
| `src/shared/contracts/endpoints.ts` | `endpoints`, `EndpointDescriptor`; P5 descriptors |
| `src/app/live-route-policy.ts` | `liveFeatureRouteDefinitions`, `decideLiveFeatureRoute`, `isLiveRouteAccessible` |
| `src/app/LiveRouter.tsx`, `navigation.ts`, `safe-return-to.ts` | Lazy route, ready/scheduled navigation, exact return targets |
| `src/app/read/ReadProvider.tsx` | `getCurrentState`, synchronous `getCurrentScope`, `requiredCapabilities` |
| `src/app/read/createLiveReadApi.ts` | `createLiveReadApi`, `ReadApiRegistrations`, protected read adapter |
| `src/app/read/read-runtime.ts` | `createReadRuntime`, `cleanupReadQueries` |
| `src/shared/api/read-keys.ts` | `readKeys`, `isReadQueryKey`; P5 namespace lifecycle |
| `src/shared/auth/session-controller.ts` | `SessionController.protectedRead/protectedMutation` |
| `src/shared/api/one-dispatch-action.ts` | `createOneDispatchAction`, `createActionRegistry`, `invalidateAfterConfirmed` |
| `src/app/read/useScopedActionRegistry.ts` | Intent lifetime across panel/page replacement; scope cleanup |
| `src/shared/contracts/management-read.ts`, `management-filters.ts` | Existing page/ID/filter patterns; merchant/terminal lookup projection |
| `src/shared/contracts/terminal-lookup.contract.ts`, `merchant-read.ts` | Existing terminal decoder, no-parent API va merchant-scoped API |
| `src/features/account/AccountPage.tsx`, existing auth provider/hooks | Profile snapshot va account presentation |
| `src/app/layout/LiveShellLayout.tsx` | AC-01 shell; yangi nav item existing composition orqali |

Taklif etiladigan yangi fayllar — actual ekvivalenti bo‘lsa shu faylni kengaytir, parallel modul yaratma:

| Proposed path | Mas’uliyat |
|---|---|
| `src/shared/contracts/p5-read.ts` | Wire → minimal normalized page; status/ID/date guards |
| `src/shared/contracts/p5-filters.ts` | Exact query subset, draft/applied validation |
| `src/features/p5/P5Page.tsx`, `P5Results.tsx` | Filter/pagination va table/mobile presentation |
| `src/features/p5/p5-reset.ts`, `P5ResetDialog.tsx` | Existing controllerga P5 binding, eligibility, confirmation |
| Colocated `*.test.ts` / existing component test convention | New contract va feature wiring tests |
| `src/dev/day6/` | Isolated scenario data, fake read/reset ports, counters, pages |
| `docs/contracts/DAY_06_P5_CONTRACT.md` | Source ledger + reset semantics + frontend decisions |
| `docs/verification/DAY_06_MANUAL_CHECKS.md` | Reproducible scenarios, commands, actual evidence |
| `docs/handoffs/QRHUB_FRONTEND_DAY_06_RESULT.md` | Checkpoint, feature, verification, gap closeout |

## 4. Review focus va P5 biznes qoidalari

Quyidagi besh failure class uchun tegishli checkpointda test/evidence bo‘lishi shart:

1. Reset dispatchdan keyin javob yo‘qolishi: status listdan taxmin qilinmaydi; no replay. D6.3 va D6.5.
2. Confirmation ochiq/pending paytda permission/session/row o‘zgarishi: boshqa scopega effect va ikkinchi dispatch yo‘q. D6.2–D6.3.
3. Merchant/terminal lookup kechikishi yoki yo‘qolishi: eski option yangi parent uchun ishlamaydi; unfiltered read mustaqil. D6.1–D6.2.
4. Unknown/null status, noto‘g‘ri ID yoki duplicate row: o‘qish va action xavfsizligi ajratiladi; soxta empty/success va taxminiy eligibility yo‘q. D6.1–D6.3.
5. DEV fixtures/profile eski scopedata’si production yoki yangi sessionga chiqishi: DEV/livesource va cache lifecycles ajratilgan. D6.4–D6.6.

### 4.1 List va filter

- `status` request filtri va `deviceStatus` response maydoni boshqa nomlar. Static QR statusi qurilma statusi yoki reset eligibility emas.
- Source to‘liq enum bermasa UI’da neutral `Holat: 777` kabi kod ko‘rsatiladi; `online`, `offline`, `blocked` yoki yashil active label taxmin qilinmaydi.
- Status filter to‘liq enum bo‘lmasa, optional integer-code field bo‘lsin: label `Holat kodi`, bo‘sh qiymat — hammasi. Faqat source’da isbotlangan ma’nolar select labeliga aylanishi mumkin. `0` falsy deb yo‘qolmasin. Integer interval backend Java type asosida tekshiriladi.
- Queryga unknown `sort`, `fromDate`, `toDate`, `regionId`, `deviceStatus` yoki frontend-only scope fieldlari qo‘shilmaydi. Bo‘sh optional parametrlar yuborilmaydi.
- Page 0/size 10; projectdagi 10/25/50 convention sourcega mos bo‘lsa saqlanadi. Apply/clear/size change page0ga qaytaradi. Server rows/order/total saqlanadi; current-page filtering yoki totalni qayta hisoblash yo‘q.
- Merchant lookup va terminal lookup mustaqil optional grantlar. Granted unfiltered P5 list lookup denied bo‘lsa ham ishlaydi; lookup subseti qaytgan P5 rowlarni o‘chirib tashlash uchun ishlatilmaydi.
- Selected merchant/terminal faqat current scoped options bilan tasdiqlanadi. Merchant draft o‘zgarsa terminal draft tozalanadi. Invalid applied selection filtered queryni alohida paused keyga o‘tkazadi va oldingi rowsni yashiradi; explicit Clear yoki valid Apply orqali chiqiladi. Filter avtomatik olib tashlanib kengroq GET yuborilmaydi.
- List joinlari duplicate deviceId keltirishi mumkinligini source’da tekshir. Rows dedupe qilinmaydi. UI key row occurrence uchun unique bo‘lishi mumkin; action identity esa deviceId+scope, index emas. Bir xil IDdagi conflicting eligibility fields bo‘lsa resetni block qil, data gapni yoz.
- DeviceId opaque identifier: wire turi isbotlansin; string bo‘lsa case/leading zero saqlansin, numeric bo‘lsa safe integerdan keyin normalize qilinsin. UUID/32-hex taxmini yo‘q. Path bir segment sifatida existing encoder orqali encode qilinadi; raw interpolation yoki double encoding yo‘q.
- `createdAt` uchun existing offsetless/date policy qayta ishlatiladi; taxminiy `Z`, client-timezone konversiyasi yoki last-seen ma’nosi qo‘shilmaydi. Static QR link bu scope’da action/preview sifatida ishlatilmaydi.

### 4.2 Reset eligibility va access

Audit user-terminal membership + local status0 tekshiruvini qayd etgan. D6.0 actual SQL/service’da qaysi status field va qaysi entity tekshirilishini aniqlaydi. Faqat uning P5 row `deviceStatus`ga mosligi isbotlansa frontend status0ni local eligibility sharti qiladi. To‘liq status vocabularyni buning asosida yaratma.

Reset uchun barchasi zarur: existing authenticated session; current granted P5 read orqali olingan target; exact reset grant; configured reset contract/port; current source-backed eligibility; shu scope/device uchun pending yoki unresolved intent bilan conflict yo‘qligi. Lookup grant reset sharti emas. Current row backendning so‘nggi authorization tekshiruvini almashtirmaydi.

| Grants / readiness | Kutiladigan UI va transport |
|---|---|
| GET_P5 bor, RESET_P5_PIN yo‘q | List ishlaydi, reset control yo‘q, reset dispatch0 |
| Ikkalasi bor, reset contract tayyor | Eligible current rowda confirmation ochiladi; POST faqat explicit confirmdan keyin |
| RESET_P5_PIN bor, GET_P5 yo‘q | Row-based P5 route ochilmaydi; reset0. Qo‘lda deviceId kiritadigan bypass sahifa yo‘q |
| List bor, optional lookup yo‘q | Unfiltered list ishlaydi; lookup-dependent filter unavailable |
| List bor, reset contract blocked | List ishlaydi; xavfsiz mavjud state component bilan reset unavailable; reset0 |
| Unknown/null/ineligible status | Listdagi neutral state saqlanadi, reset yuborilmaydi |
| Faqat D4/D5 grants | P5 read/reset ochilmaydi |

### 4.3 Reset lifecycle va natija

1. Row action faqat dialog ochadi; hech qanday write yubormaydi. Dialogda qurilma IDsi, mavjud description/terminal nomi va `Qurilma PIN’ini reset qilish` niyati aniq.
2. `Bekor qilish` — dispatch0. Yangi PIN fieldi, OTP, login PIN yoki default PIN yo‘q. Tasdiqlash tugmasi `PIN resetni tasdiqlash`.
3. Confirmdan oldin va session preflight tugab transportga o‘tishdan oldin current scope, grant, target, visible-row eligibility va intent recheck qilinadi. Eski captured React propsning o‘zi yetmaydi.
4. Bitta explicit intent — ko‘pi bilan bitta `POST /p5/reset-pin/{deviceId}`, body yo‘q. Double click, Enter, dialog remount yoki 401/network timeout write’ni replay qilmaydi. Client idempotency header o‘ylab topilmaydi.
5. Dispatchdan oldingi validation/permission/target change — write0. Dispatchdan keyingi cancellation/unmount request serverda bekor bo‘lganini isbotlamaydi; old-scope natija yangi UI/cachega tegmaydi.
6. P5 source/shared envelope isboti shu shaklni tasdiqlasa, faqat `success=true` va **own** `data:null` confirmed. HTTP200, `message`, truthy object, missing `data` yoki `undefined`ning o‘zi confirmed emas. P5 actual documented contract boshqacha bo‘lsa D6.0 da dalil bilan moslashtir; tolerant guessed decoder yo‘q.
7. Response yo‘q/malformed yoki mapped bo‘lmagan post-dispatch failure — `UNKNOWN`. Texnik xabarni foydalanuvchiga raw chiqazma. Explicit rejection faqat source-backed no-side-effect error classification bo‘lsa ishlatiladi; DEV synthetic rejection deployed schema dalili emas.
8. Confirmed message D6.0 tasdiqlagan server success semantikasiga mos: device yangi PIN olganini, PIN qiymatini, SMS yetganini, reboot yoki logout bo‘lganini dalilsiz va’da qilma. Source synchronous muvaffaqiyatni tasdiqlasa `PIN reset so‘rovi muvaffaqiyatli bajarildi.`; faqat qabul qilishni tasdiqlasa `PIN reset so‘rovi qabul qilindi.` ishlatiladi. Qabul qilish qurilmada yakunlanganini anglatmaydi.
9. Confirmed-only invalidation current-scope P5 list variantsga tegadi; reset tasdiqlangani refetch fail bilan UNKNOWNga qaytmaydi. Dashboard, auth profile, cashiers va bank listlarini global invalidate qilma. Scope change paytidagi existing all-read cleanup siyosati saqlanadi.
10. **P5 GET ro‘yxati reset receipt emas.** O‘zgarmagan/yangilangan status yoki createdAt reset bajarilganini isbotlamaydi. Manual read UNKNOWNni CONFIRMEDga aylantirmaydi. Automatic retry/reconcile/polling endpoint yo‘q.
11. Pending/UNKNOWN intent dialog close/reopen yoki route qaytishidan keyin registry orqali esda qoladi. Pending paytda yangi same-device intent bloklanadi. UNKNOWNdan keyingi yangi reset faqat explicit yangi niyat va qayta confirmation bilan; UNKNOWNni oddiy Retry orqali yashirib yuborma. Existing policy ruxsat bersa avval `Avvalgi reset natijasi noma’lum. Takrorlash yangi reset so‘rovini yuboradi.` degan acknowledgement talab qil. Bu oldingi intentni CONFIRMED yoki REJECTED qilmaydi. Reload RAM intentni yo‘qotadi — bu known limit, persistent write queue qo‘shish sababi emas.

## 5. D6.0 — Targeted contract va reuse inventory

**Natija:** `DAY_06_P5_CONTRACT.md`, aniq P5 descriptor/capability qarorlari va keyingi checkpointlar uchun file/interface map. Bu bosqich yangi page yoki live reset transportni ulamaydi.

**Files:** o‘qish — latest D5 docs, original audit, yuqoridagi existing map, backend P5 controller/service/repository/DTO/security/RestConfig; yozish — P5 contract, kerak bo‘lsa inert access/endpoint descriptors va tegishli exact mapping testi; mavjud gap hujjati.

**Consumes → produces:** latest source/docs → `SOURCE_CONFIRMED / SOURCE_PARTIAL / CONTRACT_BLOCKED` per read/reset, actual reusable signatures va proposed P5 binding names. Quyidagi source topiladigan nomlar qidiruv boshlanishi, ularning mavjudligini oldindan da’vo qilma.

- [ ] **D6.0.1** Frontend root, repo instructions, package.json, actual source layout va user diffni tekshir. Source yo‘q bo‘lsa aynan kerakli faylni belgila; yangi project yaratma.
- [ ] **D6.0.2** `P5Resource`, `P5Service`, `P5ServiceImpl`, `P5RepositoryImpl`, `P5DTO`, security authority, PageResponse va existing shared envelope dalillarini top. Backend root: `qh-merchant-web-api/src/main/java/uz/wt/qh/merchant/web/api/`; actual symbol farqi bo‘lsa hujjatga yoz.
- [ ] **D6.0.3** List field/type/nullability/alias/ID, exact query param type, search predicate, sort, membership join, list/count cardinality, status projectionni yoz. Search qaysi fieldni qamrashini frontend labeli va testga bog‘la.
- [ ] **D6.0.4** Reset chainni tracing qil: deviceId lookup, ownership/member/status predicate, external client request, success tekshiruvi, possible local update, exception propagation va merchant envelope. Source async qabul qilish bilan yakunlanadimi yoki remote successni tekshiradimi — ajrat. Reset natijasidagi PIN qiymati/sms/user action haqida dalilsiz xulosa yo‘q.
- [ ] **D6.0.5** Existing shared 1.0.77/javap va D5 envelope dalilidan foydalan. Resolved schema uchun takror artifact talab qilma. Yangi bytecode extraction kerak bo‘lsa userga aniq command ber; backend build/API yoki secret config qiymatini chiqarma.
- [ ] **D6.0.6** Inventory’da existing `protectedMutation`, action registry, read scope, invalidation, route readiness va AccountPage interface’larini actual symbol bilan qayd et. P5 qo‘shilganda barcha `ReadApiRegistrations` implementorlari/old DEV stub’lar qayerda yangilanishini sanab chiq.
- [ ] **D6.0.7** Faqat yangi P5 muhim gap uchun D6 prefiksli band qo‘sh; gap sabab qaysi control/adapter yopilishini aniq yoz. To‘liq status label yoki staging yo‘qligi butun listni bloklamaydi.

Contractda har row: `question | source path + symbol | evidence | frontend decision | unresolved owner/closure evidence`. Raw config secret/token/customer ma’lumotini qo‘shma.

Readiness qarori: local merchant API orqali niyat/request/success/authorization chain tasdiqlansa reset adapterini configured qilish mumkin. Tashqi servisning barcha ichki implementatsiyasi yoki idempotency guarantee yo‘qligi avtomatik global block emas. Muhim success/target/eligibility ma’nosi aniqlanmasa aynan reset contract gate yopiladi; normalized UI/controller/DEV/testlar davom etadi.

**Acceptance:** P5 read/reset va profile statuslari ajratilgan; old D5 gaps qayta ochilmagan; keys/signaturelar qayd etilgan; source dalili runtime PASS deb yozilmagan. Faqat docs o‘zgarsa command gate shart emas; inert mapping code yozilsa tegishli test commandini userga ber.

## 6. D6.1 — P5 decoder, filters va scoped read

**Natija:** P5 normalized boundary va guarded read wiring; hali yangi sahifa talab emas.

**Files:** `p5-read.ts`, `p5-filters.ts`, colocated tests; existing read registry/provider/keys/runtime; actual endpoint descriptor. Existing no-parent terminal lookup signature/behavior saqlanadi.

**Consumes → produces:** D6.0 wire ledger + shared envelope/page/scoped transport → normalized P5 page, exact serialized query va protected `p5List` read binding. Nomi existing convention bilan farqlansa bir xil actual nom contract va testsda ishlatiladi.

- [ ] **D6.1.1** Source-confirmed minimal valid envelope/page fixture va nullable/unknown/bad-required fixturesni yoz. Sensitive yoki real device ma’lumoti o‘rniga aniq synthetic qiymat ishlat.
- [ ] **D6.1.2** Decoderda critical identity/page fieldsni validatsiya qil. Optional presentation text yo‘q bo‘lsa placeholder uchun null; nullable/unknown status rowni o‘qiladigan qoldirishi mumkin, lekin resetni eligible qilmaydi. Critical malformed rowni silently tashlab valid emptyga aylantirma.
- [ ] **D6.1.3** Serializerda faqat source subsetni chiqaz; whitespace search trim, empty optional omission, integer status0, page/size guards. Status input integer-stringni backend intervalga tekshir; string `0` yuboriladi. Device ID formatini bu filterga noto‘g‘ri qo‘llama.
- [ ] **D6.1.4** Draft/applied helpersni existing management pattern bilan ulang: dependent terminal reset, validation, Apply/Clear/page/size. Direct URL query state qo‘shish talab emas; agar projectda mavjud bo‘lsa xuddi shu validator bilan raw inputdan requestni saqla.
- [ ] **D6.1.5** `p5List` va optional existing lookup portlari exact capability/registration bilan ishlasin. Keysga source/session/accessRevision/applied filters kirsin. Denied/paused read alohida key/state bilan stale data ko‘rsatmasin.
- [ ] **D6.1.6** P5 namespace cleanupni existing lifecyclega ulang; old simulator interface’lariga inert unavailable registration zarur bo‘lsa qo‘sh. Ularni active grant/real backend transport bilan to‘ldirma.
- [ ] **D6.1.7** Targeted contract/filter/scope testlarini user-run qilish uchun command ber; old core testlarni mazmunsiz nusxalama. Source read va user-run resultsni ajratib yoz.

Proposed serializer assertion misoli; actual import/type D6.0 da tanlangan signaturega mos bo‘ladi:

```ts
const q = new URLSearchParams(serializeP5Filters({
  merchantId: undefined,
  terminalId: undefined,
  status: 0,
  search: '  demo  ',
  page: 0,
  size: 10,
}));
expect(Object.fromEntries(q)).toEqual({
  status: '0', search: 'demo', page: '0', size: '10',
});
expect(q.has('deviceStatus')).toBe(false);
expect(q.has('sort')).toBe(false);
```

`serializeP5Filters` bu handoffdagi proposed pure function nomi; return turi string/URLSearchParamsdan existing conventionga mos bittasi tanlanadi. Empty/raw draft validation alohida; wirega yuboriladigan input allaqachon normalized bo‘ladi.

**Acceptance:** Grant/readiness yo‘q bo‘lsa P5 GET0; status0 saqlanadi; query faqat ruxsat etilgan parametrlar; old scope response yangi cache/UIga o‘tmaydi; lookup deny unfiltered readni to‘xtatmaydi.

## 7. D6.2 — `/devices` list, routing va presentation

**Natija:** Existing LiveShellLayout ichida P5 qurilmalar sahifasi; read-only holatda ham to‘liq ishlaydi.

**Files:** `P5Page.tsx`, `P5Results.tsx`; live route policy/router/navigation/returnTo; focused route/filter/selection tests. Reset binding hali ulanmaydi.

**Consumes → produces:** D6.1 scoped page + existing lookups → `/devices`, current scoped selected row va read states. Row selection action uchun safe target bo‘ladi, storage/route state’da saqlanmaydi.

- [ ] **D6.2.1** `/devices`ni existing route-lazy pattern bilan qo‘sh. Exact `p5.read / GET_P5` va list registration readiness; reset/lookup/account role shartlari routega qo‘shilmaydi.
- [ ] **D6.2.2** `P5 qurilmalari` nav item, active state va exact safe-return targetni shu policy bilan ulang. `/p5` parallel route yoki `/dev/day6/*` return allowlist yo‘q.
- [ ] **D6.2.3** Merchant/terminal/status/search form, Apply/Clear va paginationni ulang. Search helper text D6.0 SQL daliliga mos bo‘lsin; unsupported field bo‘yicha qidirish va’dasi yo‘q.
- [ ] **D6.2.4** Columns: deviceId, description, terminal, merchant, neutral deviceStatus, mavjud createdAt. Long ID/description wraps; missing optional text `—`; server count/pagination authoritative. Static QR URLni active anchor/copy/QRga aylantirma.
- [ ] **D6.2.5** Loading, empty, read error/retry, contract-data error, no-access va unavailable statesni existing komponent bilan ko‘rsat. Initial missing data `0 devices` emas; failed read rowsni empty success qilib bermaydi.
- [ ] **D6.2.6** Current row selectionni source/session/accessRevisionga bog‘la. Page/filter change, row yo‘qolishi/ambiguous bo‘lishi, grant loss yoki scope change confirmation targetni yaroqsiz qiladi. Matching old IDning o‘zi eski eligibilityni saqlashga yetmaydi.
- [ ] **D6.2.7** 390px uchun container/table overflow va form labelsni source’da tekshir; keyboard-friendly controls ishlat. Actual browser PASS faqat userdan keladi. Focused route/nav/filter testsni yoz.

**Acceptance:** Direct URL va nav bir xil access; unfiltered list optional grantlarsiz ishlaydi; unauthorized reads0; selected target boshqa page/scopega ko‘chmaydi; AC-01 o‘zgarmagan.

## 8. D6.3 — P5 PIN reset action

**Natija:** Source-backed yoki aniq contract-gated reset flow, real shared lifecycle reuse bilan. Reset listdan mustaqil readinessga ega.

**Files:** `p5-reset.ts`, `P5ResetDialog.tsx`, focused tests; existing composition/controller binding. Auth reset-PIN sahifasi va D5 mutationlar qayta yozilmaydi.

**Consumes → produces:** D6.0 reset ledger, D6.2 current target, SessionController/action registry → P5 reset intent + semantic outcome + confirmed-only P5 invalidation.

- [ ] **D6.3.1** Exact reset capability, port readiness, verified status projection va current rowga asoslangan eligibility helperni yoz. Status0 qaysi fieldga tegishli ekanligi tasdiqlanmasa helperni taxmin bilan ochma.
- [ ] **D6.3.2** Existing registryda key scope+deviceId+operation bilan yuritilsin; row index/dialog component lifecycle keyi emas. Same-device duplicate rows ikkita independent pending reset yaratmasin.
- [ ] **D6.3.3** Protected mutation adapter endpoint pathini encode qilib POST yuborsin; body, PIN, merchantId yoki terminalId payloadga kiritilmaydi. Bu IDlar UI display/guards uchun bo‘lishi mumkin, audited requestga qo‘shilmaydi.
- [ ] **D6.3.4** Dialog confirmation va pending/outcome statesni §4.3 bo‘yicha ulang. Submit disabled bo‘lishidan tashqari controller synchronous double-dispatch guard ham ishlasin. Preflightdan keyingi access/target check test qilinsin.
- [ ] **D6.3.5** Exact supported void-successni confirmed qil; lost/malformed/unmapped outcome UNKNOWN. No PIN display, no assumed reset timestamp, no auto retry va no optimistic row status change.
- [ ] **D6.3.6** Confirmed outcome current-scope P5 list variantsini invalidate qilsin. Invalidation callback current scopega mos bo‘lmasa no-op; read-refetch fail confirmed actionni pasaytirmasin.
- [ ] **D6.3.7** Pending close/reopen, permission loss, logout/session switch, stale completion va UNKNOWN/new-intent policylarini existing lifecycle yordamida yakunla. UNKNOWN holatda oddiy list Refresh natijani aniqlamaydi.
- [ ] **D6.3.8** Tests: confirm/cancel, exact path/no-body, missing/reset-only permission, ineligible/unknown status, double submit/remount, preflight scope loss, post-dispatch unknown, explicit-null success, refetch fail, same-ID duplicate, late old-scope response.

Request testida spy network boundaryda method `POST`, encoded path va `body === undefined`ni tekshiradi. Result testida `success:true` bilan `data:null` success bo‘lsa ham missing `data`, `data:undefined`, `data:{}`, `success:false` confirmed bo‘lmasin. Actual envelope helper P5ga mosligi D6.0da tasdiqlangan bo‘lishi shart.

**Acceptance:** Dispatch 1 yoki aniq pre-dispatch deny bo‘lsa 0; no replay. GET status o‘zgarishi reset success isboti bo‘lmaydi. Material gap bo‘lsa reset port closed, UI/test/DEV flow tayyor, list ochiq qoladi. Backend javobining barcha ichki code’larini taxminan map qilish talab emas.

## 9. D6.4 — Existing `/account` uchun zarur polish

**Natija:** Mavjud read-only profil sahifasi scopega mos va foydalanishga qulay. Talablar allaqachon bajarilgan bo‘lsa `COMPLETE_NO_CHANGE_REQUIRED` bilan yopiladi.

**Files:** existing `src/features/account/AccountPage.tsx`, shared presentation primitives va faqat zarur tests. Yangi parallel ProfileProvider yoki get-me request layer yo‘q.

**Consumes → produces:** Existing authenticated get-me snapshot → read-only profile presentation; auth bootstrap/session/grant policy unchanged.

- [ ] **D6.4.1** Current AccountPage’ni o‘qi va faqat real gaplarni qisqa sanab chiq: long fullname/phone wrapping, label/focus, loading/error/empty distinction, stale profile loss. Gap bo‘lmasa kodni o‘zgartirma.
- [ ] **D6.4.2** Source tasdiqlagan fullname/phone kabi existing profile fieldsni ko‘rsat. Unknown optional display fielddan xayoliy default yasama. Role label mavjud bo‘lsa authority grant hisoblash uchun ishlatma; raw permissions/debug/session/tokenlar merchant UIga qo‘shilmaydi.
- [ ] **D6.4.3** Existing logout control va permission behaviorni saqla; profile refresh bo‘lsa existing session-controller yo‘lidan yursin. Render/mount uchun redundant get-me GET yoki parallel auth query yaratma.
- [ ] **D6.4.4** Device PIN reset actionini `/account` login PIN actioniga aylantirma. Profile edit, password/PIN settings, OTP invitation yoki token-storage o‘zgarishi yo‘q.
- [ ] **D6.4.5** Faqat o‘zgargan behaviorga meaningful test qo‘sh. Pure spacing/copy tweak uchun implementationni takrorlovchi test kerak emas; user-run 390px/keyboard check yetarli. Session clear yoki profile leak regression bo‘lsa existing lifecycle testini kengaytir.

**Acceptance:** Account P5 grantlaridan mustaqil; existing session ownership/access o‘zgarmagan; yangi request/secrets yo‘q. Yopish uchun sun’iy feature qo‘shilmaydi.

## 10. D6.5 — DEV scenario va integration-test surface

**Natija:** Backendga ulanmasdan P5 list/reset va zarur account presentationni user tekshira oladi.

**Files:** `src/dev/day6/`, existing DEV lazy AppRouter boundary, focused boundary/integration tests; manual checklistning scenario bo‘limi.

**Consumes → produces:** Real normalized decoder/feature controller/UI interfaces → injected deterministic fake ports. Global fetch, live bearer yoki production auth policy patch qilinmaydi.

- [ ] **D6.5.1** `/dev/day6/devices` route’ini faqat `import.meta.env.DEV` lazy import branchga qo‘sh. Production LiveRouter’da DEV import yo‘q. Normal mode va failure mode bir xil feature/controllerni ishlatadi.
- [ ] **D6.5.2** Kamida 12 ta synthetic row bilan size10/page2 ssenariyini yarat; known/unknown/null status va uzun matnlarni qamra. Contract fixturelar D6.0 verified wirega mos, synthetic rejection alohida belgilangan bo‘lsin.
- [ ] **D6.5.3** Counters: `p5List`, `merchantLookup`, `terminalLookup`, `resetPin`. Scenario switch data/countersni deterministic reset qiladi; `Reset counters` faqat countersni nollaydi. Kechikkan request uchun `Kech javobni bo‘shatish` nazoratini ber; sleepga bog‘liq flaky scenario kerak emas.
- [ ] **D6.5.4** Quyidagi jadvaldagi ssenariylarni ulang. Same-ID duplicate test controller darajasida bo‘lsa manual pagega alohida murakkab variant qo‘shish shart emas; coverage joyini hujjatlashtir.
- [ ] **D6.5.5** Account browser check uchun existing safe DEV auth/profile preview ishlatsa bo‘ladi. Yetarli bo‘lmasa faqat presentationga synthetic normalized profile inject qiladigan `/dev/day6/account` qo‘sh; production guardni ochadigan fake token yo‘q. Actual route manual/resultga yoziladi; unnecessary duplicate simulator yo‘q.
- [ ] **D6.5.6** Markers `D6-P5-DEMO-ONLY` va fixture ID prefix `D6-P5-DEMO-` DEV subtree ichida qolsin. Existing D2–D5 markers/routes saqlanadi. Markerlar production kodga scan uchun constant sifatida import qilinmaydi.

| Scenario | Amal | Expected observation |
|---|---|---|
| NORMAL | List, search/filter, page2; eligible resetni confirm | Server metadata mos; confirmationgacha reset0, confirmdan keyin1 |
| READ_ONLY | GET_P5, reset grantsiz | List bor; reset control/dispatch yo‘q |
| RESET_ONLY | RESET_P5_PIN, read grantsiz | P5 row route denied; p5List0/reset0 |
| NO_P5_GRANTS | Faqat D4/D5 grants | P5 read/reset0; old grants kengaymaydi |
| LOOKUP_DENIED | Lookup grantlarini olib tashla | Unfiltered list bor; denied lookup0; reset row uchun lookup talab qilmaydi |
| PARENT_CHANGED / LOOKUP_LOST | Applied filterdan keyin parent/optionsni o‘zgartir | Filtered GET paused, stale rows yashiriladi; clear/apply explicit |
| EMPTY / ERROR / DELAYED_READ | Listni och | Empty, error va loading farqli; delayed old read boshqa scopega o‘tmaydi |
| UNKNOWN_STATUS / NULL_OPTIONAL / BAD_REQUIRED | Rowsni ko‘r | Neutral code/placeholder; malformed critical data error; reset xato targetga ochilmaydi |
| INELIGIBLE_DEVICE | Verified predicatega mos kelmaydigan row | Reset0; boshqa row/list ishlashda davom etadi |
| TARGET_CHANGED | Dialogdan so‘ng target/page/statusni o‘zgartir | Old confirmationdan dispatch0; fresh target uchun yangi confirmation |
| CONFIRMED | Explicit verified void-success | reset1, confirmed; no generated PIN/status promise |
| REJECTED_SYNTHETIC | Fake portdan explicit business rejection | Rejected state; bu real error schema dalili emas |
| DELAYED_DOUBLE_SUBMIT | Rapid confirm, close/reopen, release | Same intent reset1; pending lifetime componentdan uzun |
| UNKNOWN_AFTER_DISPATCH | Lost response; keyin list Refresh | reset1; action UNKNOWN qoladi; no automatic resend |
| MALFORMED_SUCCESS | HTTP-like200, missing/wrong data | UNKNOWN; false success yo‘q |
| CONFIRMED_REFETCH_FAILED | Confirmed resetdan keyin list error | Action confirmed, list refresh error alohida |
| SCOPE_CHANGED / PERMISSION_REVOKED | Pendingni yubor, scope/access almashtir, release | Old-scope toast/cache/UI effect yo‘q; new reset yo‘q |
| ACTION_CONTRACT_BLOCKED | Reset port unavailable | List bor; reset0; feature-specific unavailable |

**Acceptance:** DEV real backend Network0; actual scope/action logic ishlatiladi; delay/data/counters deterministic; production import boundary saqlangan. Source grepning o‘zi browser/network PASS o‘rnini bosa olmaydi.

## 11. D6.6 — User-run verification va aniq regressionlar

**Natija:** Day 06 o‘zgarishlari uchun actual command/browser/accessibility/isolation evidence. Bu staging/deployment emas.

### 11.1 Focused test coverage

| ID | Tekshiriladigan xulq | Owning checkpoint |
|---|---|---|
| P6-01 | Valid/invalid page, safe ID, required/optional fields; no fake empty | D6.1 |
| P6-02 | status0 saqlanadi; exact query subset; invalid integer/page/size | D6.1 |
| P6-03 | Merchant→terminal dependency; wrong-parent/denied applied options paused | D6.1–2 |
| P6-04 | Read/reset/lookup authorities independent; direct route/nav/returnTo bir xil | D6.0–2 |
| P6-05 | Old session/permission-content scope response yangi queryga chiqmaydi | D6.1 |
| P6-06 | deviceStatus/staticQR status adashmaydi; unknown/ineligible reset0 | D6.1–3 |
| P6-07 | Encoded deviceId, POST, no body; confirm/cancel counts | D6.3 |
| P6-08 | Double submit/remount/same-ID rows: bitta dispatch | D6.3 |
| P6-09 | Refresh/preflight vaqtida permission/target/scope change: dispatch0 | D6.3 |
| P6-10 | Explicit void success; missing/malformed response UNKNOWN; no replay | D6.3 |
| P6-11 | Late old-scope outcome ignored; confirmed invalidation faqat P5 current scope | D6.3 |
| P6-12 | Confirmed+refetch fail ajratilgan; list refresh UNKNOWNni success qilmaydi | D6.3 |
| P6-13 | Existing account/session behavior; real behavior o‘zgargan bo‘lsa regression | D6.4 |
| P6-14 | DEV route/fixture production boundary; no real backend fake-port calls | D6.5–6 |

Tests existing Vitest convention bilan yoziladi. Core one-dispatch va auth suite’larini to‘liq nusxalash o‘rniga P5 callback/target/path/key/registration wiringni isbotla. Test soni maqsad emas. Targeted test failure uchun zarur rerun qilinadi; barcha gate’ni har fayldan keyin qaytarish talab emas.

### 11.2 Command gate — faqat user bajaradi

Actual `package.json` scriptlarini tekshirgach quyidagi commandlar userga beriladi:

```powershell
Set-Location 'D:\QR projects\qrhub-merchant-frontend'
npm run lint
npm run typecheck
npm run test
npm run build
```

Baseline 487 tests/64 files. Day 06 final soni actual outputdan yoziladi; aynan oshirish yoki eski sonni saqlash acceptance sharti emas. Old test coverage olib tashlanishi esa izohsiz qabul qilinmaydi. 0 lint errors, faqat ikki accepted existing warning; yangi warning bo‘lsa tekshir va tuzat.

### 11.3 Browser — local DEV

User alohida terminalda existing demo mode’ni ishga tushiradi:

```powershell
Set-Location 'D:\QR projects\qrhub-merchant-frontend'
$env:VITE_APP_MODE = 'demo'
npm run dev
```

- [ ] `/dev/day6/devices`da §10 scenario matrixni bajar; counters bilan dispatch0/1ni qayd et.
- [ ] `READ_ONLY`, `RESET_ONLY`, optional lookup deny, contract-blocked holatlarni aniq tekshir. Permission yo‘q control uchun hidden/denied policy existing conventionga mos.
- [ ] Reset dialogda keyboard focus trap, initial focus, Escape/Cancel, pending close/reopen va return focusni tekshir. Trigger yo‘qolsa focus safe heading/controlga qaytsin. Dialogni yopish dispatch rollback deb talqin qilinmaydi.
- [ ] Inline field error `aria-describedby`, proper labels, visible focus; outcomes existing live-region orqali e’lon qilinsin. Rangning o‘zi status ma’nosini bermasin.
- [ ] 390px va desktop: filter wrapping, pagination, long IDs/description, table internal scroll, dialog width va outer horizontal overflow yo‘qligi.
- [ ] Existing `/account`ni safe preview orqali tekshir: long fullname/phone, existing profile states, keyboard; P5 PIN action accountga ko‘chmagan.
- [ ] Affected D2 auth/account, D3 dashboard/dynamic QR, D4 static/export/gates, D5 list/create/assign/unassign smoke/regressionlarini tekshir. Shared interface o‘zgarsa aynan ta’sirlangan ssenariylar; keng yangi re-audit yo‘q.
- [ ] Network’da DEV fake-port scenario real auth/web/P5 backendni chaqirmaganini tasdiqla. Dev server asset/HMR requestlarini backend API requesti bilan adashtirma.

### 11.4 Production build/preview isolation

Demo serverni to‘xtat. Old `$env:VITE_APP_MODE='demo'` qolgan terminaldan tasodifiy prod tekshiruv qilma: yangi terminal yoki repo hujjatidagi production/live build tartibini ishlat. Quyidagi misolda demo override olib tashlanadi; boshqa env konfiguratsiyasi actual existing validated policyga mos bo‘lsin. Secret qiymatlarini reportga ko‘chirma.

```powershell
Set-Location 'D:\QR projects\qrhub-merchant-frontend'
Remove-Item Env:VITE_APP_MODE -ErrorAction SilentlyContinue
npm run build
Get-ChildItem -LiteralPath .\dist -Recurse -File |
  Select-String -SimpleMatch -Pattern `
    'DEMO-QR-', `
    'D3-READ-DEMO-ONLY', 'D3-QR-DEMO-', `
    'D4-ACTIONS-DEMO-ONLY', 'D4-QR-DEMO-', `
    'D5-MGMT-DEMO-ONLY', 'D5-MGMT-DEMO-', '/dev/day5/', `
    'D6-P5-DEMO-ONLY', 'D6-P5-DEMO-', '/dev/day6/'
npm run preview -- --host 127.0.0.1
```

Code/D6 env farqi bo‘lmasa final build outputdan qayta foydalanish mumkin; faqat demo override sabab boshqa artifact kerak bo‘lsa qayta build qil. Marker scan expected: no matches. Existing old markerlar ro‘yxati actual repo’dagi nomlar bilan to‘ldiriladi; tekshiruvdan o‘tish uchun fixture/marker nomini yashirma yoki almashtirma.

Production preview’da quyidagi DEV route’lar simulatorni mount qilmasin: `/dev/auth`, `/dev/read/dashboard`, `/dev/read/dynamic-qrs`, `/dev/day4/actions`, `/dev/day4/static-qrs`, `/dev/day5/terminals`, `/dev/day5/bank-accounts`, `/dev/day5/cashiers`, `/dev/day5/cashiers/new`, `/dev/day6/devices` va qo‘shilgan bo‘lsa `/dev/day6/account`. SPA fallback HTML200 bo‘lishining o‘zi failure emas; simulator component/data mounted bo‘lmasligi tekshiriladi.

Normal `/devices` va existing routes auth/bootstrap/access/readiness guardlarini saqlasin. Real staging login yoki device PIN reset bu verification uchun talab qilinmaydi. Authenticated permission combinations injected local tests/DEV orqali, unauthenticated production route guards esa preview orqali tekshiriladi; bular live account grant dalili emas.

### 11.5 Evidence record

Har gate `PASS | FAIL | NOT_RUN`, source `USER_REPORTED | CODEX_STATIC_REVIEW`, actual command/scenario va qisqa observation bilan yoziladi. Source review browser PASSga aylantirilmaydi. Error bo‘lsa shu aniq failure tuzatiladi va user relevant gate’ni rerun qiladi. Bekor qilingan command, berilmagan screenshot yoki taxminiy timestampni evidencega qo‘shma.

## 12. D6.7 — Final closeout va keyingi chatga topshirish

**Files:** P5 contractni final implementation bilan moslash; `DAY_06_MANUAL_CHECKS.md`, `QRHUB_FRONTEND_DAY_06_RESULT.md`; existing `CONTRACT_GAPS.md`ga actual yangi dalil. Source fayllarida faqat aniqlangan Day 06 correctness defect tuzatiladi.

- [ ] **D6.7.1** D6.0–D6.6 deliverable va actual changed-file inventoryni solishtir. Planned filename bilan actual filename farqini qayd et; inexist filega link yozma.
- [ ] **D6.7.2** Source/feature/access/local verification/live verification matritsasini yoz. P5 reset gated bo‘lsa nimasi tayyor va qaysi kontrakt qolganini aniq ajrat.
- [ ] **D6.7.3** User evidence bo‘yicha command/test/file counts va browser/isolation holatini yoz. Baseline’ni yangi result qilib qayta ishlatma.
- [ ] **D6.7.4** D5-01…05 va S-01…04ni saqla. P5 gap topilsa D6 prefiksi bilan actual owner/impact/closure evidence yoz; faqat savol bo‘lgan bandni avtomatik OPEN gapga aylantirma.
- [ ] **D6.7.5** Userga final result, P5 contract va manual checks fayllarini ber. Day 07 scope uchun faqat actual carry-forward facts; Day 07ni boshlama.

### 12.1 New gap qaydi

Gap satri: `ID | BACKEND_CONTRACT/BACKEND_BEHAVIOR/PRODUCT/FRONTEND_DEFECT | feature | evidence | frontend mitigation | owner | closure evidence | status`.

P5 tekshiruv savollari: per-device status labels; reset predicate projection; external successning aniq ma’nosi; response/error wire; list/count join cardinality. Ularni source hal qilsa `SOURCE_CONFIRMED`; dalilsiz beshta yangi blocker yaratma. D5 status vocabularydan P5 label chiqarma. Deployed runtime yo‘qligi tegishli S-bandda qoladi; S-bandlarni qayta raqamlama.

Haqiqiy frontend defect masalan wrong grant, stale target, duplicate dispatch yoki false success bo‘lsa uni backend gap deb yashirma. Bunday defect Day 06 completiondan oldin tuzatiladi.

### 12.2 Status mezonlari

| Status | Shart |
|---|---|
| `DAY_06_IN_PROGRESS` | Ayrim checkpoints yoki mustaqil frontend vazifalari tugamagan |
| `DAY_06_IMPLEMENTED_AWAITING_MANUAL_CHECKS` | Barcha unblocked code/tests/docs tayyor; user-run gate hali tugamagan |
| `DAY_06_FRONTEND_COMPLETE_STAGING_PENDING` | Unblocked frontend va dalilli feature-specific gated flowlar tayyor; command/browser/responsive/affected-regression/isolation gates PASS |
| `DAY_06_INCOMPLETE` | Bajarilishi mumkin bo‘lgan talab qolgan yoki actual verification FAIL |

Staging pendingning o‘zi `INCOMPLETE`ga sabab emas. Material P5 contract gap uchun port closed bo‘lishi mumkin, ammo bajarish mumkin bo‘lgan decoder/controller/UI/testsni tashlab ketish `CONTRACT_BLOCKED` bilan oqlanmaydi. Account allaqachon yaxshi bo‘lsa `COMPLETE_NO_CHANGE_REQUIRED` valid.

### 12.3 Final result matritsasi

| Feature | Contract status | Frontend status | Exact access | Local evidence | Staging |
|---|---|---|---|---|---|
| P5_READ | Actual D6.0 evidence | Actual implementation | GET_P5 | Actual gate | NOT_RUN |
| P5_RESET_PIN | Actual predicate/success evidence or named gap | Configured conservative flow or explicit gated flow | RESET_P5_PIN; read supplies target | Actual gate | NOT_RUN |
| OPTIONAL_LOOKUPS | Reused D5 contract; actual relevant delta | Existing + P5 binding | Each exact lookup grant | Actual gate | NOT_RUN |
| ACCOUNT_READ_ONLY | Existing D2/current source | Changed or NO_CHANGE_REQUIRED | Existing GET_ME policy | Actual gate | NOT_RUN |

Quyidagi blok resultda **actual qiymatlar bilan** to‘ldiriladi; bu handoffning o‘zi PASS natija emas:

```text
DAY_05_BASELINE: CLOSED; DAY_05_FRONTEND_COMPLETE_STAGING_PENDING
DAY_06_STATUS: actual status
LIVE_STAGING: NOT_RUN / STAGING_PENDING
PRODUCTION_DEPLOYMENT: OUT_OF_SCOPE; TEAM_LEAD_DECISION

D6_0_CONTRACTS: actual status
D6_1_SCOPED_READS_FILTERS: actual status
D6_2_DEVICES_PAGE_ROUTING: actual status
D6_3_DEVICE_PIN_RESET: actual status + configured/gated reason
D6_4_ACCOUNT: actual status or COMPLETE_NO_CHANGE_REQUIRED
D6_5_DEV_SCENARIOS: actual status
D6_6_VERIFICATION: actual status
D6_7_CLOSEOUT: actual status

LINT: actual result; errors/warnings
TYPECHECK: actual result
TESTS: actual result; tests count and files count
BUILD: actual result
D6_BROWSER_NORMAL: actual result
D6_PERMISSION_MATRIX: actual result
D6_LOOKUP_FILTERS: actual result
D6_RESET_LIFECYCLE: actual result
D6_ACCOUNT: actual result
390PX_DESKTOP_KEYBOARD: actual result
D2_D3_D4_D5_AFFECTED_REGRESSION: actual result
DEV_NO_REAL_BACKEND_NETWORK: actual result
PRODUCTION_MARKER_SCAN: actual result
PRODUCTION_DEV_ROUTES: actual result
PRODUCTION_LIVE_ROUTES: actual result
DEV_SIMULATOR_MOUNTED_IN_PRODUCTION: actual observation

AC_01_NAVY_RED_DESIGN: preserved or actual defect
D4_FEATURE_GATES: preserved or actual regression
D5_RESOLVED_WORK: not reopened
OPEN_FRONTEND_DEFECTS: actual list or NONE_FOUND
NEW_D6_BACKEND_PRODUCT_GAPS: actual IDs or NONE_FOUND
CARRIED_D5_GAPS: D5-01..D5-05 unchanged unless new authoritative evidence
STAGING_MILESTONE: S-01..S-04 pending; P5 endpoint inventory added
CHANGED_FILES: actual paths
DAY_07_INPUTS: factual remaining work only
```

Day 07 keyingi alohida bosqich: implemented frontendning umumiy review’i, zarur UX/accessibility tuzatishlari va topshirish hujjatlari. Staging integration va production release frontend kunlariga yashirin majburiy gate sifatida qo‘shilmaydi.
