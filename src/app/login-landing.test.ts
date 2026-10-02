import { describe, expect, it } from 'vitest'
import type { ReadApiRegistrations } from './read/createLiveReadApi'
import { buildLiveLoginLandingContext, resolveLoginLanding } from './login-landing'

const configured: ReadApiRegistrations = {
  dashboard: { kind: 'configured' },
  dynamicQr: { kind: 'configured' },
  terminalLookup: { kind: 'unavailable', reason: 'Not configured.' },
  terminalList: { kind: 'unavailable', reason: 'Not configured.' },
  bankAccountList: { kind: 'unavailable', reason: 'Not configured.' },
  cashierList: { kind: 'unavailable', reason: 'Not configured.' },
  merchantLookup: { kind: 'unavailable', reason: 'Not configured.' },
  bankAccountLookup: { kind: 'unavailable', reason: 'Not configured.' },
  regionLookup: { kind: 'unavailable', reason: 'Not configured.' },
  districtLookup: { kind: 'unavailable', reason: 'Not configured.' },
  p5List: { kind: 'unavailable', reason: 'Not configured.' },
}

function authenticated(...permissions: string[]) {
  return { kind: 'authenticated' as const, permissions: new Set(permissions) }
}

describe('post-login landing', () => {
  it.each([
    {
      name: 'starts at dashboard when all primary destinations are permitted',
      state: null,
      primaryDestinations: ['/dashboard', '/dynamic-qrs', '/static-qrs', '/account'],
      expected: '/dashboard',
    },
    {
      name: 'falls back to dynamic QR when dashboard is unavailable',
      state: null,
      primaryDestinations: ['/dynamic-qrs', '/static-qrs', '/account'],
      expected: '/dynamic-qrs',
    },
    {
      name: 'falls back to static QR when earlier destinations are unavailable',
      state: null,
      primaryDestinations: ['/static-qrs', '/account'],
      expected: '/static-qrs',
    },
    {
      name: 'uses account when it is the only permitted primary destination',
      state: null,
      primaryDestinations: ['/account'],
      expected: '/account',
    },
    {
      name: 'uses forbidden when no primary destination is permitted',
      state: null,
      primaryDestinations: [],
      expected: '/403',
    },
    {
      name: 'ignores an unsafe returnTo and uses the first primary destination',
      state: { returnTo: 'https://example.com' },
      primaryDestinations: ['/dashboard', '/account'],
      expected: '/dashboard',
    },
  ])('$name', ({ state, primaryDestinations, expected }) => {
    expect(resolveLoginLanding({
      state,
      primaryDestinations,
      returnToAccessible: true,
    })).toBe(expected)
  })

  it('honors an accessible safe returnTo ahead of the primary fallback', () => {
    expect(resolveLoginLanding({
      state: { returnTo: '/static-qrs' },
      primaryDestinations: ['/dashboard', '/static-qrs', '/account'],
      returnToAccessible: true,
    })).toBe('/static-qrs')
  })

  it('falls back when a safe returnTo is inaccessible', () => {
    expect(resolveLoginLanding({
      state: { returnTo: '/dashboard' },
      primaryDestinations: ['/dynamic-qrs', '/account'],
      returnToAccessible: false,
    })).toBe('/dynamic-qrs')
  })
})

