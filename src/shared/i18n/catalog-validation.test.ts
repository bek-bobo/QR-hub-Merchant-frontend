import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const project = process.cwd()
const script = path.join(project, 'scripts/validate-locales.mjs')

function fixture(change: (root: string) => void, generate = false) {
  const root = mkdtempSync(path.join(tmpdir(), 'qrhub-i18n-'))
  if (path.dirname(path.resolve(root)) !== path.resolve(tmpdir()) || !path.basename(root).startsWith('qrhub-i18n-')) throw new Error('Unsafe fixture cleanup path')
  try {
    cpSync(path.join(project, 'src/shared/i18n'), path.join(root, 'src/shared/i18n'), { recursive: true })
    cpSync(path.join(project, 'src/locales'), path.join(root, 'src/locales'), { recursive: true })
    change(root)
    const result = spawnSync(process.execPath, [script, '--root', root, ...(generate ? ['--generate'] : [])], { encoding: 'utf8' })
    return { code: result.status, output: result.stdout + result.stderr,
      generated: generate && result.status === 0 ? ['generated.d.ts', 'metadata.generated.ts'].map((file) => readFileSync(path.join(root, 'src/shared/i18n', file), 'utf8')) : [] }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function editCommon(root: string, transform: (value: Record<string, unknown>) => void) {
  const file = path.join(root, 'src/locales/ru/common.json')
  const catalog = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
  transform(catalog)
  writeFileSync(file, JSON.stringify(catalog))
}

describe('catalog release validator with temporary catalogs', () => {
  it('accepts complete catalogs with differing Russian plural forms', () => {
    expect(fixture(() => {}).code).toBe(0)
  })
  it.each([
    ['missing key', (value: Record<string, unknown>) => { delete value.greeting }, 'missing key greeting'],
    ['extra key', (value: Record<string, unknown>) => { value.extra = 'Extra' }, 'unexpected extra key extra'],
    ['empty string', (value: Record<string, unknown>) => { value.greeting = ' ' }, 'empty translation greeting'],
    ['numeric value', (value: Record<string, unknown>) => { value.greeting = 4 }, 'must be a nonempty object'],
    ['array', (value: Record<string, unknown>) => { value.greeting = ['A'] }, 'must be a nonempty object'],
    ['null', (value: Record<string, unknown>) => { value.greeting = null }, 'must be a nonempty object'],
    ['empty object', (value: Record<string, unknown>) => { value.greeting = {} }, 'must be a nonempty object'],
    ['bad placeholder', (value: Record<string, unknown>) => { value.greeting = 'Hi {{other}}' }, 'inconsistent placeholders'],
    ['malformed interpolation', (value: Record<string, unknown>) => { value.greeting = 'Hi {{name}' }, 'invalid interpolation'],
    ['unnamed interpolation', (value: Record<string, unknown>) => { value.greeting = 'Hi {{}}' }, 'invalid interpolation'],
    ['engine nested key', (value: Record<string, unknown>) => { value.greeting = '$t(actions.save)' }, 'unsupported rich/nested'],
    ['HTML', (value: Record<string, unknown>) => { value.greeting = '<b>{{name}}</b>' }, 'unsupported rich/nested'],
    ['identifier copy', (value: Record<string, unknown>) => { value.greeting = 'common.actions.save' }, 'identifier used as translation'],
    ['missing plural', (value: Record<string, unknown>) => { delete value.items_few }, 'missing plural items_few'],
    ['unexpected plural', (value: Record<string, unknown>) => { value.items_two = '{{count}} записи' }, 'unexpected plural items_two'],
    ['inconsistent plural placeholders', (value: Record<string, unknown>) => { value.items_few = '{{other}} записи' }, 'inconsistent placeholders'],
    ['missing count placeholder', (value: Record<string, unknown>) => { value.items_few = 'Записи' }, 'inconsistent placeholders'],
  ])('rejects %s', (_name, transform, expected) => {
    const result = fixture((root) => editCommon(root, transform))
    expect(result.code).toBe(1); expect(result.output).toContain(expected)
  })
  it('rejects duplicate JSON keys including escaped equivalents', () => {
    const result = fixture((root) => writeFileSync(path.join(root, 'src/locales/ru/common.json'), '{"greeting":"A","\\u0067reeting":"B"}'))
    expect(result.code).toBe(1); expect(result.output).toContain('duplicate JSON key greeting')
  })
  it('rejects missing namespaces, unsupported resources and stale declarations', () => {
    for (const [file, expected] of [
      ['src/locales/ru/common.json', 'ENOENT'],
      ['src/shared/i18n/generated.d.ts', 'generated.d.ts is stale'],
      ['src/shared/i18n/metadata.generated.ts', 'metadata.generated.ts is stale'],
    ]) {
      const result = fixture((root) => rmSync(path.join(root, file)))
      expect(result.code).toBe(1); expect(result.output).toContain(expected)
    }
    const unsupported = fixture((root) => cpSync(path.join(root, 'src/locales/en'), path.join(root, 'src/locales/fr'), { recursive: true }))
    expect(unsupported.code).toBe(1); expect(unsupported.output).toContain('Unsupported locale resource: fr')
    const planned = fixture((root) => {
      const file = path.join(root, 'src/shared/i18n/namespaces.json')
      const manifest = JSON.parse(readFileSync(file, 'utf8'))
      manifest.planned.push('futureFeature')
      writeFileSync(file, JSON.stringify(manifest))
      writeFileSync(path.join(root, 'src/locales/en/futureFeature.json'), '{}')
    })
    expect(planned.code).toBe(1); expect(planned.output).toContain('planned namespaces are not enabled')
  })
  it('regenerates deterministic declarations and metadata', () => {
    const result = fixture((root) => {
      rmSync(path.join(root, 'src/shared/i18n/generated.d.ts'))
      rmSync(path.join(root, 'src/shared/i18n/metadata.generated.ts'))
    }, true)
    expect(result.code).toBe(0)
    expect(result.generated).toEqual(['generated.d.ts', 'metadata.generated.ts'].map((file) => readFileSync(path.join(project, 'src/shared/i18n', file), 'utf8')))
    const check = spawnSync(process.execPath, [script], { encoding: 'utf8' })
    expect(check.status).toBe(0)
  })
})

describe('enforced translation-engine import boundary', () => {
  const boundaryUrl = pathToFileURL(path.join(project, 'scripts/check-i18n-boundary.mjs')).href
  function check(source: string, filename = 'src/features/test/Component.tsx') {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      `import { checkImports } from ${JSON.stringify(boundaryUrl)}; console.log(JSON.stringify(checkImports(${JSON.stringify(source)}, ${JSON.stringify(filename)})))`], { encoding: 'utf8' })
    expect(result.status).toBe(0)
    return JSON.parse(result.stdout) as string[]
  }
  it.each([
    "import i18next from 'i18next'", "import { useTranslation } from 'react-i18next'",
    "export { Trans } from 'react-i18next'", "const engine = await import('i18next')",
    "const engine = require('i18next')", "import { createLocaleRuntime } from '@/shared/i18n/runtime'",
    "import { createLocaleRuntime } from '../../shared/i18n/runtime'",
    "import copy from '@/locales/en/common.json'",
  ])('rejects %s', (source) => expect(check(source)).toHaveLength(1))
  it('permits the facade, explicit adapter owners, and test fixtures', () => {
    expect(check("import { useMessages } from '@/shared/i18n/useMessages'")).toEqual([])
    expect(check("import { createInstance } from 'i18next'", 'src/shared/i18n/runtime.ts')).toEqual([])
    expect(check("import { createInstance } from 'i18next'", 'src/shared/i18n/runtime.test.ts')).toEqual([])
    expect(check("import { createLocaleRuntime } from '@/shared/i18n/runtime'", 'src/app/i18n/bootstrap.ts')).toEqual([])
  })
})
