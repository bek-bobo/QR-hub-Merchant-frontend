import { liveFeatureRouteDefinitions, accountRoutePolicy } from './access-policy'
import type { MessageCatalog } from '@/shared/i18n/generated'
import type { createMessages } from '@/shared/i18n/messages'
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
  labelKey: Extract<keyof MessageCatalog['shell'], `navigation.${string}`>
  path: string
  icon: LucideIcon
  capability: Capability
  availability: 'ready' | 'scheduled'
}

export const navigationItems = [
  {
    labelKey: 'navigation.home',
    path: '/dashboard',
    icon: LayoutDashboardIcon,
    capability: 'dashboard.read',
    availability: 'ready',
  },
  {
    labelKey: 'navigation.dynamicQrPreview',
    path: '/dynamic-qrs',
    icon: ScanLineIcon,
    capability: 'dynamicQr.read',
    availability: 'scheduled',
  },
  {
    labelKey: 'navigation.staticQrPreview',
    path: '/static-qrs',
    icon: QrCodeIcon,
    capability: 'staticQr.read',
    availability: 'scheduled',
  },
  {
    labelKey: 'navigation.terminals',
    path: '/terminals',
    icon: MonitorIcon,
    capability: 'terminal.read',
    availability: 'scheduled',
  },
  {
    labelKey: 'navigation.bankAccounts',
    path: '/bank-accounts',
    icon: LandmarkIcon,
    capability: 'bankAccount.read',
    availability: 'scheduled',
  },
  {
    labelKey: 'navigation.cashiers',
    path: '/cashiers',
    icon: UsersIcon,
    capability: 'cashier.read',
    availability: 'scheduled',
  },
  {
    labelKey: 'navigation.devices',
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
  { ...liveFeatureRouteDefinitions.dashboard, labelKey: 'navigation.dashboard', icon: LayoutDashboardIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.dynamicQr, labelKey: 'navigation.dynamicQr', icon: ScanLineIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.staticQr, labelKey: 'navigation.staticQr', icon: QrCodeIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.terminals, labelKey: 'navigation.terminals', icon: MonitorIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.bankAccounts, labelKey: 'navigation.bankAccounts', icon: LandmarkIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.cashiers, labelKey: 'navigation.cashiers', icon: UsersIcon, availability: 'ready' },
  { ...liveFeatureRouteDefinitions.devices, labelKey: 'navigation.devices', icon: SmartphoneIcon, availability: 'ready' },
  { ...accountRoutePolicy, labelKey: 'navigation.account', icon: UserRoundIcon, availability: 'ready' },
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

export function presentNavigationItems(items: readonly NavigationItem[], messages: ReturnType<typeof createMessages<'shell'>>) {
  return items.map((item) => ({ ...item, label: messages.message(item.labelKey) }))
}
