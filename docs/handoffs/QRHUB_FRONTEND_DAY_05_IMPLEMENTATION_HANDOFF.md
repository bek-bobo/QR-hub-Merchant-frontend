# QRHub Merchant Frontend — Day 05 Implementation Plan / Handoff

> **For agentic workers:** Use `superpowers:executing-plans` if available. Work inline with one agent; do not delegate. Codex reads/edits frontend source, writes focused tests and updates docs. The user runs installation, generators, lint, typecheck, tests, builds, dev servers and browser checks. Complete all unblocked Day 05 work without routine approval pauses. No backend mutation, external API execution, commit, push or deployment. These explicit workflow constraints override skill defaults about execution, commits and subagents.

**Goal:** Mavjud merchant frontendga terminallar, bank hisoblari va kassirlar ekranlarini, kassir yaratish hamda terminal biriktirish/ajratish oqimlarini qo‘shish.

**Architecture:** Day 04 dagi SessionController, scoped ReadProvider, action registry, one-dispatch controller, exact permission policy va LiveShellLayout qayta ishlatiladi. Yangi featurelar mustaqil read/action kontraktlari orqali ulanadi. Frontend completion, backend contract gaps va staging integration alohida qayd etiladi.

**Tech Stack:** Actual package/lockfile’dagi React + TypeScript + Vite, React Router, TanStack Query, Zod, Tailwind/shadcn/Radix, Lucide, Vitest va Oxlint. Native fetch va mavjud UI primitive’lar. Yangi majburiy dependency, framework almashishi yoki upgrade yo‘q; `qrcode.react@4.2.0` mavjud, lekin Day 05 yangi QR funksiyasi qo‘shmaydi.

**Spec:** Eng yangi `QRHUB_FRONTEND_DAY_04_RESULT.md`, `QRHUB_FRONTEND_DAY_04_ADDITIONAL_CHANGES.md`, `DAY_04_ACTION_CONTRACT.md`, `DAY_04_MANUAL_CHECKS.md`, `CONTRACT_GAPS.md`; yangi endpointlar uchun original `BACKEND_FRONTEND_CONTRACT_AUDIT.md`. Initial Day 01 roadmap’dagi D5 — terminals/bank accounts/cashiers.

**Target:** `D:\QR projects\qrhub-merchant-frontend`. Backend reference: `D:\QR projects\qrhub-merchant-service`, faqat read-only. Implementation pathlar frontend root’iga nisbatan. Ushbu chatda actual repo source yoki runtime tekshirilmagan; handoff user bergan yakuniy hisobotlar va auditga asoslangan. Execution chat actual fayl va signaturelarni topadi.

## 0. Boshlash uchun Codex prompt

Ushbu faylni `docs/handoffs/QRHUB_FRONTEND_DAY_05_IMPLEMENTATION_HANDOFF.md` qilib joylashtir. Spec fayllarining latest nusxalarini ber; upload nomidagi `(5)`/`(9)` nusxa suffixlari, repo nomi emas.

```text
QRHUB_FRONTEND_DAY_05_IMPLEMENTATION_HANDOFF.md bo‘yicha Day 05 ni bajar.
Frontend: D:\QR projects\qrhub-merchant-frontend.
Backend: D:\QR projects\qrhub-merchant-service — read-only reference.

Day 04 CLOSED:
DAY_04_FRONTEND_COMPLETE_STAGING_PENDING.
385/385 tests, 53/53 files; lint/typecheck/build/browser/regression/isolation PASS.
Faqat 2 accepted shadcn warning bor. AC-01 navy sidebar saqlanadi.
Resolved Day 04 ishlarini qayta audit/tuzatish uchun ochma.

Day 05 scope:
terminal list, bank-account list, cashier list/create/assign/unassign,
zarur merchant/bank/terminal lookup, independent permission/routes,
scoped lifecycle, DEV scenarios va manual verification hujjatlari.

Avval D5.0 da yangi endpointlarning source kontraktlarini aniqlagin;
keyin D5.1–D5.7 dagi barcha bloklanmagan ishlarni davom ettir.
Mavjud auth/read/action controller va exact can()ni qayta ishlat.
Request/response/enum/role/idempotency kontraktini taxmin qilma.

Staging integration — alohida external milestone. Uni Day 05 completion
shartiga aylantirma; staging API chaqirma yoki env/CORS tuzatishni boshlama.
Production deployment — Team Lead qarori, bu scope’da emas.
Day 04 create/cancel/link/static-preview gate’larini ochma.

Bir agent bilan code/test/docs yoz. Install/generator/lint/typecheck/test/
build/dev server/browser/API requestni ishga tushirma; men qo‘lda bajaraman.
Backendni o‘zgartirma; commit/push/deploy qilma; Day 06 ni boshlama.
Har checkpointdan so‘ng qisqa o‘zbekcha natija ber.
Oxirida Day 05 result, management contract va manual checksni tayyorla.
User evidence kelmaguncha verificationni PASS deb belgilama.
```

## 1. Qabul qilingan baseline — Day 04 qayta ochilmaydi

| Holat | Saqlanadigan qaror |
|---|---|
| Day 04 | `DAY_04_FRONTEND_COMPLETE_STAGING_PENDING`; frontend CLOSED |
| Latest command gate | Lint PASS, faqat 2 accepted shadcn warning; typecheck PASS; 385/385 tests, 53/53 files PASS; build PASS |
| Browser va isolation | D4.7 manual, responsive/accessibility, D2/D3 regression, production isolation PASS; marker scan no matches; DEV simulator productionda mounted emas |
| AC-01 | `src/app/layout/LiveShellLayout.tsx` desktop navy sidebar, light workspace, red accent. Supplied navigationItems’dan render qiladi; Day 04 da access/routing policy o‘zgarmagan |
| Staging | `STAGING_INTEGRATION: NOT_RUN / STAGING_PENDING`; alohida external milestone |
| Production | `OUT_OF_SCOPE; TEAM_LEAD_DECISION`. Local production build/preview isolation tekshiruvi deployment emas |

Day 05 yangi o‘zgarishlardan keyin o‘z verification gate’iga ega. Bu Day 04 ni incomplete qilish yoki uning testlarini baseline sifatida qayta ishlatib PASS yozish degani emas. Yangi kod sabab aniq regression topilsa Day 05 change doirasida tuzatiladi; unrelated re-audit yo‘q.

Day 04 result ichidagi 172…331 test sonlari, intermediate `DEFER_TO_D4_*` va checkpoint izohlari tarix. Yakuniy matrix, 385/385 dalil va user bergan final status authoritative closeout; historical matndan yangi incomplete task yaratma.

Quyidagi resolved ishlarni takrorlama: CO-01 reconciliation, CO-02 status5/25 va docs, CO-03 terminal-name search, CO-04 create limits projection, CO-05 gap tasnifi, CO-06 action lifecycle evidence, currency item source-level schema C-01a, D4 export, supported static list, DEV isolation va AC-01. Shared 1.0.77 uchun allaqachon berilgan javap dalilini takror so‘rama.

### Saqlanadigan Day 04 feature cheklovlari

| Feature / gap | Day 05 qarori |
|---|---|
| Live QR create — C-01b | Core currencyCode semantics/catalog tasdiqlanmagan; create port null va submit disabled qoladi |
| Dynamic returned link — B-09 | Live scheme policy yopiq; link/copy/QR uchun fake test policy live’ga o‘tmaydi |
| Cancel — B-06a/b/c | Production cancel gate yopiq; live row POST qo‘shilmaydi |
| Static QR — B-08 | Supported list saqlanadi; status raw numeric, canonical link/preview/copy yo‘q |
| B-01…B-05, B-07 | Applicable backend limitations va optional field gaplar saqlanadi; yangi barcha featurelarni global bloklamaydi |
| S-01…S-04 | Base/gateway, CORS, actual staging grants, runtime tekshiruvi keyingi external milestone’da |

D4 hisobotidagi “future design refinement” Day 05 uchun dizayn yo‘nalishi. Bu kun yangi ekranlar mavjud token/patternlarga moslanadi; barcha eski sahifalarni qayta bezash, sidebarni almashtirish yoki auth/action core refactor scope emas.

## 2. Day 05 scope

