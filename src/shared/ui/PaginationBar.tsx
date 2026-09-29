import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  PAGINATION_ELLIPSIS,
  createPaginationWindow,
} from '@/shared/pagination'

export interface PaginationBarProps {
  readonly ariaLabel: string
  readonly currentPage: number
  readonly totalPages: number
  readonly totalItems: number
  readonly onPageChange: (page: number) => void
  readonly disabled?: boolean
}

export function PaginationBar({
  ariaLabel,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
}: PaginationBarProps) {
  const pages = createPaginationWindow(currentPage, totalPages)
  const previousDisabled = disabled || currentPage <= 0
  const nextDisabled = disabled || totalPages <= 0 || currentPage >= totalPages - 1

  return (
    <nav
      aria-label={ariaLabel}
      className="flex min-w-0 flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="shrink-0 text-sm text-text-secondary">
        Jami: {totalItems.toLocaleString('uz-UZ')}
      </p>
      <span aria-live="polite" className="sr-only">
        {totalPages > 0
          ? `${currentPage + 1}-sahifa, jami ${totalPages} sahifa`
          : 'Sahifalar mavjud emas'}
      </span>
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label="Oldingi sahifa"
          disabled={previousDisabled}
          onClick={() => {
            if (!previousDisabled) onPageChange(currentPage - 1)
          }}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>

        {pages.map((item, index) => item === PAGINATION_ELLIPSIS ? (
          <span
            key={`${item}-${index}`}
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center text-text-secondary"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === currentPage ? 'default' : 'outline'}
            size="icon-lg"
            aria-label={`${item + 1}-sahifa`}
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
          aria-label="Keyingi sahifa"
          disabled={nextDisabled}
          onClick={() => {
            if (!nextDisabled) onPageChange(currentPage + 1)
          }}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}
