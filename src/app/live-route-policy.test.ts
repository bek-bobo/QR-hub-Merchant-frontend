import { describe, expect, it } from 'vitest'
import type { AccessContextValue } from '@/shared/auth/access'
import type { ReadApiRegistrations } from './read/createLiveReadApi'
import { decideLiveFeatureRoute, isLiveRouteAccessible } from './live-route-policy'
import { getLiveNavigationItems } from './navigation'

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

function authenticated(...permissions: string[]): AccessContextValue {
  return { kind: 'authenticated', permissions: new Set(permissions) }
}

describe('live feature route policy', () => {
  it('sends an anonymous visitor to login before evaluating a feature', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'anonymous',
        access: { kind: 'anonymous' },
        registrations: configured,
      }),
    ).toBe('login')
  })

  it('keeps private pages unmounted while the session bootstraps', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'bootstrapping',
        access: { kind: 'anonymous' },
        registrations: configured,
      }),
    ).toBe('pending')
  })

  it('forbids an authenticated user missing the route capability', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access: authenticated(),
        registrations: configured,
      }),
    ).toBe('forbidden')
  })

  it('reports feature unavailability after capability approval', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DASHBOARD'),
        registrations: {
          ...configured,
          dashboard: { kind: 'unavailable', reason: 'Not configured.' },
        },
      }),
    ).toBe('unavailable')
  })

  it('allows an authenticated user with the exact capability and registration', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DASHBOARD'),
        registrations: configured,
      }),
    ).toBe('allowed')
  })
  it('allows the terminal route with only GET_TERMINAL, independently of lookup grants', () => {
    const registrations = { ...configured, terminalList: { kind: 'configured' as const } }
    expect(decideLiveFeatureRoute('terminals', { sessionPhase: 'authenticated', access: authenticated('GET_TERMINAL'), registrations })).toBe('allowed')
    expect(isLiveRouteAccessible('/terminals', { access: authenticated('GET_TERMINAL'), registrations })).toBe(true)
    expect(decideLiveFeatureRoute('terminals', { sessionPhase: 'authenticated', access: authenticated('GET_DROPDOWN_TERMINALS'), registrations })).toBe('forbidden')
    expect(decideLiveFeatureRoute('terminals', { sessionPhase: 'authenticated', access: authenticated('GET_TERMINAL'), registrations: configured })).toBe('unavailable')
  })
  it('allows bank accounts with only GET_BANK_ACCOUNTS and its list registration', () => {
    const registrations = { ...configured, bankAccountList: { kind: 'configured' as const } }
    expect(decideLiveFeatureRoute('bankAccounts', { sessionPhase: 'authenticated', access: authenticated('GET_BANK_ACCOUNTS'), registrations })).toBe('allowed')
    expect(isLiveRouteAccessible('/bank-accounts', { access: authenticated('GET_BANK_ACCOUNTS'), registrations })).toBe(true)
    expect(decideLiveFeatureRoute('bankAccounts', { sessionPhase: 'authenticated', access: authenticated('GET_DROPDOWN_MERCHANTS'), registrations })).toBe('forbidden')
    expect(decideLiveFeatureRoute('bankAccounts', { sessionPhase: 'authenticated', access: authenticated('GET_BANK_ACCOUNTS'), registrations: configured })).toBe('unavailable')
  })
  it('allows cashiers only with GET_CASHIERS and its list registration', () => {
    const registrations = { ...configured, cashierList: { kind: 'configured' as const } }
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'authenticated', access: authenticated('GET_CASHIERS'), registrations })).toBe('allowed')
    expect(isLiveRouteAccessible('/cashiers', { access: authenticated('GET_CASHIERS'), registrations })).toBe(true)
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'anonymous', access: { kind: 'anonymous' }, registrations })).toBe('login')
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'bootstrapping', access: { kind: 'anonymous' }, registrations })).toBe('pending')
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'authenticated', access: authenticated('GET_DROPDOWN_MERCHANTS', 'GET_DROPDOWN_TERMINALS'), registrations })).toBe('forbidden')
    expect(decideLiveFeatureRoute('cashiers', { sessionPhase: 'authenticated', access: authenticated('GET_CASHIERS'), registrations: configured })).toBe('unavailable')
  })
  it('applies cashier-list access to the legacy create URL destination', () => {
    const registrations = { ...configured, cashierList: { kind: 'configured' as const } }
    const createOnly = authenticated('CREATE_CASHIER', 'GET_DROPDOWN_TERMINALS')
    expect(isLiveRouteAccessible('/cashiers/new', { access: createOnly, registrations })).toBe(false)
    expect(isLiveRouteAccessible('/cashiers/new', { access: authenticated('GET_CASHIERS'), registrations })).toBe(true)
    expect(isLiveRouteAccessible('/cashiers', { access: createOnly, registrations })).toBe(false)
    expect(isLiveRouteAccessible('/cashiers/new', { access: authenticated('GET_CASHIERS'), registrations: configured })).toBe(false)
  })
  it('gates devices by only GET_P5 and the P5 list registration', () => {
    const registrations = { ...configured, p5List: { kind: 'configured' as const } }
    const allowed = { sessionPhase: 'authenticated' as const, access: authenticated('GET_P5'), registrations }
    expect(decideLiveFeatureRoute('devices', allowed)).toBe('allowed')
    expect(isLiveRouteAccessible('/devices', allowed)).toBe(true)
    expect(decideLiveFeatureRoute('devices', { ...allowed, access: authenticated() })).toBe('forbidden')
    expect(decideLiveFeatureRoute('devices', { ...allowed, access: authenticated('RESET_P5_PIN') })).toBe('forbidden')
    expect(decideLiveFeatureRoute('devices', { ...allowed, access: authenticated('GET_DROPDOWN_MERCHANTS', 'GET_DROPDOWN_TERMINALS') })).toBe('forbidden')
    expect(decideLiveFeatureRoute('devices', { ...allowed, access: authenticated('GET_TERMINAL', 'GET_BANK_ACCOUNTS', 'GET_CASHIERS') })).toBe('forbidden')
    expect(decideLiveFeatureRoute('devices', { ...allowed, registrations: configured })).toBe('unavailable')
  })

  it('does not let dashboard authority grant the dynamic QR route', () => {
    expect(
      decideLiveFeatureRoute('dynamicQr', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DASHBOARD'),
        registrations: configured,
      }),
    ).toBe('forbidden')
  })

  it('does not let dynamic QR authority grant the dashboard route', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DYNAMIC_QRS'),
        registrations: configured,
      }),
    ).toBe('forbidden')
  })

  it('does not require terminal lookup for either core route', () => {
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DASHBOARD'),
        registrations: configured,
      }),
    ).toBe('allowed')
    expect(
      decideLiveFeatureRoute('dynamicQr', {
        sessionPhase: 'authenticated',
        access: authenticated('GET_DYNAMIC_QRS'),
        registrations: configured,
      }),
    ).toBe('allowed')
  })

  it('allows export-only access without dynamic read or terminal lookup', () => {
    const access = authenticated('EXPORT_DYNAMIC_QRS')
    const input = { sessionPhase: 'authenticated' as const, access, registrations: configured }
    expect(decideLiveFeatureRoute('exportQr', input)).toBe('allowed')
    expect(decideLiveFeatureRoute('dynamicQr', input)).toBe('forbidden')
    expect(getLiveNavigationItems(access, configured).map((item) => item.path))
      .toEqual([])
  })

  it('gates direct export route by session, exact grant and web registration', () => {
    const access = authenticated('EXPORT_DYNAMIC_QRS')
    expect(decideLiveFeatureRoute('exportQr', {
      sessionPhase: 'anonymous', access: { kind: 'anonymous' }, registrations: configured,
    })).toBe('login')
    expect(decideLiveFeatureRoute('exportQr', {
      sessionPhase: 'bootstrapping', access, registrations: configured,
    })).toBe('pending')
    expect(decideLiveFeatureRoute('exportQr', {
      sessionPhase: 'authenticated', access: authenticated('GET_DYNAMIC_QRS'), registrations: configured,
    })).toBe('forbidden')
    expect(decideLiveFeatureRoute('exportQr', {
      sessionPhase: 'authenticated', access,
      registrations: { ...configured, dynamicQr: { kind: 'unavailable', reason: 'Not configured.' } },
    })).toBe('unavailable')
  })

  it('allows a static-only account without dynamic or dashboard grants', () => {
    const access = authenticated('GET_STATIC_QRS')
    const input = { sessionPhase: 'authenticated' as const, access, registrations: configured }
    expect(decideLiveFeatureRoute('staticQr', input)).toBe('allowed')
    expect(decideLiveFeatureRoute('dynamicQr', input)).toBe('forbidden')
    expect(decideLiveFeatureRoute('dashboard', input)).toBe('forbidden')
    expect(getLiveNavigationItems(access, configured).map((item) => item.path))
      .toEqual(['/static-qrs'])
  })

  it('gates static route by session, exact grant and shared web registration', () => {
    const access = authenticated('GET_STATIC_QRS')
    expect(decideLiveFeatureRoute('staticQr', {
      sessionPhase: 'anonymous', access: { kind: 'anonymous' }, registrations: configured,
    })).toBe('login')
    expect(decideLiveFeatureRoute('staticQr', {
      sessionPhase: 'bootstrapping', access, registrations: configured,
    })).toBe('pending')
    expect(decideLiveFeatureRoute('staticQr', {
      sessionPhase: 'authenticated', access: authenticated('GET_DYNAMIC_QRS'), registrations: configured,
    })).toBe('forbidden')
    expect(decideLiveFeatureRoute('staticQr', {
      sessionPhase: 'authenticated', access,
      registrations: { ...configured, dynamicQr: { kind: 'unavailable', reason: 'Not configured.' } },
    })).toBe('unavailable')
  })

  it('still denies a direct route when its navigation item is hidden', () => {
    const access = authenticated('GET_ME')

    expect(
      getLiveNavigationItems(access, configured).some(
        (item) => item.path === '/dashboard',
      ),
    ).toBe(false)
    expect(
      decideLiveFeatureRoute('dashboard', {
        sessionPhase: 'authenticated',
        access,
        registrations: configured,
      }),
    ).toBe('forbidden')
  })
})

