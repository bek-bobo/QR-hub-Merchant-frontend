# QRHub Merchant Frontend — Day 04 Implementation Plan / Handoff

> **For agentic workers:** Use `superpowers:executing-plans` if available. Work inline with one agent, without delegation. Codex reads/edits source and writes focused tests. The user runs installation, generators, lint, typecheck, tests, builds, dev servers, browser checks and API requests. Complete every unblocked checkpoint without routine approval pauses. These workflow constraints override skill defaults about running commands, commits and delegation.

**Goal:** Day 03 dan qolgan frontend tuzatishlari va hujjat nomuvofiqliklarini yopish; dynamic QR yaratish, XLSX export, static QR read ekranini va kontrakt bilan cheklangan cancel oqimini tayyorlash.

**Architecture:** Mavjud React SPA, feature modullar, SessionController, exact permission policy, yagona QueryClient va normalized read boundary saqlanadi. Yangi mutation/download portlari shu session lifecycle’ga ulanadi. Har action alohida contract/config/access gate oladi.

**Tech Stack:** Actual package/lockfile’dagi React, TypeScript, Vite, React Router, TanStack Query v5, Zod, Tailwind/shadcn/Radix, Lucide, Vitest va Oxlint. Native fetch saqlanadi. QR renderer kerak bo‘lsa avval mavjud dependency qayta ishlatiladi; yangi dependency faqat §7.4 tartibida.

**Target:** `D:\QR projects\qrhub-merchant-frontend`. Quyidagi implementation pathlar frontend root’iga nisbatan. `D:\QR projects\qrhub-merchant-service` faqat read-only reference.

**Spec / evidence:** `QRHUB_FRONTEND_DAY_03_RESULT.md`, `DAY_03_READ_CONTRACT.md`, `DAY_03_MANUAL_CHECKS.md`, eng yangi `CONTRACT_GAPS.md`, amaldagi `AUTH_CONTRACT_STATUS.md` va original `BACKEND_FRONTEND_CONTRACT_AUDIT.md`. Ushbu handoff hisobotlar asosida tuzildi; bu chatda actual frontend source, backend JAR yoki deployed runtime mustaqil tekshirilmadi.

## 0. Codexga topshirish

Frontend projectni och. Ushbu faylni `docs/handoffs/QRHUB_FRONTEND_DAY_04_IMPLEMENTATION_HANDOFF.md` sifatida joylashtir; yuqoridagi dalil fayllarini ham ber. Upload nomlaridagi `(1)`/`(3)` nusxa suffixlari; repo ichida canonical fayllarni top. Yangi scaffold yaratma.

Quyidagi promptni yangi Codex chatga ber:

```text
QRHUB_FRONTEND_DAY_04_IMPLEMENTATION_HANDOFF.md bo‘yicha ishlagin.
Frontend: D:\QR projects\qrhub-merchant-frontend.
Backend reference: D:\QR projects\qrhub-merchant-service, faqat read-only.

Avval D4.0 dagi Day 03 carry-over review/tuzatishlarini bajar.
Keyin D4.1–D4.7: action kontraktlari, mutation/download lifecycle,
dynamic QR create, XLSX export, cancel gate/flow, static QR read va DEV checks.
Day 03 auth/read contractlari statik tasdiqlangan va decoderlar configured;
ularni boshidan qayta qurma yoki yana umumiy UNKNOWN deb belgilama.

Mavjud qizil dizayn, exact can(), RAM session, single-flight refresh,
scoped cache va production/demo isolationni saqla.
Create/cancel so‘rovini avtomatik qayta yuborma. Core cancel eligibility yoki
boshqa zarur contract topilmasa faqat shu actionni blokla; qolgan ishni tugat.
Backend endpoint, enum, role mapping, currency schema yoki idempotency key uydirma.

Bir agent bilan source read/edit qil va focused testlarni yoz.
Install, generator, lint, typecheck, test, build, dev server, browser automation
yoki backend requestni o‘zing ishga tushirma. Men ularni qo‘lda bajaraman.
Backendni o‘zgartirma; commit/push/deploy va Day 05 scope’ini boshlama.
Rutin tasdiq kutma. Har checkpointdan keyin qisqa o‘zbekcha update ber.
Oxirida QRHUB_FRONTEND_DAY_04_RESULT.md, DAY_04_ACTION_CONTRACT.md,
DAY_04_MANUAL_CHECKS.md va yangilangan CONTRACT_GAPS.md tayyorla.
Tekshiruvlarni men natija bermagunimcha PASS deb yozma.
```

## 1. Day 03 review xulosasi

Boshlang‘ich status: `DAY_03_FRONTEND_COMPLETE_LIVE_BLOCKED`; live: `LIVE_CONTRACT_BLOCKED`.

User lint, typecheck, tests, build, D3.6 browser scenario’lari, dashboard→QR router state, 390px/desktop va production isolation uchun PASS bergan. Testlarning aniq soni berilmagan. Bu dalil saqlanadi; Day 04 tekshiruvi yoki deployed integration PASS sifatida ko‘chirilmaydi.

Day 03 dashboard/list/lookup va D2 review tuzatishlari tugagan. Create/cancel/export/static QR Day 03 scope’idan ataylab tashqarida bo‘lgan; ularni bajarilmagan Day 03 bug’i deb yozma.

### 1.1 Day 04 boshida yopiladigan carry-over

| ID | Dalil va qolgan masala | Day 04 vazifasi / closure |
|---|---|---|
| CO-01 | Dashboard total barcha statuslarni oladi; success `50`, processing `0/10`, failed `5/20`. `processing.percent = 100 − success.percent − failed.percent`. Tasniflanmagan status processing foiziga singib ketishi mumkin | Actual presentationni tekshir. §6 dagi reconciliation guard bilan chalg‘ituvchi foiz grafiklarini chekla; mismatch fixture/test qo‘sh. Backend formula tuzatilgan deb da’vo qilma |
| CO-02 | Read contract header’i hali `D3.2`; keyingi bo‘limlar D3.6 gacha. Status qismidagi umumiy unknown izohi va §9 dagi `25` display-only izohi bir xil aniqlikda emas | Current header/status jadvalini mosla. `5` — muddati tugagan, `25` — rad etilgan, display-only; actual kod allaqachon mos bo‘lsa faqat docs/evidence |
| CO-03 | Search faqat terminal nomida `ILIKE`; D3 checks `CHILONZOR` bilan tekshirilgan | Placeholder/help va DEV matcher ham terminal nomi bo‘yicha ekanini tekshir. Pkey/RRN qidiruvi va’dasi bo‘lsa tuzat; yo‘q bo‘lsa `VERIFIED_NO_CHANGE` |
| CO-04 | Terminal dropdown wire’da min/max bor; D3 normalized option faqat `{id,name}` | Create uchun source bilan tasdiqlangan amount limits projection qo‘sh. D3 read lookup’ni currency/min-max gate’iga qaram qilib qo‘yma |
| CO-05 | Qolgan gaplar ro‘yxatida global live blocker, ayrim field cheklovi va backend yaxshilanishi aralashgan | §2 bo‘yicha scope/owner/evidence bilan ajrat. Ko‘rsatilmaydigan FX fieldi yoki to‘liq role katalogi yo‘qligi barcha feature’larni yopmasin |
| CO-06 | D3 manual checklist yangi action lifecycle’ni va barcha permission-revoke/session-switch holatlarini isbotlamaydi | D4 ga ta’sir qiladigan scope cleanup, lookup loss, kechikkan response va production regression dalillarini qo‘sh. Checklistda yo‘qlikni implementation bug deb atama |

CO-01 — hujjatdagi formuladan chiqarilgan semantik xavf; grafikning actual kodi ko‘rilmagan. CO-02 — hujjat aniqligi masalasi. CO-03/06 — maqsadli tekshiruv, tasdiqlangan kod bug’i emas. Bajarilgan ishni takrorlash o‘rniga actual source’dagi holatni qayd et.

### 1.2 Saqlanadigan tayanch

