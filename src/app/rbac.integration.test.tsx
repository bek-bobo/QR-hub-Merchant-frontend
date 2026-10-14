import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { renderToStaticMarkup } from '@/test/locale-fixture'
import { cashierPermissions, merchantPermissions, rbacProfile } from '@/test/rbac-fixtures'
import { can, canWithPermissions, hasAllPermissions, hasAnyPermission, hasPermission, type AccessContextValue } from '@/shared/auth/access'
import { capabilities } from '@/shared/auth/access'
import { createLiveReadApi } from './read/createLiveReadApi'
import { createReadRuntime } from './read/read-runtime'
import { decideLiveFeatureRoute, isLiveRouteAccessible, liveFeatureRouteDefinitions, type LiveFeatureRoute } from './live-route-policy'
import { getVisibleLiveNavigationItems } from './navigation'
import { buildLiveLoginLandingContext, resolveLoginLanding } from './login-landing'
import { ShellNavigation } from './layout/ShellNavigation'
import { createP5ResetController } from '@/features/p5/p5-reset'
import type { P5Row } from '@/shared/contracts/p5-read'

const configuredApi = () => {
  const get = vi.fn().mockResolvedValue({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 })
  const live = createLiveReadApi({ webBaseUrl: 'https://web.example.test', environment: 'production', bridge: { get } })
  return { live, get }
}
const scope = { source: 'live', sessionScopeId: 'rbac-test', accessRevision: 1 } as const
const accessFor = (permissions: readonly string[]): AccessContextValue => ({ kind: 'authenticated', permissions: new Set(rbacProfile(permissions).permissions) })
const sharedPaths = ['/dashboard', '/dynamic-qrs', '/static-qrs', '/terminals', '/bank-accounts', '/cashiers']

