import { createInstance, type i18n, type Resource } from 'i18next'
import { emergencyCopy } from './emergency-copy'
import { persistLocale, type LocaleStorage } from './locale-resolution'
import { CANONICAL_LOCALE, DEFAULT_LOCALE, languageRegistry, normalizeLocale, supportedLocales, type SupportedLocale } from './registry'
import { descriptors, namespaceManifest, resourceAt, resources, validLocaleResources, validTemplate } from './resources'

export type MessageResult =
  | { readonly status: 'resolved'; readonly text: string }
  | { readonly status: 'unavailable'; readonly reason: 'missing-copy' | 'invalid-parameters' | 'engine-unavailable' }
export type SwitchResult = { readonly status: 'changed' | 'superseded' } | { readonly status: 'failed'; readonly text: string }
export interface LocaleSnapshot { readonly locale: SupportedLocale; readonly ready: boolean }
export interface LocaleRoot { lang: string; dir: string }

export interface LocaleRuntime {
  initialize(locale?: SupportedLocale): Promise<boolean>
  getSnapshot(): LocaleSnapshot
  subscribe(listener: () => void): () => void
  switchLocale(locale: SupportedLocale): Promise<SwitchResult>
  resolve(namespace: string, key: string, params?: unknown): MessageResult
}

const engines = new WeakMap<LocaleRuntime, i18n>()
// Adapter-only access, enforced by the import-boundary check. Never expose this via hooks.
export function engineForProvider(runtime: LocaleRuntime): i18n | undefined { return engines.get(runtime) }

export function createLocaleRuntime(options: {
  storage?: LocaleStorage | null
  root?: LocaleRoot | null
  resources?: Resource
  // Internal/test seams; production does not supply asynchronous loaders or an engine.
  engine?: i18n
  prepare?: (locale: SupportedLocale) => Promise<void>
} = {}): LocaleRuntime {
  const engine = options.engine ?? createInstance()
  let snapshot: LocaleSnapshot = Object.freeze({ locale: DEFAULT_LOCALE, ready: false })
  let initialization: Promise<boolean> | undefined
  let intent = 0
  let transaction = Promise.resolve()
  const listeners = new Set<() => void>()
  const bundle = (locale: SupportedLocale, namespace: string): unknown => engine.getResourceBundle(locale, namespace)
  function publish(locale: SupportedLocale, ready: boolean) {
    snapshot = Object.freeze({ locale, ready })
    try {
      if (options.root) { options.root.lang = locale; options.root.dir = languageRegistry[locale].direction }
    } catch { /* Partial DOM implementations must not prevent recovery rendering. */ }
    for (const listener of listeners) {
      try { listener() } catch { /* A subscriber cannot invalidate a committed locale. */ }
    }
  }
  const runtime: LocaleRuntime = {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    initialize(locale = DEFAULT_LOCALE) {
      initialization ??= (async () => {
        try {
          await engine.init({
            resources: structuredClone(options.resources ?? resources),
            lng: locale, fallbackLng: CANONICAL_LOCALE,
            supportedLngs: [...supportedLocales], load: 'currentOnly',
            ns: [...namespaceManifest.enabled], defaultNS: 'common', fallbackNS: false,
            initAsync: false, returnObjects: false, returnNull: false, returnEmptyString: false,
            saveMissing: false, debug: false, ignoreJSONStructure: false,
            interpolation: { escapeValue: false, skipOnVariables: true },
            react: { useSuspense: false },
          })
          if (!validLocaleResources(CANONICAL_LOCALE, bundle)) throw new Error('Canonical catalog unavailable')
          const selected = validLocaleResources(locale, bundle) ? locale : CANONICAL_LOCALE
          if (engine.language !== selected) await engine.changeLanguage(selected)
          publish(selected, true)
          return true
        } catch {
          publish(DEFAULT_LOCALE, false)
          return false
        }
      })()
      return initialization
    },
    async switchLocale(target) {
      const request = ++intent
      const locale = normalizeLocale(target)
      if (!locale || !snapshot.ready) return { status: 'failed', text: emergencyCopy.changeFailed }
      try { await options.prepare?.(locale) } catch {
        return request === intent ? { status: 'failed', text: emergencyCopy.changeFailed } : { status: 'superseded' }
      }
      let result: SwitchResult = { status: 'superseded' }
      // Serialize engine mutations; prepare may finish out of order. Facade reads
      // the committed snapshot explicitly, never the engine's transient language.
      const next = transaction.then(async () => {
        if (request !== intent) return
        const previous = snapshot.locale
        try {
          if (!validLocaleResources(locale, bundle)) throw new Error('Incomplete catalog')
          await engine.changeLanguage(locale)
          if (request !== intent) { await engine.changeLanguage(previous); return }
          publish(locale, true)
          persistLocale(options.storage ?? null, locale)
          result = { status: 'changed' }
        } catch {
          try { await engine.changeLanguage(previous) } catch { /* Explicit-locale facade keeps previous copy usable. */ }
          result = request === intent ? { status: 'failed', text: emergencyCopy.changeFailed } : { status: 'superseded' }
        }
      })
      transaction = next.catch(() => {})
      await next
      return result
    },
    resolve(namespace, key, parameters = {}) {
      const descriptor = Object.hasOwn(descriptors, namespace) && Object.hasOwn(descriptors[namespace], key)
        ? descriptors[namespace][key] : undefined
      if (!descriptor) return { status: 'unavailable', reason: 'missing-copy' }
      if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return { status: 'unavailable', reason: 'invalid-parameters' }
      const params = parameters as Record<string, unknown>
      if (Object.keys(params).length !== descriptor.params.length || descriptor.params.some((name) =>
        !Object.hasOwn(params, name) || (name === 'count' ? typeof params[name] !== 'number' || !Number.isFinite(params[name])
          : typeof params[name] !== 'string' && (typeof params[name] !== 'number' || !Number.isFinite(params[name]))))) {
        return { status: 'unavailable', reason: 'invalid-parameters' }
      }
      if (!snapshot.ready) return { status: 'unavailable', reason: 'engine-unavailable' }
      for (const locale of [...new Set([snapshot.locale, CANONICAL_LOCALE])]) {
        try {
          let resourceKey = key
          if (descriptor.plural) {
            const category = new Intl.PluralRules(languageRegistry[locale].intlLocale).select(params.count as number)
            resourceKey = `${key}_${params.count === 0 && resourceAt(bundle(locale, namespace), `${key}_zero`) !== undefined ? 'zero' : category}`
          }
          const source = resourceAt(bundle(locale, namespace), resourceKey)
          if (!validTemplate(source, descriptor, namespace, key, descriptor.plural && resourceKey === `${key}_zero`)) continue
          const expected = source.replace(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g, (_, name: string) => String(params[name]))
          const output: unknown = engine.t(resourceKey, { lng: locale, ns: namespace, fallbackLng: false, replace: params })
          if (typeof output === 'string' && output === expected && output.trim()) return { status: 'resolved', text: output }
        } catch { /* Try canonical copy, then the independent emergency path. */ }
      }
      return { status: 'unavailable', reason: 'missing-copy' }
    },
  }
  engines.set(runtime, engine)
  return runtime
}
