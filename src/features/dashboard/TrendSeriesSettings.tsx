import { useDashboardPresentation } from './presentation'
import { useId } from 'react'
import { SlidersHorizontalIcon } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { ALL_TREND_SERIES, TREND_SERIES, type TrendSeriesKey } from './trend-presentation'

interface TrendSeriesSettingsProps {
  readonly visible: readonly TrendSeriesKey[]
  readonly available?: readonly TrendSeriesKey[]
  readonly onToggle: (key: TrendSeriesKey) => void
}

export function TrendSeriesSettingsList({ visible, available = ALL_TREND_SERIES, onToggle }: TrendSeriesSettingsProps) {
  const p = useDashboardPresentation()
  const helpId = useId()
  return <div className="min-w-0 space-y-3">
    <p className="text-sm font-semibold text-text-primary">{p.message('trend.settingsTitle')}</p>
    <ul className="space-y-2">
      {TREND_SERIES.filter(({ key }) => available.includes(key)).map((item) => {
        const checked = visible.includes(item.key)
        return <li key={item.key}>
          <label className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
            <input type="checkbox" checked={checked} disabled={checked && visible.length === 1}
              aria-describedby={helpId}
              className="size-4 shrink-0 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              onChange={() => onToggle(item.key)} />
            <span aria-hidden="true" className={`h-0.5 w-3 shrink-0 rounded-full ${item.swatch}`} />
            <span className="min-w-0 break-words text-sm text-text-primary">{p.label(item.key)}</span>
          </label>
        </li>
      })}
    </ul>
    <p id={helpId} className="text-xs text-text-secondary">{p.message('trend.settingsHelp')}</p>
  </div>
}

export function TrendSeriesSettings(props: TrendSeriesSettingsProps) {
 const p = useDashboardPresentation()
  return <PopoverPrimitive.Root>
    <PopoverPrimitive.Trigger asChild>
      <Button type="button" variant="outline" size="icon-sm" aria-label={p.message('trend.settings')}>
        <SlidersHorizontalIcon aria-hidden="true" />
      </Button>
    </PopoverPrimitive.Trigger>
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align="end" sideOffset={8} collisionPadding={12} aria-label={p.message('trend.settingsTitle')}
        className="z-50 w-64 max-w-[calc(100vw-1.5rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none">
        <TrendSeriesSettingsList {...props} />
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>
}