| Natija | Shu kun bajariladigan ish |
|---|---|
| Terminallar | Server pagination, dalilli search, merchant/bank filterlari, supported read-only fields |
| Bank hisoblari | Server pagination, dalilli search, merchant filtri; account rekvizitlari exact text |
| Kassirlar | Server list, merchant/terminal filterlari, mavjud biriktirishlarni ko‘rish |
| Kassir yaratish | F.I.Sh., telefon, terminal tanlash; independent create permission; one-dispatch outcome |
| Terminal biriktirish | Current cashier target + terminal selection; exact server semantics va assign permission |
| Terminal ajratish | Bitta cashier–terminal bog‘lanishini explicit confirmation bilan ajratish; cashierni o‘chirish emas |
| Foundation reuse | Scoped read/lookup keys, action cleanup, exact route/nav/returnTo gates |
| Verification surface | DEV-only deterministic scenarios, focused tests, user-run manual checklist va result |

Day 05 tashqarisida: terminal/bank account CRUD, cashier profile edit/delete/block/unblock, role/permission editor, PIN/password/OTP berish yoki SMS invitation, static QR preview/search kengaytmasi, QR create/cancel gate’larini ochish, P5/reset PIN, refund/settlement, full visual redesign. Region/district advanced filterlari shu kun talab emas. Staging/deploy alohida.

## 3. Yangi API va permission jadvali

Original audit quyidagi mavjud endpointlarni ko‘rsatgan. D5.0 har birini actual controller/security/service/DTO/SQL bilan tasdiqlaydi. Jadvaldagi source-level dalil staging PASS emas.

| Ichki capability nomi | Endpoint | Required authority | Input / result |
|---|---|---|---|
| `terminal.read` | `GET /terminals/get-all` | `GET_TERMINAL` | Optional merchantId, bankAccountId, regionId, districtId, search, page/size; `PageResponse<TerminalDTO>` |
| `bankAccount.read` | `GET /bank-accounts/get-all` | `GET_BANK_ACCOUNTS` | Optional merchantId, search, page/size; `PageResponse<BankAccountDTO>` |
| `cashier.read` | `GET /cashiers/get-all` | `GET_CASHIERS` | Optional merchantId, terminalId, search, page/size; `PageResponse<CashierDTO>` |
| `cashier.create` | `POST /cashiers/create` | `CREATE_CASHIER` | `CashierCreateRequest`; success envelope `data=null` |
| `cashier.assignTerminals` | `POST /cashiers/assign/terminals` | `ASSIGN_TERMINALS` | `AssignTerminalRequest`; success envelope `data=null` |
| `cashier.unassignTerminal` | `DELETE /cashiers/unassign/terminal` | `UNASSIGN_TERMINAL` | Required **query** cashierId, terminalId; success envelope `data=null` |
| `merchant.lookup` | `GET /dropdown/merchants` | `GET_DROPDOWN_MERCHANTS` | Current owner’s active merchant dropdown |
| `bankAccount.lookup` | `GET /dropdown/bank-accounts` | `GET_DROPDOWN_BANK_ACCOUNTS` | Optional merchantId; current owner scope |
| `terminal.lookup` — reuse | `GET /dropdown/terminals` | `GET_DROPDOWN_TERMINALS` | Optional merchantId; active/current-user assigned terminals |

Ichki capability nomlarini existing naming’ga mosla; authority nomlari bilan adashtirma. `GET_TERMINAL` singular, `GET_DROPDOWN_TERMINALS` boshqa grant. Bank list va bank dropdown ham alohida. `/merchants/get-all` uchun security mapping borligi controller borligini isbotlamaydi; undan foydalanma.

Role→permission DB-managed. Backend create paytida `ROLE_MERCHANT_USER` tanlashi frontendga role tanlash yoki shu rolega grantlar to‘plamini taxmin qilish huquqini bermaydi. `can()` exact get-me membership orqali ishlaydi; wildcard/admin shortcut/alias yo‘q.

### Day 05 yuboradigan list query subset

| Page | Applied request input |
|---|---|
| Terminals | merchantId?, bankAccountId?, search?, page, size |
| Bank accounts | merchantId?, search?, page, size |
| Cashiers | merchantId?, terminalId?, search?, page, size |

Optional qiymat tanlanmagan bo‘lsa umuman yuborilmaydi. `fromDate/toDate/status/sort` bu uch API uchun taxminan qo‘shilmaydi. Search qaysi fieldlarda ishlashi SQL’dan tasdiqlansin; “ID, nom, telefon bo‘yicha” kabi umumiy va’da dalilsiz berilmaydi. Search predicate source’da olinmasa qolgan listni tugat, shu search controlni unavailable qoldir va scope gap’ini yoz.

## 4. D5.0 da aniqlanadigan business contract

Bu targeted source extraction; Day 04 auditini takrorlash emas. `DAY_05_MANAGEMENT_CONTRACT.md` har qarorning actual path/symboli, versioni, field type/nullability va qarorini saqlasin. Backend source yo‘q bo‘lsa normalized UI/test/DEV tugatiladi, tasdiqlanmagan real adapter yopiq qoladi.

| O‘qiladigan manba | Javob olinadigan savol |
|---|---|
| TerminalResource/Service/Repository, TerminalDTO, mapper/migration | Query nom/type; search target; required/nullable fields; ordering; actual status/terminalType ma’nolari |
| BankAccount resource/service, `BankAccountRepositorImpl` yoki actual class, DTO/SQL | Owner filter; account/tin/MFO exact types; ID wire; search; status va pagination |
| Cashier resource/service/repository/DTO | List scope, search, id type, role/status shape; nested terminals to‘liqmi yoki filter/join natijasida subsetmi? |
| CashierCreateRequest | Actual fullname/phone/terminalIds validation; success body; duplicate phone va existing-user branchlari |
| AssignTerminalRequest + service/repository transaction | Assign mavjudlarga **qo‘shadimi yoki almashtiradimi**; existing/inactive assignment qanday ishlaydi; bulk operation atomicmi? |
| Unassign controller/service/repository | Query-only DELETE; bitta bog‘lanish; soft status/update/delete; last terminal, self-target yoki inactive membership cheklovlari bormi? |
| Dropdown source | Merchant/bank/terminal IDs va scope; merchant-filtered options; owner check bilan candidate lookup mosligi |
| SecurityConfig + shared 1.0.77 dalili | Har yangi endpoint exact required authority; success/error/null serialization |

Auditdan ma’lum validation: create’da nonblank `fullname`, 12-digit `998...` phone va nonempty terminal IDs; assign’da nonnull cashierId va nonempty/nonblank terminalIds. Request IDning Java turi, aniq JSON representation, transaction/duplicate behavior ushbu audit xulosasidan taxmin qilinmaydi.

### Gate qoidasini tor saqla

- Request/success/required business semantics va ownership chain source’dan tasdiqlansa frontend real adapterini configured qilish mumkin. Staging test bo‘lmaganligi uchun uni sun’iy “schema unknown” deb yopma.
- Missing idempotency guarantee — no replay/unknown-outcome policy uchun sabab; o‘z-o‘zidan barcha cashier mutationlarni taqiqlash sababi emas. Wire yoki assign-add-versus-replace kabi amaldagi niyat noma’lum bo‘lsa aynan shu action gate yopiladi.
- Bank statusning ayrim labeli yoki optional field noma’lum bo‘lsa list hammasi bloklanmaydi: unknown kod neutral, optional field ko‘rsatilmaydi.
- Shared currency QhCurrency schemasini qayta olish bu scope emas. Core currency/cancel/link gaplari cashier operatsiyalariga avtomatik ko‘chirilmaydi.
- New gap IDlari `D5-...` prefiksi bilan qo‘shilsin. Eski B/C/F/S IDlari qayta nomlanmaydi va yopilgan F-bandlar ochilmaydi.

## 5. Global constraints va mavjud arxitektura

