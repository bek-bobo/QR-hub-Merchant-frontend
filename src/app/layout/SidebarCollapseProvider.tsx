import { useContext, useMemo, useReducer, type ReactNode } from 'react'
import { SidebarCollapseContext } from './sidebar-collapse-context'
import { reduceSidebarCollapsed } from './sidebar-collapse-state'

function SidebarCollapseOwner({ children }: { readonly children: ReactNode }) {
  const [collapsed, toggleCollapsed] = useReducer(reduceSidebarCollapsed, false)
  const state = useMemo(() => ({ collapsed, toggleCollapsed }), [collapsed])
  return <SidebarCollapseContext value={state}>{children}</SidebarCollapseContext>
}

/** Inherit the router's owner; standalone preview shells get one local owner. */
export function SidebarCollapseProvider({ children }: { readonly children: ReactNode }) {
  const inherited = useContext(SidebarCollapseContext)
  return inherited ? children : <SidebarCollapseOwner>{children}</SidebarCollapseOwner>
}
