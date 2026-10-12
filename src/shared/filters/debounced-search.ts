import { useEffect, useEffectEvent } from 'react'

export const SEARCH_DEBOUNCE_MS = 400

// Commit effective text and pagination together; identical text keeps the key/page.
export function applyEffectiveSearch<T extends { readonly search: string; readonly page: number }>(
  current: T,
  search: string,
): T {
  return current.search === search ? current : Object.freeze({ ...current, search, page: 0 })
}

export function useDebouncedSearch(
  draft: string,
  effective: string,
  onEffectiveChange: (search: string) => void,
): void {
  const commit = useEffectEvent(onEffectiveChange)
  useEffect(() => {
    if (draft === effective) return
    const timer = setTimeout(() => commit(draft), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [draft, effective])
}
