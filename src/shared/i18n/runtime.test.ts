import { createInstance } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { createLocaleRuntime } from './runtime'
import { createMessages } from './messages'
import { emergencyCopy } from './emergency-copy'
import { LOCALE_STORAGE_KEY } from './locale-resolution'
import { resources } from './resources'
import { createTokenPersistence } from '@/shared/auth/token-persistence'

function deferred() {
  let resolve = () => {}
  let reject = (_reason: Error) => {}
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

describe('isolated locale runtime', () => {
  it.each(['uz', 'ru', 'en'] as const)('initializes %s with bundled resources', async (locale) => {
    const runtime = createLocaleRuntime()
    expect(await runtime.initialize(locale)).toBe(true)
    expect(runtime.getSnapshot()).toEqual({ locale, ready: true })
    expect(createMessages(runtime, 'common').message('actions.save')).toBe({ uz: 'Saqlash', ru: 'Сохранить', en: 'Save' }[locale])
  })

  it('initializes once and switches UZ → RU → EN → UZ with root attributes, subscriptions and persistence', async () => {
    const engine = createInstance(), init = vi.spyOn(engine, 'init')
    const setItem = vi.fn(), root = { lang: '', dir: '' }
    const runtime = createLocaleRuntime({ engine, root, storage: { getItem: () => null, setItem } })
    await Promise.all([runtime.initialize(), runtime.initialize('en')])
    expect(init).toHaveBeenCalledOnce()
    expect(setItem).not.toHaveBeenCalled()
    const listener = vi.fn(), unsubscribe = runtime.subscribe(listener)
    for (const locale of ['ru', 'en', 'uz'] as const) {
      expect(await runtime.switchLocale(locale)).toEqual({ status: 'changed' })
      expect(root).toEqual({ lang: locale, dir: 'ltr' })
      expect(engine.language).toBe(locale)
    }
    expect(setItem.mock.calls).toEqual(['ru', 'en', 'uz'].map((code) => [LOCALE_STORAGE_KEY, code]))
    expect(listener).toHaveBeenCalledTimes(3)
    unsubscribe()
    await runtime.switchLocale('en')
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('survives blocked persistence and leaves authentication keys and logout behavior intact', async () => {
    const saved = new Map<string, string>([['auth-sentinel', 'unchanged']])
    const storage = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value) }, removeItem: (key: string) => { saved.delete(key) } }
    const runtime = createLocaleRuntime({ storage })
    await runtime.initialize(); await runtime.switchLocale('ru')
    createTokenPersistence(storage).clear()
    expect(saved.get(LOCALE_STORAGE_KEY)).toBe('ru')
    expect(saved.get('auth-sentinel')).toBe('unchanged')
    const refreshed = createLocaleRuntime()
    await refreshed.initialize('ru')
    expect(refreshed.getSnapshot().locale).toBe('ru')
    const blocked = createLocaleRuntime({ storage: { getItem: () => null, setItem: () => { throw new Error('blocked') } } })
    await blocked.initialize()
    expect((await blocked.switchLocale('en')).status).toBe('changed')
    expect(blocked.getSnapshot().locale).toBe('en')
  })

  it('retains working language and storage when resources or the engine switch fail', async () => {
    const engine = createInstance(), setItem = vi.fn(), root = { lang: '', dir: '' }
    const runtime = createLocaleRuntime({ engine, root, storage: { getItem: () => null, setItem } })
    await runtime.initialize()
    engine.removeResourceBundle('ru', 'common')
    expect((await runtime.switchLocale('ru')).status).toBe('failed')
    vi.spyOn(engine, 'changeLanguage').mockImplementationOnce(async () => { engine.language = 'en'; throw new Error('failed') })
    expect((await runtime.switchLocale('en')).status).toBe('failed')
    expect(runtime.getSnapshot().locale).toBe('uz')
    expect(root.lang).toBe('uz'); expect(engine.language).toBe('uz')
    expect(setItem).not.toHaveBeenCalled()
    expect(createMessages(runtime, 'common').message('actions.save')).toBe('Saqlash')
  })

  it('rejects invalid runtime selections and uninitialized switches', async () => {
    const runtime = createLocaleRuntime()
    expect((await runtime.switchLocale('en')).status).toBe('failed')
    await runtime.initialize()
    expect((await runtime.switchLocale('fr' as 'en')).status).toBe('failed')
    expect(runtime.getSnapshot().locale).toBe('uz')
  })

  it('prevents out-of-order preparations from overriding the latest intent', async () => {
    const ru = deferred(), en = deferred(), setItem = vi.fn()
    const runtime = createLocaleRuntime({ prepare: (locale) => locale === 'ru' ? ru.promise : en.promise, storage: { getItem: () => null, setItem } })
    await runtime.initialize()
    const first = runtime.switchLocale('ru'), second = runtime.switchLocale('en')
    en.resolve(); expect((await second).status).toBe('changed')
    ru.resolve(); expect((await first).status).toBe('superseded')
    expect(runtime.getSnapshot().locale).toBe('en')
    expect(setItem.mock.calls).toEqual([[LOCALE_STORAGE_KEY, 'en']])
  })

  it('rolls back a stale in-flight engine mutation before the next commit', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine })
    await runtime.initialize()
    const gate = deferred(), started = deferred(), original = engine.changeLanguage.bind(engine)
    vi.spyOn(engine, 'changeLanguage').mockImplementationOnce(async (locale) => {
      started.resolve(); await gate.promise; return original(locale)
    })
    const first = runtime.switchLocale('ru')
    await started.promise
    const second = runtime.switchLocale('en')
    expect(createMessages(runtime, 'common').message('actions.save')).toBe('Saqlash')
    gate.resolve()
    expect((await first).status).toBe('superseded')
    expect((await second).status).toBe('changed')
    expect(runtime.getSnapshot().locale).toBe('en'); expect(engine.language).toBe('en')
  })

  it('keeps the previous language when the latest requested preparation fails', async () => {
    const gate = deferred(), runtime = createLocaleRuntime({ prepare: () => gate.promise })
    await runtime.initialize('ru')
    const pending = runtime.switchLocale('en'); gate.reject(new Error('load failed'))
    expect((await pending).status).toBe('failed')
    expect(runtime.getSnapshot().locale).toBe('ru')
  })

  it('uses independent emergency copy after initialization fails', async () => {
    const engine = createInstance()
    vi.spyOn(engine, 'init').mockRejectedValue(new Error('private init diagnostic'))
    const runtime = createLocaleRuntime({ engine })
    expect(await runtime.initialize()).toBe(false)
    expect(createMessages(runtime, 'common').message('actions.save')).toBe(emergencyCopy.message)
    expect(createMessages(runtime, 'common').critical('actions.save')).toEqual({ status: 'unavailable', reason: 'engine-unavailable' })
  })

  it('falls back to complete Uzbek at startup when requested resources are corrupt', async () => {
    const catalog = structuredClone(resources)
    catalog.ru.common.actions.save = ''
    const runtime = createLocaleRuntime({ resources: catalog })
    expect(await runtime.initialize('ru')).toBe(true)
    expect(runtime.getSnapshot().locale).toBe('uz')
    catalog.uz.common.actions.save = ''
    expect(await createLocaleRuntime({ resources: catalog }).initialize()).toBe(false)
  })
})

