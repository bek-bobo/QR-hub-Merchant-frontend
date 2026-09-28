import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CreateQrControllerState } from './create-qr'
import { CreateQrResult } from './CreateQrResult'
import { copyExactCreateLink, presentCreateResult, validateCreateLink } from './create-result'

const scope: ReadScope = { source: 'live', sessionScopeId: 'session-a', accessRevision: 1 }
const original = 'https://example.test/pay/%2f?signature=a%2Bb&case=MiXeD'
const confirmed: CreateQrControllerState = {
  outcome: { kind: 'confirmed', data: { pkey: 'opaque-pkey', link: original } },
  intent: { terminalName: 'Terminal A', amountMinor: '100001', currencyCode: 'UZS', scope },
  closed: false,
}

function deferred() {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('create result and link security policy', () => {
  it('retains the exact original link including encoded query data when a scheme is explicitly allowed', () => {
    expect(validateCreateLink(original, ['https:'])).toEqual({ kind: 'available', original })
    expect(presentCreateResult(confirmed, ['https:'])).toMatchObject({
      kind: 'confirmed', pkey: 'opaque-pkey', terminalName: 'Terminal A',
      amountMinor: '100001', currencyCode: 'UZS', link: { kind: 'available', original },
    })
  })

  it.each(['', '   ', 'javascript:alert(1)', 'data:text/html,hi', 'file:///tmp/x',
    'https://user:pass@example.test/pay', '/relative/path'])('rejects unsafe or unconfirmed link %s', (link) => {
    expect(validateCreateLink(link, ['https:'])).toEqual({ kind: 'unavailable' })
  })

  it('keeps the live link unavailable because backend source confirms no accepted scheme', () => {
    expect(validateCreateLink(original)).toEqual({ kind: 'unavailable' })
    const result = presentCreateResult(confirmed)
    expect(result).toMatchObject({ kind: 'confirmed', pkey: 'opaque-pkey', link: { kind: 'unavailable' } })
  })

  it('renders confirmed QR creation data without claiming payment success or building a link from pkey', () => {
    const result = presentCreateResult(confirmed, ['https:'])!
    const html = renderToString(<CreateQrResult result={result} currentScope={() => scope}
      canCreate={() => true} onClose={() => undefined} onNewIntent={() => undefined} />)
    expect(html).toContain('opaque-pkey')
    expect(html).toContain('Terminal A')
    expect(html).toContain('UZS')
    expect(html).toContain('signature=a%2Bb')
    expect(html).not.toContain('to‘lov muvaffaqiyatli')
  })

  it('keeps confirmed result while hiding an invalid presentation link', () => {
    const invalid = { ...confirmed, outcome: { kind: 'confirmed' as const,
      data: { pkey: 'opaque-pkey', link: 'javascript:alert(1)' } } }
    const result = presentCreateResult(invalid, ['https:'])
    expect(result).toMatchObject({ kind: 'confirmed', pkey: 'opaque-pkey', link: { kind: 'unavailable' } })
  })

  it('keeps the unconfirmed live link out of rendered text and link attributes', () => {
    const result = presentCreateResult(confirmed)!
    const html = renderToString(<CreateQrResult result={result} currentScope={() => scope}
      canCreate={() => true} onClose={() => undefined} onNewIntent={() => undefined} />)
    expect(html).not.toContain(original)
    expect(html).not.toContain('href=')
    expect(html).toContain('havolani xavfsiz ko‘rsatib bo‘lmadi')
  })

  it('copies only the exact validated original after an explicit call and resolves success afterwards', async () => {
    const gate = deferred()
    const written: string[] = []
    const result = presentCreateResult(confirmed, ['https:'])!
    let completed = false
    const flight = copyExactCreateLink({
      result, currentScope: () => scope, canCreate: () => true,
      writeText: async (text) => { written.push(text); await gate.promise },
    }).then((value) => { completed = true; return value })
    expect(written).toEqual([original])
    expect(completed).toBe(false)
    gate.resolve()
    expect(await flight).toBe('copied')
    expect(completed).toBe(true)
  })

  it('does not report clipboard success on rejection or after scope replacement', async () => {
    const result = presentCreateResult(confirmed, ['https:'])!
    expect(await copyExactCreateLink({
      result, currentScope: () => scope, canCreate: () => true,
      writeText: async () => { throw Error('denied') },
    })).toBe('failed')
    let writes = 0
    expect(await copyExactCreateLink({
      result, currentScope: () => ({ ...scope, accessRevision: 2 }), canCreate: () => true,
      writeText: async () => { writes++ },
    })).toBe('stale')
    expect(writes).toBe(0)
  })

  it('hides unknown and stale results from confirmed-link actions', () => {
    const unknown: CreateQrControllerState = { ...confirmed, outcome: { kind: 'unknown', reason: 'uncertain' } }
    const result = presentCreateResult(unknown, ['https:'])!
    expect(result.kind).toBe('unknown')
    expect('link' in result).toBe(false)
    const html = renderToString(<CreateQrResult result={result} currentScope={() => scope}
      canCreate={() => true} onClose={() => undefined} onNewIntent={() => undefined} />)
    expect(html).toContain('Natija tasdiqlanmadi')
    expect(html).not.toContain(original)
    expect(presentCreateResult({ ...confirmed, outcome: { kind: 'stale' } })).toBeNull()
    expect(presentCreateResult({ ...confirmed, closed: true })).toBeNull()
    expect(renderToString(<CreateQrResult result={result} currentScope={() => ({ ...scope, sessionScopeId: 'b' })}
      canCreate={() => true} onClose={() => undefined} onNewIntent={() => undefined} />)).toBe('')
  })

  it('never attempts copy for unavailable link', async () => {
    const result = presentCreateResult(confirmed)!
    let writes = 0
    expect(await copyExactCreateLink({ result, currentScope: () => scope, canCreate: () => true,
      writeText: async () => { writes++ } })).toBe('unavailable')
    expect(writes).toBe(0)
  })
})