- Shared `qh-lib-model:1.0.77` va `qh-lib-shared:1.0.77` selected classlari ko‘rilgan. Auth decoder configured; envelope `success`, `requestId`, `timeZone`, `error`, `data`; error `code/tag/text`. Eski `code/message/data` taxminiga qaytma.
- `profile.read -> GET_ME`, `dashboard.read -> GET_DASHBOARD`, `dynamicQr.read -> GET_DYNAMIC_QRS`, `terminal.lookup -> GET_DROPDOWN_TERMINALS` tasdiqlangan. Runtime grants get-me’dan; frontend role nomidan grant yasamaydi.
- `SessionController.protectedRead`, `src/shared/api/protected-read.ts`, `ReadProvider`, `createReadRuntime`, `MerchantReadApi`/`LiveReadApi` mavjudligi D3 contractida qayd etilgan. Aniq signature/pathni source’dan top; parallel auth/read framework yaratma.
- Query key scope: `[source, sessionScopeId, accessRevision, feature, ...]`. Tokenning o‘zi key emas; access revision permission content uchun, oddiy token refresh uchun emas.
- Tokens faqat session qatlamining RAM holatida. Query, router state, props, fixture, console va storage’ga token/PIN/OTP/session key yozilmaydi. Avvalgi device UUID istisnosi saqlanadi.
- Auth refresh single-flight, atomik token pair, bitta auth tab, stale-response rejection va GET uchun ko‘pi bilan bitta ruxsatli 401 replay saqlanadi. 403 refresh qilinmaydi.
- Pul exact UZS tiyin; offset’siz LocalDateTime matni saqlanadi. Dashboard metrics o‘z endpointidan; list sahifasidan hisoblanmaydi. Unknown status neutral.
- Mavjud nav, dark navy sidebar, ochiq workspace va qizil accent saqlanadi. Refactor yoki dependency upgrade alohida maqsad emas.

## 2. Qolgan gaplarni qayerda yopamiz?

| Gap | Ta’siri / Day 04 qarori | Yopish uchun dalil / owner |
|---|---|---|
| Deployed auth/web base URL va gateway prefix | Real transport konfiguratsiyasi. Controller pathni prefixga bir marta qo‘shish kerak | Environment URL jadvali; backend/infra |
| CORS va gateway | Browserdagi real API tekshiruvi ochiq. `no-cors` bilan chetlab o‘tilmaydi | Actual frontend origin uchun preflight va response; infra + user |
| Actual grants | Har capability alohida. Full role katalogini kutish shart emas | Sanitized get-me permissions yoki mos test account; backend/admin |
| Auth/read runtime | Statik tasdiq saqlanadi, deployed PASS hali yo‘q | User-run login/refresh/logout/dashboard/list/lookup evidence |
| Unsafe Java Long | Safe qiymatlar ishlaydi; unsafe qiymat ko‘rilgan response aniq contract error oladi | Backend range guarantee yoki lossless wire contract. `String(roundedNumber)` yechim emas |
| FX: currencyAmount/rate/serviceFeeAmount | Day 04 ham bu fieldlarni ko‘rsatmaydi/hisoblamaydi; asosiy UZS amount ishlaydi | Business unit/scale/rounding keyingi FX display uchun. Create’dagi currencyCode talqini alohida §7.2 |
| ToDate fractional second | List va exportning `23:59:59` chegarasi backend cheklovi; client sanani kengaytirmaydi | Backend fix yoki yozma acceptance + boundary test |
| Teng created_at tartibi | Stable ordering kafolati yo‘q; client lokal sort/dedup bilan yashirmaydi | Backend secondary sort key va sinov |
| Dashboard tasniflanmagan status | CO-01 frontendda misleading presentationni yopadi; kategoriya/formula backend qarori bo‘lib qoladi | Backend/product status taqsimoti va formula |
| Cancel eligibility / Core natijasi | Zarur transition dalili topilmaguncha live cancel yopiq | Core contract yoki ishonchli backend eligibility contract; frontend yangi allowedActions fieldini uydirmaydi |
| D4 currency/static/action DTO detali | Faqat tegishli action/fieldni cheklaydi | Mavjud local source/JAR/artifactlardan D4.1 targeted extraction |

`CONTRACT_GAPS.md` har row uchun `ID, scope, owner, current evidence, frontend mitigation, closure evidence, status` saqlasin. Day 03 yakuniy tarixini qayta yozma; yangi tasnifni Day 04 qarori sifatida qo‘sh. Statik readiness, actual access va runtime verification uch xil tushuncha.

## 3. Day 04 scope va permission mapping

Original audit quyidagi endpointlarni qayd etgan. D4.1 actual resource/security/service va serializer bilan tasdiqlaydi; original auditdagi eskirgan umumiy UNKNOWN xulosalari yangi shared dalilni bekor qilmaydi.

| Frontend capability | Endpoint | Exact authority reference | Wire natijasi / muhim shart |
|---|---|---|---|
| `dynamicQr.create` | `POST /dynamic-qrs/create` | `CREATE_DYNAMIC_QR` | Envelope ichida `{pkey,link}`; request terminalId/amount/currencyCode |
| `dynamicQr.export` | `GET /dynamic-qrs/export` | `EXPORT_DYNAMIC_QRS` | XLSX bytes; list filterlari, pagination yo‘q |
| `dynamicQr.cancel` | `POST /dynamic-qrs/cancel/{pkey}` | `CANCEL_PAYMENT` | Body yo‘q; success `data=null`; Core eligibility alohida |
| `staticQr.read` | `GET /static-qrs/get-all` | `GET_STATIC_QRS` | Envelope ichida `PageResponse<StaticQrDTO>` |
| `currency.lookup` | `GET /currency/get-all` | `GET_CURRENCY_CODE` | **Raw `List<QhCurrency>`**, envelope emas; item schema tekshiriladi |
| `terminal.lookup` — reuse | `GET /dropdown/terminals` | `GET_DROPDOWN_TERMINALS` | Envelope; create uchun id/name/minAmount/maxAmount |

Frontend capability nomlari ichki nomlar; backendga yuborilmaydi. Mavjud naming bo‘lsa moslashtir. D3 dagi enum `toString()`/override dalilini qayta ishlat; yangi endpointning mappingini aniq tekshir. Required authority borligi actual userga ruxsat berilganini bildirmaydi.

| Feature | Amalni yoqish sharti | Mustaqillik |
|---|---|---|
| Create | Auth + create permission + terminal/currency lookup access + configured schemas + yaroqli form | `dynamicQr.read` yoki dashboard permission majburiy emas; createsiz read ishlaydi |
| Export | Auth + export permission + binary contract + yaroqli applied filter snapshot | Create/currency/cancel contractini kutmaydi. List o‘qish va export ikki xil permission |
| Cancel | Auth + cancel permission + wire contract + **tasdiqlangan eligibility** + current scoped target | Row orqali kirish list accessni ham talab qiladi; statusning o‘zi ruxsat emas |
| Static list | Auth + static read permission + static page contract | Dashboard/dynamic QR/currencyga bog‘lanmaydi; terminal filter tanlansa lookup kerak |

Day 04 tashqarisida: static QR create/edit/delete, refund, settlement, P5, kassir boshqaruvi, profile edit, notification, yangi backend endpoint va yangi FX hisoblash. Cancel’ni refund deb atama.

## 4. Source va fayl xaritasi

Bu tavsiya etilgan xarita; mavjud feature kataloglari ustun. D4.0 actual fayl nomlarini yozadi. Shu fayllar oldindan bor deb hisoblama.

| Joy | Ish |
|---|---|
| Actual SessionController va `src/shared/api/protected-read.ts` | Existing protected operation API’sini o‘qi; xavfsiz one-dispatch mutation bridge kerak bo‘lsa qo‘sh |
| `src/shared/api/protected-mutation.ts` — zarur bo‘lsa yangi | Tokenni oshkor qilmasdan session-scope ichida bir marta dispatch; stale completion rejection |
| `src/shared/files/download.ts` — zarur bo‘lsa yangi | Validated Blob, safe filename, object URL cleanup; endpoint/permission bilimlari yo‘q |
| Actual `ReadProvider`, SessionCache, query key registries | Static/currency/creation lookup query lifecycle hamda action-result cleanup |
| `src/features/dynamic-qr/` actual katalog | Create form/result, export action, cancel confirmation, API/decoder/action state/test |
| `src/features/static-qr/` — yangi feature | DTO projection, normalized port, scoped list/filters/QR panel/test |
| Actual terminal/currency feature yoki entity modullari | Lookup decoder/projection; terminal read option va create limits ajratiladi |
| Actual dashboard/status/search modullari | CO-01/02/03 targeted changes |
| Actual live composition/router/navigation | Registrations, route gates, exact returnTo; yangi QueryClient yo‘q |
| Actual DEV-only subtree | D4 fixture/scenario/ports; `D4-ACTIONS-DEMO-ONLY` va `D4-QR-DEMO-` markerlari |
| `docs/handoffs/` va actual contract docs joyi | Day 04 contract/result/manual checks, yangilangan gaplar |

