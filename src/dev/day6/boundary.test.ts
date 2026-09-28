import { describe, expect, it } from 'vitest'
import appRouterSource from '../../app/AppRouter.tsx?raw'
import liveRouterSource from '../../app/LiveRouter.tsx?raw'
import accountSource from './Day6AccountPreview.tsx?raw'
import previewSource from './Day6PreviewRoot.tsx?raw'
import simulatorSource from './simulator.ts?raw'

const fetchReplacementPattern = /globalThis\.fetch|window\.fetch|\bfetch\s*=/

describe('Day 06 DEV composition boundary', () => {
  it('keeps the Day 06 route behind the DEV-only lazy branch', () => {
    expect(appRouterSource).toMatch(
      /const Day6PreviewRoot = import\.meta\.env\.DEV\s*\? lazy\(\(\) => import\('@\/dev\/day6\/Day6PreviewRoot'\)\)\s*: null/,
    )
    expect(appRouterSource).toContain('path="/dev/day6/*"')
  })

  it('has no production LiveRouter import of Day 06 fixtures', () => {
    expect(liveRouterSource).not.toContain('@/dev/day6')
    expect(liveRouterSource).not.toContain('D6-P5-DEMO-')
  })

  it('detects fetch replacement without matching identifiers that end in refetch', () => {
    expect(fetchReplacementPattern.test('fetch = replacement')).toBe(true)
    expect(fetchReplacementPattern.test('globalThis.fetch = replacement')).toBe(true)
    expect(fetchReplacementPattern.test('window.fetch = replacement')).toBe(true)
    expect(fetchReplacementPattern.test('failP5Refetch = true')).toBe(false)
    expect(fetchReplacementPattern.test('refetch = callback')).toBe(false)
    expect(fetchReplacementPattern.test('prefetch = callback')).toBe(false)
  })

  it('does not replace global fetch or introduce token/storage access in the DEV subtree', () => {
    const combined = [simulatorSource, previewSource, accountSource].join('\n')
    expect(combined).not.toMatch(fetchReplacementPattern)
    expect(combined).not.toMatch(/localStorage|sessionStorage|Bearer\s/)
  })
})
