import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { ReadRuntimeContext, type ReadRuntimeContextValue } from '@/app/read/useReadRuntime'
import { AccessProvider } from '@/shared/auth/AccessContext'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import { ExportButton } from './ExportButton'

describe('export button access boundary', () => {
  it('keeps the Day 03 demo list usable without mounting the live binary bridge', () => {
    const scope: ReadScope = { source: 'demo', sessionScopeId: 'preview', accessRevision: 1 }
    const runtime = { scope, getCurrentScope: () => scope } as unknown as ReadRuntimeContextValue
    expect(() => renderToString(
      <AccessProvider value={{ kind: 'demo', grants: new Set(['dynamicQr.read']) }}>
        <ReadRuntimeContext value={runtime}>
          <ExportButton applied={{ fromDate: '2026-09-09', toDate: '2026-09-15', search: '', page: 0, size: 10 }} terminalValid />
        </ReadRuntimeContext>
      </AccessProvider>,
    )).not.toThrow()
  })
})