describe('authenticated live route accessibility', () => {
  it.each([
    ['/dashboard', 'GET_DASHBOARD', 'dashboard'],
    ['/dynamic-qrs', 'GET_DYNAMIC_QRS', 'dynamicQr'],
    ['/static-qrs', 'GET_STATIC_QRS', 'dynamicQr'],
    ['/dynamic-qrs/export', 'EXPORT_DYNAMIC_QRS', 'dynamicQr'],
    ['/devices', 'GET_P5', 'p5List'],
  ] as const)('requires the exact grant and registration for %s', (path, grant, registration) => {
    const readyRegistrations = {
      ...configured,
      [registration]: { kind: 'configured' as const },
    }
    expect(isLiveRouteAccessible(path, {
      access: authenticated(grant), registrations: readyRegistrations,
    })).toBe(true)
    expect(isLiveRouteAccessible(path, {
      access: authenticated(), registrations: readyRegistrations,
    })).toBe(false)
    expect(isLiveRouteAccessible(path, {
      access: authenticated(grant),
      registrations: {
        ...readyRegistrations,
        [registration]: { kind: 'unavailable', reason: 'Not configured.' },
      },
    })).toBe(false)
  })

  it('keeps account independent of web read registrations', () => {
    const unavailable = {
      ...configured,
      dashboard: { kind: 'unavailable' as const, reason: 'Not configured.' },
      dynamicQr: { kind: 'unavailable' as const, reason: 'Not configured.' },
      terminalLookup: { kind: 'unavailable' as const, reason: 'Not configured.' },
    }
    expect(isLiveRouteAccessible('/account', {
      access: authenticated('GET_ME'), registrations: unavailable,
    })).toBe(true)
    expect(isLiveRouteAccessible('/account', {
      access: authenticated(), registrations: configured,
    })).toBe(false)
  })

  it('allows the create page with only its exact grant and no web read registration', () => {
    expect(isLiveRouteAccessible('/dynamic-qrs/new', {
      access: authenticated('CREATE_DYNAMIC_QR'),
      registrations: {
        ...configured,
        dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
      },
    })).toBe(true)
    expect(isLiveRouteAccessible('/dynamic-qrs/new', {
      access: authenticated('GET_DYNAMIC_QRS'), registrations: configured,
    })).toBe(false)
  })

  it('keeps forbidden reachable for an authenticated user and rejects unknown paths', () => {
    expect(isLiveRouteAccessible('/403', {
      access: authenticated(), registrations: configured,
    })).toBe(true)
    expect(isLiveRouteAccessible('/unknown', {
      access: authenticated('GET_ME'), registrations: configured,
    })).toBe(false)
    expect(isLiveRouteAccessible('/403', {
      access: { kind: 'anonymous' }, registrations: configured,
    })).toBe(false)
  })
})
