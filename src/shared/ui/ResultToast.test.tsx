// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from '@/test/locale-fixture'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { ResultToast } from './ResultToast'

let root: Root
let host: HTMLDivElement
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

it.each([
  [undefined, 'top-4', 'sm:top-6'],
  ['below-header', 'top-24', 'top-24'],
] as const)('positions the body-portaled shared viewport for %s placement', async (placement, top, responsiveTop) => {
  await act(async () => root.render(
    <ResultToast tone="success" title="Download handed off" placement={placement} />,
  ))
  const item = document.body.querySelector<HTMLElement>('li[role="status"]')
  expect(item).not.toBeNull()
  const viewport = item!.closest('ol')!
  expect(viewport).not.toBeNull()
  for (const token of ['fixed', 'right-4', 'sm:right-6', top, responsiveTop, 'z-[100]']) {
    expect(viewport.classList.contains(token)).toBe(true)
  }
  expect(viewport.classList.contains(placement === 'below-header' ? 'top-4' : 'top-24')).toBe(false)
  expect(host.contains(viewport)).toBe(false)
  expect(document.body.contains(viewport)).toBe(true)
  expect(item!.classList.contains('relative')).toBe(true)
  expect(item!.classList.contains('fixed')).toBe(false)
  expect(item!.textContent).toContain('Download handed off')
  expect(item!.querySelector('button[aria-label="Bildirishnomani yopish"]')).not.toBeNull()
})
