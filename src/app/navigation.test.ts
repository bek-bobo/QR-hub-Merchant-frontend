import { describe, expect, it } from 'vitest'
import type { AccessContextValue } from '@/shared/auth/access'
import type { ReadApiRegistrations } from './read/createLiveReadApi'
import {
  getVisibleLiveNavigationItems as getLiveNavigationItems,
  liveNavigationItems,
} from './navigation'

const configured: ReadApiRegistrations = {
  dashboard: { kind: 'configured' },
  dynamicQr: { kind: 'configured' },
  terminalLookup: { kind: 'unavailable', reason: 'Not configured.' },
  terminalList: { kind: 'unavailable', reason: 'Not configured.' },
  bankAccountList: { kind: 'unavailable', reason: 'Not configured.' },
  cashierList: { kind: 'unavailable', reason: 'Not configured.' },
  merchantLookup: { kind: 'unavailable', reason: 'Not configured.' },
  bankAccountLookup: { kind: 'unavailable', reason: 'Not configured.' },
  p5List: { kind: 'unavailable', reason: 'Not configured.' },
}

function authenticated(...permissions: string[]): AccessContextValue {
  return { kind: 'authenticated', permissions: new Set(permissions) }
}

describe('live navigation policy', () => {
  it('keeps route order and owns an icon for every navigation destination', () => {
    expect(liveNavigationItems.map((item) => item.path)).toEqual([
      '/dashboard',
      '/dynamic-qrs',
      '/static-qrs',
      '/terminals',
      '/bank-accounts',
      '/cashiers',
      '/devices',
      '/account',
    ])
    expect(liveNavigationItems.every((item) => item.icon !== undefined)).toBe(true)
  })

  it('keeps the account route out of primary navigation', () => {
    expect(getLiveNavigationItems(authenticated(
      'GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_STATIC_QRS', 'GET_ME',
      'CREATE_DYNAMIC_QR', 'EXPORT_DYNAMIC_QRS',
    ), configured).map((item) => item.path)).toEqual([
      '/dashboard', '/dynamic-qrs', '/static-qrs',
    ])
  })

  it('shows only exact granted and configured feature links', () => {
    expect(
      getLiveNavigationItems(
        authenticated('GET_ME', 'GET_DASHBOARD', 'GET_DYNAMIC_QRS'),
        configured,
      ).map((item) => item.path),
    ).toEqual(['/dashboard', '/dynamic-qrs'])
  })
  it('matches the terminal route grant and registration, without dropdown permissions', () => {
    const ready = { ...configured, terminalList: { kind: 'configured' as const } }
    expect(getLiveNavigationItems(authenticated('GET_TERMINAL'), ready).map((item) => item.path)).toEqual(['/terminals'])
    expect(getLiveNavigationItems(authenticated('GET_TERMINAL'), configured).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('GET_DROPDOWN_TERMINALS'), ready).map((item) => item.path)).toEqual([])
  })
  it('shows bank accounts only for its exact list grant and registration', () => {
    const ready = { ...configured, bankAccountList: { kind: 'configured' as const } }
    expect(getLiveNavigationItems(authenticated('GET_BANK_ACCOUNTS'), ready).map((item) => item.path)).toEqual(['/bank-accounts'])
    expect(getLiveNavigationItems(authenticated('GET_BANK_ACCOUNTS'), configured).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('GET_DROPDOWN_MERCHANTS'), ready).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('GET_TERMINAL'), { ...ready, terminalList: { kind: 'configured' as const } }).map((item) => item.path)).toEqual(['/terminals'])
  })
  it('shows cashiers only for its exact list grant and registration while retaining D5 links', () => {
    const ready = { ...configured, cashierList: { kind: 'configured' as const }, terminalList: { kind: 'configured' as const }, bankAccountList: { kind: 'configured' as const } }
    expect(getLiveNavigationItems(authenticated('GET_CASHIERS'), ready).map((item) => item.path)).toEqual(['/cashiers'])
    expect(getLiveNavigationItems(authenticated('GET_CASHIERS'), configured).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('ASSIGN_TERMINALS', 'UNASSIGN_TERMINAL', 'CREATE_CASHIER'), ready).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('GET_TERMINAL', 'GET_BANK_ACCOUNTS', 'GET_CASHIERS'), ready).map((item) => item.path)).toEqual(['/terminals', '/bank-accounts', '/cashiers'])
    expect(getLiveNavigationItems(authenticated('CREATE_CASHIER'), configured).map((item) => item.path)).toEqual([])
  })
  it('shows one devices link only for exact P5 read access and readiness', () => {
    const ready = { ...configured, p5List: { kind: 'configured' as const } }
    expect(getLiveNavigationItems(authenticated('GET_P5'), ready).map((item) => item.path)).toEqual(['/devices'])
    expect(getLiveNavigationItems(authenticated('GET_P5'), configured).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('RESET_P5_PIN', 'GET_DROPDOWN_MERCHANTS', 'GET_DROPDOWN_TERMINALS'), ready).map((item) => item.path)).toEqual([])
    expect(getLiveNavigationItems(authenticated('GET_P5'), ready).filter((item) => item.path === '/devices')).toHaveLength(1)
  })

  it('hides a feature link when its registration is unavailable', () => {
    expect(
      getLiveNavigationItems(authenticated('GET_ME', 'GET_DASHBOARD'), {
        ...configured,
        dashboard: { kind: 'unavailable', reason: 'Not configured.' },
      }).map((item) => item.path),
    ).toEqual([])
  })

  it('hides a feature link when its capability is missing', () => {
    expect(
      getLiveNavigationItems(authenticated('GET_ME'), configured).map(
        (item) => item.path,
      ),
    ).toEqual([])
  })

  it('keeps core links visible when terminal lookup is unavailable', () => {
    expect(
      getLiveNavigationItems(
        authenticated('GET_DASHBOARD', 'GET_DYNAMIC_QRS'),
        configured,
      ).map((item) => item.path),
    ).toEqual(['/dashboard', '/dynamic-qrs'])
  })

  it('does not treat an export-only grant as primary navigation', () => {
    expect(getLiveNavigationItems(authenticated('EXPORT_DYNAMIC_QRS'), configured).map((item) => item.path))
      .toEqual([])
    expect(getLiveNavigationItems(authenticated('EXPORT_DYNAMIC_QRS'), {
      ...configured, dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
    }).map((item) => item.path)).toEqual([])
  })

  it.each([
    ['GET_DASHBOARD', '/dashboard'],
    ['GET_DYNAMIC_QRS', '/dynamic-qrs'],
    ['GET_STATIC_QRS', '/static-qrs'],
  ])('omits %s primary navigation without its exact grant', (missing, path) => {
    const permissions = [
      'GET_DASHBOARD', 'GET_DYNAMIC_QRS', 'GET_STATIC_QRS', 'GET_ME',
    ].filter((permission) => permission !== missing)
    expect(getLiveNavigationItems(authenticated(...permissions), configured)
      .map((item) => item.path)).not.toContain(path)
  })

  it('hides dynamic QR when its web registration is unavailable', () => {
    expect(getLiveNavigationItems(authenticated('GET_DYNAMIC_QRS', 'GET_ME'), {
      ...configured, dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
    }).map((item) => item.path)).toEqual([])
  })

  it('shows static navigation only for its exact grant and configured web base', () => {
    expect(getLiveNavigationItems(authenticated('GET_STATIC_QRS'), configured).map((item) => item.path))
      .toEqual(['/static-qrs'])
    expect(getLiveNavigationItems(authenticated('GET_DYNAMIC_QRS'), configured).map((item) => item.path))
      .not.toContain('/static-qrs')
    expect(getLiveNavigationItems(authenticated('GET_STATIC_QRS'), {
      ...configured, dynamicQr: { kind: 'unavailable', reason: 'Not configured.' },
    }).map((item) => item.path)).toEqual([])
  })
})
