import type { LucideIcon } from 'lucide-react'
import { InfoTooltip } from '@/shared/ui/InfoTooltip'

export function DynamicQrSummaryCard({
  title,
  value,
  icon: Icon,
  tone,
  helper,
}: {
  readonly title: string
  readonly value: string
  readonly icon: LucideIcon
  readonly tone: 'brand' | 'neutral'
  readonly helper: { readonly message: string; readonly explanation: string; readonly label: string } | null
}) {
  return (
    <section
      aria-label={title}
      className={`relative min-w-0 overflow-hidden rounded-xl border p-5 ${
        tone === 'brand'
          ? 'border-brand/20 bg-linear-to-br from-surface/70 to-brand-soft'
          : 'border-border bg-linear-to-br from-surface to-muted/40'
      }`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 180 140"
        preserveAspectRatio="none"
        className={`pointer-events-none absolute inset-y-0 right-0 h-full w-2/5 ${tone === 'brand' ? 'text-brand/3' : 'text-text-secondary/3'}`}
      >
        <path fill="currentColor" d="M180 0C90 0 130 85 40 140H180Z" />
        <path fill="currentColor" d="M180 55C115 50 70 105 0 140H180Z" />
      </svg>
      <div className="relative flex items-start gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
          tone === 'brand' ? 'bg-brand/7 text-brand' : 'bg-muted text-text-primary'
        }`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="mt-0.5 text-sm font-semibold text-text-primary">{title}</h2>
          <p className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere] sm:text-3xl">
            {value}
          </p>
          {helper ? (
            <p role="status" className="mt-2.5 flex items-start gap-2 text-xs leading-5 text-text-secondary">
              <InfoTooltip label={helper.label} text={helper.explanation} />
              <span>{helper.message}</span>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
}

