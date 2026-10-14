// Confirmed against merchant web SecurityConfig and resource mappings.
// Effective grants come only from the current accepted GET_ME profile.
import type { Capability } from '@/shared/auth/access'
import type { ReadApiRegistrations } from './read/createLiveReadApi'

export type LiveFeatureRoute = 'dashboard' | 'dynamicQr' | 'exportQr' | 'staticQr' | 'terminals' | 'bankAccounts' | 'cashiers' | 'devices'

export const liveFeatureRouteDefinitions = {
  dashboard: {
    path: '/dashboard',
    capability: 'dashboard.read',
    registration: 'dashboard',
  },
  dynamicQr: {
    path: '/dynamic-qrs',
    capability: 'dynamicQr.read',
    registration: 'dynamicQr',
  },
  exportQr: {
    path: '/dynamic-qrs/export',
    capability: 'dynamicQr.export',
    // Shared web-base registration; the read capability is checked separately.
    registration: 'dynamicQr',
  },
  staticQr: {
    path: '/static-qrs',
    capability: 'staticQr.read',
    // Both list APIs use the same validated web base; grants remain independent.
    registration: 'dynamicQr',
  },
  terminals: {
    path: '/terminals',
    capability: 'terminal.read',
    registration: 'terminalList',
  },
  bankAccounts: {
    path: '/bank-accounts',
    capability: 'bankAccount.read',
    registration: 'bankAccountList',
  },
  cashiers: {
    path: '/cashiers',
    capability: 'cashier.read',
    registration: 'cashierList',
  },
  devices: {
    path: '/devices',
    capability: 'p5.read',
    registration: 'p5List',
  },
} as const satisfies Record<
  LiveFeatureRoute,
  {
    readonly path: string
    readonly capability: Capability
    readonly registration: keyof ReadApiRegistrations
  }
>


// Explicit endpoint capabilities shared by query gating and runtime assertions.
export const readEndpointCapabilities = {
  dashboard: 'dashboard.read',
  dynamicQr: 'dynamicQr.read',
  terminalLookup: 'terminal.lookup',
  terminalList: 'terminal.read',
  bankAccountList: 'bankAccount.read',
  cashierList: 'cashier.read',
  merchantLookup: 'merchant.lookup',
  bankAccountLookup: 'bankAccount.lookup',
  regionLookup: 'region.lookup',
  districtLookup: 'district.lookup',
  p5List: 'p5.read',
} as const satisfies Record<keyof ReadApiRegistrations, Capability>

export const accountRoutePolicy = { path: '/account', capability: 'profile.read' } as const
export const createQrRoutePolicy = { path: '/dynamic-qrs/new', capability: 'dynamicQr.create' } as const
