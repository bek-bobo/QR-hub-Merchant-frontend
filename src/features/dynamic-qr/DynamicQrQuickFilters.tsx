import { useDynamicQrPresentation } from './presentation'
import type { FormEvent } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DateRange } from '@/shared/contracts/merchant-read'
import { DateRangeQuickFilter } from './DateRangeQuickFilter'

interface DynamicQrQuickFiltersProps {
  readonly range: DateRange
  readonly searchDraft: string
  readonly searchPlaceholder?: string
  readonly onRangeDraftChange: (range: DateRange) => void
  readonly onRangeApply: (range: DateRange) => void
  readonly onRangeReset: () => void
  readonly onSearchDraftChange: (search: string) => void
}

export function DynamicQrQuickFilters({
  range,
  searchDraft,
  searchPlaceholder,
  onRangeDraftChange,
  onRangeApply,
  onRangeReset,
  onSearchDraftChange,
}: DynamicQrQuickFiltersProps) {
  const p = useDynamicQrPresentation()
  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  return (
    <div className="dynamic-qr-quick-filters flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <DateRangeQuickFilter
        presentation={p}
        value={range}
        onDraftChange={onRangeDraftChange}
        onApply={onRangeApply}
        onReset={onRangeReset}
        resetLabel={p.message('dates.reset')}
      />
      <form className="dynamic-qr-search relative min-w-0 sm:w-80" role="search" onSubmit={submitSearch}>
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
        />
        <Input
          type="text"
          enterKeyHint="search"
          value={searchDraft}
          className="h-9 pl-9 pr-9"
          aria-label={p.message('filters.search')}
          placeholder={searchPlaceholder ?? p.message('filters.searchShort')}
          onChange={(event) => onSearchDraftChange(event.target.value)}
        />
        {searchDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label={p.message('filters.clearSearch')}
            onClick={() => {
              onSearchDraftChange('')
            }}
          >
            <XIcon aria-hidden="true" />
          </Button>
        ) : null}
        <button type="submit" className="sr-only" aria-label={p.message('filters.applySearch')}>
          {p.message('filters.applySearch')}</button>
      </form>
    </div>
  )
}
