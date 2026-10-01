import {
  LandmarkIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  QrCodeIcon,
  ScanLineIcon,
  SmartphoneIcon,
  UserRoundIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ReadApiRegistrations } from '@/app/read/createLiveReadApi'
import {
  can,
  type AccessContextValue,
  type Capability,
} from '@/shared/auth/access'

export interface NavigationItem {
  label: string
  path: string
  icon: LucideIcon
  capability: Capability
  availability: 'ready' | 'scheduled'
}

export const navigationItems = [
  {
    label: 'Bosh sahifa',
    path: '/dashboard',
    icon: LayoutDashboardIcon,
    capability: 'dashboard.read',
    availability: 'ready',
  },
  {
    label: 'Dinamik QR',
    path: '/dynamic-qrs',
    icon: ScanLineIcon,
    capability: 'dynamicQr.read',
    availability: 'scheduled',
  },
  {
    label: 'Statik QR',
    path: '/static-qrs',
    icon: QrCodeIcon,
    capability: 'staticQr.read',
    availability: 'scheduled',
  },
  {
    label: 'Terminallar',
    path: '/terminals',
    icon: MonitorIcon,
    capability: 'terminal.read',
    availability: 'scheduled',
  },
  {
    label: 'Bank hisoblari',
    path: '/bank-accounts',
    icon: LandmarkIcon,
    capability: 'bankAccount.read',
    availability: 'scheduled',
  },
  {
    label: 'Kassirlar',
    path: '/cashiers',
    icon: UsersIcon,
    capability: 'cashier.read',
    availability: 'scheduled',
  },
  {
    label: 'P5 qurilmalari',
    path: '/devices',
    icon: SmartphoneIcon,
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
    icon: LayoutDashboardIcon,
    capability: 'dashboard.read',
    availability: 'ready',
    registration: 'dashboard',
  },
  {
    label: 'Dinamik QRlar',
    path: '/dynamic-qrs',
    icon: ScanLineIcon,
    capability: 'dynamicQr.read',
    availability: 'ready',
    registration: 'dynamicQr',
  },
  {
    label: 'Statik QRlar', path: '/static-qrs', icon: QrCodeIcon, capability: 'staticQr.read', availability: 'ready', registration: 'dynamicQr',
  },
  {
    label: 'Terminallar', path: '/terminals', icon: MonitorIcon, capability: 'terminal.read', availability: 'ready', registration: 'terminalList',
  },
  {
    label: 'Bank hisoblari', path: '/bank-accounts', icon: LandmarkIcon, capability: 'bankAccount.read', availability: 'ready', registration: 'bankAccountList',
  },
  {
    label: 'Kassirlar', path: '/cashiers', icon: UsersIcon, capability: 'cashier.read', availability: 'ready', registration: 'cashierList',
  },
  {
    label: 'P5 qurilmalari', path: '/devices', icon: SmartphoneIcon, capability: 'p5.read', availability: 'ready', registration: 'p5List',
  },
  {
    label: 'Hisob',
    path: '/account',
    icon: UserRoundIcon,
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

export function getVisibleLiveNavigationItems(
  access: AccessContextValue,
  registrations: ReadApiRegistrations,
): readonly LiveNavigationItem[] {
  return getLiveNavigationItems(access, registrations).filter(
    (item) => item.path !== '/account',
  )
}
