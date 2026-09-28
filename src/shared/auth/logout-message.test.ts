import { describe, expect, it } from 'vitest'
import type { LogoutResult } from './session-controller'
import { resolveLogoutMessage } from './logout-message'

describe('resolveLogoutMessage', () => {
  it('returns no message for confirmed logout', () => {
    const result: LogoutResult = { status: 'remote-confirmed' }

    expect(resolveLogoutMessage(result)).toBeNull()
  })

  it('preserves the unconfirmed remote logout warning', () => {
    const result: LogoutResult = { status: 'local-cleared-remote-unconfirmed' }

    expect(resolveLogoutMessage(result)).toBe(
      'Bu oynadan chiqildi. Serverdagi sessiya yopilganini tasdiqlab bo‘lmadi.',
    )
  })
})