Shared qatlam feature yoki DEV modullarni import qilmaydi; app composition adapterlarni ulaydi. Amount parser, lookup mapper yoki session guardning ikkinchi nusxasini yaratishdan oldin mavjud helperni top.

## 5. Action arxitekturasi va lifecycle

Quyidagi TypeScript — **normalized frontend contract namunasi**, backend DTO yoki mavjud SessionController signature’i emas. Actual type/importlarni qayta ishlat; repo’da boshqa mos interface bo‘lsa yangi parallel qatlam qo‘shma.

```ts
type ActionScope = Readonly<{
  source: 'live' | 'demo';
  sessionScopeId: string;
  accessRevision: number;
}>;

type CreateQrInput = Readonly<{
  terminalId: string;
  amountMinor: string; // canonical integer; UZS, scale 2
  currencyCode: string; // source-confirmed lookup selection
}>;

type CreateQrResult = Readonly<{ pkey: string; link: string }>;
type ExportFile = Readonly<{ blob: Blob; filename: string }>;

type MutationOutcome<T> =
  | { kind: 'confirmed'; data: T }
  | { kind: 'not-sent'; reason: string }
  | { kind: 'rejected'; reason: string } // only an authoritative rejection
  | { kind: 'unknown'; reason: string };
```

Controller/UI outcome turi backendga yuborilmaydi. `stale`/scope expired holati active UI uchun tashlab yuboriladi; uni yangi sessionda success/error toastga aylantirma. Error modeli mavjud bo‘lsa undan foydalan.

### 5.1 One-dispatch mutation qoidalari

1. Submit paytida actual auth, exact permission, feature contract va form/eligibility tekshiriladi. Button disabled’ning o‘zi yetarli emas; port/handler ham guard qiladi.
2. Session single-flight orqali **POST hali yuborilmasidan oldin** tokenni yangilash mumkin. Refresh/grant tekshiruvi tugagach scope va ruxsatni qayta tekshir.
3. Bir user intent uchun transport callback bir marta ishlaydi. Rapid double-click/Enter uchun synchronous in-flight latch kerak; faqat React renderdan keyingi `isPending`ga tayanma.
4. POSTdan keyingi 401, 403, timeout, network/5xx, abort yoki malformed body avtomatik POST replay keltirmaydi. 403 refresh qilinmaydi. UI retry button ham yashirin replay bo‘lmasin.
5. Contract tasdiqlagan pre-execution validation/access rejection — `rejected`. Dispatchdan keyingi noaniq xato — `unknown`; hamma `success=false` yoki HTTP errorni “server hech narsa qilmadi” deb qabul qilma. Core side effect va local update atomikligi auditda tasdiqlanmagan.
6. Confirmed response bo‘lsa success UI; current scope’da tegishli read querylar invalidate/refetch qilinadi. Optimistic QR row/status/balans/growth yozilmaydi.
7. Refetch xatosi confirmed create/cancel’ni failed mutationga aylantirmaydi. “Amal bajarildi, ro‘yxatni yangilashda xato” kabi alohida holat; POST qayta yuborilmaydi.
8. Unknown natija: “Natija tasdiqlanmadi. Qayta yuborishdan oldin ro‘yxatdagi holatni tekshiring.” Mavjud read access bo‘lsa qo‘lda yangilashga yo‘l ber. Yagona matching amount/terminal row requestning natijasi ekanini isbotlamaydi; row topilmagani ham failure isboti emas.
9. Pending/unknown intent route almashganda yoki panel yopilganda avtomatik reset/retry bo‘lmaydi. Session scope’da saqlanadi. Keyingi yangi intent userning alohida tanlovi bo‘lsin; unknown create uchun takroriy QR yaratilishi mumkinligi aniq aytiladi. Reload’dan keyin RAM intent yo‘qolishini docs’da cheklov sifatida qayd et; browser storage joriy etma.
10. Abort client kutishini to‘xtatadi, backend/Core ishini bekor qilganini isbotlamaydi. Modalni yopish payment cancel emas. User logout qilishi bloklanmaydi; old operation state/key/token yangi sessionga chiqmaydi.

