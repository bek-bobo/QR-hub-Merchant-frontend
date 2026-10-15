import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient } from '@tanstack/react-query'
import { createHttpTransport, validateWebBaseUrl } from '@/shared/api/http'
import { createProtectedReadBridge } from '@/shared/api/protected-read'
import { readKeys } from '@/shared/api/read-keys'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import { SessionController } from '@/shared/auth/session-controller'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { createLocaleRuntime } from '@/shared/i18n/runtime'
import { LocaleProvider } from '@/shared/i18n/LocaleProvider'
import type { LiveWebContext } from '@/app/read/useLiveWebContext'
import { createLiveCreateQrAdapter } from './live-create-adapter'
import { createCreateQrController } from './create-qr'
import { presentCreateResult } from './create-result'
import { CreateQrResult } from './CreateQrResult'

const envelope = { success: false, requestId: null, timeZone: null,
  error: { code: 10023, tag: 'BANK_ACCOUNT_STATUS_IS_NOT_ACTIVE', text: 'Bank hisobi holati faol emas' }, data: null }
const terminalId = '0123456789abcdef0123456789abcdef'
const terminals = [{ id: terminalId, name: 'Synthetic terminal', minAmountMinor: '100000', maxAmountMinor: '2000000000' }]
const currencies = decodeCurrencyOptionsResponse([{ code: 'UZS', nameUz: null, nameRu: null, nameEn: null, status: 0 }])
const permissions = ['CREATE_DYNAMIC_QR', 'GET_DROPDOWN_TERMINALS', 'GET_CURRENCY_CODE']
const input = { draft: { terminalId, amountInput: '1000.01', currencyCode: 'UZS' }, terminals, currencies,
  terminalLookupAllowed: true, currencyLookupAllowed: true }

async function setup({ status = 200, body = envelope as unknown, failure = '' } = {}) {
  const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue({ ...syntheticProfileA, permissions }) })
  const session = new SessionController({ api, cache: { clear() {}, cancel() {} }, now: () => 0, generateScopeId: () => 'business-fixture' })
  await session.establishSession(syntheticPairA, { release() {} })
  const fetchImpl = vi.fn<typeof fetch>(async (_url, init) => {
    if (failure === 'network') throw new TypeError('unsafe connection details')
    if (failure === 'timeout') return new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(new Error('unsafe timeout details')), { once: true })
    })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  })
  const base = validateWebBaseUrl('https://fixture.example/qh-merchant-web-api', 'production')
  if (base.kind !== 'valid') throw new Error('Invalid test base')
  const transport = createHttpTransport({ service: 'web', baseUrl: base.value, fetchImpl, timeoutMs: 10 })
  const scope = { source: 'live' as const, sessionScopeId: 'business-fixture', accessRevision: 1 }
  const queryClient = new QueryClient()
  queryClient.setQueryData([...readKeys.terminals(scope), 'create-limits'], terminals)
  queryClient.setQueryData(readKeys.currencies(scope), currencies)
  const context: LiveWebContext = {
    runtime: { scope, getCurrentScope: () => scope, capabilities: {} as LiveWebContext['runtime']['capabilities'] },
    auth: { getSessionSnapshot: session.getSnapshot, protectedMutation: operation => session.protectedMutation(operation),
      bridge: createProtectedReadBridge(session) }, queryClient, transport,
  }
  const adapter = createLiveCreateQrAdapter(() => context, scope)
  return { controller: createCreateQrController(adapter.controllerDependencies), fetchImpl, scope, session }
}

describe('HTTP → session → live adapter → decoder → controller → result presentation', () => {
  it.each([200, 400, 422, 500])('recognizes the exact rejection in an HTTP %s envelope without replay', async status => {
    const subject = await setup({ status })
    expect(await subject.controller.submit(input)).toEqual({ kind: 'rejected', reason: envelope.error.tag })
    expect(subject.controller.getState().intent).toMatchObject({ terminalName: 'Synthetic terminal', amountMinor: '100001' })
    expect(presentCreateResult(subject.controller.getState())).toMatchObject({ kind: 'rejected', reason: envelope.error.tag })
    await subject.controller.submit(input)
    expect(subject.fetchImpl).toHaveBeenCalledTimes(1)
    subject.controller.closeResult()
    expect(presentCreateResult(subject.controller.getState())).toBeNull()
    expect(subject.controller.getState().intent?.amountMinor).toBe('100001')
    expect(subject.controller.beginNewIntent()).toBe(true)
    expect(subject.controller.getState().intent).toBeNull()
    expect(subject.fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['uz', 'Bank hisobi holati faol emas', 'Tanlangan terminalga bog‘langan bank hisobining holatini tekshiring.'],
    ['ru', 'Банковский счёт неактивен', 'Проверьте статус банковского счёта, привязанного к выбранному терминалу.'],
    ['en', 'The bank account is inactive', 'Check the status of the bank account linked to the selected terminal.'],
  ] as const)('renders trusted %s copy from the actual pipeline and ignores backend text', async (locale, message, guidance) => {
    const subject = await setup({ body: { ...envelope, error: { ...envelope.error, text: '<script>unsafe internal exception</script>' } } })
    await subject.controller.submit(input)
    const result = presentCreateResult(subject.controller.getState())!
    const runtime = createLocaleRuntime(); await runtime.initialize(locale)
    const html = renderToStaticMarkup(<LocaleProvider runtime={runtime}><CreateQrResult result={result}
      currentScope={() => subject.scope} canCreate={() => true} onClose={() => {}} onNewIntent={() => {}} /></LocaleProvider>)
    expect(html).toContain(message); expect(html).toContain(guidance)
    expect(html).toContain('role="alert"')
    expect(html).not.toMatch(/unsafe|script|10023|BANK_ACCOUNT_STATUS/)
    expect(html).not.toMatch(/Natija tasdiqlanmadi|check the result|результат не подтверждён/i)
  })

  it.each(['network', 'timeout'])('keeps a %s failure indeterminate with one dispatch', async failure => {
    const subject = await setup({ failure })
    expect(await subject.controller.submit(input)).toMatchObject({ kind: 'unknown' })
    await subject.controller.submit(input)
    expect(subject.fetchImpl).toHaveBeenCalledTimes(1)
    expect(presentCreateResult(subject.controller.getState())?.kind).toBe('unknown')
  })

  it.each([
    '{malformed JSON', null, { success: false, data: null },
    { ...envelope, success: true }, { ...envelope, success: 'false' }, { ...envelope, data: {} },
    { ...envelope, error: { ...envelope.error, code: 99999 } },
    { ...envelope, error: { ...envelope.error, code: '10023' } },
    { ...envelope, error: { ...envelope.error, tag: 'UNRECOGNIZED', text: 'unsafe details' } },
    { ...envelope, error: { ...envelope.error, text: null } },
    { ...envelope, error: { ...envelope.error, text: '' } },
  ])('does not treat untrusted or inconsistent envelopes as a proven rejection: %j', async body => {
    const subject = await setup({ body })
    expect(await subject.controller.submit(input)).toMatchObject({ kind: 'unknown' })
    await subject.controller.submit(input)
    expect(subject.fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([401, 403])('preserves HTTP %s auth handling even with a recognized error body', async status => {
    const subject = await setup({ status })
    expect((await subject.controller.submit(input)).kind).not.toBe('rejected')
    expect(subject.session.getSnapshot().phase).toBe(status === 401 ? 'anonymous' : 'authenticated')
    await subject.controller.submit(input)
    expect(subject.fetchImpl).toHaveBeenCalledTimes(1)
  })
})
