import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const categories = new Set(['zero', 'one', 'two', 'few', 'many', 'other'])

// JSON.parse validates grammar; this second, token-based walk catches duplicate
// members (including escaped equivalents) before JSON.parse can discard them.
export function parseCatalog(text, label) {
  const parsed = JSON.parse(text)
  const tokens = text.match(/"(?:\\.|[^"\\])*"|[{}[\]:,]|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? []
  let index = 0
  function value(location) {
    const token = tokens[index++]
    if (token === '{') {
      const seen = new Set()
      while (tokens[index] !== '}') {
        const key = JSON.parse(tokens[index++])
        if (seen.has(key)) throw new Error(`${label}: duplicate JSON key ${location}${key}`)
        seen.add(key)
        index++ // colon
        value(`${location}${key}.`)
        if (tokens[index] === ',') index++
      }
      index++
    } else if (token === '[') {
      while (tokens[index] !== ']') {
        value(location)
        if (tokens[index] === ',') index++
      }
      index++
    }
  }
  value('')
  return parsed
}

export function placeholders(text, label) {
  const names = [...text.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)].map((match) => match[1])
  const remainder = text.replace(/{{\s*[A-Za-z][A-Za-z0-9]*\s*}}/g, '')
  if (/[{}]/.test(remainder) || text.includes('$t(') || /<\/?[A-Za-z]/.test(text)) {
    throw new Error(`${label}: invalid interpolation or unsupported rich/nested message syntax`)
  }
  return [...new Set(names)].sort()
}

export function logicalCatalog(catalog, locale, label) {
  const flat = {}
  function visit(node, prefix) {
    if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.keys(node).length) {
      throw new Error(`${label}: ${prefix || '<root>'} must be a nonempty object`)
    }
    for (const [key, val] of Object.entries(node)) {
      if (!/^[A-Za-z][A-Za-z0-9]*(?:_(?:zero|one|two|few|many|other))?$/.test(key)) {
        throw new Error(`${label}: invalid key ${prefix}${key}`)
      }
      const full = `${prefix}${key}`
      if (typeof val === 'string') {
        if (!val.trim()) throw new Error(`${label}: empty translation ${full}`)
        if (val === full || /^[A-Za-z][A-Za-z0-9]*(?:[.:][A-Za-z][A-Za-z0-9]*)+$/.test(val)) throw new Error(`${label}: identifier used as translation ${full}`)
        flat[full] = { text: val, params: placeholders(val, `${label}:${full}`) }
      } else visit(val, `${full}.`)
    }
  }
  visit(catalog, '')
  const logical = {}
  const forms = {}
  for (const [key, entry] of Object.entries(flat).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const suffix = key.split('_').at(-1)
    const plural = categories.has(suffix)
    const id = plural ? key.slice(0, -(suffix.length + 1)) : key
    const params = [...new Set([...entry.params, ...(plural ? ['count'] : [])])].sort()
    const descriptor = { plural, params, interpolations: entry.params }
    if (plural && suffix === 'zero' && logical[id]) {
      if (JSON.stringify(entry.params.filter((param) => param !== 'count')) !== JSON.stringify(logical[id].interpolations.filter((param) => param !== 'count'))) {
        throw new Error(`${label}: inconsistent placeholders for ${id}_zero`)
      }
      (forms[id] ??= []).push(suffix)
      continue
    }
    if (logical[id] && JSON.stringify(logical[id]) !== JSON.stringify(descriptor)) {
      throw new Error(`${label}: inconsistent placeholders/plural structure for ${id}`)
    }
    logical[id] = descriptor
    if (plural) (forms[id] ??= []).push(suffix)
  }
  const required = new Intl.PluralRules(locale).resolvedOptions().pluralCategories
  for (const [id, present] of Object.entries(forms)) {
    for (const category of required) {
      if (!present.includes(category)) throw new Error(`${label}: missing plural ${id}_${category}`)
    }
    for (const category of present) {
      if (!required.includes(category) && category !== 'zero') throw new Error(`${label}: unexpected plural ${id}_${category}`)
    }
  }
  return logical
}

