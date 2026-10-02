export const capabilities = [
  'dashboard.read',
  'dynamicQr.read',
  'dynamicQr.create',
  'dynamicQr.export',
  'dynamicQr.cancel',
  'currency.lookup',
  'staticQr.read',
  'terminal.read',
  'terminal.lookup',
  'bankAccount.read',
  'bankAccount.lookup',
  'cashier.read',
  'cashier.create',
  'cashier.assignTerminals',
  'cashier.unassignTerminal',
  'merchant.lookup',
  'region.lookup',
  'district.lookup',
  'p5.read',
  'p5.resetPin',
  'profile.read',
] as const

export type Capability = (typeof capabilities)[number]

export type AccessContextValue =
  | { kind: 'anonymous' }
  | { kind: 'demo'; grants: ReadonlySet<Capability> }
  | { kind: 'authenticated'; permissions: ReadonlySet<string> }

export type VerifiedAuthorityMap = Partial<Record<Capability, string>>

export const verifiedAuthorityMap: VerifiedAuthorityMap = {
  'dashboard.read': 'GET_DASHBOARD',
  'dynamicQr.read': 'GET_DYNAMIC_QRS',
  'dynamicQr.create': 'CREATE_DYNAMIC_QR',
  'dynamicQr.export': 'EXPORT_DYNAMIC_QRS',
  'dynamicQr.cancel': 'CANCEL_PAYMENT',
  'staticQr.read': 'GET_STATIC_QRS',
  'currency.lookup': 'GET_CURRENCY_CODE',
  'terminal.lookup': 'GET_DROPDOWN_TERMINALS',
  'terminal.read': 'GET_TERMINAL',
  'bankAccount.read': 'GET_BANK_ACCOUNTS',
  'bankAccount.lookup': 'GET_DROPDOWN_BANK_ACCOUNTS',
  'cashier.read': 'GET_CASHIERS',
  'cashier.create': 'CREATE_CASHIER',
  'cashier.assignTerminals': 'ASSIGN_TERMINALS',
  'cashier.unassignTerminal': 'UNASSIGN_TERMINAL',
  'merchant.lookup': 'GET_DROPDOWN_MERCHANTS',
  'region.lookup': 'GET_DROPDOWN_REGIONS',
  'district.lookup': 'GET_DROPDOWN_DISTRICTS',
  'p5.read': 'GET_P5',
  'p5.resetPin': 'RESET_P5_PIN',
  'profile.read': 'GET_ME',
}

export function can(
  context: AccessContextValue,
  capability: Capability,
  allowDemo: boolean,
  authorityMap: VerifiedAuthorityMap = verifiedAuthorityMap,
): boolean {
  if (context.kind === 'anonymous') {
    return false
  }

  if (context.kind === 'demo') {
    return allowDemo && context.grants.has(capability)
  }

  const authority = authorityMap[capability]

  return (
    typeof authority === 'string' &&
    authority.length > 0 &&
    context.permissions.has(authority)
  )
}