TanStack Query ishlatilsa `retry: false`ni aniq qo‘y; transportdagi retry ham yopiq bo‘lsin. Offline mutation queue/resume yoki persisted mutation yo‘q. TanStack `scope.id` ketma-ket bajarish uchun queue yaratishi mumkin, shuning uchun uni double-submit lock o‘rniga ishlatma. Pending offline operation reconnect’da o‘zidan-o‘zi ketmasligi uchun one-dispatch controller yoki mos `networkMode`/pre-dispatch guardni test bilan tasdiqla. [TanStack mutation semantics](https://tanstack.com/query/latest/docs/framework/react/guides/mutations).

### 5.2 Cache, scope va access

- D3 cleanup hozir dashboard/dynamic-QR/terminal-lookup namespacesni qamraydi. Static QR, currency, create lookup va action state/download resourcesni ham current lifecycle’ga ro‘yxatdan o‘tkaz.
- Logout, session replacement, source change va permission-content revision: tegishli readlarni cancel/remove; form/result/QR link, pending callback, export Blob/object URL va intent state’ni tozala. Unrelated public querylarni o‘chirma.
- In-flight network bekor bo‘lmasa ham late completion’dan oldin captured scope tekshiriladi. Eski response yangi query cache, toast, navigation, clipboard yoki downloadga ta’sir qilmaydi.
- Create/cancel success current scope’dagi dynamic list variantlari, dashboard metrics va recent panelni stale qiladi; faqat ruxsatli active readlar refetch qilinadi. Static/currency/cache unrelated holatda invalidate qilinmaydi.
- Permission yo‘qolganda current create/cancel UI yopiladi/disabled bo‘ladi; tanlangan terminal validity yo‘qolsa kengroq scope’ga avtomatik o‘tilmaydi.

## 6. CO-01: dashboard semantic guard

Contract bo‘yicha misol: `totalCount=10`, success=4, failed=2, processing=1. Uch guruh jami 7; qolgan 3 boshqa status. Backend processing percent’ni 40% qaytarishi mumkin, lekin processing count 1. Bu **hujjatdan chiqarilgan misol**, runtime kuzatuvi emas.

- [ ] Current renderer kategoriya foizini qanday ishlatishini aniqlab yoz.
- [ ] Total count va uch count yig‘indisini overflow bo‘lmaydigan exact arithmetic bilan solishtir. Amount reconciliation ham exact minor-unit arithmetic bilan qilinadi; count-based percentni money percent deb ko‘rsatma.
- [ ] Count mismatch bo‘lsa uch kategoriya butun totalni qoplaydi degan pie/proportional bar/percentage’ni ko‘rsatma. Total va server kategoriya count/amount qiymatlari matn/jadval shaklida qoladi; “Ayrim holatlar ushbu taqsimotga kirmagan” izohi ko‘rsatiladi.
- [ ] Faqat amount reconciliation farqi bo‘lsa uni alohida ko‘rsat; count pie’ni amount taqsimoti deb talqin qilma. Chartda categorized amountsni totalga tenglashtirib stack qilish bo‘lsa xuddi shu qoida.
- [ ] `25`/unknownni processing/failedga qo‘shma; yangi business kategoriya yoki qayta hisoblangan server percent yaratma. To‘g‘ri, to‘liq qamrovli response odatdagidek ishlaydi; total=0 alohida zero-data holati.
- [ ] DEV fixture va focused test: normal, zero-total, total>categorized, amount mismatch. Barcha mismatchni decoder failurega aylantirib dashboardni to‘liq yo‘qotma.

Bu frontend mitigation backend SQL/formula masalasini CLOSED qilmaydi. `CO-01=MITIGATED`, backend gap esa `OPEN` bo‘lishi mumkin.

## 7. Dynamic QR yaratish

### 7.1 Request, terminal va amount

Original audit: `POST /dynamic-qrs/create`, body `{ terminalId, amount, currencyCode }`; terminalId 32 hex; amount `100000..2000000000`; currencyCode `^[A-Z]{3}$`. D3 amount uchun UZS tiyin dalilini tasdiqlagan. Wire amount — JSON number, bu create oralig‘i safe integer ichida.

- Terminal options active/current-user assigned lookup’dan. `{id,name}` read optionni saqla; create projection source bilan tasdiqlangan `minAmount/maxAmount`ni ham decode qilsin. Bir wire contractdan foydalan, ikki xil taxminiy mapping yaratma.
- Source auditda lookup limitlari local `100000` va `2000000000` konstantalari; runtime’dagi har terminal uchun dinamik biznes qoida bor deb da’vo qilma. Actual source tasdiqlasa server constraint va lookup limitlarining kesishmasini ishlat.
- Missing/malformed limits, `min>max`, tanlanmagan yoki yo‘qolgan terminal create’ni bloklaydi. D3 dashboard/list’ni shu sabab yopma. Bo‘sh lookup — “Biriktirilgan faol terminal topilmadi”.
- UI label **“Summa, UZS”**. Source tasdiqlagan current global oralig‘i: **1 000.00–20 000 000.00 UZS**. Dynamic response’dagi `currencyCode`ni amount denomination deb olma.
- Amount input `string`, `inputMode="decimal"`; hisoblash string/BigInt bilan. Number/parseFloat orqali ko‘paytirib keyin rounding qilma.
- Qabul qilish siyosati: tashqi whitespace trim; faqat raqamlar va bitta `.` yoki `,` decimal separator, ko‘pi bilan 2 decimal digit. Ichki space/thousands separator, minus, `e`, `Infinity`, aralash separator, uchinchi decimal digit va bo‘sh input rad etiladi. UI yordam matni shu formatni aytsin.
- `1000`/`1000.00`/`1000,00` → canonical `100000`; `1000.01` → `100001`. Max/min tekshirilgandan keyingina adapter `Number(amountMinor)` qiladi. Unknown conversion/rate/service fee hisoblanmaydi.

### 7.2 Currency lookup

`GET /currency/get-all` raw list qaytaradi. `QhCurrency` qaysi field/enum/nullability bilan serializatsiya qilinishini shared source/JAR va CurrencyService/Core mappingdan aniqlash — D4.1 vazifasi. Item `{code,name}` ekanini yoki enum string ekanini taxmin qilma.

- Normalized option `{code,label}` bo‘lishi mumkin, lekin wire→normalized mapping dalilli bo‘lsin. Required code yaroqli va source-supported bo‘lsin; unknown/malformed required item optionga aylanmaydi.
- Request `currencyCode`ning Core uchun ma’nosini tekshir; form label shu ma’noga mos bo‘lsin. Tasdiqlansa “Konvertatsiya valyutasi” ishlatish mumkin. Asosiy amount har doim tasdiqlangan UZS birligida qoladi.
- UZS default faqat actual lookup UZSni bergan va source uni requestda qo‘llashni tasdiqlagan bo‘lsa. Hardcoded USD/EUR/UZS supported ro‘yxati yo‘q; `^[A-Z]{3}$` regex business support isboti emas.
- Foreign code mapping tasdiqlanib, request amount baribir UZS ekanligi aniq bo‘lsa code tanlash mumkin; conversion amount/rate/fee preview qilinmaydi. Faqat UZS ma’nosi tasdiqlansa UZS bilan chegarala va cheklovni yoz. Required currency semantics umuman noma’lum bo‘lsa live create yopiq, DEV/form/test ishlari davom etadi.
- Currency lookup xatosi createga ta’sir qiladi; export/static/read emas.

### 7.3 UI va success

Mavjud Sheet/Dialog primitive’dan accessible create panel tuz: terminal, summa, valyuta, inline validation, submit/pending/known-error/unknown-outcome va success view. Placeholderlarni haqiqiy data deb ko‘rsatma.

Success uchun `success=true`, valid `data.pkey` va link mapping talab qilinadi. Pkeyning exact shape’i source’dan; faqat request terminalId regexini response pkeyga avtomatik ko‘chirma. Backend create bo‘lib, body/link yaroqsiz kelishi mumkin: “aniq yaratilmadi” demagin, qayta POST yo‘q. Agar response yaratilganini yetarli tasdiqlasa “QR yaratildi, havolasini ko‘rsatib bo‘lmadi”; aks holda unknown outcome.

Linkni xavfsiz URL policy orqali tekshir: tasdiqlangan protocol/format; `javascript:`, `data:`, credentialli URL yo‘q. Source’da HTTPS public link bo‘lsa HTTPSni qabul qil; boshqa scheme/relative URL faqat contract dalili bilan. Host taxmin qilinmaydi, pkeydan checkout URL yasalmasin. Valid original link exact QR payload bo‘ladi; querystring/encodingni qayta yasab signed linkni buzma.

Success panel: QR, pkey, UZS amount, terminal, “Havolani nusxalash”, “Yopish”, alohida “Yangi QR”. Clipboard success toast faqat actual copy successdan keyin. Avtomatik tashqi navigatsiya yoki payment submit yo‘q. Returned link QR yaratildi degani, payment muvaffaqiyatli bo‘ldi degani emas. Expiry/countdown source’da bo‘lmasa chizilmaydi.

### 7.4 QR renderer

Mavjud local QR kutubxonani qayta ishlat. Yo‘q bo‘lsa bitta mos renderer sifatida `qrcode.react`ni tanlash mumkin; actual React peer compatibility/versionni tekshir, aniq install commandni userga ber, o‘zing install qilma. Lockfile qo‘lda uydirilmaydi. `QRCodeSVG` va `marginSize={4}` documented; tashqi QR-image servisiga link yuborish kerak emas. [qrcode.react official repository](https://github.com/zpao/qrcode.react).

```tsx
// Faqat validated paymentLink; actual component naming/designni saqla.
<QRCodeSVG
  value={paymentLink}
  size={240}
  marginSize={4}
  level="M"
  fgColor="#000000"
  bgColor="#ffffff"
  title="To‘lov uchun QR kod"
/>
```

Qizil accent button/iconlarda qoladi; QRning kontrasti va quiet zone saqlanadi. Image generation bilan to‘lov QRini yasama. Static QR preview ham shu componentni ishlatadi; PNG/PDF print generator Day 04 talabi emas.

## 8. Dynamic QR XLSX export

- `GET /dynamic-qrs/export` faqat user click bilan chaqiriladi; prefetch/focus/refetch orqali avtomatik download boshlanmaydi. Query cache’da Blob saqlanmaydi.
- Requestga **applied** `fromDate`, `toDate`, `terminalId`, `status`, `search` snapshoti kiradi; bo‘sh optional fieldlar yuborilmaydi, `status=0` saqlanadi. **`page`/`size` yuborilmaydi**. `merchantId/bankAccountId/distributionStatus/sort` ixtiro qilinmaydi.
- Label: “Tanlangan filtrlar bo‘yicha XLSX”. Bu joriy 10 qatorni frontendda yig‘ish emas; actual backend export fayli. FX ustunlari backend faylida bo‘lsa frontend ularni qayta hisoblamaydi/tahrirlamaydi.
- Binary request existing protected-read session boundary’dan o‘tadi; bearer faqat transport callback ichida. Zarur bo‘lsa transportni explicit response reader bilan kengaytir, generic JSON decoder’ga binary body berma. Safe GET uchun mavjud ko‘pi bilan bitta refreshable 401 replay qoidasi; POST policy bilan aralashtirma.
- Status/envelope xatolari downloaddan oldin tekshiriladi. HTTP 200 JSON business error, HTML/gateway page, bo‘sh/opaque response va unexpected MIME fayl sifatida berilmaydi. Expected Content-Type’ni resource’dan tasdiqla; octet-stream qabul qilish uchun ham contract dalili kerak. ZIP signature screening mumkin, lekin XLSX validligining to‘liq isboti deb yozma.
- Body bir marta o‘qiladi; binary success Blob sifatida olinadi. JSON error branch alohida decode qilinadi. [Response.blob](https://developer.mozilla.org/en-US/docs/Web/API/Response/blob).
- Filename source’dagi `dynamic-qrs.xlsx` bilan fallback qiladi. Content-Disposition’dan foydalanilsa filename sanitization: path segment, control/CRLF va xavfli nomlarni tashla; `.xlsx` extensionni saqla. Header brauzerga ochilmasa known fallback ishlaydi; buning o‘zi exportni bloklamaydi. Cross-origin custom response header o‘qish uchun server expose configuration kerak. [Access-Control-Expose-Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Expose-Headers).
- In-flight paytida duplicate click dispatch bo‘lmaydi. Applied export filterlari o‘zgarsa eski exportni abort/invalidate qil; kech tugagan eski snapshot download boshlamasin. Faqat draft input yoki list page almashishi export filterini o‘zgartirmaydi.
- Blob va object URL faqat current scope/intent uchun; download triggerdan oldin scope qayta tekshiriladi. Temporary anchor olib tashlanadi; object URL browser downloadni boshlashiga imkon bergach revoke qilinadi, cancel/unmount/scope cleanup ham mavjud.
- UI browserga download topshirilganini aytadi; diskka saqlanishini tekshirmasdan “diskka saqlandi” demaydi. User Cancel/abort download kutishini to‘xtatishi mumkin, bu payment cancel endpointi emas.

## 9. Cancel oqimi va aniq chegara

Original audit local service ownershipni tekshirishi, Core cancel successdan keyin local statusni `20`ga o‘zgartirishini qayd etgan. **Allowed old-status transition va idempotency tasdiqlanmagan.**

- Live eligibility tasdiqlanmaguncha confirm-submit network chaqirmaydi. Status `0`, `10` yoki `50` ko‘rinishi asosida o‘zing allowlist yaratma. `CANCEL_PAYMENT` grant eligibility o‘rnini bosmaydi.
- D4.1 da Core/artifactdan eligibility ma’lum bo‘lsa exact qoidani, authority va unknown-status deny’ni ulash mumkin. Backend kelajakda `allowedActions` qo‘shishi taklif bo‘lishi mumkin, lekin hozirgi DTOdan uydirib o‘qilmaydi.
- Scope’dagi current selected row pkey ishlatiladi; URL path segment xavfsiz encode qilinadi, request body yo‘q. Pkey kiritib arbitrary paymentni cancel qilish formasi yo‘q.
- UI nomi “QRni/to‘lovni bekor qilish” source’dagi biznes ma’nosiga mos tanlanadi. “Pul qaytarildi” yoki refund va’dasi berilmaydi.
- Confirmation panel pkey, terminal, exact UZS amount va current statusni ko‘rsatadi. “Ortga” tugmasi request qilmaydi. Tasdiqlashdan oldin latest scope/access/eligibility qayta tekshiriladi; pending click bir marta ishlaydi.
- Confirmed `success=true, data=null` normal natija; object response majburlanmaydi. Current-scope dynamic/dashboard readlar invalidate qilinadi; optimistic status20 qo‘yilmaydi.
- Core/business rejection foydalanuvchiga tushunarli va sanitized xabar bilan; raw stack trace yo‘q. Unknown outcome’da §5.1 policy. Mavjud listni refetch qilib current statusni ko‘rish mumkin; auditda yo‘q `/status`, `/get-by-id`, `/cancel-status` endpointini qo‘shma.
- Live contract blocked bo‘lsa tegishli capability bor userga qisqa “Bekor qilish hozircha mavjud emas” holati ko‘rsatiladi; sababi contract docs’da. Permission yo‘q userga action/request yo‘q. Sahifada Core/JAR/enum kabi implementation tafsilotlari chiqmaydi.
- DEV simulator explicit synthetic eligibility bilan success/rejection/unknown/delayed scenario’larini beradi. Bu live eligibility dalili emas. Blocked live adapter va fully testable UI birga yakunlanishi mumkin; result buni ochiq yozadi.

## 10. Static QR read ekran

`GET /static-qrs/get-all` original auditda optional `merchantId`, `terminalId`, `regionId`, `districtId`, `search`, `page`, `size`ni oladi. Day 04 minimal UI **terminal + pagination**, search esa repository predicate tasdiqlangandan keyin. Date/status dynamic filterlarini ko‘chirma. Merchant/region/district lookup bu kun talab emas va default ID yuborilmaydi.

- Source DTO + mapper/SQL’dan field type/nullability/order/search ma’nosini chiqar. Critical row: exact id, kerakli terminal/merchant display, status; QR preview uchun canonical link field. ID number bo‘lsa safe/lossless qoidasi qo‘llanadi; stringga o‘tkazish orqali allaqachon yo‘qolgan precision tiklanmaydi.
- `link` va `redirectUrl` bir xil deb olinmaydi. QRga qaysi biri encode qilinishini manba tasdiqlasin; birini ikkinchisiga dalilsiz fallback qilma. Link projection noma’lum/yaroqsiz bo‘lsa shu row preview yopiq, tasdiqlangan list ma’lumoti qoladi.
- `minAmount/maxAmount` static QR uchun exact unit/scale tasdiqlanmaguncha ko‘rsatilmaydi. Dynamic create’dagi tiyin qoidasini avtomatik ko‘chirma; bu optional column gap’i listni to‘liq bloklamaydi.
- Source tasdiqlagan status label; boshqa kod neutral `Noma’lum (kod)`. Unknown code uchun action capability yoki aktivlik chiqarilmaydi.
- Backend page 0-based, UI 1-based; size `10/25/50`; apply/clear page0ga qaytaradi. Null/malformed page empty list emas. Backend ordering saqlanadi.
- Terminal lookup yo‘q, tanlangan terminal ham yo‘q bo‘lsa ruxsatli all-owned read ishlaydi. Tanlangan terminal lookup loss/permission change sabab tasdiqlanmasa explicit reset talab qilinadi; all-ownedga yashirin kengayish yo‘q.
- Loading/empty/error/retry/denied/contract-unavailable alohida. Retry faqat GET. QR detail/preview mavjud row’dan ochiladi; yangi details API kerak emas. Link copy va QR bir xil validated payloadni ishlatadi.
- Static QR create/edit/delete, fictitious enable/disable tugmalari yo‘q. “Active static QR” holati QR orqali biror payment amalga oshganini anglatmaydi.

## 11. Route va UI entry point’lar

| Route | Guard / surface |
|---|---|
| `/account`, `/dashboard`, `/dynamic-qrs` | Mavjud D2/D3 guardlar saqlanadi; dynamic listga ruxsatli action entrylari qo‘shiladi |
| `/dynamic-qrs/new` | Create capability uchun standalone create form; terminal/currency readiness form ichida |
| `/dynamic-qrs/export` | Export capability uchun standalone applied filter form + download; list permission shart emas |
| `/static-qrs` | Static read capability; mustaqil read registration |

Yangi new/export routelarini dynamic read guard ostiga joylashtirma. Header/nav’da tegishli permissionli user ularga kira olsin; create-only/export-only account listga access olmasin. Shared form/action bir marta implement qilinadi; list tugmasi shu route’ga o‘tishi mumkin. Dashboarddan create formiga hidden/PII state ko‘chirish talab emas.

Direct route ham auth/access/contractni tekshiradi. Exact safe returnTo allowlistga faqat tayyor uchta yangi route qo‘shiladi; wildcard/prefix/external URL qabul qilinmaydi. Existing account landing saqlanadi. Production route uchun DEV access bypass yo‘q.

## 12. Codex checkpointlari

### D4.0 — Baseline va carry-over

**Files:** actual docs, dashboard status/chart, dynamic filters/search, shared registry/composition.

- [ ] Project instructions, package/scripts va actual file inventoryni o‘qi. User o‘zgarishlarini saqla; re-scaffold, upgrade, git init yo‘q.
- [ ] CO-01–CO-06 jadvalini actual source bilan tekshir; `FIXED / MITIGATED / VERIFIED_NO_CHANGE / BLOCKED` va dalil yoz.
- [ ] CO-01 safe presentationni implement qil; status5/status25/search copy va current doc header’ni kerak bo‘lsa mosla. Status25 display-only qoladi; D3 filter `0/5/10/20/50`ni o‘zboshimcha kengaytirma.
- [ ] Closed D2 R1–R4, configured auth/read decoder va exact D3 authoritiesni saqla. D3 historic subsectionsni yangi active todo deb talqin qilma.

**Acceptance:** D3 carry-over uchun tekshiriladigan closure jadvali va mismatch regression testlari bor; live blockerlar frontend fix bilan yopilgan deb yozilmagan.

### D4.1 — Targeted contract extraction

**Files:** `DAY_04_ACTION_CONTRACT.md`, capability registry, feature wire schemas/adapters, `CONTRACT_GAPS.md`.

- [ ] Read-only `DynamicQrResource`, create/cancel service, export service, `CurrencyResource`/service, `StaticQrResource`/repository/DTO, `TerminalDropdownDTO`, `DynamicQrCreateRequest/Response`, security mappingni top.
- [ ] Mavjud shared 1.0.77 dalilidan QhCurrency serializationini aniqlashga harakat qil. Zarur JAR inspection commandni userga ber; runtime request/javap/buildni shu ish tartibida o‘zing ishga tushirma.
- [ ] Har endpoint uchun method/path, input field/type/nullability, envelope/binary/raw list, exact permission, money/link/error va side-effect cheklovini source path/symbol bilan yoz. Yetishmagan source’ga line number uydirma.
- [ ] Cancel eligibility/idempotency/partial-failure dalili bo‘lmasa action-specific blocker yoz. Static optional field yoki undisplayed FX gap’ini universal block qilma.
- [ ] Dalilli decoder/registrationni ulash; unknown real adapter fail-closed. DEV schema fixture haqiqiy wire contract o‘rnini bosmaydi.

**Acceptance:** Create/export/cancel/static/currency/terminal-limits alohida contract status olgan; bloklanmagan keyingi ish davom etadi.

### D4.2 — Mutation/download foundation

**Files:** existing session transport, kerakli mutation/download bridge, scoped action state va registry cleanup.

- [ ] §5 dagi current-scope, pre-dispatch refresh, one-dispatch, no-replay, no-queue va outcome modeli.
- [ ] Synchronous latch, controller-owned lifecycle; form unmount yoki mutation observer unmountiga critical invalidationni bog‘lama.
- [ ] Static/currency/limits read querylari va action results cleanup qo‘sh; tests permission-content revision va logoutdagi late response’ni tekshirsin.
- [ ] Binary protected read json read’ni buzmasin. HTTP200 business failure,401,403 va abort branchlari saqlansin.

**Acceptance:** Tokenlar UIga chiqmaydi; POST attempt count har intent uchun ≤1; stale completion hech qanday yangi UI/cache/download effekt qilmaydi.

### D4.3 — Create UI, adapter va QR result

**Files:** terminal/currency projections, exact amount parser, create feature/page, local QR component.

- [ ] §7 amount/form/lookup/error/unknown/success qoidalari; one active intent.
- [ ] Create-only permission uchun entry route; list/dashboard permission yo‘q holatda success ishlaydi va taqiqlangan refetch ketmaydi.
- [ ] Required source yetishmasa real submit disabled; normalized DEV implementation va tests tugatiladi.

**Acceptance:** Typed body dalilga mos; exact UZS boundaries; lookup error fake optionga aylantirilmagan; link uchun local QR/copy ishlaydi yoki dependency/manual step aniq qayd etilgan.

### D4.4 — XLSX export

**Files:** export adapter/action/filter projection/download helper + permission route.

- [ ] §8 serializer, applied snapshot, non-JSON success, error classification, abort/scope va filename/resource cleanup.
- [ ] Dedicated export access; binary file current page’dan yig‘ilmaydi. Tokenni URLga qo‘shib browser navigatsiyasiga bermagin.
- [ ] Valid binary fixture bilan test; HTTP200 JSON/HTML response’da anchor/download chaqirilmasin.

**Acceptance:** Export requestda page/size yo‘q, status0 bor; Blob query cache’da yo‘q; late/unauthorized download yo‘q.

### D4.5 — Cancel flow

**Files:** cancel eligibility policy, action adapter/controller, row confirmation UI, DEV scenarios.

- [ ] §9 confirmation/outcome/no-replay/invalidation; backend/Core gap’ini aniq capability gate bilan ifodala.
- [ ] Eligibility dalili bo‘lsa exact policy; bo‘lmasa live zero calls va contract-unavailable UI. Har ikkala branch uchun meaningful test.
- [ ] Duplicate click, Core rejection, unknown outcome va permissions revoked paytidagi late result.

**Acceptance:** Full testable frontend flow mavjud; live cancel faqat barcha dalil/access sharti bilan enabled. Source’da yo‘q transition yoki refund va’dasi yo‘q.

### D4.6 — Static QR read + route integration

**Files:** static feature/port/decoder/queries/page, ReadProvider/composition/navigation/returnTo.

- [ ] §10/11 page, filter, QR view va mustaqil permission/readiness.
- [ ] New read namespaces logout/access/source change’da tozalanadi. Active terminalni tasdiqlab bo‘lmasa explicit reset.
- [ ] Mavjud dark/red responsive layout, keyboard/focus/labels, 390px va desktop flow.

**Acceptance:** Static endpointga faqat supported params; synthetic fields/actions yo‘q; barcha direct-route gate ishlaydi.

### D4.7 — DEV verification va yakuniy docs

**Files:** existing DEV-only boundary, D4 simulator/fixtures/checklist, final result/gaps.

- [ ] §13 scenario’lari, per-endpoint request counters va abort-aware delayed responses.
- [ ] §14 regression/contract tests yoziladi; user-run buyruqlar aniq `package.json`ga mos beriladi.
- [ ] §15 manual checklist va §16 result report yaratiladi. User evidence bo‘lmasa `NOT_RUN`/`BLOCKED`, frontend code tayyor bo‘lsa `AWAITING_MANUAL_CHECKS`.

**Acceptance:** Har enabled control deterministic tekshiriladi; productionga DEV fixture/scenario/route import qilinmaydi; barcha tashqi blocker owner/evidence bilan qayd etilgan.

## 13. DEV simulator talablari

Existing DEV/demo dynamic import boundary’ni kengaytir; production mode’da route yashirishning o‘zi yetarli emas, import/asset ham izolyatsiyada bo‘lsin. Tavsiya entry: `/dev/actions/dynamic-qrs` va `/dev/read/static-qrs`. Actual nomlarni manual docs’da bir xil yoz.

- Same normalized ports; live transportga DEV fallback yo‘q. Synthetic auth token yaratma, global fetch’ni almashtirma.
- D3 23-row/7-day fixture va eski scenario’lar buzilmasin. D4 dataset alohida, fixed Tashkent clock bilan; create/cancel form uchun source-valid 32-hex terminal IDlar ishlat. D3 `T-01`/`T-02` fixturelarini validation bypass bilan create inputga bermagin.
- Currency, terminal limits va cancel eligibility DEV business fixture ekanini belgilash kerak; live schema tasdig‘i emas.
- `CREATE_ONLY` — auth bootstrap uchun kerakli grantlar + create + terminal/currency lookup, ammo dashboard/dynamic-read grantlari yo‘q. `EXPORT_ONLY` — auth + export, terminal tanlanmasa lookup shart emas. `STATIC_ONLY` — auth + static read, terminal tanlanmasa lookup shart emas. Scenario nomidagi “only” zarur auth/lookup dependency’larini olib tashlash degani emas.
- Create yangi rowni faqat simulator successda qo‘shadi; cancel synthetic state’ni faqat simulator successda o‘zgartiradi. Lookup/permission/contract unavailable holatida request counter o‘smaydi.
- Unknown mutation scenario server tomonda side effect bo‘lib, response yo‘qolgan holatni ham taqlid qilsin; client ikkinchi POST qilmasligi ko‘rinsin.
- Export uchun minimal **haqiqiy, ochiladigan XLSX** fixture ishlat. JSON/CSVni `.xlsx` deb nomlama. Bu faqat download transport smoke fixture bo‘lsa UI/docs’da shunday yoz; uning satrlari joriy filterga mos deb da’vo qilma. Filter serializer/snapshot alohida test bilan tekshiriladi; real export tarkibi faqat live manual check bilan tasdiqlanadi.
- Binary fixture yo‘q bo‘lsa test fixture generator kodini yozib user-run step ber; runtime XLSX dependency qo‘shish shart emas. Fixture/scenario’larni `public/`ga qo‘yib productionga avtomatik ko‘chirtirma. Fixture tayyor bo‘lmaguncha download browser check `NOT_RUN`, fake PASS emas.
- Request counterlar: dashboard, dynamic list, static list, terminal, currency, create, export, cancel alohida; payload snapshotdan faqat synthetic non-secret data ko‘rsat.

| Scenario | Kutiladigan natija |
|---|---|
| NORMAL | Lookup, create, server-style list refresh, valid QR/copy, XLSX smoke, static paging |
| CREATE_ONLY / EXPORT_ONLY / STATIC_ONLY / READ_ONLY | Faqat ruxsatli UI/requests; unrelated permission yo‘qligi mustaqil feature’ni bloklamaydi |
| TERMINAL_DENIED / CURRENCY_DENIED | Create cheklangan; tegishli boshqa feature ishlaydi |
| EMPTY_TERMINALS / BAD_LIMITS | Submit yo‘q; fake option/default limit yo‘q |
| BUSINESS_REJECTED / UNKNOWN_OUTCOME | Success ko‘rsatilmaydi; post-dispatch noaniqlikda avtomatik resend yo‘q |
| DELAYED + DOUBLE_CLICK | Bir intentga bitta POST/download; disabled pending |
| SESSION_REPLACED / PERMISSION_REVOKED | Result, QR link, query va download yangi scope’ga chiqmaydi |
| CANCEL_CONTRACT_BLOCKED | Ruxsat bo‘lsa ham live-equivalent gate’da cancel 0 calls |
| CANCEL_ALLOWED / REJECTED / UNKNOWN | Faqat DEV eligibility bilan confirmation va outcome branchlari |
| EXPORT_JSON_ERROR / EXPORT_DELAYED | Xato fayl bo‘lib tushmaydi; applied filter change/logout late downloadni to‘xtatadi |
| STATIC_EMPTY / ERROR / UNKNOWN_STATUS / BAD_LINK | List state to‘g‘ri; malformed link preview disabled |
| DASHBOARD_UNCATEGORIZED | CO-01 note va misleading foizni cheklash, metriclar saqlanadi |

## 14. Yoziladigan meaningful testlar

Mavjud Vitest config va test helperlarni ishlat. Har UI className/snapshot uchun test yozma; quyidagi biznes/security chegaralarini qamra. Runtime/test execution userda.

| Test guruhi | Asosiy assertion |
|---|---|
| CO-01/02/03 | Total10/categories7 misolida misleading processing40% diagram yo‘q; metriclar qoladi. Status25 neutral display-only, filterga qo‘shilmaydi. Search fixture pkey/RRNga emas terminal nomiga mos |
| Amount | `1000`, `1000,00`, `1000.01`, min/max; min−1/max+1 tiyin; `1e3`, negative, empty, `1000.001`, aralash separator rad; wire value exact |
| Lookup | Currency raw list to‘g‘ri decode; envelope deb o‘qimaslik; exact valid code tanlovi; empty/malformed bounds create’ni yopib, readni saqlaydi |
| Create/cancel dispatch | Parallel double-click bir request; pre-dispatch refresh failure POST0; dispatched401/timeout/abort POST1, replay0; backend-success/refetch-failure qayta POST qilmaydi |
| Offline / unmount | Offline paused POST reconnect’da ketmaydi; panel close/reopen unknown intentni auto-retry qilmaydi; callback unmountda critical invalidation yo‘qolmaydi |
| Outcomes | HTTP200 business failure success emas; malformed success post-dispatch noaniqlik; valid cancel data=null; no optimistic row/status |
| Scope | Deferred create/cancel/exportdan keyin logout/permission-content/source/session change → no late toast/cache/navigation/download; query cleanup yangi namespacesni qamraydi |
| Permissions | Read≠create≠export≠cancel≠static; create-only/export-only routes ishlaydi; denied action port call0; contract-blocked cancel call0 |
| Export | Applied params, status0, no page/size; binary success; JSON/HTML/empty rejection; filename fallback; filter change abort; object URL lifecycle |
| Static | Supported query subset, page reset, unknown status, optional bad link faqat previewga ta’sir qiladi; no dates/status params |
| QR payload | Renderer/copy faqat validated original URL; bad scheme rad; pkeydan URL yo‘q; returned querystring/encoding o‘zgarmaydi |

Test namunalari implementation signature’ini belgilamaydi; actual helperlarga mosla:

```ts
expect(parseUzAmount('1000.01')).toBe('100001');
expect(() => parseUzAmount('1000.001')).toThrow();

// Global bounds + lookup limits keyingi validation qatlami.
expect(validateCreateAmount('99999', confirmedLimits).ok).toBe(false);

// POSTdan keyingi timeout: outcome unknown; refresh transport retry qilmaydi.
await controller.submit(validInput);
expect(fakeTransport.createCalls).toBe(1);
expect(controller.snapshot().outcome.kind).toBe('unknown');

// Export current page bilan cheklanmaydi.
const params = buildExportParams(appliedFilters);
expect(params.get('status')).toBe('0');
expect(params.has('page')).toBe(false);
expect(params.has('size')).toBe(false);
```

Deferred-promise bilan stale outcome testini yoz; arbitrary sleep/timing testga tayanma. Existing D2 session/D3 GET refresh testlarini nusxalama; action qo‘shilishi ta’sir qilgan yangi holatlarni tekshir.

## 15. User bajaradigan verification

Codex source/test/doc yozgach actual package scripts bo‘yicha buyruqlarni beradi. Kerakli yangi QR package install yoki fixture generation qadami bo‘lsa oldin alohida ko‘rsatadi; no-op install/upgrade talab qilmaydi. `package.json`/lockfile mismatch bilan build PASS da’vosi yo‘q.

Odatdagi buyruqlar (actual scripts ustun):

```powershell
npm run lint
npm run typecheck
npm run test -- --run
npm run build
```

Existing test script allaqachon run mode’da bo‘lsa ortiqcha flagni olib tashla. Har command actual natijasi, test soni bo‘lsa uning outputi qayd etilsin. Codex bu komandalarni ishga tushirmaydi.

### 15.1 Browser checklist

- [ ] CO-01 mismatch/normal/zero, status5/25 va terminal-only search.
- [ ] Create minimum/maximum/decimal, terminal/currency empty/error/denied, old selected terminal lookupdan yo‘qolishi.
- [ ] Create success QRini telefon skaneri bilan o‘qiganda exact fixture link chiqadi; clipboard aynan shu link. DEVda real payment bajarilmaydi.
- [ ] Create-only va export-only user route’ga kira oladi; dynamic list access berilmaydi. Read-only user create/export/cancel request yuborolmaydi.
- [ ] Rapid double submit, pre-dispatch expired session, POSTdan keyingi lost response, panel close/reopen, network reconnect: duplicate action yo‘q.
- [ ] Confirmed create/cancel’dan keyingi GET failure actionni failurega aylantirmaydi; manual read refresh mumkin.
- [ ] Exportda applied dates/terminal/status0/search ko‘rinadi, page/size yuborilmaydi; fixture haqiqiy XLSX sifatida ochiladi. JSON error fayl sifatida tushmaydi.
- [ ] Delayed export davomida applied filter change yoki logout — eski download boshlanmaydi.
- [ ] Cancel confirm/ortga/success/rejection/unknown; contract blocked holatda counter0. Live eligibility fixture orqali ochilmaydi.
- [ ] Static filter/page/empty/error/unknown-status/link preview; unsupported filter/query param yo‘q.
- [ ] Logout, session switch va permission revocation vaqtida eski data/result/link/toast yo‘q; yangi namespaces cleanup.
- [ ] 390px va desktop: form/table/paging/QR overflow yo‘q; keyboard submit, focus return, dialog label, pending/error matnlari tushunarli.
- [ ] Mavjud D2 login/session va D3 dashboard/list routes uchun ta’sirlangan smoke regression; oldingi PASS yangi build uchun avtomatik ko‘chirilmaydi.

### 15.2 Production isolation

Production build’ni user tekshiradi. D2 auth-preview markerlari, D3 `D3-READ-DEMO-ONLY`/`D3-QR-DEMO-`, D4 `D4-ACTIONS-DEMO-ONLY`/`D4-QR-DEMO-` va fixture assetlari output’da bo‘lmasin. Actual old marker nomlarini repo’dan topib checklistga qo‘sh.

PowerShell text-marker tekshiruvi uchun:

```powershell
Get-ChildItem dist -Recurse -File |
  Select-String -Pattern 'D3-READ-DEMO-ONLY','D3-QR-DEMO-','D4-ACTIONS-DEMO-ONLY','D4-QR-DEMO-'
```

Match yo‘qligi bir dalil; production asset inventory va browser route tekshiruvi ham kerak. Dev-only read/auth/action routelaridan hech biri productionda simulatorni ochmasin. Production live registries synthetic APIga fallback qilmasin. Build’ning demo flagga bog‘liq eski isolation qoidasi saqlanadi.

### 15.3 Live checks — faqat sharoit tayyor bo‘lsa

Authoritative URL/CORS, mos test account va kerakli contractlar bo‘lmasa bu bo‘lim `BLOCKED`. Codex external API chaqirmaydi. User test muhitida tekshiradi; real merchant QR/paymentni tasodifan mutate qilish uchun DEV scenario ishlatilmaydi.

- [ ] Auth login/get-me/refresh/logout va D3 readlar deployed tekshirildi; actual granted permissions sanitized qayd etildi.
- [ ] Currency raw list va terminal limits actual response contractga mos.
- [ ] Create faqat user tanlagan test terminal/amount bilan; bitta intentga bitta POST; pkey/link va QR payload tasdiqlandi. QR skan qilish paymentni avtomatik bajarish emas.
- [ ] Export actual XLSX ochildi; filterga mosligi, bir sahifadan ko‘p natija bo‘lsa paginationga cheklanmagani, filename/content-type/CORS va vaqt chegarasi dalili yozildi.
- [ ] Static actual page/ID/status/link fields contractga mos; source/range cheklovlari ko‘rsatildi.
- [ ] Cancel faqat tasdiqlangan eligibility va maxsus test QR uchun. Natija Core/backend contract bilan tekshirildi; dalil yo‘q bo‘lsa `BLOCKED`, xulosa uydirilmaydi.

Har evidence’da environment nomi, actual check va natija bo‘lsin; secret/header token/OTP/PIN kiritilmaydi. Runtime permission yetishmasligi contract noma’lumligini anglatmaydi: `ACCESS_DENIED` deb alohida yoz.

## 16. Yakuniy deliverable va completion mezoni

Execution chat quyidagilarni yaratadi/yangilaydi:

1. `docs/handoffs/QRHUB_FRONTEND_DAY_04_RESULT.md` — actual implementation inventory, carry-over closure, verification, qolgan ish.
2. `DAY_04_ACTION_CONTRACT.md` — actual docs katalogida, source/versiya dalilli endpoint/DTO/error/permission va feature matrix.
3. `DAY_04_MANUAL_CHECKS.md` — actual commandlar, DEV route/scenario, browser/production/live natijalari.
4. `CONTRACT_GAPS.md` — §2 tasnifi; closed masalalar active gap emas; backend limitation va action blocker aniq ajratilgan.
5. `DAY_03_READ_CONTRACT.md` — current header/status/search/CO-01 izohi; historic checkpointlar tarix sifatida saqlanadi. Auth behavior o‘zgarmasa auth docs’ni sababsiz qayta yozma.

Feature matrix alohida o‘qlar bilan bo‘lsin:

| Feature | Contract | Frontend | Actual access | Runtime |
|---|---|---|---|---|
| Auth / D3 reads | Old confirmed dalil saqlanadi | Existing + targeted regression | Granted/denied/not observed | PASS/FAIL/NOT_RUN/BLOCKED |
| Create | Confirmed/blocked + sabab | Implemented/partial | Exact grant va lookups | Alohida natija |
| Export | Confirmed/blocked + sabab | Implemented/partial | Exact export grant | Alohida natija |
| Cancel | Wire va eligibility **alohida** | Implemented-gated/partial | Exact cancel grant | Alohida natija |
| Static / currency / terminal limits | Har biri alohida | Implemented/partial | Har biri alohida | Har biri alohida |

`Frontend implemented` runtime success degani emas. `Actual access denied` boshqa user yoki mos grant bilan feature ishlamaydi degan xulosa emas. Verification PASS haqiqiy user daliliga tayanadi.

| Yakuniy status | Qachon ishlatiladi? |
|---|---|
| `DAY_04_IMPLEMENTED_AWAITING_MANUAL_CHECKS` | Unblocked code/test/docs tayyor, user verification hali tugamagan |
| `DAY_04_FRONTEND_COMPLETE_LIVE_BLOCKED` | Barcha unblocked frontend + explicit gated flowlar, lint/typecheck/tests/build/browser/isolation PASS; tashqi contract/runtime blockerlar ochiq |
| `DAY_04_COMPLETE` | Frontend mezonlari va barcha Day 04 live featurelar, jumladan cancel eligibility/runtime, talab darajasida tasdiqlangan |
| `DAY_04_INCOMPLETE` | Unblocked talablar bajarilmagan yoki verification FAIL; “complete” deb yopilmaydi |

Live summary uchun existing `LIVE_CONTRACT_BLOCKED` formatini saqla, lekin sabab/matrixni aniq yoz. Hammasi configured, runtime hali tekshirilmagan bo‘lsa buni `NOT_VERIFIED` sifatida izohla; “hamma schema unknown”ga qaytma. Ochiq cheklov bilan acceptance berilsa uning konkret scope/evidence’i yozilsin; Codex o‘zi business acceptance bermaydi.

Result oxiridagi copyable blok:

```text
DAY_04_STATUS:
LIVE_READINESS:

CO_01_DASHBOARD_RECONCILIATION:
CO_02_DOCS_STATUS_LABELS:
CO_03_TERMINAL_NAME_SEARCH:
CO_04_CREATE_LIMITS:
CO_05_GAP_SCOPE_CLASSIFICATION:
CO_06_LIFECYCLE_EVIDENCE:

CREATE_CONTRACT / FRONTEND / ACCESS / RUNTIME:
EXPORT_CONTRACT / FRONTEND / ACCESS / RUNTIME:
CANCEL_WIRE / ELIGIBILITY / FRONTEND / ACCESS / RUNTIME:
STATIC_QR_CONTRACT / FRONTEND / ACCESS / RUNTIME:
CURRENCY_CONTRACT / FRONTEND / ACCESS / RUNTIME:
TERMINAL_LIMITS_CONTRACT / FRONTEND / ACCESS / RUNTIME:

LINT:
TYPECHECK:
TESTS: result + actual count if supplied
BUILD:
D4_BROWSER_SCENARIOS:
D2_D3_AFFECTED_REGRESSION:
PRODUCTION_ISOLATION:
LIVE_CHECKS:

NEW_DEPENDENCIES_AND_USER_RUN_STEPS:
CHANGED_FILES:
OPEN_BLOCKERS_WITH_OWNER_AND_EVIDENCE:
KNOWN_BACKEND_LIMITATIONS:
DAY_05_INPUTS:
RESULT_REPORT: QRHUB_FRONTEND_DAY_04_RESULT.md
```

Day 04 ni yopish uchun tashqi kontraktni taxmin qilib to‘ldirish shart emas. Barcha bajarish mumkin bo‘lgan ishlar, aniq gated behavior va tekshiruv dalillari tayyor bo‘lishi shart. Keyingi Day 05 handoff Day 04 natijasi ko‘rib chiqilgandan keyin alohida tuziladi.