- Project instructions va user o‘zgarishlarini saqla. Day 04 report frontend papkada `.git` yo‘qligini qayd etgan; actual holatni tekshir, git init yoki fake diff/commit dalili yo‘q.
- Actual package/lockfile ustun; ikki accepted shadcn warningni yo‘qotish uchun generated componentlarni unrelated refactor qilma.
- `SessionController.protectedRead` GET uchun existing bounded 401 refresh/replayni, 403 deny’ni boshqaradi. `protectedMutation` dispatchdan oldin refresh qiladi; dispatched write qayta yuborilmaydi.
- D4 `one-dispatch-action.ts`, `actionRegistry`, `useScopedActionRegistry`, synchronous `ReadProvider.getCurrentScope`, `invalidateAfterConfirmed` qayta ishlatiladi. Ikkinchi mutation framework, TanStack offline queue yoki action persistence qo‘shma.
- Scope `source + sessionScopeId + permission-content accessRevision`. Token query key/props/router state/loglarda yo‘q. Access revision oddiy access-token rotation sanog‘i emas.
- RAM intentlar page/panel replacement’dan yuqorida yashaydi; session/scope/logoutda tozalanadi. Token/PIN/OTP, kassir shaxsiy ma’lumoti va bank rekvizitlari log/fixture/URL history/localStoragega yozilmaydi. Zarur API query IDlari bundan farq qiladi; secrets queryga kirmaydi.
- Existing device UUID storage istisnosi saqlanadi; browser storage’ni kengaytirma. Full reload RAM intentni yo‘qotishi ma’lum cheklov.
- Shared qatlam feature/dev’ni import qilmaydi. App composition faqat haqiqiy configured yoki DEV inject qilingan portni ulaydi; live adapter errorida demo fallback yo‘q.
- No invented role grant, merchant ownerId, JWT secret yoki Core/P5 key. Ownership server JWT + SQL/service orqali tekshiriladi; dropdown/IDning o‘zi ruxsat isboti emas.
- Locale/date/money qoidalari saqlanadi. Bu kun bank balansi, pul oqimi yoki analytics metric hisoblanmaydi.

## 6. Fayl va interface xaritasi

Exact pathlar actual repo asosida tanlanadi. Quyidagilar taklif; mavjud faylni topmasdan uning mavjudligi haqida da’vo qilma.

| Joy | Mas’uliyat |
|---|---|
| Existing access/endpoints/registrations/live-route-policy/navigation | D5 capabilitylar, endpointlar, mustaqil route/nav guards |
| Existing ReadProvider/read keys/SessionCache/action registry | Yangi namespace cleanup, current-scope checks va action lifecycle reuse |
| `src/features/terminals/` | Contract mapping, read query/filter, table/page va tests |
| `src/features/bank-accounts/` | Contract mapping, exact-text account presentation, query/page/tests |
| `src/features/cashiers/` | Cashier list, create, assign, unassign, request/outcome/invalidation, UI/tests |
| Existing lookup/entity/contracts modullari | Merchant/bank options; existing terminal projectionning merchant-scoped reuse’i |
| `src/app/layout/LiveShellLayout.tsx` | Faqat yangi nav itemlarining existing shell’da joylashishi; shell/access rewrite yo‘q |
| Existing tokens/shared UI | Yangi ekranlar uchun mavjud spacing, tables, forms, Sheet/Dialog va state feedback |
| `src/dev/day5/` — yangi, existing DEV boundary ichida | Deterministic dataset, ports, named scenarios, per-endpoint counters |
| `docs/contracts/DAY_05_MANAGEMENT_CONTRACT.md` | Source-backed contract, action semantics va readiness |
| `docs/verification/DAY_05_MANUAL_CHECKS.md` | Actual commands/routes/scenario/evidence |
| `docs/handoffs/QRHUB_FRONTEND_DAY_05_RESULT.md` | Scope, implementation, checks, external pending va Day 06 inputs |

### Normalized boundary namunasi

Quyidagi TypeScript yangi frontend modelining namunasi; wire DTO yoki existing method signature deb qabul qilma. Existing equivalent type/method bo‘lsa qayta ishlat. No token/header maydoni.

```ts
type EntityId = string; // exact normalized ID, never a rounded Number
type PageSize = 10 | 25 | 50;
type PageInput = Readonly<{ page: number; size: PageSize }>;
type LookupOption = Readonly<{ id: EntityId; name: string }>;

type TerminalFilters = PageInput & Readonly<{
  merchantId?: EntityId; bankAccountId?: EntityId; search?: string;
}>;
type BankFilters = PageInput & Readonly<{
  merchantId?: EntityId; search?: string;
}>;
type CashierFilters = PageInput & Readonly<{
  merchantId?: EntityId; terminalId?: EntityId; search?: string;
}>;

type CreateCashierInput = Readonly<{
  fullname: string; phone: string; terminalIds: readonly EntityId[];
}>;
type AssignTerminalsInput = Readonly<{
  cashierId: EntityId; terminalIds: readonly EntityId[];
}>;
type UnassignTerminalInput = Readonly<{
  cashierId: EntityId; terminalId: EntityId;
}>;
```

List portlari confirmed minimal row DTO + existing `PageResponse` normalized variantini qaytaradi. Merchant/bank/terminal lookup `LookupOption[]` boundary’dan foydalanadi. Mutation portlari existing one-dispatch controller bilan confirmed void/proven rejection/unknown outcome’ni ajratadi; source success body’da yangi entity ID yo‘q bo‘lsa `CreateCashierResult.id` ixtiro qilinmaydi.

Wire ID Long JSON number bo‘lsa safe integer majburiy; canonical stringdan Numberga conversion faqat safe range va source-confirmed type bilan. Numeric string backend emits qiladi deb taxmin qilma. Already rounded numberni String/BigIntga o‘tkazib tuzatib bo‘lmaydi. Query parameterda string ishlatish wire JSON type’ni o‘zgartirish huquqini bermaydi.

## 7. Read, lookup va filter qoidalari

### 7.1 Yagona filter lifecycle

- Draft form query emas. Apply valid draftni normalized applied state qiladi; search trim, page0. Clear optional filterlarni olib tashlaydi, page0/size10; date filter yo‘q.
- Page API 0-based, UI 1-based; size10/25/50. Backend page metadata source truth; visible rows sonini totalElements deb ko‘rsatma. Status/search clientda joriy sahifani filtrlash orqali amalga oshirilmaydi.
- Query key filterlar, parent lookup ID, source/session/access revisionni qamraydi. Eski scope/permission response hech qachon active UIga chiqmaydi.
- Merchant drafti o‘zgarsa uning dependent bank/terminal draft selectioni tozalanadi. Yangi lookup result eski merchant uchun tanlangan IDni valid qilmaydi. Applied selection Apply/Clear bilan explicit o‘zgaradi; yashirin scope kengayishi yo‘q.
- Merchant-filtered terminal option kerak bo‘lsa existing terminal lookup input/key’iga mos dimension qo‘sh; D3/D4 no-merchant call va create/read projectionlari o‘zgarmasin. Cashier formga create QR min/max/currency lookup dependency yuklama.
- Optional lookup denied/unavailable va applied tanlov yo‘q bo‘lsa authorized unfiltered list ishlaydi. Applied selection tasdiqlanmay qolsa eski data yashiriladi, filtered request pausaga tushadi va explicit reset/reapply talab qilinadi.
- Read errors exact permissionni bera olmaydi; 403 lookup uchun “bo‘sh ro‘yxat” emas. Route readiness yetishmasa query boshlanmasidan unavailable state.
- Server ordering saqlanadi; yangi `sort` input yoki client tie-breaker yo‘q. Empty yoki mutationdan keyin page chegarasi o‘zgarsa mavjud helper bilan bounded clamp; qayta-qayta refetch loop yo‘q.

### 7.2 Row va status presentation

| Page | Minimal ko‘rinish | Chegara |
|---|---|---|
| Terminals | pkey/name, merchant/bank nomi, status; source-proven terminalType yoki address bo‘lsa optional detail | Type enum labeli dalilli; staticQrLink fieldi borligi QR previewni ochmaydi |
| Bank accounts | name, bankName, bankAccount, merchantName, status; source-valid tin/MFO/contractNumber optional detail | Account/MFO/TIN/contract raqamlari exact text; leading zero saqlanadi; pul formatida ko‘rsatilmaydi |
| Cashiers | fullname, phone, status, role display, nested terminal assignments va ruxsatli actionlar | Nested array coverage tasdiqlanmasa uni barcha assigned terminal katalogi deb talqin qilma |

