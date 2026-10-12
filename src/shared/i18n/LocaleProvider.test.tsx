// @vitest-environment happy-dom
import { act, StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { BrowserRouter, useLocation } from 'react-router'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createInstance } from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { AppRecoveryBoundary } from '@/app/AppRecoveryBoundary'
import { LiveRoot } from '@/app/LiveRoot'
import { AuthProvider } from '@/shared/auth/AuthProvider'
import { useAuth, type AuthContextValue } from '@/shared/auth/useAuth'
import { createTokenPersistence } from '@/shared/auth/token-persistence'
import { ThemeProvider } from '@/shared/theme/ThemeProvider'
import { makeAuthApi, syntheticPairA, syntheticProfileA } from '@/test/auth-fakes'
import { createLocaleRuntime } from './runtime'
import { LocaleProvider } from './LocaleProvider'
import { useLocale } from './useLocale'
import { useMessages } from './useMessages'
import { emergencyCopy } from './emergency-copy'
import { PaginationBar } from '@/shared/ui/PaginationBar'
import { LoadingState } from '@/shared/ui/AsyncState'

vi.mock('@/shared/auth/device-lease', async (original) => ({ ...await original<typeof import('@/shared/auth/device-lease')>(),
  createBrowserAuthDeviceLease: () => ({ acquire: async () => ({ status: 'acquired', deviceUuid: '00000000-0000-4000-8000-000000000001' }), release: vi.fn(), dispose: vi.fn() }),
}))
vi.mock('@/shared/api/auth-api', async (original) => ({ ...await original<typeof import('@/shared/api/auth-api')>(),
  createLiveAuthApi: () => ({ kind: 'unavailable' }),
}))
const mounted: { root: Root; host: HTMLElement }[] = []
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); localStorage.clear() })
afterEach(async () => {
  for (const { root, host } of mounted.splice(0)) { await act(async () => root.unmount()); host.remove() }
  localStorage.clear(); vi.restoreAllMocks()
})

async function mount(content: React.ReactNode) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host, { onCaughtError: () => {} })
  mounted.push({ root, host })
  await act(async () => root.render(content))
  return host
}

