// @vitest-environment happy-dom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountManagement } from '@/test/management-i18n-fixture'
import { createMessages } from '@/shared/i18n/messages'
import { TABLE_COLUMN_STORAGE_KEY } from '@/shared/table-columns/storage'
import { StaticQrPage } from './StaticQrPage'

const operations = vi.hoisted(() => ({ get: vi.fn(), fetch: vi.fn(), refetch: vi.fn(), keys: [] as string[] }))
vi.mock('@tanstack/react-query', async importOriginal => ({
  ...await importOriginal<typeof import('@tanstack/react-query')>(),
  useQuery: (options: { queryKey: readonly unknown[] }) => {
    operations.keys.push(JSON.stringify(options.queryKey))
    return { isPending: false, isError: false, isFetching: false, dataUpdatedAt: 0,
      refetch: operations.refetch, data: options.queryKey[3] === 'static-qrs'
        ? { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 } : undefined }
  },
}))
vi.mock('@/shared/auth/useAccessContext', () => ({ useAccessContext: () => ({
  kind: 'authenticated', permissions: new Set(['GET_STATIC_QRS']),
}) }))
vi.mock('@/shared/api/ProtectedReadContext', () => ({ useProtectedReadContext: () => ({
  bridge: { get: operations.get }, getSessionSnapshot: vi.fn(),
}) }))
vi.mock('@/shared/api/http', () => ({
  validateWebBaseUrl: () => ({ kind: 'valid', value: 'https://web.example.test' }),
  createHttpTransport: () => ({}),
}))
vi.mock('@/app/read/useReadRuntime', () => {
  const scope = { source: 'live', sessionScopeId: 'column-trigger', accessRevision: 1 }
  const lookup = () => ({ queryKey: ['lookup'], enabled: false })
  return { useReadRuntime: () => ({ scope, getCurrentScope: () => scope,
    readiness: { auth: { kind: 'configured' } }, queries: {
      merchantLookupOptions: lookup, terminalLookupOptions: lookup,
      regionLookupOptions: lookup, districtLookupOptions: lookup,
    },
  }) }
})

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  operations.keys.length = 0
  vi.stubGlobal('fetch', operations.fetch)
})
afterEach(() => vi.unstubAllGlobals())

describe.each(['uz', 'ru', 'en'] as const)('Static QR column trigger in %s', locale => {
  it('uses the Dynamic QR icon-only styling, translated tooltip and accessible name', async () => {
    const view = await mountManagement(locale, <StaticQrPage />)
    try {
      const messages = createMessages(view.runtime, 'common')
      const trigger = view.host.querySelector<HTMLButtonElement>(`button[aria-label="${messages.message('table.settings')}"]`)!
      expect(trigger).not.toBeNull()
      expect(trigger.textContent).toBe('')
      expect(trigger.querySelector('svg.lucide-columns-3')?.getAttribute('aria-hidden')).toBe('true')
      expect(trigger.getAttribute('data-size')).toBe('icon-sm')
      expect(trigger.className).toContain('size-10 rounded-xl bg-muted/30')
      expect(trigger.className).toContain('focus-visible:ring-3')
      expect(trigger.disabled).toBe(false)
      const tooltip = document.getElementById(trigger.getAttribute('aria-describedby')!)!
      expect(tooltip.getAttribute('role')).toBe('tooltip')
      expect(tooltip.textContent).toBe({ uz: 'Ustunlar', ru: 'Столбцы', en: 'Columns' }[locale])
      expect(tooltip.className).toContain('group-hover:visible')
      expect(tooltip.className).toContain('group-focus-within:visible')
      await act(async () => trigger.focus())
      expect(document.activeElement).toBe(trigger)
      await act(async () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(tooltip.className).not.toContain('group-focus-within:visible')
      await act(async () => { trigger.blur(); trigger.focus() })
      expect(tooltip.className).toContain('group-focus-within:visible')
      expect(operations.get).not.toHaveBeenCalled()
      expect(operations.fetch).not.toHaveBeenCalled()
      expect(operations.refetch).not.toHaveBeenCalled()
    } finally { await view.dispose() }
  })
})

it('updates the mounted tooltip and open sheet while preserving edited column preferences and query parameters', async () => {
  const view = await mountManagement('uz', <StaticQrPage />)
  try {
    const messages = createMessages(view.runtime, 'common')
    const trigger = view.host.querySelector<HTMLButtonElement>(`button[aria-label="${messages.message('table.settings')}"]`)!
    const tooltip = document.getElementById(trigger.getAttribute('aria-describedby')!)!
    await act(async () => trigger.focus())
    const keys = new Set(operations.keys)
    for (const locale of ['ru', 'en', 'uz'] as const) {
      await view.switchTo(locale)
      expect(tooltip.textContent).toBe({ uz: 'Ustunlar', ru: 'Столбцы', en: 'Columns' }[locale])
      expect(trigger.getAttribute('aria-label')).toBe(messages.message('table.settings'))
      expect(document.activeElement).toBe(trigger)
      expect(document.getElementById(tooltip.id)).toBe(tooltip)
    }
    await act(async () => trigger.click())
    const dialog = document.querySelector<HTMLElement>('[role=dialog]')!
    expect(dialog).not.toBeNull()
    const terminal = dialog.querySelector<HTMLElement>('[data-column-id=terminal]')!
    expect(terminal).not.toBeNull()
    await act(async () => terminal.querySelector<HTMLInputElement>('input')!.click())
    await act(async () => terminal.querySelectorAll<HTMLButtonElement>('button')[2]!.click())
    const saved = localStorage.getItem(TABLE_COLUMN_STORAGE_KEY)
    expect(saved).not.toBeNull()
    const preferences = JSON.parse(saved!).tables.staticQr
    expect(preferences.hidden).toContain('terminal')
    expect(preferences.order.indexOf('terminal')).toBeGreaterThan(preferences.order.indexOf('merchant'))
    for (const locale of ['ru', 'en'] as const) {
      await view.switchTo(locale)
      expect(document.querySelector('[role=dialog]')).toBe(dialog)
      expect(dialog.querySelector('[data-column-id=terminal]')).toBe(terminal)
      expect(terminal.querySelector<HTMLInputElement>('input')!.checked).toBe(false)
      expect(localStorage.getItem(TABLE_COLUMN_STORAGE_KEY)).toBe(saved)
      expect(new Set(operations.keys)).toEqual(keys)
    }
    await act(async () => dialog.querySelector<HTMLButtonElement>(`button[aria-label="${messages.message('table.close')}"]`)!.click())
    await vi.waitFor(() => expect(document.querySelector('[role=dialog]')).toBeNull())
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
    await act(async () => trigger.click())
    expect(document.querySelector<HTMLInputElement>('[data-column-id=terminal] input')!.checked).toBe(false)
    expect(localStorage.getItem(TABLE_COLUMN_STORAGE_KEY)).toBe(saved)
    expect(operations.get).not.toHaveBeenCalled()
    expect(operations.fetch).not.toHaveBeenCalled()
    expect(operations.refetch).not.toHaveBeenCalled()
  } finally { await view.dispose() }
})
