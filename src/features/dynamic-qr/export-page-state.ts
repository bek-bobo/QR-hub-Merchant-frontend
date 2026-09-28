import type { DynamicQrFilters } from '@/shared/contracts/merchant-read'
import { isValidDateRange } from '@/shared/filters/date-range'
import { applyQrFilters, type DynamicQrFilterDraft } from './filters'
import { getTerminalFilterState, type TerminalLookupState } from './page-state'

export type ExportApplyResult =
  | { readonly kind: 'applied'; readonly filters: DynamicQrFilters }
  | { readonly kind: 'invalid-date' | 'terminal-unconfirmed' }

export function applyExportDraft(draft: DynamicQrFilterDraft, lookup: TerminalLookupState): ExportApplyResult {
  if (!isValidDateRange(draft)) return { kind: 'invalid-date' }
  const filters = applyQrFilters(draft)
  if (getTerminalFilterState(filters, lookup) !== 'valid') return { kind: 'terminal-unconfirmed' }
  return { kind: 'applied', filters }
}