describe('guarded messages in production configuration', () => {
  it('falls back per plural variant and missing namespace, then fails independently when canonical copy is absent', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine })
    await runtime.initialize('ru')
    engine.addResource('ru', 'common', 'items_few', '{{unknown}} записи')
    expect(createMessages(runtime, 'common').message('items', { count: 2 })).toBe('2 ta yozuv')
    engine.removeResourceBundle('ru', 'common')
    expect(createMessages(runtime, 'common').message('actions.save')).toBe('Saqlash')
    engine.removeResourceBundle('uz', 'common')
    expect(createMessages(runtime, 'common').message('items', { count: 2 })).toBe(emergencyCopy.message)
    expect(createMessages(runtime, 'common').critical('actions.save').status).toBe('unavailable')
  })
  it('uses requested copy, then canonical Uzbek, then independent emergency copy', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine })
    await runtime.initialize('ru')
    const { message, critical } = createMessages(runtime, 'common')
    expect(message('actions.save')).toBe('Сохранить')
    engine.addResource('ru', 'common', 'actions.save', 'common.actions.save')
    expect(message('actions.save')).toBe('Saqlash')
    engine.addResourceBundle('uz', 'common', { actions: { save: { bad: 'object' } } }, true, true)
    expect(message('actions.save')).toBe(emergencyCopy.message)
    expect(critical('actions.save').status).toBe('unavailable')
    expect(runtime.resolve('dashboard', 'totalAmount').status).toBe('unavailable')
    expect(runtime.resolve('common', 'missing.key').status).toBe('unavailable')
  })

  it.each([undefined, {}, { name: undefined }, { name: null }, { name: false }, { name: [] }, { name: {} }, { name: 'A', extra: 'B' }])('rejects invalid greeting params %j', async (params) => {
    const runtime = createLocaleRuntime(); await runtime.initialize()
    expect(runtime.resolve('common', 'greeting', params)).toEqual({ status: 'unavailable', reason: 'invalid-parameters' })
  })

  it.each(['0', undefined, NaN, Infinity, false])('rejects invalid numeric count %s', async (count) => {
    const runtime = createLocaleRuntime(); await runtime.initialize()
    expect(runtime.resolve('common', 'items', { count }).status).toBe('unavailable')
  })

  it('treats interpolation strings as data, including templates, keys, HTML, and $ replacement tokens', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize('en')
    for (const name of ['{{name}}', '$t(actions.save)', '<script>x</script>', 'common.actions.save', '$&', 'undefined']) {
      expect(createMessages(runtime, 'common').message('greeting', { name })).toBe(`Hello, ${name}!`)
    }
  })

  it('supports zero and locale-specific Russian plural categories', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize('ru')
    const { message } = createMessages(runtime, 'common')
    expect(message('items', { count: 0 })).toBe('0 записей')
    expect(message('items', { count: 1 })).toBe('1 запись')
    expect(message('items', { count: 2 })).toBe('2 записи')
    expect(message('items', { count: 5 })).toBe('5 записей')
    expect(message('items', { count: 1.5 })).toBe('1.5 записи')
  })

  it('rejects malformed templates and mismatched engine output without leaking diagnostics', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine }); await runtime.initialize('en')
    engine.addResource('en', 'common', 'greeting', 'Hello, {{unknown}}')
    expect(createMessages(runtime, 'common').message('greeting', { name: 'A' })).toBe('Salom, A!')
    vi.spyOn(engine, 't').mockReturnValue('common.greeting')
    expect(createMessages(runtime, 'common').message('greeting', { name: 'A' })).toBe(emergencyCopy.message)
    vi.spyOn(engine, 't').mockImplementation(() => { throw new Error('private failure') })
    expect(createMessages(runtime, 'common').message('greeting', { name: 'A' })).toBe(emergencyCopy.message)
  })
})
