import { createContext } from 'react'
import type { CashierCreateDependencies } from './create-cashier'

// Composition seam for normalized ports; live transport stays in the live adapter.
export interface CashierCreateAdapter extends CashierCreateDependencies {
  readonly canReadList: () => boolean
}

export const CashierCreateAdapterContext = createContext<CashierCreateAdapter | null>(null)