Backend schema/migration nullability ustun. Optional missing field “—”; malformed required field contract error. Missing arrayni “kassirda terminal yo‘q” deb avtomatik `[]`ga aylantirma, agar source buni tasdiqlamagan bo‘lsa.

Status `0=active`ni original auditdagi umumiy gapdan barcha yangi entityga qo‘llama; aynan tegishli column/source predicate bilan tasdiqla. Unknown numeric/enum status neutral kod, `role` display authorization emas. Statusdan create/assign/unassign eligibility chiqarmagin; actionning server qoidasi alohida.

Bank account textni Number/parseInt/locale separator orqali aylantirma. Details faqat joriy row’dagi tasdiqlangan data’dan ochiladi; auditda bo‘lmagan detail API kerak emas. D5 endpointlarda balance/settlement/turnover yo‘q — shunday metric kartalar qo‘shilmaydi.

## 8. Kassir yaratish

- Route `cashier.create` bilan ochiladi; `cashier.read`, terminal list yoki bank list grantlari shart emas. Terminal tanlash uchun `terminal.lookup` kerak. Merchant dropdown faqat optional option filteri; uning yo‘qligi unfiltered valid terminal tanlovini yopmaydi.
- Form: `fullname`, `phone`, `terminalIds[]`. Backend source’da boshqa required field bo‘lmasa merchantId, ownerId, role, permission, password yoki PIN yuborma.
- Fullname trim qilinadi va nonblank bo‘lishi shart; o‘zbek/kirill Unicode ismga ASCII-only regex qo‘llama. Additional length/pattern faqat actual DTO dalili bilan.
- Phone UI policy: tashqi whitespace trim, bitta leading `+`ni olib tashlash mumkin; keyin `^998\d{9}$`. Misol `+998901234567` → `998901234567`. Ichki space/hyphen yoki boshqa belgilar silently yo‘qotilmaydi; xabar `998901234567` formatini ko‘rsatadi. Numberga aylantirma, `998`ni ikki marta qo‘shma.
- Terminal IDs exact valid lookup optionlardan olinadi, nonempty, deduplicated. Submit paytida scope/access va tanlangan barcha options qayta tekshiriladi. Active assigned dropdown server ownershipni almashtirmaydi; backend rad etsa uni chetlab o‘tma.
- Create default role’ni backend belgilaydi. Role select, permission editor, SMS yuborildi, parol/PIN tayyorlandi yoki kassir darhol login qila oladi degan va’da yo‘q.
- Confirmed void response’da “Kassir yaratildi”. Response ID yo‘q — fake ID, “yangi kassir detail” redirect yoki form inputidan fabricated list row yo‘q. `cashier.read` bo‘lsa ro‘yxatga o‘tish/yangilash mumkin; bo‘lmasa success summary va explicit yangi intent.
- Duplicate phone/existing user branchini source’dan aniqlab, proven business rejection bo‘lsa field/global error ko‘rsat. Phone mos row topilgani uncertain create muvaffaqiyatini isbotlaydi deb yozma.
- Pending/unknown/confirmed intent panel/page navigationda saqlanadi; faqat explicit yangi intent yoki scope cleanup bilan reset. Unknown create’da “Kassir yaratilgan bo‘lishi mumkin; qayta yuborishdan oldin ro‘yxatni tekshiring” izohi, avtomatik qayta submit yo‘q.

Frontend-only parser namunalari (actual helpers mavjud bo‘lsa ularni mosla):

```ts
export function normalizeCashierPhone(input: string): string {
  const phone = input.trim().replace(/^\+/, '');
  if (!/^998\d{9}$/.test(phone)) throw new Error('PHONE_FORMAT');
  return phone;
}

export function uniqueSelectedIds(ids: readonly EntityId[]): EntityId[] {
  if (ids.length === 0 || ids.some(id => id.length === 0 || id !== id.trim())) {
    throw new Error('TERMINAL_SELECTION');
  }
  return [...new Set(ids)];
}
// Keyingi guard har IDni current permitted lookup ichida validate qiladi.
```

## 9. Terminal biriktirish va ajratish

### 9.1 Assign — mavjud holatni dalilsiz almashtirma

List row → “Terminal biriktirish” Sheet/Dialog. Faqat `cashier.assignTerminals`; read permission actionni avtomatik bermaydi. List row target ishlatilgani uchun bu surface cashier read’ga ham tayanadi. Free-form cashierId kiritish oynasi yoki alohida cashier dropdown endpointi ixtiro qilinmaydi.

- Request `{cashierId, terminalIds}`; field wire type D5.0 bilan tasdiqlanadi. Terminal selector active/current-scope lookupdan; cashier ID current-scope row’dan.
- Source **additive assign**ni tasdiqlasa faqat qo‘shiladigan IDs yuboriladi; mavjud assigned IDs selectiondan chiqariladi yoki “Biriktirilgan” disabled holatida ko‘rinadi. Bu faqat nested assignments full/current ekanligi tasdiqlansa ishonchli.
- Source **replacement**ni tasdiqlasa bu alohida biznes oqimi: to‘liq current membership snapshot, added/removed confirmation va unknown/truncated membershipda blocked submit talab qilinadi. Qisman listdan replacement set yasash mumkin emas. Complete setni olish uchun mavjud read API yetmasa action-specific gap bilan gate yopiladi.
- Add-versus-replace noma’lum bo‘lsa live assign yopiq, frontend port/confirmation/DEV tests tayyorlanadi. Submit label source ma’nosiga mos; oddiy “Saqlash” bilan removalni yashirma.
- Terminal count/card faqat ma’lum coverage’ni ifodalaydi. Filtered nested assignment arraydan “barcha biriktirishlar” yoki “shu terminal aniq biriktirilmagan” degan xulosa chiqarilmaydi.
- Empty, duplicate-only yoki joriy scope’da tasdiqlanmagan selection dispatch qilmaydi. Inactive/existing assignment reactivation semantics dalilsiz aktivlashtirilmaydi.
- Bulk assign atomic bo‘lishi source’da tasdiqlanmasa failed response hamma narsa rollback bo‘ldi degani emas. Partial/uncertain outcome’ni §10 bo‘yicha ko‘rsat; clientdan bir nechta POST qilib batch’ni taqlid qilma.

### 9.2 Unassign — faqat bitta bog‘lanish

Cashier nested terminal row → “Terminalni ajratish”. Confirmation cashier fullname/ID va terminal name/IDni ko‘rsatadi; label “Kassirni o‘chirish” emas. Shared terminal boshqa kassirlardan ham olib tashlanadi degan xulosa yo‘q.

- `DELETE /cashiers/unassign/terminal?cashierId=...&terminalId=...`; parameters `URLSearchParams` orqali. Controller talab qilmasa JSON body yo‘q, ID path segmentga ko‘chirilmaydi.
- `cashier.unassignTerminal` alohida grant; target cashier va aynan shu nested membership current scope’da bo‘lsin. Terminal dropdowndan yo‘qolgan inactive assignmentni ko‘rsatmaslik orqali boshqaruvni yo‘qotma: existing relationship row va server eligibility qoidasi ustun. Unassign uchun terminal lookupni sun’iy majburiy qilma.
- Last terminal, current user/self-target, inactive/removed relationship kabi qoidalar source’dan keladi. “Oxirgi terminalni ajratib bo‘lmaydi” yoki “self-unassign mumkin” deb taxmin qilma.
- DELETE ham one-dispatch mutation boundary’dan o‘tadi. GET refresh/retry wrapperidan foydalanma; method nomi safe replay guarantee emas.
- Confirmed response → “Terminal ajratildi”; optimistic row removal yoki kassir o‘chirildi degan xabar yo‘q. Query refresh xatosi action successni failurega aylantirmaydi.
- “Ortga/Yopish” request yubormaydi. Dispatchdan keyin oynani yopish server amalini bekor qilganini anglatmaydi. Unknown response’dan keyin membershipni qo‘lda tekshirish va explicit yangi intent; blind retry yo‘q.

Query serializer namunasi — IDlar oldin source-confirmed guarddan o‘tadi:

```ts
export function buildUnassignQuery(input: UnassignTerminalInput): URLSearchParams {
  return new URLSearchParams({
    cashierId: input.cashierId,
    terminalId: input.terminalId,
  });
}
```

## 10. Mutation outcome, invalidation va scope

D4 controller kontraktini o‘qib reuse qil. Maxsus D5 controller faqat biznes input/outcome presentation va endpoint portini bog‘laydi; generic state machine nusxalanmaydi.

Intent immutable operation/target/payload snapshotiga tegishli bo‘lsin. Registry identity’da scope bilan birga action turi va mavjud target IDlar hisobga olinadi: create uchun scoped form intent; assign uchun cashier; unassign uchun cashier+terminal. Boshqa cashier panelini ochish eski target successini yangi targetniki qilib ko‘rsatmasin. Form o‘zgarishi allaqachon yuborilgan payloadni o‘zgartirmaydi.

Bitta cashier bo‘yicha assign yoki unassign pending bo‘lsa shu cashierga parallel qarama-qarshi write boshlanmasin; synchronous feature-level guard ikkinchi intentni yubormaydi va queue qilmaydi. Boshqa cashierlarni o‘qish davom etadi. Unknown outcome’dan keyin tegishli membershipsni qayta tekshirmasdan keyingi write auto-resume bo‘lmaydi. Bu frontend UX guardi, server concurrency kafolati emas.

| Vaziyat | Kutiladigan behavior |
|---|---|
| Form/access/config yaroqsiz yoki pre-dispatch refresh fail | `not-sent`, write transport count0 |
| Double click/Enter, panel reopen | Current intent uchun synchronous latch; ko‘pi bilan bitta write |
| Source-confirmed success envelope | `confirmed`; create/assign/unassign void successni to‘g‘ri decode qil |
| Proven validation/ownership/duplicate rejection | `rejected`, sanitized xabar; raw stack/server dump yo‘q |
| Dispatchdan keyin timeout/abort/401/5xx/invalid success body | `unknown`, avtomatik replay yo‘q; backend o‘zgarmagan deb da’vo qilma |
| 403 | Refresh yo‘q; write qayta ketmaydi; source’dan proven access rejection bo‘lsa shuni ajrat |
| Scope/source/accessRevision yo‘qolishi | Old result/cache/toast/navigation suppress; intent va PII tozalanadi |
| Confirmed actiondan keyin refetch failure | Confirmed holat saqlanadi, read error alohida; ikkinchi mutation yo‘q |

`success=false`ning o‘zi rollback isboti emas. D5 live rejection classifierni actual service/transaction/error semantics asosida yoz; fake-port `business-rejection` varianti live serverdan keladigan yangi JSON field emas. Explicit null yoki omitted data qabul qilish checked serializer daliliga mos bo‘lsin; har qanday HTTP200 success deb olinmaydi.

Create/assign/unassign’dan keyin current scope’dagi **barcha cashier list filter/page variantlari** stale bo‘lsin. Faqat permitted active readlar refetch qilinadi. Filterdan tashqaridagi list yoki faqat current page key’ini invalidate qilish yetarli emas. `cashier.read` yo‘q create-only user uchun cashier GET boshlanmaydi.

Source operations faqat other cashier membershipini o‘zgartirsa dashboard/dynamic/static/bank/terminal cache’larini sababsiz invalidate qilma. Agar self-target/current-user terminal scope o‘zgarishi mumkin bo‘lsa D5.0 buni alohida belgilasin: affected terminal lookup va terminal-scoped reads cancel/remove/revalidate qilinishi shart; eski access/data ko‘rinib qolmasin. Bu branch uchun maqsadli test yoz. Frontend boshqa kassirning aktiv session/JWT/cache’si darhol yangilandi deb kafolat bermaydi; cross-session propagation server mas’uliyati, kerak bo‘lsa external gap.

Yangi read/lookup namespaces current lifecycle cleanup’iga kirsin: terminal-list, bank-account-list, cashier-list, merchant lookup, bank lookup va yangi merchant-scoped terminal key varianti. Prefixlarni actual key factory’dan ol; unrelated querylar o‘chirilmaydi. Pending create/assign/unassign results ham `actionRegistry` orqali tozalanadi.

## 11. Route, access va dizayn

| Route / action surface | Guard | Qo‘shimcha shart |
|---|---|---|
| `/terminals` | `terminal.read` | Optional lookup grantlari applied filterga bog‘liq |
| `/bank-accounts` | `bankAccount.read` | Merchant lookup optional |
| `/cashiers` | `cashier.read` | Row actionlari alohida capabilities |
| `/cashiers/new` | `cashier.create` | Terminal lookup form uchun; cashier.read majburiy emas |
| Assign Sheet | `cashier.assignTerminals` | Current scoped cashier row va valid terminal choices; confirmed semantics |
| Unassign Sheet | `cashier.unassignTerminal` | Current scoped cashier–terminal relationship; server eligibility |

New/create route’ni cashier.read parent guard ostiga qo‘yma. Navbar va direct route bir xil permission/config policy’dan foydalanadi. Shared validated web-base registration reuse; source-confirmed adapter configured bo‘lishi mumkin, staging verified flag talab qilinmaydi. Anonymous→login, bootstrapping→pending, no grant→403, missing feature contract/config→specific unavailable state.

Exact safe returnTo allowlistga faqat yuqoridagi 4 tayyor route qo‘shiladi; wildcard/prefix/deep arbitrary ID yo‘q. Existing account landing va D4 routes o‘zgarmaydi. AC-01 shell `navigationItems`ni qabul qilishda qoladi; yangi entries registry/policy orqali qo‘shiladi, hardcoded privileged link emas.

Yangi page’larda existing design tokens: navy sidebar, light workspace, red primary button/icons, bir xil page title/toolbar, compact readable tables, coherent input/error/pending state. Unknown status gray/neutral; barcha status qizil bo‘lmaydi. Actual existing token bo‘lsa yangi hex rang yaratma.

390px: filters stacked, actions wrap, table faqat o‘z scroll containerida; butun page horizontal scroll yo‘q. Sheet/Dialog label, keyboard focus trap/return, focus-visible va pending/error matnlar bor. Red actionni faqat rang bilan tushuntirma. Cashier terminal ro‘yxati uzun bo‘lsa accessible expandable panel, hidden mass removal yo‘q. CSS-only o‘zgarish uchun className/screenshot assertionli keraksiz unit testlar yozilmaydi.

## 12. Codex checkpointlari

### D5.0 — Baseline + management kontrakt

**Files:** project instructions/package scripts, yangi contract doc, relevant backend source read-only, access/endpoints registration.

**Consumes:** Day 04 closed state va original D5 endpoint inventory. **Produces:** D5 source-backed contract matrix, actual frontend file inventory va independent feature gates.

- [ ] §1 baseline’ni qabul qil; Day 04 resultni status-downgrade yoki qayta audit qilma.
- [ ] §4 dagi source’ni targeted o‘qi: query/DTO/IDs/search/order/status, cashier create/assign/unassign semantics, null/error and ownership.
- [ ] `DAY_05_MANAGEMENT_CONTRACT.md`ga required fields, safe optional omissions, action semantics va actual source dalilini yoz.
- [ ] Exact mappings qo‘sh; hozir mavjud generic capabilityni tekshirmasdan dublikat yaratma.
- [ ] Missing field/action evidence uchun `D5-...` gap va tor gate. D4 B/C/S gaplarini shu kunning required taskiga aylantirma.

**Acceptance:** D5 wire/read/action matritsasi aniq; source-confirmed, contract-blocked va staging-not-run holatlari aralashmagan.

### D5.1 — Read contracts, lookup va scoped lifecycle

**Files:** shared/entity contractlar, lookup query helpers, read key factories, ReadProvider/cleanup va focused tests.

**Consumes:** D5.0 field/type va owner/filter dalili. **Produces:** validated minimal rows/pages, merchant/bank/terminal options, scoped queries.

