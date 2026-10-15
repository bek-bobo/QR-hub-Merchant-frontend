// @vitest-environment happy-dom
import { act, type ReactNode } from 'react'
import { readFileSync } from 'node:fs'
import { createRoot, type Root } from '@/test/locale-fixture'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { PaginationBar } from './PaginationBar'
import { DateRangeQuickFilter } from '@/features/dynamic-qr/DateRangeQuickFilter'
const policy = readFileSync('src/shared/ui/cursor-policy.css', 'utf8')

let host: HTMLDivElement
let style: HTMLStyleElement
let root: Root
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div'); document.body.append(host)
  // happy-dom's CSS parser drops multiline functional selectors. Whitespace
  // normalization leaves the production selectors/declarations unchanged.
  style = document.createElement('style'); style.textContent = policy.replace(/\s+/g, ' '); document.head.append(style)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove(); style.remove()
})
async function render(children: ReactNode) { await act(async () => root.render(children)) }
function cursor(selector: string) {
  const element = host.querySelector(selector)
  expect(element).not.toBeNull()
  return getComputedStyle(element!).cursor
}

// Test the shared semantic stylesheet against real rendered controls. Browser
// verification separately covers Tailwind layer ordering and utility overrides.
describe('shared cursor policy', () => {
  it('owns enabled buttons, icon actions, slotted links and select triggers', async () => {
    await render(<>
      <Button id="button">Action</Button>
      <Button id="icon" size="icon" aria-label="Action"><svg /></Button>
      <Button asChild><a id="link" href="#target">Link action</a></Button>
      <Select id="select"><option value="a">A</option></Select>
    </>)
    for (const id of ['button', 'icon', 'link', 'select']) expect(cursor(`#${id}`)).toBe('pointer')
  })

  it('excludes native, ARIA, Radix and loading-disabled controls', async () => {
    await render(<>
      <Button id="native" disabled>Disabled</Button>
      <Button id="loading" disabled aria-busy="true">Loading</Button>
      <Select id="select" disabled><option value="a">A</option></Select>
      <a id="aria" href="#target" aria-disabled="true">Unavailable</a>
      <div id="radix" role="menuitem" data-disabled="">Unavailable</div>
      <button id="date" data-calendar-date="2026-10-01" disabled>1</button>
    </>)
    for (const id of ['native', 'loading', 'select', 'aria', 'radix', 'date']) {
      expect(cursor(`#${id}`)).toBe('default')
    }
  })

  it('covers menu items, navigation links and semantic actions without targeting content or text fields', async () => {
    await render(<>
      <a id="nav" href="#dashboard">Dashboard</a>
      <div id="menu" role="menuitem">Profile</div>
      <div id="action" role="button" tabIndex={0}>Action</div>
      <Input id="input" /><textarea id="textarea" />
      <div id="content">Content</div><span id="span">Caption</span>
      <table><tbody><tr><td id="cell">Cell</td></tr></tbody></table>
      <a id="anchor">Anchor without destination</a>
    </>)
    for (const id of ['nav', 'menu', 'action']) expect(cursor(`#${id}`)).toBe('pointer')
    for (const id of ['input', 'textarea', 'content', 'span', 'cell', 'anchor']) {
      expect(cursor(`#${id}`)).not.toBe('pointer')
    }
  })

  it('gives enabled pagination pointer and keeps the disabled previous control neutral', async () => {
    await render(<PaginationBar ariaLabel="Pages" currentPage={0} totalPages={3} totalItems={60}
      onPageChange={() => {}} onPageSizeChange={() => {}} />)
    for (const button of host.querySelectorAll('button')) {
      expect(getComputedStyle(button).cursor).toBe(button.disabled ? 'default' : 'pointer')
    }
    expect(host.querySelectorAll('button:disabled')).toHaveLength(1)
  })

  it('covers raw calendar days, month navigation, date trigger and reset without changing selection', async () => {
    const draft = vi.fn(), apply = vi.fn(), reset = vi.fn()
    await render(<DateRangeQuickFilter value={{ fromDate: '2026-10-14', toDate: '2026-10-14' }}
      onDraftChange={draft} onApply={apply} onReset={reset} />)
    const trigger = host.querySelector('button')!
    expect(getComputedStyle(trigger).cursor).toBe('pointer')
    await act(async () => trigger.click())
    const dialog = document.querySelector('[role=dialog]')!
    const dates = dialog.querySelectorAll<HTMLButtonElement>('button[data-calendar-date]')
    expect(dates.length).toBeGreaterThan(27)
    for (const button of dialog.querySelectorAll('button')) expect(getComputedStyle(button).cursor).toBe('pointer')
    expect(draft).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled(); expect(reset).not.toHaveBeenCalled()
    await act(async () => dates[0]!.click())
    expect(draft).toHaveBeenCalledOnce()
    expect(apply).not.toHaveBeenCalled()
  })
})
