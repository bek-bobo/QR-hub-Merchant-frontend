import type { ReadApiRegistrations } from '@/app/read/createLiveReadApi'
import {
  can,
  type AccessContextValue,
  type Capability,
} from '@/shared/auth/access'

export interface NavigationItem {
  label: string
  path: string
  capability: Capability
  availability: 'ready' | 'scheduled'
}

export const navigationItems = [
  {
    label: 'Bosh sahifa',
    path: '/dashboard',
    capability: 'dashboard.read',
    availability: 'ready',
  },
  {
    label: 'Dinamik QR',
    path: '/dynamic-qrs',
    capability: 'dynamicQr.read',
    availability: 'scheduled',
  },
  {
    label: 'Statik QR',
    path: '/static-qrs',
    capability: 'staticQr.read',
    availability: 'scheduled',
  },
  {
    label: 'Terminallar',
    path: '/terminals',
    capability: 'terminal.read',
    availability: 'scheduled',
  },
  {
    label: 'Bank hisoblari',
    path: '/bank-accounts',
    capability: 'bankAccount.read',
    availability: 'scheduled',
  },
  {
    label: 'Kassirlar',
    path: '/cashiers',
    capability: 'cashier.read',
    availability: 'scheduled',
  },
  {
    label: 'P5 qurilmalari',
    path: '/devices',
    capability: 'p5.read',
    availability: 'ready',
  },
] as const satisfies readonly NavigationItem[]

interface LiveNavigationItem extends NavigationItem {
  readonly registration?: 'dashboard' | 'dynamicQr' | 'terminalList' | 'bankAccountList' | 'cashierList' | 'p5List'
}

export const liveNavigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    capability: 'dashboard.read',
    availability: 'ready',
    registration: 'dashboard',
  },
  {
    label: 'Dinamik QRlar',
    path: '/dynamic-qrs',
    capability: 'dynamicQr.read',
    availability: 'ready',
    registration: 'dynamicQr',
  },
  {
    label: 'Statik QRlar', path: '/static-qrs', capability: 'staticQr.read', availability: 'ready', registration: 'dynamicQr',
  },
  {
    label: 'Terminallar', path: '/terminals', capability: 'terminal.read', availability: 'ready', registration: 'terminalList',
  },
  {
    label: 'Bank hisoblari', path: '/bank-accounts', capability: 'bankAccount.read', availability: 'ready', registration: 'bankAccountList',
  },
  {
    label: 'Kassirlar', path: '/cashiers', capability: 'cashier.read', availability: 'ready', registration: 'cashierList',
  },
  {
    label: 'Yangi kassir', path: '/cashiers/new', capability: 'cashier.create', availability: 'ready', registration: 'cashierList',
  },
  {
    label: 'P5 qurilmalari', path: '/devices', capability: 'p5.read', availability: 'ready', registration: 'p5List',
  },
  {
    label: 'Hisob',
    path: '/account',
    capability: 'profile.read',
    availability: 'ready',
  },
] as const satisfies readonly LiveNavigationItem[]

export function getLiveNavigationItems(
  access: AccessContextValue,
  registrations: ReadApiRegistrations,
): readonly LiveNavigationItem[] {
  return liveNavigationItems.filter(
    (item) =>
      can(access, item.capability, false) &&
      (!('registration' in item) ||
        registrations[item.registration].kind === 'configured'),
  )
}