- [ ] Critical fieldlarni decode qil; optional presentation field yo‘qligi hamma page’ni bloklamasin; unsafe Long raqam rad etilsin.
- [ ] §7 parent-filter/selection validation va request subset helpersni yoz. Existing D3/D4 terminal option projection/signature behaviorini saqla.
- [ ] Yangi key namespaces va scope cleanupni ro‘yxatdan o‘tkaz. GET dispatch/late result’da current scope va exact permission checks.
- [ ] Focused tests: nullable optional vs malformed required, parent lookup stale result, selected filter lookup loss, unauthorized query0 va new namespace cleanup.

Misol: new helper `buildTerminalQuery` faqat TerminalFilters’dan parametr chiqaradi; `merchantId`/bankId allaqachon validated.

```ts
export function buildTerminalQuery(f: TerminalFilters): URLSearchParams {
  const q = new URLSearchParams({ page: String(f.page), size: String(f.size) });
  if (f.merchantId !== undefined) q.set('merchantId', f.merchantId);
  if (f.bankAccountId !== undefined) q.set('bankAccountId', f.bankAccountId);
  if (f.search?.trim()) q.set('search', f.search.trim());
  return q;
}
// Bank/Cashier serializers o‘z confirmed subsetini chiqaradi; object spread bilan
// butun filter/form state yoki arbitrary router state queryga yuborilmaydi.
```

**Acceptance:** Permission yo‘q lookup unfiltered listni yopmaydi; applied invalid filter yashirin kengaymaydi; old-scope response ko‘rinmaydi.

### D5.2 — Terminal list

**Files:** `features/terminals` model/api/query/page/table/tests va route registration.

**Consumes:** D5.1 terminal page va scoped lookup. **Produces:** `/terminals` supported read UI.

- [ ] Server search/pagination va merchant→bank filters; minimal columns, optional detail va neutral unknown status.
- [ ] Loading/empty/error/denied/unavailable alohida, retry faqat safe GET.
- [ ] Source ordering va page metadata saqlansin; no terminal CRUD yoki QR link action.
- [ ] Test serializer/capability/lookup loss; UI tests meaningful empty/error/denied state, CSS snapshots emas.

**Acceptance:** Applied filter payload exact; terminal list va terminal dropdown grants alohida; account rekvizitlari yoki QR action taxmin qilinmagan.

### D5.3 — Bank account list

**Files:** `features/bank-accounts` model/api/query/page/table/tests va route registration.

**Consumes:** D5.1 bank page va optional merchant lookup. **Produces:** `/bank-accounts` read-only UI.

- [ ] Exact account/bank/merchant fields, source-proven search va paging. Account/MFO/TIN string ko‘rinishi saqlansin.
- [ ] Bank list permission bank dropdown permission o‘rnida ishlatilmasin.
- [ ] Leading-zero fixture, neutral unknown status va safe required/optional decoding tests.

**Acceptance:** Zero-prefixed rekvizit o‘zgarmaydi; balance yoki unsupported edit yo‘q; bank-only user boshqa readga grant olmagan.

### D5.4A — Cashier list va memberships

**Files:** cashier model/read query/list/assignment presentation/tests.

**Consumes:** D5.0 nested-array coverage va cashier status/role/search dalili. **Produces:** `/cashiers`, scoped selected target context.

- [ ] Applied merchant→terminal filterlar, pagination, search field-specific help.
- [ ] Nested terminals coverage’ni to‘g‘ri ifodala; role matnini grantga aylantirma.
- [ ] Table/Sheet selected targetini source/session/accessRevision bilan bog‘la. Scope yo‘qolsa target va PII yopiladi.
- [ ] Create/assign/unassign entrylari faqat tegishli grant; row read grantining o‘zi mutatsiyaga yetmaydi.

**Acceptance:** List readonly foydalanuvchida write0; target current row’dan, fabricated cashier ID yoki details API yo‘q.

### D5.4B — Cashier create

**Files:** create request/decoder/port/controller/form/page/tests, cashier invalidation selector.

**Consumes:** scoped terminal options va existing one-dispatch controller. **Produces:** `/cashiers/new` real configured yoki explicitly gated create flow.

- [ ] §8 form validation, typed body va void success. Duplicate phone handling source-grounded.
- [ ] Existing `protectedMutation` orqali one-dispatch port; before/after refresh scope/access recheck.
- [ ] Confirmed/unknown/rejected/not-sent UI, RAM intent ownership va permitted cashier invalidation.
- [ ] Test independent create access, double submit, malformed dispatched success, retained unknown intent, no hidden password/role/owner fields.

```ts
expect(normalizeCashierPhone(' +998901234567 ')).toBe('998901234567');
expect(() => normalizeCashierPhone('99890 1234567')).toThrow('PHONE_FORMAT');
expect(uniqueSelectedIds(['terminal-a', 'terminal-a'])).toEqual(['terminal-a']);
// These IDs only test de-duplication; request/lookup ID validation is separate.
```

**Acceptance:** Create-only route ishlaydi; invalid lookup dispatch0; confirmed void response’dan fake ID yaratilmaydi.

### D5.5A — Assign terminals

**Files:** assign request/decoder/port/controller/Sheet/tests.

**Consumes:** current cashier context, verified membership coverage, terminal lookup va D5.0 assign semantics. **Produces:** precise assignment flow yoki action-specific closed gate.

- [ ] Additive/replacement branchning faqat source-confirmed turini implement qil; §9.1 confirmation/coverage guard.
- [ ] Selectionni current candidate va permissions bilan qayta validate qil; duplicate-only/empty bo‘lsa request0.
- [ ] One bulk request; clientdan per-terminal fan-out, silent replace yoki optimistic assignment yo‘q.
- [ ] Test membership preservation: additive bo‘lsa B qo‘shilganda existing A request orqali olib tashlanmaydi; replacement bo‘lsa incomplete A snapshot submitni bloklaydi.

**Acceptance:** UI niyati server semanticsga mos; missing semantics butun cashier/read scope’ni to‘xtatmaydi.

### D5.5B — Unassign terminal

**Files:** unassign serializer/decoder/port/controller/confirmation/tests.

**Consumes:** exact selected relationship va server constraints. **Produces:** one relationship removal flow.

- [ ] §9.2 required query-only DELETE, explicit cashier+terminal confirmation va no GET wrapper.
- [ ] Confirm/back/pending/unknown/confirmed states; inactive lookup omission membership targetni yashirmasin.
- [ ] Confirmed-only cashier invalidation; last-terminal/self-target qoidalari actual source bilan.
- [ ] Test request path/query/body, cancel-dialog request0, dispatched failure attempt1/replay0, boshqa memberships untouched.

```ts
const q = buildUnassignQuery({ cashierId: '42', terminalId: 'terminal-a' });
expect(q.get('cashierId')).toBe('42');
expect(q.get('terminalId')).toBe('terminal-a');
expect([...q.keys()].sort()).toEqual(['cashierId', 'terminalId']);
```

**Acceptance:** Ajratish kassirni yoki terminalni o‘chirmaydi; POST/DELETE exception’lar no-replay boundary’dan chiqmaydi.

### D5.6 — Route/nav, coherent UI va DEV scenarios

**Files:** LiveRouter/shared route/nav policy/returnTo, new pages, `src/dev/day5` va DEV router.

**Consumes:** D5.2–5.5 feature surfaces. **Produces:** permission-independent navigation va reproducible local verification.

- [ ] §11 dagi exact routelar, direct URL guards va create-only accessni ulash. AC-01 shelldan foydalan.
- [ ] Yangi ekranlar title/filter/table/form/state patternlarini existing tokens bilan mosla; eski page redesign yo‘q.
- [ ] §13 dagi named scenario’lar va per-endpoint countersni qo‘sh; actual pages/controllers normalized ports bilan ishlasin.
- [ ] D4 gate’lari unchanged; DEV fixture importlari live compositiondan yetib borilmasin.

**Acceptance:** D5 UI barcha declared grant kombinatsiyasida tekshiriladi; appda secrets yoki real-network DEV dependency yo‘q.

### D5.7 — Verification package va closeout

**Files:** Day 05 management contract/manual checks/result, CONTRACT_GAPS’dagi faqat yangi D5 entries.

**Consumes:** implementation va user-run evidence. **Produces:** frontend status va alohida external milestone matrix.

