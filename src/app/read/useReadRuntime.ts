import { createContext, useContext } from 'react'
import type { P5ResetPort } from '@/features/p5/p5-reset'
import type { Capability } from '@/shared/auth/access'
import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { createActionRegistry } from '@/shared/api/one-dispatch-action'
import type {
  MerchantReadApi,
  ReadApiRegistrations,
  ReadRegistration,
} from './createLiveReadApi'
import type { ReadRuntime } from './read-runtime'

export interface ReadCapabilityState {
  readonly dashboard: boolean
  readonly dynamicQr: boolean
  readonly terminalLookup: boolean
  readonly terminalList: boolean
  readonly bankAccountList: boolean
  readonly cashierList: boolean
  readonly merchantLookup: boolean
  readonly bankAccountLookup: boolean
  readonly p5List: boolean
  readonly p5ResetPin: boolean
}

export interface ReadRuntimeContextValue {
  readonly p5ResetPort?: P5ResetPort | null
  readonly actionRegistry: ReturnType<typeof createActionRegistry>
  readonly api: MerchantReadApi
  readonly scope: ReadScope
  readonly getCurrentScope: () => ReadScope
  readonly readiness: ReadApiRegistrations & {
    readonly auth: ReadRegistration
    readonly p5Reset: ReadRegistration
  }
  readonly capabilities: ReadCapabilityState
  readonly requiredCapabilities: Readonly<
    Record<keyof ReadCapabilityState, Capability>
  >
  readonly queries: Pick<
    ReadRuntime,
      |'dashboardOptions'
      | 'dynamicQrOptions'
      | 'dynamicQrStatsOptions'
      | 'terminalOptions'
      | 'terminalListOptions'
      | 'bankAccountListOptions'
      | 'cashierListOptions'
      | 'merchantLookupOptions'
      | 'bankAccountLookupOptions'
      | 'regionLookupOptions'
      | 'districtLookupOptions'
      | 'terminalLookupOptions'
      | 'p5ListOptions'
  >
}

export const ReadRuntimeContext = createContext<ReadRuntimeContextValue | null>(
  null,
)

export function useReadRuntime(): ReadRuntimeContextValue {
  const value = useContext(ReadRuntimeContext)
  if (!value) {
    throw new Error('useReadRuntime must be used within ReadProvider.')
  }
  return value
}