describe('backend-driven RBAC integration', () => {
  it.each([
    ['ROLE_MERCHANT_USER', cashierPermissions, sharedPaths],
    ['ROLE_MERCHANT', merchantPermissions, [...sharedPaths, '/devices']],
  ] as const)('uses the supplied %s effective grants throughout navigation and direct routes', (role, permissions, expected) => {
    const profile = rbacProfile(permissions, [role])
    const access: AccessContextValue = { kind: 'authenticated', permissions: new Set(profile.permissions) }
    const { live } = configuredApi()
    expect(permissions).toHaveLength(role === 'ROLE_MERCHANT' ? 28 : 26)
    expect(getVisibleLiveNavigationItems(access, live.registrations).map((item) => item.path)).toEqual(expected)
    for (const [feature, definition] of Object.entries(liveFeatureRouteDefinitions)) {
      const decision = decideLiveFeatureRoute(feature as LiveFeatureRoute, { sessionPhase: 'authenticated', access, registrations: live.registrations })
      expect(decision).toBe(feature === 'devices' && role === 'ROLE_MERCHANT_USER' ? 'forbidden' : 'allowed')
      expect(isLiveRouteAccessible(definition.path, { access, registrations: live.registrations })).toBe(decision === 'allowed')
    }
  })

  it.each(['ROLE_MERCHANT_USER', 'ROLE_MERCHANT', 'ROLE_UNKNOWN', ''])('never derives grants from role %s', (role) => {
    const profile = rbacProfile(cashierPermissions, [role])
    expect(capabilities.filter((capability) => canWithPermissions(profile.permissions, capability)))
      .toEqual(capabilities.filter((capability) => can(accessFor(cashierPermissions), capability, false)))
    expect(canWithPermissions(rbacProfile([], [role]).permissions, 'p5.read')).toBe(false)
  })

  it('denies unknown policies, unknown permission strings, empty grants and demo grants in live routes', () => {
    const { live } = configuredApi()
    for (const access of [accessFor([]), accessFor(['GET_P5_EXTRA', 'ROLE_MERCHANT', 'FUTURE_GRANT']), { kind: 'anonymous' } as const,
      { kind: 'demo', grants: new Set(['p5.read'] as const) } as const]) {
      expect(getVisibleLiveNavigationItems(access, live.registrations)).toEqual([])
      expect(decideLiveFeatureRoute('devices', { sessionPhase: 'authenticated', access, registrations: live.registrations })).toBe('forbidden')
    }
    expect(decideLiveFeatureRoute('unknown' as LiveFeatureRoute, { sessionPhase: 'authenticated', access: accessFor(merchantPermissions), registrations: live.registrations })).toBe('forbidden')
    expect(isLiveRouteAccessible('/future', { access: accessFor(merchantPermissions), registrations: live.registrations })).toBe(false)
  })

  it('keeps exact membership, ANY and ALL distinct and denies empty requirements', () => {
    const access = accessFor(['GET_P5'])
    expect(hasPermission(access, 'GET_P5')).toBe(true)
    expect(hasPermission(access, 'GET_P5_EXTRA')).toBe(false)
    expect(hasAllPermissions(access, ['GET_P5', 'RESET_P5_PIN'])).toBe(false)
    expect(hasAnyPermission(access, ['GET_P5', 'RESET_P5_PIN'])).toBe(true)
    expect(hasAllPermissions(access, [])).toBe(false)
    expect(hasAnyPermission(access, [])).toBe(false)
  })

  it.each([false, true])('filters expanded/collapsed=%s navigation without removing shared pages', (collapsed) => {
    const { live } = configuredApi()
    const items = getVisibleLiveNavigationItems(accessFor(cashierPermissions), live.registrations)
      .map((item) => ({ ...item, label: item.path }))
    const html = renderToStaticMarkup(<MemoryRouter><ShellNavigation items={items} label="Navigation" collapsed={collapsed} /></MemoryRouter>)
    for (const path of sharedPaths) expect(html).toContain(`href="${path}"`)
    expect(html).not.toContain('href="/devices"')
    expect(html).not.toContain('href="/account"')
  })

  it('selects a deterministic authorized landing and rejects an unauthorized P5 deep link', () => {
    const { live } = configuredApi()
    for (const [permissions, expected] of [[['GET_CASHIERS'], '/cashiers'], [[], '/403'], [['GET_ME'], '/account']] as const) {
      expect(resolveLoginLanding(buildLiveLoginLandingContext({ state: { returnTo: '/devices' }, access: accessFor(permissions), registrations: live.registrations }))).toBe(expected)
    }
  })

  it('suppresses P5 requests for cashier, pending session and revoked grants even by direct query invocation', async () => {
    const { live, get } = configuredApi()
    let access: AccessContextValue = { kind: 'anonymous' }
    const runtime = createReadRuntime(live, () => ({ scope, access }))
    const filters = { search: '', page: 0, size: 20 } as const
    const signal = new AbortController().signal
    for (const next of [{ kind: 'anonymous' } as const, accessFor(cashierPermissions), accessFor([])]) {
      access = next
      const options = runtime.p5ListOptions(filters)
      expect(options.enabled).toBe(false)
      await expect(options.queryFn({ signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    }
    expect(get).not.toHaveBeenCalled()
    access = accessFor(merchantPermissions)
    const authorized = runtime.p5ListOptions(filters)
    expect(authorized.enabled).toBe(true)
    await authorized.queryFn({ signal })
    expect(get).toHaveBeenCalledTimes(1)
    access = accessFor(cashierPermissions)
    await expect(authorized.queryFn({ signal })).rejects.toMatchObject({ name: 'ReadAccessError' })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('keeps read-only P5 accessible with missing optional dropdowns while denying reset callbacks', async () => {
    const { live, get } = configuredApi()
    let permissions: readonly string[] = ['GET_P5']
    const runtime = createReadRuntime(live, () => ({ scope, access: accessFor(permissions) }))
    const options = runtime.p5ListOptions({ search: '', page: 0, size: 20 })
    expect(options.enabled).toBe(true)
    expect(runtime.merchantLookupOptions().enabled).toBe(false)
    expect(runtime.terminalLookupOptions().enabled).toBe(false)
    await options.queryFn({ signal: new AbortController().signal })
    expect(get).toHaveBeenCalledTimes(1)
    const reset = vi.fn().mockResolvedValue({ success: true, data: null })
    const row = { deviceId: 'synthetic-device', deviceStatus: 0 } as P5Row
    const controller = createP5ResetController({ currentScope: () => scope,
      canRead: () => canWithPermissions(permissions, 'p5.read'), canReset: () => canWithPermissions(permissions, 'p5.resetPin'),
      currentRow: () => row, port: () => ({ reset }), invalidateConfirmed: async () => undefined })
    expect(controller.request(row)).toBe(false)
    await controller.confirm()
    expect(reset).not.toHaveBeenCalled()
    permissions = merchantPermissions
    expect(controller.request(row)).toBe(true)
    permissions = cashierPermissions
    await controller.confirm()
    expect(reset).not.toHaveBeenCalled()
  })
})
