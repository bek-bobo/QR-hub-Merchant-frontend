/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { normalizeThemeMode, resolveTheme } from './theme-model'

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8')
const bootstrapSource = /<script data-qrhub-theme-bootstrap>([\s\S]*?)<\/script>/.exec(
  html,
)?.[1]

interface BootstrapOptions {
  stored?: string | null
  prefersDark?: boolean
  storageThrows?: boolean
  mediaThrows?: boolean
}

function executeBootstrap(options: BootstrapOptions = {}) {
  if (!bootstrapSource) {
    throw new Error('Missing data-qrhub-theme-bootstrap script.')
  }

  let dark = false
  let writes = 0
  const style = { colorScheme: '' }
  const root = {
    classList: {
      toggle(token: string, force?: boolean) {
        if (token === 'dark') dark = force ?? !dark
        return dark
      },
    },
    style,
  }
  const storage = {
    getItem() {
      if (options.storageThrows) throw new Error('blocked')
      return options.stored ?? null
    },
    setItem() {
      writes += 1
    },
  }
  const windowObject = {
    localStorage: storage,
    matchMedia() {
      if (options.mediaThrows) throw new Error('blocked')
      return { matches: options.prefersDark ?? false }
    },
  }

  runInNewContext(bootstrapSource, {
    document: { documentElement: root },
    window: windowObject,
  })

  return { dark, colorScheme: style.colorScheme, writes }
}

describe('initial theme bootstrap', () => {
  it.each([
    { stored: 'light', prefersDark: true },
    { stored: 'dark', prefersDark: false },
    { stored: 'system', prefersDark: false },
    { stored: 'system', prefersDark: true },
    { stored: null, prefersDark: true },
    { stored: 'invalid', prefersDark: false },
  ] as const)(
    'applies stored=$stored prefersDark=$prefersDark before React',
    ({ stored, prefersDark }) => {
      const expected = resolveTheme(normalizeThemeMode(stored), prefersDark)

      expect(executeBootstrap({ stored, prefersDark })).toEqual({
        dark: expected === 'dark',
        colorScheme: expected,
        writes: 0,
      })
    },
  )

  it('survives storage failure and follows the system preference', () => {
    expect(
      executeBootstrap({ storageThrows: true, prefersDark: true }),
    ).toEqual({ dark: true, colorScheme: 'dark', writes: 0 })
  })

  it('falls back to light when system preference cannot be read', () => {
    expect(executeBootstrap({ stored: 'system', mediaThrows: true })).toEqual({
      dark: false,
      colorScheme: 'light',
      writes: 0,
    })
  })
})

