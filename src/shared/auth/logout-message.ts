import type { LogoutFeedback } from './feedback'
import type { LogoutResult } from './session-controller'

export function resolveLogoutMessage(result: LogoutResult): LogoutFeedback | null {
  return result.status === 'remote-confirmed'
    ? null
    : 'remoteUnconfirmed'
}
