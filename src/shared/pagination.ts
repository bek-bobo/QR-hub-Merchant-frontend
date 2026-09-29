export const DEFAULT_PAGE_SIZE = 20 as const

export const PAGINATION_ELLIPSIS = 'ellipsis' as const

export type PaginationWindowItem = number | typeof PAGINATION_ELLIPSIS

export function createPaginationWindow(
  currentPage: number,
  totalPages: number,
): readonly PaginationWindowItem[] {
  if (!Number.isSafeInteger(totalPages) || totalPages <= 0) return []
  if (totalPages <= 7) return Object.freeze(Array.from({ length: totalPages }, (_, page) => page))

  const lastPage = totalPages - 1
  const focusPage = Number.isSafeInteger(currentPage)
    ? Math.min(Math.max(currentPage, 0), lastPage)
    : 0
  const pages = new Set([0, lastPage])

  if (focusPage <= 1) {
    pages.add(1)
    pages.add(2)
  } else if (focusPage >= lastPage - 1) {
    pages.add(lastPage - 2)
    pages.add(lastPage - 1)
  } else {
    pages.add(focusPage - 1)
    pages.add(focusPage)
    pages.add(focusPage + 1)
  }

  const sortedPages = [...pages].toSorted((left, right) => left - right)
  const result: PaginationWindowItem[] = []
  for (const page of sortedPages) {
    const previous = result.at(-1)
    if (typeof previous === 'number') {
      const gap = page - previous
      if (gap === 2) result.push(previous + 1)
      if (gap > 2) result.push(PAGINATION_ELLIPSIS)
    }
    result.push(page)
  }
  return Object.freeze(result)
}
