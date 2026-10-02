import { describe, expect, it } from 'vitest'
import { can, type AccessContextValue } from './access'

describe('capability boundary', () => {
  it('does not grant anonymous access', () => {
    expect(can({ kind: 'anonymous' }, 'dashboard.read', true)).toBe(false)
  })

  it('requires both the preview gate and an explicit demo grant', () => {
    const demo: AccessContextValue = {
      kind: 'demo',
      grants: new Set(['dashboard.read']),
    }

    expect(can(demo, 'dashboard.read', true)).toBe(true)
    expect(can(demo, 'dashboard.read', false)).toBe(false)
    expect(can(demo, 'dynamicQr.read', true)).toBe(false)
  })

  it('does not infer an authority for an unmapped capability', () => {
    const user: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['GET_TERMINALS']),
    }

    expect(can(user, 'terminal.read', false)).toBe(false)
  })

  it('requires exact verified authority matching without role shortcuts', () => {
    const map = { 'dashboard.read': 'example:dashboard:read' } as const
    const exact: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['example:dashboard:read']),
    }
    const similar: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['example:dashboard:read-all', 'ROLE_ADMIN']),
    }

    expect(can(exact, 'dashboard.read', false, map)).toBe(true)
    expect(can(similar, 'dashboard.read', false, map)).toBe(false)
  })

  it('grants profile read only for the exact verified GET_ME permission', () => {
    const exact: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['GET_ME']),
    }
    const substring: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['GET_ME_EXTENDED']),
    }
    const missing: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(),
    }
    const roleOnly = {
      kind: 'authenticated' as const,
      permissions: new Set<string>(),
      roles: new Set(['GET_ME']),
    }

    expect(can(exact, 'profile.read', false)).toBe(true)
    expect(can(substring, 'profile.read', false)).toBe(false)
    expect(can(missing, 'profile.read', false)).toBe(false)
    expect(can(roleOnly, 'profile.read', false)).toBe(false)
  })
  it('does not conflate management list, lookup and mutation authorities', () => {
    const listOnly: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_TERMINAL', 'GET_BANK_ACCOUNTS', 'GET_CASHIERS']) }
    expect(can(listOnly, 'terminal.read', false)).toBe(true)
    expect(can(listOnly, 'terminal.lookup', false)).toBe(false)
    expect(can(listOnly, 'bankAccount.lookup', false)).toBe(false)
    expect(can(listOnly, 'cashier.create', false)).toBe(false)
    const lookupOnly: AccessContextValue = { kind: 'authenticated', permissions: new Set(['GET_DROPDOWN_TERMINALS', 'GET_DROPDOWN_BANK_ACCOUNTS']) }
    expect(can(lookupOnly, 'terminal.read', false)).toBe(false)
    expect(can(lookupOnly, 'bankAccount.read', false)).toBe(false)
  })

  it.each([
    ['dashboard.read', 'GET_DASHBOARD'],
    ['dynamicQr.read', 'GET_DYNAMIC_QRS'],
    ['dynamicQr.create', 'CREATE_DYNAMIC_QR'],
    ['dynamicQr.export', 'EXPORT_DYNAMIC_QRS'],
    ['dynamicQr.cancel', 'CANCEL_PAYMENT'],
    ['staticQr.read', 'GET_STATIC_QRS'],
    ['currency.lookup', 'GET_CURRENCY_CODE'],
    ['terminal.lookup', 'GET_DROPDOWN_TERMINALS'],
    ['region.lookup', 'GET_DROPDOWN_REGIONS'],
    ['district.lookup', 'GET_DROPDOWN_DISTRICTS'],
    ['p5.read', 'GET_P5'],
    ['p5.resetPin', 'RESET_P5_PIN'],
  ] as const)('requires the exact verified %s authority', (capability, authority) => {
    expect(
      can(
        { kind: 'authenticated', permissions: new Set([authority]) },
        capability,
        false,
      ),
    ).toBe(true)
    expect(
      can(
        {
          kind: 'authenticated',
          permissions: new Set([`${authority}_EXTRA`, 'GET_TERMINAL']),
        },
        capability,
        false,
      ),
    ).toBe(false)
  })

  it('denies a capability when its verified mapping is missing', () => {
    const user: AccessContextValue = {
      kind: 'authenticated',
      permissions: new Set(['example:dashboard:read']),
    }

    expect(can(user, 'dashboard.read', false, {})).toBe(false)
  })

  it('does not grant through role, substring, or wildcard guesses', () => {
    const map = { 'dashboard.read': 'example:dashboard:read' } as const
    for (const permission of [
      'ROLE_ADMIN',
      'example:dashboard:read-all',
      'example:dashboard:*',
      '*',
    ]) {
      expect(
        can(
          { kind: 'authenticated', permissions: new Set([permission]) },
          'dashboard.read',
          false,
          map,
        ),
      ).toBe(false)
    }
  })

  it('never treats demo grants as live permissions', () => {
    const demo: AccessContextValue = {
      kind: 'demo',
      grants: new Set(['dashboard.read']),
    }

    expect(can(demo, 'dashboard.read', false, {
      'dashboard.read': 'example:dashboard:read',
    })).toBe(false)
  })
})
