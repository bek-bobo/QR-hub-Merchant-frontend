import type { LogoutResult } from './session-controller'

export function resolveLogoutMessage(result: LogoutResult): string | null {
  return result.status === 'remote-confirmed'
    ? null
    : 'Bu oynadan chiqildi. Serverdagi sessiya yopilganini tasdiqlab bo‘lmadi.'
}
