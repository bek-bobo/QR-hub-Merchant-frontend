import { useMessages } from '@/shared/i18n/useMessages'
import { useLocale } from '@/shared/i18n/useLocale'
import { languageRegistry } from '@/shared/i18n/registry'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import type { PageSize } from '@/shared/contracts/merchant-read'
import {
  DEFAULT_PAGE_SIZE,
  PAGINATION_ELLIPSIS,
  createPaginationWindow,
} from '@/shared/pagination'

const pageSizes: readonly PageSize[] = [10, 20, 25, 50]
const pageButtonClasses = 'size-9 rounded-lg border-border/80 bg-surface text-sm font-medium text-text-primary hover:border-primary/30 hover:bg-brand-soft/50 sm:size-10 sm:text-base'

export interface PaginationBarProps {
  readonly ariaLabel: string
  readonly currentPage: number
  readonly totalPages: number
  readonly totalItems: number
  readonly onPageChange: (page: number) => void
  readonly pageSize?: number
  readonly onPageSizeChange?: (size: PageSize) => void
  readonly disabled?: boolean
  readonly showTotal?: boolean
  readonly totalLabel?: ReactNode
  readonly className?: string
}

export function PaginationBar({
  ariaLabel,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  pageSize = DEFAULT_PAGE_SIZE,
  onPageSizeChange,
  disabled = false,
  showTotal = true,
  totalLabel,
  className,
}: PaginationBarProps) {
  const { message } = useMessages('common')
  const { locale } = useLocale()
  const pages = createPaginationWindow(currentPage, totalPages)
  const previousDisabled = disabled || currentPage <= 0
  const nextDisabled = disabled || totalPages <= 0 || currentPage >= totalPages - 1

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'flex min-w-0 flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center',
        showTotal ? 'sm:justify-between' : 'sm:justify-end',
        className,
      )}
    >
      {showTotal ? (
        <p className="shrink-0 text-sm text-text-secondary">
          {totalLabel ?? message('pagination.total', { value: totalItems.toLocaleString(languageRegistry[locale].intlLocale) })}
        </p>
      ) : null}
      <span aria-live="polite" className="sr-only">
        {totalPages > 0
          ? message('pagination.pageSummary', { page: currentPage + 1, count: totalPages })
          : message('pagination.noPages')}
      </span>
      <div data-slot="pagination-controls" className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-surface p-2 shadow-[0_8px_30px_-16px_rgba(16,24,40,0.18)] sm:justify-end sm:px-3">
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={pageButtonClasses}
          aria-label={message('pagination.previous')}
          disabled={previousDisabled}
          onClick={() => {
            if (!previousDisabled) onPageChange(currentPage - 1)
          }}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4 sm:size-5" />
        </Button>

        {pages.map((item, index) => item === PAGINATION_ELLIPSIS ? (
          <span
            key={`${item}-${index}`}
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center text-lg tracking-widest text-text-secondary/50 sm:size-10"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant="outline"
            size="icon-lg"
            className={cn(pageButtonClasses, item === currentPage && 'border-primary bg-brand-soft/70 font-semibold text-primary hover:border-primary hover:bg-brand-soft')}
            aria-label={message('pagination.page', { page: item + 1 })}
            aria-current={item === currentPage ? 'page' : undefined}
            disabled={disabled}
            onClick={() => onPageChange(item)}
          >
            {item + 1}
          </Button>
        ))}

        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className={pageButtonClasses}
          aria-label={message('pagination.next')}
          disabled={nextDisabled}
          onClick={() => {
            if (!nextDisabled) onPageChange(currentPage + 1)
          }}
        >
          <ChevronRightIcon aria-hidden="true" className="size-4 sm:size-5" />
        </Button>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="h-6 w-px bg-border/80" />
          <div className="relative">
            <Select size="compact" aria-label={message('pagination.pageSize')} value={pageSize}
              disabled={disabled || !onPageSizeChange}
              className="h-9 w-32 rounded-lg border-border/80 bg-surface px-3 text-base text-text-primary sm:h-10 sm:w-36 md:text-base"
              onChange={(event) => {
                const size = pageSizes.find((option) => option === Number(event.target.value))
                if (!disabled && size !== undefined) onPageSizeChange?.(size)
              }}>
              {!pageSizes.includes(pageSize as PageSize) ? <option value={pageSize}>{message('pagination.perPage', { size: pageSize })}</option> : null}
              {pageSizes.map((size) => <option key={size} value={size}>{message('pagination.perPage', { size })}</option>)}
            </Select>
          </div>
        </div>
      </div>
    </nav>
  )
}
