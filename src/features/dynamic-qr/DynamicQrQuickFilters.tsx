import type { FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DateRange } from '@/shared/contracts/merchant-read'
import { DateRangeQuickFilter } from './DateRangeQuickFilter'

interface DynamicQrQuickFiltersProps {
  readonly range: DateRange
  readonly searchDraft: string
  readonly onRangeDraftChange: (range: DateRange) => void
  readonly onRangeApply: (range: DateRange) => void
  readonly onRangeReset: () => void
  readonly onSearchDraftChange: (search: string) => void
  readonly onSearchApply: (search: string) => void
}

export function DynamicQrQuickFilters({
  range,
  searchDraft,
  onRangeDraftChange,
  onRangeApply,
  onRangeReset,
  onSearchDraftChange,
  onSearchApply,
}: DynamicQrQuickFiltersProps) {
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearchApply(searchDraft)
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <DateRangeQuickFilter
        value={range}
        onDraftChange={onRangeDraftChange}
        onApply={onRangeApply}
        onReset={onRangeReset}
      />
      <form className="relative min-w-0 sm:w-80" role="search" onSubmit={submitSearch}>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
        />
        <Input
          type="search"
          value={searchDraft}
          className="h-9 pl-9 pr-9"
          aria-label="Terminal nomi bo‘yicha qidirish"
          placeholder="Terminal nomi bo‘yicha"
          onChange={(event) => onSearchDraftChange(event.target.value)}
        />
        {searchDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label="Qidiruvni tozalash"
            onClick={() => {
              onSearchDraftChange('')
              onSearchApply('')
            }}
          >
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
        <button type="submit" className="sr-only" aria-label="Qidiruvni qo‘llash">
          Qidiruvni qo‘llash
        </button>
      </form>
    </div>
  )
}