- [ ] §14 testlar yozilgan; actual package scripts bilan user-run buyruqlar berilgan.
- [ ] Named browser checklar, 390px/desktop/a11y, impacted D2–D4 regression va production isolation checklist tayyor.
- [ ] User evidence kelgach actual PASS/FAIL/count yoziladi; undan oldin NOT_RUN. Tests count maqsad sifatida belgilanmaydi.
- [ ] §15 completion policy bo‘yicha result; staging pending va Team Lead deployment scope’i o‘zgarmaydi.

**Acceptance:** Bajarilgan/bajarilmagan scope, contract gate va manual evidence halol ajratilgan; eski D4 masalalari qayta opened emas.

## 13. DEV verification surface

Tavsiya etilgan routes: `/dev/day5/terminals`, `/dev/day5/bank-accounts`, `/dev/day5/cashiers`. Cashier preview ichida create/assign/unassign oqimlari bor; actual route nomlarini manual docs bilan bir xil saqla. Ular live router va returnTo allowlistda yo‘q.

- Existing `import.meta.env.DEV && VITE_APP_MODE=demo` lazy boundary saqlanadi. Feature/controller modullari DEV’ni import qilmaydi. Public folder yoki top-level live import orqali fixture buildga qo‘shilmaydi.
- Markerlar: `D5-MGMT-DEMO-ONLY`, `D5-MGMT-DEMO-`. Fixed instant `2026-09-15T07:00:00Z`, synthetic merchant/cashier/bank nomlari. Synthetic IDs wire guardlari bilan mos: Long kerak bo‘lsa safe numeric source, terminal pkey kerak bo‘lsa valid 32-hex. Real ism/telefon/bank account yo‘q.
- Minimum dataset: 2 merchant; paginationni ko‘rsatadigan terminal, bank-account va cashier listlar; har kamida bitta multi-page scenario. Cashierlarda no-assignment, one-assignment va multiple-assignment holatlari, leading-zero bank account, unknown status bor.
- Existing D3/D4 fixturelar o‘zgarmaydi. D5 filtered result/totals butun fixture datasetdan olinadi; faqat current page’da client filtering emas. Search actual source predicate’ni taqlid qiladi, noma’lum search qo‘shilmaydi.
- Same normalized pages/controllers, injected fake ports. Create success fake datasetga yoziladi; response haqiqiy void contractni taqlid qiladi. Assign/unassign faqat confirmed synthetic semanticsga muvofiq o‘zgartiradi; live contract gate’ini ochmaydi.
- Mutation `unknown` scenario’sida server-side fake change bo‘lib, response yo‘qolishi mumkin. Client avtomatik resend qilmaydi; keyingi read current state’ni ko‘rsatadi, aynan old request sababchi ekanini dalilsiz da’vo qilmaydi.
- Abort-aware delay/deferred completion bilan scope change va permission revoke ko‘rsatiladi. Fixed-clock/deferred-promise; testlar random timeoutga tayanmaydi.
- Counterlar har endpoint uchun: terminal list, bank list, cashier list, merchant lookup, bank lookup, terminal lookup, create, assign, unassign. Denied/gated calls0; replay count0. Global fetch monkey-patch, fake tokens yoki real API request yo‘q.

| Named scenario | Ko‘rinadigan natija / dalil |
|---|---|
| NORMAL | Uch list, parent filters, paging; exact account text; create/assign/unassign confirmation |
| TERMINAL_ONLY / BANK_ONLY / CASHIER_READ_ONLY | Faqat tegishli read; optional lookups deny holatida unfiltered read ishlaydi; write0 |
| CREATE_ONLY | Auth bootstrap + create + terminal lookup, cashier.read yo‘q; form/success ishlaydi, cashier GET0 |
| ASSIGN_ONLY / UNASSIGN_ONLY | Auth + cashier.read va tegishli action; assign uchun terminal lookup. Boshqa write grantlari yo‘q |
| LOOKUP_DENIED / EMPTY / ERROR | Optional unfiltered read saqlanadi; create/assign required selection yaroqsiz bo‘lsa write0 |
| PARENT_CHANGED / LOOKUP_LOST | Old merchant options/old applied bank/terminal ishlatilmaydi; explicit reset |
| UNKNOWN_STATUS / NULL_OPTIONAL / BAD_REQUIRED | Neutral status, optional “—”, required contract error; no fake empty success |
| DUPLICATE_PHONE / OWNERSHIP_REJECTED | Source-proven yoki explicitly synthetic rejection; no success/no automatic retry |
| DELAYED_DOUBLE_SUBMIT | Bir intentga bitta POST/DELETE; pending state va latch |
| UNKNOWN_AFTER_DISPATCH | No replay, retained unknown outcome, explicit new intent after recheck |
| CONFIRMED_REFETCH_FAILED | Action confirmed qoladi; read error alohida |
| SCOPE_CHANGED / PERMISSION_REVOKED | Eski row/result/form/PII/toast yangi scopega chiqmaydi |
| ACTION_CONTRACT_BLOCKED | Tegishli UI unavailable, action count0; unrelated readlar ishlaydi |

Scenario grant nomlaridagi “only” auth uchun zarur grantlarni olib tashlash degani emas. Fake full-access persona real role mappingni isbotlamaydi. Har jadval row real DEV control/test bilan bog‘lansin; named control yo‘q scenario browser PASS deb yozilmaydi.

## 14. Tests va user-run checks

### 14.1 Focused automated tests — Codex yozadi, user bajaradi

Existing Vitest/helpersni saqla. Test countni sun’iy oshirma; pure style yoki implementationni qaytaradigan testlar kerak emas. Quyidagi biznes chegaralari muhim:

| Guruh | Required assertion |
|---|---|
| Contracts / IDs | Correct envelope/page; malformed required vs nullable optional; unsafe Long reject; bank account exact text; role/statusdan grant yo‘q |
| Filter serializer | Har endpoint exact whitelist, trim, omit absent, page0/size; no date/status/sort; server pagination |
| Parent lookups | Merchant change dependent selectionni reset; delayed old options yangi parentni valid qilmaydi; applied lookup loss pauses GET |
| Permissions / routes | Read/create/assign/unassign mustaqil; list grant dropdown grant emas; create-only direct route; denied/gated port0; exact returnTo |
| Create | Phone/fullname/nonempty terminals, duplicate IDs, disappeared selection; response void success; no invented ID/PIN/role/owner field |
| Assign | Confirmed additive/replace semantics; partial membershipdan replace yo‘q; no per-ID fan-out; empty/duplicate-only guard |
| Unassign | DELETE exact query, no unexpected body; cancel dialog call0; cashier/other relationship untouched |
| Action lifecycle | Double-submit1; same-cashier concurrent assign/unassign second dispatch0; target switch no wrong success; pre-dispatch denied0; dispatched401/timeout/abort attempt1/replay0; malformed success unknown; no offline queue |
| Invalidation | Confirmed-only current-scope cashier keys; no cashier GET without grant; refetch fail confirmedni o‘zgartirmaydi; self-scope branch bo‘lsa affected caches clean |
| Scope privacy | Logout/source/session/accessRevision change’da new namespaces va forms/intents clear; delayed completion no toast/data/navigation |
| Integration regression | D4 controller/ReadProvider reuse existing behaviorni saqlaydi; old QR create/cancel/link/static-preview gates yopiq |

Representative pure test assertions (helperlar yuqorida berilgan):

```ts
const query = buildTerminalQuery({
  page: 0, size: 10, merchantId: '11', bankAccountId: '101', search: '  Demo  ',
});
expect(Object.fromEntries(query)).toEqual({
  page: '0', size: '10', merchantId: '11', bankAccountId: '101', search: 'Demo',
});
expect(query.has('status')).toBe(false);
expect(query.has('sort')).toBe(false);
expect(query.has('fromDate')).toBe(false);
```

Bank decoder test fixture `bankAccount='00000000000000000001'` decode/renderdan keyin aynan shu matn qolishini tekshirsin. No money formatter. Existing one-dispatch helper testlari nusxalanmaydi; D5 feature callback/DELETE/request-field/namespace wiringlari tekshiriladi.

### 14.2 Command gate

