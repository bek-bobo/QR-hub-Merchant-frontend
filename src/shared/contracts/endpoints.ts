export const serviceContextPaths = {
  auth: '/qh-merchant-auth-api',
  web: '/qh-merchant-web-api',
} as const

export type ServiceName = keyof typeof serviceContextPaths
export type HttpMethod = 'GET' | 'POST' | 'DELETE'
export type EndpointAuth = 'public' | 'device-key' | 'session-key' | 'bearer'
export type EndpointBody = 'none' | 'json'

export interface EndpointDescriptor {
  readonly service: ServiceName
  readonly method: HttpMethod
  readonly path: `/${string}`
  readonly auth: EndpointAuth
  readonly body: EndpointBody
}

export const endpoints = {
  createSession: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/session',
    auth: 'device-key',
    body: 'none',
  },
  sendOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/send-otp',
    auth: 'session-key',
    body: 'json',
  },
  resendOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/resend-otp',
    auth: 'session-key',
    body: 'none',
  },
  verifyOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/verify-otp',
    auth: 'session-key',
    body: 'json',
  },
  checkPin: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/check-pin',
    auth: 'session-key',
    body: 'json',
  },
  setPin: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/set-pin',
    auth: 'session-key',
    body: 'json',
  },
  resetSendOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/reset-pin/send-otp',
    auth: 'session-key',
    body: 'json',
  },
  resetResendOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/reset-pin/resend-otp',
    auth: 'session-key',
    body: 'none',
  },
  resetVerifyOtp: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/reset-pin/verify-otp',
    auth: 'session-key',
    body: 'json',
  },
  resetSetPin: {
    service: 'auth',
    method: 'POST',
    path: '/web/login/reset-pin/set-pin',
    auth: 'session-key',
    body: 'json',
  },
  refresh: {
    service: 'auth',
    method: 'POST',
    path: '/token/refresh',
    auth: 'public',
    body: 'json',
  },
  me: {
    service: 'auth',
    method: 'GET',
    path: '/user/get-me',
    auth: 'bearer',
    body: 'none',
  },
  logout: {
    service: 'auth',
    method: 'POST',
    path: '/user/logout',
    auth: 'bearer',
    body: 'none',
  },
  dashboard: {
    service: 'web',
    method: 'GET',
    path: '/dashboard/transactions',
    auth: 'bearer',
    body: 'none',
  },
  dynamicQrs: {
    service: 'web',
    method: 'GET',
    path: '/dynamic-qrs/get-all',
    auth: 'bearer',
    body: 'none',
  },
  terminalLookup: {
    service: 'web',
    method: 'GET',
    path: '/dropdown/terminals',
    auth: 'bearer',
    body: 'none',
  },
  terminalList: { service: 'web', method: 'GET', path: '/terminals/get-all', auth: 'bearer', body: 'none' },
  bankAccountList: { service: 'web', method: 'GET', path: '/bank-accounts/get-all', auth: 'bearer', body: 'none' },
  cashierList: { service: 'web', method: 'GET', path: '/cashiers/get-all', auth: 'bearer', body: 'none' },
  merchantLookup: { service: 'web', method: 'GET', path: '/dropdown/merchants', auth: 'bearer', body: 'none' },
  bankAccountLookup: { service: 'web', method: 'GET', path: '/dropdown/bank-accounts', auth: 'bearer', body: 'none' },
  p5List: { service: 'web', method: 'GET', path: '/p5/get-all', auth: 'bearer', body: 'none' },
  createCashier: { service: 'web', method: 'POST', path: '/cashiers/create', auth: 'bearer', body: 'json' },
  assignCashierTerminals: { service: 'web', method: 'POST', path: '/cashiers/assign/terminals', auth: 'bearer', body: 'json' },
  unassignCashierTerminal: { service: 'web', method: 'DELETE', path: '/cashiers/unassign/terminal', auth: 'bearer', body: 'none' },
  createDynamicQr: { service: 'web', method: 'POST', path: '/dynamic-qrs/create', auth: 'bearer', body: 'json' },
  exportDynamicQrs: { service: 'web', method: 'GET', path: '/dynamic-qrs/export', auth: 'bearer', body: 'none' },
  staticQrs: { service: 'web', method: 'GET', path: '/static-qrs/get-all', auth: 'bearer', body: 'none' },
  currencies: { service: 'web', method: 'GET', path: '/currency/get-all', auth: 'bearer', body: 'none' },
} as const satisfies Record<string, EndpointDescriptor>

export type Endpoint = (typeof endpoints)[keyof typeof endpoints]
