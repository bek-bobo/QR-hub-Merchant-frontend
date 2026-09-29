import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAGE_SIZE,
  PAGINATION_ELLIPSIS,
  createPaginationWindow,
} from './pagination'

describe('createPaginationWindow', () => {
  it('uses one fixed production page size', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20)
  })

  it('returns no page tokens when the server reports no pages', () => {
    expect(createPaginationWindow(0, 0)).toEqual([])
  })

  it('returns the only zero-based page for a single-page result', () => {
    expect(createPaginationWindow(0, 1)).toEqual([0])
  })

  it('shows every page for a small result without ellipsis', () => {
    expect(createPaginationWindow(2, 5)).toEqual([0, 1, 2, 3, 4])
  })

  it('creates compact first, middle, and final windows', () => {
    expect(createPaginationWindow(0, 13)).toEqual([0, 1, 2, PAGINATION_ELLIPSIS, 12])
    expect(createPaginationWindow(5, 13)).toEqual([0, PAGINATION_ELLIPSIS, 4, 5, 6, PAGINATION_ELLIPSIS, 12])
    expect(createPaginationWindow(12, 13)).toEqual([0, PAGINATION_ELLIPSIS, 10, 11, 12])
  })

  it('emits unique page numbers within server bounds for every current page', () => {
    for (let totalPages = 1; totalPages <= 30; totalPages += 1) {
      for (let currentPage = -2; currentPage <= totalPages + 2; currentPage += 1) {
        const pages = createPaginationWindow(currentPage, totalPages)
          .filter((item): item is number => item !== PAGINATION_ELLIPSIS)
        expect(new Set(pages).size).toBe(pages.length)
        expect(pages.every((page) => page >= 0 && page < totalPages)).toBe(true)
      }
    }
  })
})
