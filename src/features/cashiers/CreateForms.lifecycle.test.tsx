// @vitest-environment happy-dom
import { chooseSelectOption } from '@/test/select-interaction'
import { act, StrictMode, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type { createCashierCreateController } from './create-cashier'
import type { createCreateQrController } from '@/features/dynamic-qr/create-qr'
import { notifyManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { useScopedActionRegistry } from '@/app/read/useScopedActionRegistry'
import { ProtectedReadContext, type ProtectedReadContextValue } from '@/shared/api/ProtectedReadContext'
import { AccessContext } from '@/shared/auth/useAccessContext'
import { readKeys } from '@/shared/api/read-keys'
import { deferred, syntheticProfileA } from '@/test/auth-fakes'
import { decodeCreateTerminalOptionsResponse } from '@/shared/contracts/terminal-lookup.contract'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import { CreateCashierContent } from './CreateCashierContent'
import { CreateQrContent } from '@/features/dynamic-qr/CreateQrContent'

const mounted: { root: Root; host: HTMLElement; client: QueryClient }[] = []
afterEach(async () => {
  for (const { root, host, client } of mounted.splice(0)) {
    await act(async () => root.unmount()); host.remove(); client.clear()
  }
  notifyManager.setScheduler((callback) => { setTimeout(callback, 0) })
  vi.unstubAllGlobals(); vi.unstubAllEnvs()
})
const permissions = ['CREATE_CASHIER', 'GET_CASHIERS', 'GET_DROPDOWN_TERMINALS', 'CREATE_DYNAMIC_QR', 'GET_CURRENCY_CODE', 'GET_DYNAMIC_QRS']

async function setup(flow: 'cashier' | 'QR', strict = false) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  notifyManager.setScheduler(queueMicrotask)
  vi.stubEnv('VITE_WEB_API_BASE_URL', 'https://web.example.test')
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const scope = { source: 'live', sessionScopeId: 'f08-dom', accessRevision: 1 } as const
  const cashierOptions = [{ id: 'new', name: 'New terminal' }]
  const qrOptions = decodeCreateTerminalOptionsResponse({ success: true, data: [{ id: '0123456789abcdef0123456789abcdef',
    name: 'QR terminal', minAmount: 100000, maxAmount: 2000000000 }] })
  client.setQueryData(readKeys.terminals(scope), cashierOptions)
  client.setQueryData([...readKeys.terminals(scope), 'create-limits'], qrOptions)
  client.setQueryData(readKeys.currencies(scope), decodeCurrencyOptionsResponse([{ code: 'UZS', nameUz: 'So‘m', status: 0 }]))
  const response = deferred<Response>()
  const fetchImpl = vi.fn<typeof fetch>(() => response.promise)
  vi.stubGlobal('fetch', fetchImpl)
  let granted = true
  const initialSnapshot: ProtectedReadContextValue['getSessionSnapshot'] = () => ({ phase: 'authenticated',
    sessionScopeId: scope.sessionScopeId, profile: { ...syntheticProfileA, permissions } })
  let getSessionSnapshot = initialSnapshot
  const mutation = vi.fn()
  const protectedMutation: ProtectedReadContextValue['protectedMutation'] = async (operation) => {
    mutation()
    try { return { status: 'success', data: await operation({ accessToken: 'dom-token', signal: new AbortController().signal }) } }
    catch { return { status: 'failed' } }
  }
  const confirmed = vi.fn()
  let registry!: ReturnType<typeof createActionRegistry>
  function Owner() {
    const actionRegistry = useScopedActionRegistry(scope)
    useEffect(() => { registry = actionRegistry }, [actionRegistry])
    const [open, setOpen] = useState(true)
    const runtime = { scope, getCurrentScope: () => scope, actionRegistry,
      capabilities: { terminalLookup: granted }, queries: {
        terminalLookupOptions: () => ({ queryKey: readKeys.terminals(scope), enabled: granted, queryFn: async () => cashierOptions }),
      } }
    const auth: ProtectedReadContextValue = { getSessionSnapshot, protectedMutation,
      bridge: { get: async () => { throw Error('Cached lookups should not dispatch') } } }
    return <ReadRuntimeContext.Provider value={runtime as unknown as ReadRuntimeContextValue}>
      <ProtectedReadContext.Provider value={auth}>
        <AccessContext.Provider value={{ kind: 'authenticated', permissions: new Set(granted ? permissions : []) }}>
          <button onClick={() => setOpen((value) => !value)}>{open ? 'Close form' : 'Open form'}</button>
          {open ? flow === 'cashier' ? <CreateCashierContent onConfirmed={confirmed} onPendingChange={() => undefined} />
            : <CreateQrContent embedded /> : null}
        </AccessContext.Provider>
      </ProtectedReadContext.Provider>
    </ReadRuntimeContext.Provider>
  }
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host); mounted.push({ root, host, client })
  const render = () => <QueryClientProvider client={client}>{strict ? <StrictMode><Owner /></StrictMode> : <Owner />}</QueryClientProvider>
  await act(async () => root.render(render()))
  // Capture the actual retained controller before closing; no replacement
  // factory is allowed to hide stale dependencies after reopening.
  const missingController = (): never => { throw new Error('Expected mounted create controller') }
  const cashierController = flow === 'cashier'
    ? registry.getOrCreate<ReturnType<typeof createCashierCreateController>>('cashier.create:live:f08-dom:1', missingController) : null
  const qrController = flow === 'QR'
    ? registry.getOrCreate<ReturnType<typeof createCreateQrController>>('dynamicQr.create:live:f08-dom:1', missingController) : null
  const edit = async (selector: string, value: string) => {
    const input = host.querySelector<HTMLInputElement>(selector)!
    expect(input).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const fillFields = async () => {
    if (flow === 'cashier') { await edit('input[autocomplete="name"]', 'Cashier'); await edit('#cashier-phone', '901234567') }
    else await edit('#create-qr-amount', '1000')
  }
  const fill = async () => {
    await fillFields()
    const select = host.querySelector<HTMLElement>('[role="combobox"]')!
    await chooseSelectOption(select, flow === 'cashier' ? 'new' : qrOptions[0]!.id)
  }
  const submit = async () => { await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
  const toggle = async () => { await act(async () => host.querySelector('button')!.click()) }
  return { host, fetchImpl, mutation, confirmed, fill, fillFields, submit, toggle,
    submitRetained: () => cashierController
      ? cashierController.submit({ fullname: 'Cashier', phone: '998901234567', terminalIds: ['new'] })
      : qrController!.submit({ draft: { terminalId: qrOptions[0]!.id, amountInput: '1000', currencyCode: 'UZS' },
        terminals: qrOptions, currencies: client.getQueryData(readKeys.currencies(scope)) ?? null,
        terminalLookupAllowed: true, currencyLookupAllowed: true }),
    revoke: async () => {
      granted = false
      getSessionSnapshot = () => ({ phase: 'authenticated', sessionScopeId: scope.sessionScopeId,
        profile: { ...syntheticProfileA, permissions: [] } })
      await act(async () => root.render(render()))
    },
    settle: async (unknown = false) => { await act(async () => {
      if (unknown) response.reject(new TypeError('Response lost'))
      else response.resolve(new Response(JSON.stringify({ success: true, data: flow === 'cashier' ? null : { pkey: 'pkey', link: 'opaque link' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }) },
  }
}

describe.each(['cashier', 'QR'] as const)('F08 real %s create composition', (flow) => {
  it.each([false, true])('retains one pending dispatch across close/reopen (StrictMode=%s)', async (strict) => {
    const h = await setup(flow, strict); await h.fill(); await h.submit()
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    await h.toggle(); await h.toggle()
    if (flow === 'cashier') await h.fill()
    await h.submit()
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    await h.settle()
    expect(h.host.textContent).not.toContain('Yuborilmoqda')
    if (flow === 'cashier') expect(h.confirmed).toHaveBeenCalledTimes(1)
    else expect(h.host.textContent).toContain('QR IDpkey')
  })

  it('preserves unknown across remount without replay', async () => {
    const h = await setup(flow); await h.fill(); await h.submit(); await h.settle(true)
    await h.toggle(); await h.toggle()
    if (flow === 'cashier') { await h.fill(); await h.submit() }
    expect(h.fetchImpl).toHaveBeenCalledTimes(1)
    expect(h.confirmed).not.toHaveBeenCalled()
    expect(h.host.textContent).toContain(flow === 'cashier' ? 'Holat noma’lum' : 'Qayta yuborishdan oldin holatni tekshiring.')
  })

  it.each([false, true])('consults a replacement committed auth getter before dispatch (StrictMode=%s)', async (strict) => {
    const h = await setup(flow, strict); await h.fill(); await h.revoke(); await h.submit()
    expect(h.fetchImpl).not.toHaveBeenCalled()
    expect(h.mutation).not.toHaveBeenCalled()
  })

  it.each([false, true])('updates retained dependencies when auth changes while closed (StrictMode=%s)', async (strict) => {
    const h = await setup(flow, strict)
    await h.fill()
    expect(h.host.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false)
    await h.toggle(); await h.revoke(); await h.toggle()
    // Text fields remain editable after remount; do not select from the
    // forbidden lookup. The committed replacement getter guards that render.
    await h.fillFields()
    const submit = h.host.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(submit.disabled).toBe(true)
    if (flow === 'cashier') {
      expect(h.host.querySelector<HTMLButtonElement>('[role="combobox"]')!.disabled).toBe(true)
      expect(h.host.querySelector('[role="status"]')?.textContent).toBe('Terminal tanlash uchun ruxsat mavjud emas.')
    }
    await act(async () => submit.click())
    // Defense in depth: a valid previously prepared request is still refused
    // by the retained controller after its committed auth getter is replaced.
    let result!: Awaited<ReturnType<typeof h.submitRetained>>
    await act(async () => { result = await h.submitRetained() })
    expect(result.kind).toBe('not-sent')
    expect(result).toHaveProperty('reason', flow === 'cashier' ? 'Kassir yaratish huquqi mavjud emas.' : 'Ruxsat mavjud emas.')
    expect(h.fetchImpl).not.toHaveBeenCalled()
    expect(h.mutation).not.toHaveBeenCalled()
    expect(h.confirmed).not.toHaveBeenCalled()
  })
})
