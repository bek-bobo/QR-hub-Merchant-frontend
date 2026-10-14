import { productionAuthContractRegistration } from '@/shared/contracts/auth.contract'

// Only tests use the supplied authority bundles. Identity values are synthetic.
export const cashierPermissions = [
  'GET_ME', 'LOGOUT', 'GET_DASHBOARD', 'GET_TERMINAL', 'GET_MERCHANTS',
  'GET_BANK_ACCOUNTS', 'GET_CASHIERS', 'ASSIGN_TERMINALS', 'UNASSIGN_TERMINAL',
  'GET_DROPDOWN_MERCHANTS', 'GET_DROPDOWN_BANK_ACCOUNTS', 'GET_DROPDOWN_REGIONS',
  'GET_DYNAMIC_QRS', 'GET_DROPDOWN_DISTRICTS', 'GET_DROPDOWN_TERMINALS',
  'EXPORT_DYNAMIC_QRS', 'CREATE_CASHIER', 'CREATE_DYNAMIC_QR', 'GET_STATIC_QRS',
  'GET_HOME', 'GET_PAYMENTS', 'CANCEL_PAYMENT', 'GET_CURRENCY_CODE',
  'GET_NOTIFICATIONS', 'MARK_ALL_AS_READ', 'MARK_AS_READ',
] as const
export const merchantPermissions = [...cashierPermissions, 'GET_P5', 'RESET_P5_PIN'] as const

export function rbacProfile(permissions: readonly string[], roles: readonly string[] = ['ROLE_FUTURE']) {
  if (productionAuthContractRegistration.kind !== 'verified') throw new Error('Contract unavailable')
  return productionAuthContractRegistration.wire.decodeProfile({ success: true, data: {
    userId: 101, phone: '998901234567', fullname: 'Synthetic user', deviceType: 'WEB', roles, permissions,
  } })
}
