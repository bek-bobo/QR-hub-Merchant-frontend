export type MobileNavigationAction =
  | { readonly type: 'set'; readonly open: boolean }
  | { readonly type: 'route-selected' }

export function reduceMobileNavigationOpen(
  _current: boolean,
  action: MobileNavigationAction,
): boolean {
  return action.type === 'set' ? action.open : false
}
