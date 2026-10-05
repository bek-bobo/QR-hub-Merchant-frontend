import type { ReactNode } from 'react'
import './filter-drawer.css'

/** Presentation only: the feature retains its label, control and filter state. */
export function FilterFieldCard({ children }: { readonly children: ReactNode }) {
  return <div data-slot="filter-field-card" className="filter-field-card min-w-0 space-y-2">
    {children}
  </div>
}
