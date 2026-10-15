import { createContext } from 'react'

export interface SidebarCollapseState {
  readonly collapsed: boolean
  readonly toggleCollapsed: () => void
}

export const SidebarCollapseContext = createContext<SidebarCollapseState | null>(null)