export async function validateLocales({ root = projectRoot, generate = false } = {}) {
  const readJson = async (file) => parseCatalog(await readFile(file, 'utf8'), file)
  const base = path.join(root, 'src/shared/i18n')
  const registry = await readJson(path.join(base, 'languages.json'))
  const manifest = await readJson(path.join(base, 'namespaces.json'))
  const enabled = Object.keys(registry).filter((locale) => registry[locale].enabled)
  if (!enabled.includes('uz')) throw new Error('Canonical uz locale must be enabled')
  const aliases = new Set()
  for (const [code, entry] of Object.entries(registry)) {
    if (Intl.getCanonicalLocales(code)[0] !== code || !entry.nativeName?.trim()
      || !['ltr', 'rtl'].includes(entry.direction) || typeof entry.enabled !== 'boolean'
      || !Array.isArray(entry.aliases) || !entry.aliases.includes(code)) throw new Error(`Invalid registry metadata: ${code}`)
    Intl.getCanonicalLocales(entry.intlLocale)
    for (const alias of entry.aliases) {
      const normalized = Intl.getCanonicalLocales(alias)[0]
      if (aliases.has(normalized)) throw new Error(`Duplicate language alias: ${alias}`)
      aliases.add(normalized)
    }
  }
  if (!Array.isArray(manifest.enabled) || !manifest.enabled.length || !Array.isArray(manifest.planned)
    || [...manifest.enabled, ...manifest.planned].some((name) => typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(name))
    || new Set([...manifest.enabled, ...manifest.planned]).size !== manifest.enabled.length + manifest.planned.length) {
    throw new Error('Namespace manifest must contain unique enabled/planned names')
  }
  const localeRoot = path.join(root, 'src/locales')
  for (const directory of await readdir(localeRoot, { withFileTypes: true })) {
    if (!directory.isDirectory() || !(directory.name in registry)) throw new Error(`Unsupported locale resource: ${directory.name}`)
  }
  const catalogs = {}
  for (const locale of enabled) {
    catalogs[locale] = {}
    const files = await readdir(path.join(localeRoot, locale))
    for (const file of files) {
      if (!manifest.enabled.includes(file.replace(/\.json$/, ''))) throw new Error(`${locale}: unexpected resource ${file}; planned namespaces are not enabled`)
    }
    for (const namespace of manifest.enabled) {
      const file = path.join(localeRoot, locale, `${namespace}.json`)
      catalogs[locale][namespace] = logicalCatalog(await readJson(file), registry[locale].intlLocale, file)
    }
  }
  const canonical = catalogs.uz
  for (const locale of enabled) for (const namespace of manifest.enabled) {
    const expected = canonical[namespace]
    const actual = catalogs[locale][namespace]
    for (const key of Object.keys(expected)) {
      if (!actual[key]) throw new Error(`${locale}/${namespace}: missing key ${key}`)
      if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) throw new Error(`${locale}/${namespace}:${key}: inconsistent placeholders/plural structure`)
    }
    for (const key of Object.keys(actual)) if (!expected[key]) throw new Error(`${locale}/${namespace}: unexpected extra key ${key}`)
  }
  const header = '// Generated by scripts/validate-locales.mjs --generate. Do not edit.\n'
  const declarations = `${header}export interface MessageCatalog {\n${Object.entries(canonical).map(([ns, keys]) =>
    `  ${JSON.stringify(ns)}: {\n${Object.entries(keys).map(([key, value]) =>
      `    ${JSON.stringify(key)}: ${value.params.length ? `{ ${value.params.map((param) => `${JSON.stringify(param)}: ${param === 'count' ? 'number' : 'string | number'}`).join('; ')} }` : 'Record<string, never>'}`).join('\n')}\n  }`).join('\n')}\n}\n`
  const metadata = `${header}export const messageMetadata = ${JSON.stringify(canonical, null, 2)} as const\n`
  for (const [filename, output] of [['generated.d.ts', declarations], ['metadata.generated.ts', metadata]]) {
    const file = path.join(base, filename)
    if (generate) await writeFile(file, output)
    else if (await readFile(file, 'utf8').catch(() => '') !== output) throw new Error(`${filename} is stale; run npm run locales:generate and review the diff`)
  }
  return { locales: enabled, namespaces: manifest.enabled }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootIndex = process.argv.indexOf('--root')
  validateLocales({ root: rootIndex < 0 ? projectRoot : process.argv[rootIndex + 1], generate: process.argv.includes('--generate') })
    .then((result) => console.log(`Locale integrity PASS: ${result.locales.join('/')} — ${result.namespaces.join(', ')}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1 })
}