describe('live post-login context', () => {
  it('derives all permitted primary destinations in navigation order', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_STATIC_QRS', 'GET_ME'),
      registrations: configured,
    }).primaryDestinations).toEqual([
      '/dashboard', '/dynamic-qrs', '/static-qrs', '/account',
    ])
  })

  it('omits dashboard without its exact capability', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('GET_DYNAMIC_QRS', 'GET_STATIC_QRS', 'GET_ME'),
      registrations: configured,
    }).primaryDestinations).toEqual(['/dynamic-qrs', '/static-qrs', '/account'])
  })

  it('omits dashboard when its read registration is unavailable', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('GET_DASHBOARD', 'GET_ME'),
      registrations: {
        ...configured,
        dashboard: { kind: 'unavailable', reason: 'Not configured.' },
      },
    }).primaryDestinations).toEqual(['/account'])
  })

  it('omits dynamic and static QR when their shared read registration is unavailable', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('GET_DYNAMIC_QRS', 'GET_STATIC_QRS', 'GET_ME'),
      registrations: {
        ...configured,
        dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
      },
    }).primaryDestinations).toEqual(['/account'])
  })

  it('keeps account independent of web read registration', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('GET_ME'),
      registrations: {
        ...configured,
        dashboard: { kind: 'unavailable', reason: 'Not configured.' },
        dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
      },
    }).primaryDestinations).toEqual(['/account'])
  })

  it('honors a safe returnTo when its exact capability and registration are available', () => {
    const context = buildLiveLoginLandingContext({
      state: { returnTo: '/dashboard' },
      access: authenticated('GET_DASHBOARD', 'GET_DYNAMIC_QRS'),
      registrations: configured,
    })
    expect(context.returnToAccessible).toBe(true)
    expect(resolveLoginLanding(context)).toBe('/dashboard')
  })
  it('returns to terminals only with terminal read access, not lookup access', () => {
    const registrations = { ...configured, terminalList: { kind: 'configured' as const } }
    const allowed = buildLiveLoginLandingContext({ state: { returnTo: '/terminals' }, access: authenticated('GET_TERMINAL'), registrations })
    expect(resolveLoginLanding(allowed)).toBe('/terminals')
    const denied = buildLiveLoginLandingContext({ state: { returnTo: '/terminals' }, access: authenticated('GET_DROPDOWN_TERMINALS'), registrations })
    expect(resolveLoginLanding(denied)).not.toBe('/terminals')
  })
  it('returns to bank accounts only with bank-account list access', () => {
    const registrations = { ...configured, bankAccountList: { kind: 'configured' as const } }
    const allowed = buildLiveLoginLandingContext({ state: { returnTo: '/bank-accounts' }, access: authenticated('GET_BANK_ACCOUNTS'), registrations })
    expect(resolveLoginLanding(allowed)).toBe('/bank-accounts')
    const lookupOnly = buildLiveLoginLandingContext({ state: { returnTo: '/bank-accounts' }, access: authenticated('GET_DROPDOWN_BANK_ACCOUNTS'), registrations })
    expect(resolveLoginLanding(lookupOnly)).not.toBe('/bank-accounts')
  })
  it('returns to cashiers only with cashier list access', () => {
    const registrations = { ...configured, cashierList: { kind: 'configured' as const } }
    const allowed = buildLiveLoginLandingContext({ state: { returnTo: '/cashiers' }, access: authenticated('GET_CASHIERS'), registrations })
    expect(resolveLoginLanding(allowed)).toBe('/cashiers')
    const writeOnly = buildLiveLoginLandingContext({ state: { returnTo: '/cashiers' }, access: authenticated('CREATE_CASHIER', 'ASSIGN_TERMINALS'), registrations })
    expect(resolveLoginLanding(writeOnly)).not.toBe('/cashiers')
  })

  it('does not land on the retired cashier create page', () => {
    const registrations = { ...configured, cashierList: { kind: 'configured' as const } }
    const createOnly = buildLiveLoginLandingContext({ state: { returnTo: '/cashiers/new' }, access: authenticated('CREATE_CASHIER'), registrations })
    expect(resolveLoginLanding(createOnly)).not.toBe('/cashiers/new')
    const readOnly = buildLiveLoginLandingContext({ state: { returnTo: '/cashiers/new' }, access: authenticated('GET_CASHIERS'), registrations })
    expect(resolveLoginLanding(readOnly)).not.toBe('/cashiers/new')
  })
  it('returns to devices only with exact P5 read access and readiness', () => {
    const registrations = { ...configured, p5List: { kind: 'configured' as const } }
    const allowed = buildLiveLoginLandingContext({ state: { returnTo: '/devices' }, access: authenticated('GET_P5'), registrations })
    expect(resolveLoginLanding(allowed)).toBe('/devices')
    const resetOnly = buildLiveLoginLandingContext({ state: { returnTo: '/devices' }, access: authenticated('RESET_P5_PIN'), registrations })
    expect(resolveLoginLanding(resetOnly)).not.toBe('/devices')
    const unavailable = buildLiveLoginLandingContext({ state: { returnTo: '/devices' }, access: authenticated('GET_P5'), registrations: configured })
    expect(resolveLoginLanding(unavailable)).not.toBe('/devices')
  })

  it('falls back when a safe returnTo lacks its exact capability', () => {
    const context = buildLiveLoginLandingContext({
      state: { returnTo: '/dashboard' },
      access: authenticated('GET_DYNAMIC_QRS'),
      registrations: configured,
    })
    expect(context.returnToAccessible).toBe(false)
    expect(resolveLoginLanding(context)).toBe('/dynamic-qrs')
  })

  it('falls back when a safe returnTo lacks its required read registration', () => {
    const context = buildLiveLoginLandingContext({
      state: { returnTo: '/dashboard' },
      access: authenticated('GET_DASHBOARD', 'GET_DYNAMIC_QRS'),
      registrations: {
        ...configured,
        dashboard: { kind: 'unavailable', reason: 'Not configured.' },
      },
    })
    expect(context.returnToAccessible).toBe(false)
    expect(resolveLoginLanding(context)).toBe('/dynamic-qrs')
  })

  it('does not infer primary destinations from a role-like permission', () => {
    expect(buildLiveLoginLandingContext({
      state: null,
      access: authenticated('ROLE_ADMIN'),
      registrations: configured,
    }).primaryDestinations).toEqual([])
  })
})
