import { describe, expect, it } from 'vitest'
import { ActionNotDispatchedError } from '@/shared/api/one-dispatch-action'
import { endpoints } from '@/shared/contracts/endpoints'
import { decodeCurrencyOptionsResponse } from '@/shared/contracts/currency.contract'
import { decodeCreateTerminalOptionsResponse } from '@/shared/contracts/terminal-lookup.contract'
import type { HttpTransport, TransportRequest } from '@/shared/api/http'
import type { ProtectedOperation } from '@/shared/auth/session-controller'
import { createLiveCreateQrPort } from './live-create-port'

const scope = { source: 'live' as const, sessionScopeId: 'session-a', accessRevision: 1 }
const terminalId = '0123456789abcdef0123456789abcdef'
const terminals = decodeCreateTerminalOptionsResponse({ success: true, data: [
  { id: terminalId, name: 'Terminal A', minAmount: 100000, maxAmount: 2000000000 },
] })
const currencies = decodeCurrencyOptionsResponse([{ code: 'UZS', nameUz: 'So‘m', status: 0 }])
const request = { terminalId, amount: 100000, currencyCode: 'UZS' }

function setup() {
  const requests: TransportRequest[] = []
  let permissions = ['CREATE_DYNAMIC_QR', 'GET_DROPDOWN_TERMINALS', 'GET_CURRENCY_CODE']
  let currentTerminals = terminals
  let currentCurrencies = currencies
  let transportFailure = false
  const transport: HttpTransport = {
    async request(input) {
      requests.push(input)
      if (transportFailure) throw new Error('ambiguous transport failure')
      return { ok: true, status: 200, headers: { contentType: 'application/json', requestId: null },
        body: { success: true, data: { pkey: 'created-pkey', link: 'opaque-returned-link' } } }
    },
  }
  let protectedCalls = 0
  const protectedMutation = async <T,>(operation: ProtectedOperation<T>) => {
    protectedCalls += 1
    try {
      return { status: 'success' as const, data: await operation({ accessToken: 'token', signal: new AbortController().signal }) }
    } catch {
      return { status: 'failed' as const }
    }
  }
  const port = createLiveCreateQrPort({
    transport,
    protectedMutation,
    getCurrentContext: () => ({ scope, permissions, terminals: currentTerminals, currencies: currentCurrencies }),
  })!
  return {
    port,
    requests,
    protectedCalls: () => protectedCalls,
    revokeCreate: () => { permissions = permissions.filter((value) => value !== 'CREATE_DYNAMIC_QR') },
    removeTerminal: () => { currentTerminals = [] },
    removeCurrency: () => { currentCurrencies = [] },
    failTransport: () => { transportFailure = true },
  }
}

describe('live dynamic QR create port', () => {
  it('is unavailable without a configured WEB transport', () => {
    expect(createLiveCreateQrPort({ transport: null, protectedMutation: async () => ({ status: 'failed' }),
      getCurrentContext: () => null })).toBeNull()
  })

  it('dispatches the exact bearer-protected endpoint and minor-unit body once', async () => {
    const subject = setup()
    await expect(subject.port.create(request, scope)).resolves.toEqual({
      success: true, data: { pkey: 'created-pkey', link: 'opaque-returned-link' },
    })
    expect(subject.protectedCalls()).toBe(1)
    expect(subject.requests).toHaveLength(1)
    expect(subject.requests[0]).toMatchObject({ endpoint: endpoints.createDynamicQr,
      credential: { kind: 'bearer', accessToken: 'token' }, body: request })
    expect(subject.requests[0]?.endpoint.path).toBe('/dynamic-qrs/create')
  })

  it('does not dispatch after permission revocation or a current selection disappearing', async () => {
    for (const invalidate of ['permission', 'terminal', 'currency'] as const) {
      const subject = setup()
      if (invalidate === 'permission') subject.revokeCreate()
      if (invalidate === 'terminal') subject.removeTerminal()
      if (invalidate === 'currency') subject.removeCurrency()
      await expect(subject.port.create(request, scope)).rejects.toBeInstanceOf(ActionNotDispatchedError)
      expect(subject.requests).toHaveLength(0)
    }
  })

  it('does not replay a mutation after a possibly dispatched transport failure', async () => {
    const subject = setup()
    subject.failTransport()
    await expect(subject.port.create(request, scope)).rejects.not.toBeInstanceOf(ActionNotDispatchedError)
    expect(subject.protectedCalls()).toBe(1)
    expect(subject.requests).toHaveLength(1)
  })
})