Day 04 dagi actual scriptlar quyidagicha. Execution chat package.jsonni tekshiradi; mavjud scriptga mos final command beradi. Codex ularni ishga tushirmaydi.

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Day 05 faqat frontend source/doc yozgani uchun baseline gate’ni qayta boshlash shart emas; o‘zgarishlar tugagach final gate va aniq failure uchun zarur rerun yetarli. Har command result actual evidence bilan; Day 04 385 sonini Day 05 natijasi deb ko‘chirma. Accepted ikki warning saqlanishi mumkin, yangi warninglar tekshiriladi. Unneeded install/generator yo‘q.

### 14.3 Browser checklist — staging talab qilinmaydi

User dev serverni o‘zi ishga tushiradi. Existing demo mode tartibi:

```powershell
$env:VITE_APP_MODE = 'demo'
npm run dev
```

- [ ] Terminal/bank/cashier listlarida loading→data, empty, error va retry; ko‘p sahifali dataset paginationi.
- [ ] Merchant→bank/terminal dependent filters, Apply/Clear; optional lookup deny bilan unfiltered read; applied lookup loss bilan explicit reset.
- [ ] Search help va result actual source predicatega mos. Bank leading zero, unknown status va nullable fields to‘g‘ri ko‘rinadi.
- [ ] Terminal-only/bank-only/cashier-read-only/create-only/assign-only/unassign-only permissions; actual counterlar ruxsatsiz request0ni ko‘rsatadi.
- [ ] Create validation, terminal selection, confirmed void result, duplicate/unknown/pending; new intent explicit, no hidden credential/invite promise.
- [ ] Assign existing membershipsni source semanticsga muvofiq saqlaydi; bulk result va no-op selection aniq.
- [ ] Unassign confirmation cashier+terminalni ko‘rsatadi; Back request0; boshqa kassir/terminal aloqalari o‘zgarmaydi.
- [ ] Rapid submit, delayed response, refetch failure, logout/scope/permission loss, panel close/reopen: no duplicate write yoki stale success.
- [ ] 390px va desktop: navy sidebar, new nav active state, filters/table/Sheet, no outer horizontal overflow; keyboard/focus/labels/error feedback.
- [ ] Day 02 auth UI/guard va Day 03/04 tegishli DEV scenario regressionlari; existing create/cancel/link/static-preview production gate’lari o‘zgarmagan.
- [ ] DEV Network’da unexpected backend request yo‘q. Bu staging validation deb yozilmaydi.

Normal/live route readiness/direct-URL guardlarni existing tests va unauthenticated production preview bilan tekshirish mumkin. Day 05 uchun real staging login yoki haqiqiy kassir yaratish/terminal ajratish talab qilinmaydi.

### 14.4 Production isolation — local build/preview

User local production buildni tekshiradi; bu release/deploy emas. D4 marker va DEV route coverage’ni saqla, D5ni qo‘sh. Actual marker nomlari repo’dan olinadi.

```powershell
Get-ChildItem -LiteralPath .\dist -Recurse -File |
  Select-String -SimpleMatch -Pattern `
    'DEMO-QR-',`
    'D3-READ-DEMO-ONLY',`
    'D3-QR-DEMO-',`
    'D4-ACTIONS-DEMO-ONLY',`
    'D4-QR-DEMO-',`
    'D5-MGMT-DEMO-ONLY',`
    'D5-MGMT-DEMO-'
npm run preview
```

Expected: no marker matches; old `/dev/auth`, `/dev/read/dashboard`, `/dev/read/dynamic-qrs`, `/dev/day4/actions`, `/dev/day4/static-qrs` va uchta new Day 05 route productionda simulatorni mount qilmaydi. Build assets’da demo fixture yo‘q. Normal production route guardlari ishlaydi; port xatosi demo fallbackga olib kelmaydi.

## 15. Deliverable va Day 05 yakunlash mezoni

Execution chat yaratadi:

1. `docs/handoffs/QRHUB_FRONTEND_DAY_05_RESULT.md`.
2. `docs/contracts/DAY_05_MANAGEMENT_CONTRACT.md`.
3. `docs/verification/DAY_05_MANUAL_CHECKS.md`.
4. Existing `docs/contracts/CONTRACT_GAPS.md`ga faqat yangi/actual D5 gap yoki dolzarb evidence. Oldingi ID/statuslar saqlanadi.

Resultda actual changed files va kerak bo‘lsa handoffdan asosli adaptation ko‘rsatiladi. Source-level configured adapter, frontend implemented va staging verified alohida ustunlar. Status shakli:

| Status | Shart |
|---|---|
| `DAY_05_IMPLEMENTED_AWAITING_MANUAL_CHECKS` | Barcha unblocked source/tests/docs tayyor, manual gate tugamagan |
| `DAY_05_FRONTEND_COMPLETE_STAGING_PENDING` | Unblocked D5 features va haqiqiy contract gap uchun explicit gated flowlar tayyor; user-run commands/browser/responsive/regression/isolation PASS |
| `DAY_05_INCOMPLETE` | Unblocked talab bajarilmagan yoki aniq test/manual FAIL; tashqi staging pendingning o‘zi bu statusga sabab emas |

No new contract gap bo‘lsa source-confirmed D5 adapterlar configured bo‘ladi. Zarur source topilmagan bo‘lsa to‘liq normalized UI/controller/tests va gate tugatiladi; result qaysi live feature gatedligini ko‘rsatadi. “Contract blocked” yorlig‘i bajarish mumkin bo‘lgan kod/test ishlarini tashlab ketishni oqlamaydi.

`STAGING_INTEGRATION` external milestone S-01…S-04’da qoladi. Day 05 endpointlari keyingi integration inventory’ga qo‘shiladi, shu kun ularni chaqirish yoki PASS qilish talab qilinmaydi. Actual account role/grants, CORS, gateway yoki deployment qarori frontend code completion bilan aralashmaydi. Production deployment Team Lead vakolatida.

### Final result uchun copyable blok

```text
DAY_04_BASELINE: CLOSED; DAY_04_FRONTEND_COMPLETE_STAGING_PENDING
DAY_05_STATUS:
STAGING_INTEGRATION: NOT_RUN / STAGING_PENDING — separate external milestone
PRODUCTION_DEPLOYMENT: OUT_OF_SCOPE; TEAM_LEAD_DECISION

D5_0_CONTRACTS:
D5_1_SCOPED_READS_LOOKUPS:
D5_2_TERMINALS:
D5_3_BANK_ACCOUNTS:
D5_4A_CASHIER_LIST:
D5_4B_CASHIER_CREATE:
D5_5A_ASSIGN:
D5_5B_UNASSIGN:
D5_6_ROUTES_UI_DEV:
D5_7_VERIFICATION:

TERMINAL_READ: contract / frontend / staging
BANK_ACCOUNT_READ: contract / frontend / staging
CASHIER_READ: contract / frontend / staging
CASHIER_CREATE: contract / frontend / staging
CASHIER_ASSIGN: semantics / contract / frontend / staging
CASHIER_UNASSIGN: constraints / contract / frontend / staging
MERCHANT_BANK_TERMINAL_LOOKUPS: per lookup status

LINT: actual result; accepted warnings; new warnings
TYPECHECK:
TESTS: actual result/count/files
BUILD:
D5_NAMED_BROWSER_CHECKS:
RESPONSIVE_ACCESSIBILITY:
D2_D3_D4_AFFECTED_REGRESSION:
PRODUCTION_ISOLATION:
DEV_MARKER_SCAN:
DEV_SIMULATOR_MOUNTED_IN_PRODUCTION:

AC_01_SHELL: preserved
D4_RESOLVED_WORK: not reopened
D4_FEATURE_CONTRACT_GATES: preserved
CHANGED_FILES:
NEW_D5_CONTRACT_GAPS_WITH_OWNER_AND_EVIDENCE:
REMAINING_UNBLOCKED_FRONTEND_WORK:
STAGING_MILESTONE_ADDITIONS: D5 endpoint inventory only
DAY_06_INPUTS:
RESULT_REPORT: QRHUB_FRONTEND_DAY_05_RESULT.md
```

Day 06 uchun keyingi roadmap P5 list/reset va supported account/profile polish bo‘lib qoladi; bu kun implement qilinmaydi. Day 05 final result qaytgach alohida review va Day 06 handoff tayyorlanadi.