describe('locale React integration and recovery', () => {
  it('preserves real auth/query providers, route, form, cache and dispatch across StrictMode switches', async () => {
    window.history.replaceState({ marker: 'route state' }, '', '/account?tab=profile')
    createTokenPersistence(localStorage).write(syntheticPairA, Date.now() + 3_600_000)
    const api = makeAuthApi({ getMe: vi.fn().mockResolvedValue(syntheticProfileA), logout: vi.fn() })
    const runtime = createLocaleRuntime({ storage: localStorage, root: document.documentElement })
    await runtime.initialize()
    let auth: AuthContextValue | undefined, client: QueryClient | undefined
    const dispatch = vi.fn(), cleanup = vi.fn(), mountEffect = vi.fn()
    function Probe() {
      const currentAuth = useAuth(), currentClient = useQueryClient(), location = useLocation()
      const { message } = useMessages('common'), { switchLocale } = useLocale()
      const [value, setValue] = useState('draft')
      useLayoutEffect(() => { auth = currentAuth; client = currentClient }, [currentAuth, currentClient])
      useEffect(() => { mountEffect(); return cleanup }, [])
      return <>
        <p>{location.pathname}{location.search}</p><span>{message('actions.save')}</span>
        <input aria-label="fixture draft" value={value} onChange={(event) => setValue(event.target.value)} />
        <button onClick={() => setValue('edited draft')}>Edit fixture</button>
        <button onClick={() => { void switchLocale('ru') }}>RU fixture</button>
        <button onClick={dispatch}>Dispatch fixture</button>
        <PaginationBar ariaLabel="Session lifecycle fixture" currentPage={1} totalPages={3} totalItems={60} onPageChange={dispatch} />
        <LoadingState />
      </>
    }
    const host = await mount(<StrictMode><LocaleProvider runtime={runtime}><ThemeProvider><AppProviders><AuthProvider api={api}><BrowserRouter><Probe /></BrowserRouter></AuthProvider></AppProviders></ThemeProvider></LocaleProvider></StrictMode>)
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(auth?.sessionPhase).toBe('authenticated')
    const authBefore = auth, clientBefore = client, mounts = mountEffect.mock.calls.length, cleanups = cleanup.mock.calls.length
    const persisted = createTokenPersistence(localStorage).read(), requests = vi.mocked(api.getMe).mock.calls.length
    client?.setQueryData(['locale-preserved-fixture'], 'cached evidence')
    await act(async () => {
      host.querySelectorAll('button')[0].click()
      host.querySelectorAll('button')[2].click()
    })
    const input = host.querySelector('input')
    await act(async () => { host.querySelectorAll('button')[1].click() })
    expect(host.textContent).toContain('Сохранить')
    await act(async () => { await runtime.switchLocale('en') })
    expect(host.textContent).toContain('Save')
    expect(host.querySelector('input')).toBe(input)
    expect(input?.value).toBe('edited draft')
    expect(auth).toBe(authBefore); expect(client).toBe(clientBefore)
    expect(client?.getQueryData(['locale-preserved-fixture'])).toBe('cached evidence')
    expect(createTokenPersistence(localStorage).read()).toEqual(persisted)
    expect(api.getMe).toHaveBeenCalledTimes(requests); expect(api.logout).not.toHaveBeenCalled()
    expect(mountEffect).toHaveBeenCalledTimes(mounts); expect(cleanup).toHaveBeenCalledTimes(cleanups)
    expect(dispatch).toHaveBeenCalledOnce()
    expect(window.location.pathname + window.location.search).toBe('/account?tab=profile')
    expect(window.history.state).toMatchObject({ marker: 'route state' })
    client?.removeQueries({ queryKey: ['locale-preserved-fixture'] })
  })

  it('withholds a test-only unsafe action when critical copy is unavailable', async () => {
    const engine = createInstance(), runtime = createLocaleRuntime({ engine }); await runtime.initialize('ru')
    engine.removeResourceBundle('ru', 'common'); engine.removeResourceBundle('uz', 'common')
    const dispatch = vi.fn()
    function CriticalFixture() {
      const result = useMessages('common').critical('actions.cancel')
      return result.status === 'resolved' ? <button onClick={dispatch}>{result.text}</button> : <p role="alert">{emergencyCopy.section}</p>
    }
    const host = await mount(<LocaleProvider runtime={runtime}><CriticalFixture /></LocaleProvider>)
    expect(host.querySelector('button')).toBeNull()
    expect(host.textContent).toBe(emergencyCopy.section)
    expect(host.textContent).not.toMatch(/common|actions|missing-copy/)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('shows independent emergency UI and preserves children when engine initialization fails', async () => {
    const engine = createInstance(); vi.spyOn(engine, 'init').mockRejectedValue(new Error('private diagnostic'))
    const runtime = createLocaleRuntime({ engine }); await runtime.initialize()
    function Copy() { return <span>{useMessages('common').message('actions.save')}</span> }
    const host = await mount(<LocaleProvider runtime={runtime}><Copy /><p>Legacy Uzbek child</p></LocaleProvider>)
    expect(host.querySelector('[role=alert]')?.textContent).toBe(emergencyCopy.section)
    expect(host.textContent).toContain(emergencyCopy.message)
    expect(host.textContent).toContain('Legacy Uzbek child')
    expect(host.textContent).not.toMatch(/diagnostic|actions.save/)
  })

  it('keeps the existing recovery boundary independent of a failed locale engine', async () => {
    const engine = createInstance(); vi.spyOn(engine, 'init').mockRejectedValue(new Error('engine failure'))
    const runtime = createLocaleRuntime({ engine }); await runtime.initialize()
    function BrokenRoute(): never { throw new Error('private route diagnostic') }
    const host = await mount(<LocaleProvider runtime={runtime}><AppRecoveryBoundary><BrokenRoute /></AppRecoveryBoundary></LocaleProvider>)
    expect(host.textContent).toContain(emergencyCopy.message)
    expect(host.textContent).toContain(emergencyCopy.section)
    expect(host.textContent).not.toContain('diagnostic')
  })

  it('makes locale available above the actual integration-unavailable LiveRoot', async () => {
    const runtime = createLocaleRuntime(); await runtime.initialize('en')
    const html = renderToStaticMarkup(<LocaleProvider runtime={runtime}><LiveRoot /></LocaleProvider>)
    expect(html).toContain('The service is currently unavailable.')
    expect(html).not.toContain(emergencyCopy.section)
  })

  it('rejects hooks outside their provider boundary', () => {
    function LocaleProbe() { useLocale(); return null }
    function MessageProbe() { useMessages('common'); return null }
    expect(() => renderToStaticMarkup(<LocaleProbe />)).toThrow('useLocale must be used within LocaleProvider.')
    expect(() => renderToStaticMarkup(<MessageProbe />)).toThrow('useMessages must be used within LocaleProvider.')
  })
})
