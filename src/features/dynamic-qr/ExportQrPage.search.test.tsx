// @vitest-environment happy-dom
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { DynamicQrQuickFilters } from './DynamicQrQuickFilters'
import type { ExportButton } from './ExportButton'
import { toDynamicQrExportQuery } from './export-filters'
import { ExportQrPage } from './ExportQrPage'

const bridge = vi.hoisted(() => ({ props: null as ComponentProps<typeof DynamicQrQuickFilters> | null, snapshots: vi.fn() }))
vi.mock('./DynamicQrQuickFilters', async (original) => {
  const actual = await original<typeof import('./DynamicQrQuickFilters')>()
  return { DynamicQrQuickFilters: (props: ComponentProps<typeof DynamicQrQuickFilters>) => {
    bridge.props = props
    return <actual.DynamicQrQuickFilters {...props} />
  } }
})
vi.mock('./DynamicQrAdvancedFilterFields', () => ({ DynamicQrAdvancedFilterFields: () => null }))
vi.mock('./filter-lookups', () => ({
  useDynamicQrFilterLookups: () => ({ appliedFilterState: 'valid', merchants: {}, draftBanks: {}, draftTerminals: {} }),
  advancedFilterFieldProps: () => ({}),
}))
vi.mock('./ExportButton', () => ({ ExportButton: ({ applied }: ComponentProps<typeof ExportButton>) =>
  <button data-testid="export" onClick={() => bridge.snapshots(toDynamicQrExportQuery(applied))}>Export</button>,
}))
let root: Root
let host: HTMLElement
beforeEach(async () => {
  vi.useFakeTimers()
  bridge.snapshots.mockClear()
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<ExportQrPage />))
})
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.useRealTimers()
})
async function advance(ms: number) { await act(async () => vi.advanceTimersByTime(ms)) }
async function exportNow() { await act(async () => host.querySelector<HTMLButtonElement>('[data-testid="export"]')!.click()) }

it('snapshots effective Search before/after 400 ms; Enter and clear never flush or auto-export', async () => {
  await act(async () => bridge.props!.onSearchDraftChange('old'))
  expect(host.querySelector<HTMLInputElement>('input')!.value).toBe('old')
  await advance(400)
  expect(bridge.snapshots).not.toHaveBeenCalled()
  await act(async () => bridge.props!.onSearchDraftChange('  AbC!  '))
  const submit = new Event('submit', { bubbles: true, cancelable: true })
  await act(async () => host.querySelector('form')!.dispatchEvent(submit))
  expect(submit.defaultPrevented).toBe(true)
  await advance(399); await exportNow()
  expect(bridge.snapshots.mock.lastCall![0].search).toBe('old')
  await advance(1)
  expect(bridge.snapshots).toHaveBeenCalledTimes(1)
  await exportNow()
  expect(bridge.snapshots.mock.lastCall![0].search).toBe('  AbC!  ')
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Qidiruvni tozalash"]')!.click())
  expect(host.querySelector<HTMLInputElement>('input')!.value).toBe('')
  await advance(399); await exportNow()
  expect(bridge.snapshots.mock.lastCall![0].search).toBe('  AbC!  ')
  await advance(1)
  expect(bridge.snapshots).toHaveBeenCalledTimes(3)
  await exportNow()
  expect(bridge.snapshots.mock.lastCall![0]).not.toHaveProperty('search')
})
