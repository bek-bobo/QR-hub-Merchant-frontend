// @vitest-environment happy-dom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AccessProvider } from '@/shared/auth/AccessContext'
import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import type { ResultToast } from '@/shared/ui/ResultToast'
import { ExportButton } from './ExportButton'
import { toDynamicQrExportQuery } from './export-filters'

const state = vi.hoisted(() => ({
  scope: { source: 'live', sessionScopeId: 'session', accessRevision: 1 },
  getXlsx: vi.fn(),
  handoff: vi.fn(),
  toast: vi.fn(),
}))
vi.mock('@/app/read/useReadRuntime', () => ({
  useReadRuntime: () => ({ scope: state.scope, getCurrentScope: () => state.scope }),
}))
vi.mock('@/shared/api/ProtectedReadContext', () => ({
  useProtectedReadContext: () => ({
    bridge: { getXlsx: state.getXlsx },
    getSessionSnapshot: () => ({
      phase: 'authenticated', sessionScopeId: 'session',
      profile: { permissions: ['EXPORT_DYNAMIC_QRS'] },
    }),
  }),
}))
vi.mock('./export-download', async (original) => ({
  ...await original<typeof import('./export-download')>(),
  handoffXlsxDownload: state.handoff,
}))
vi.mock('@/shared/ui/ResultToast', () => ({
  ResultToast: (props: ComponentProps<typeof ResultToast>) => {
    state.toast(props)
    return null
  },
}))

const applied = { fromDate: '2026-10-05', toDate: '2026-10-08', search: 'Terminal', page: 0, size: 20 } satisfies DynamicQrFilters
let root: Root
let host: HTMLDivElement
beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_WEB_API_BASE_URL', 'https://merchant.example.com')
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  state.handoff.mockReturnValue(() => {})
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(
    <AccessProvider value={{ kind: 'authenticated', permissions: new Set(['EXPORT_DYNAMIC_QRS']) }}>
      <ExportButton applied={applied} terminalValid />
    </AccessProvider>,
  ))
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllEnvs()
})
async function download() {
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
}

it('dispatches success through the shared toast only after browser handoff, with unchanged export parameters', async () => {
  const file = { blob: new Blob(['xlsx']), filename: 'dynamic-qrs.xlsx' }
  state.handoff.mockImplementation(() => {
    expect(state.toast).not.toHaveBeenCalled()
    return () => {}
  })
  state.getXlsx.mockResolvedValue(file)
  await download()
  expect(state.getXlsx).toHaveBeenCalledWith(expect.objectContaining({ query: toDynamicQrExportQuery(applied) }), expect.any(AbortSignal))
  expect(state.handoff).toHaveBeenCalledWith(file)
  expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
    tone: 'success', title: 'XLSX yuklab olish brauzerga topshirildi.', placement: 'below-header',
  }))
  expect(host.textContent).not.toContain('XLSX yuklab olish brauzerga topshirildi.')
})

it('dispatches the existing failure copy through the same shared toast placement', async () => {
  state.getXlsx.mockRejectedValue(new Error('Download failed'))
  await download()
  expect(state.handoff).not.toHaveBeenCalled()
  expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
    tone: 'error', title: 'XLSX yuklab bo‘lmadi. Filtrlarni tekshirib, qayta urinib ko‘ring.', placement: 'below-header',
  }))
  expect(host.textContent).not.toContain('XLSX yuklab bo‘lmadi.')
})

it('reports handoff failure as an error without dispatching success', async () => {
  state.getXlsx.mockResolvedValue({ blob: new Blob(['xlsx']), filename: 'dynamic-qrs.xlsx' })
  state.handoff.mockImplementation(() => { throw new Error('Browser handoff failed') })
  await download()
  expect(state.handoff).toHaveBeenCalledTimes(1)
  expect(state.toast).toHaveBeenCalledWith(expect.objectContaining({
    tone: 'error', title: 'XLSX yuklab bo‘lmadi. Filtrlarni tekshirib, qayta urinib ko‘ring.', placement: 'below-header',
  }))
  expect(state.toast.mock.calls.some(([props]) => props.tone === 'success')).toBe(false)
})
