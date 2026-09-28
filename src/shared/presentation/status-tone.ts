export const STATUS_TONES = [
  'success',
  'warning',
  'info',
  'error',
  'neutral',
] as const

export type StatusTone = (typeof STATUS_TONES)[number]

interface StatusToneClassNames {
  readonly badge: string
  readonly indicator: string
  readonly icon: string
}

export const statusToneClasses: Readonly<Record<StatusTone, StatusToneClassNames>> = {
  success: {
    badge: 'border-status-success-border bg-status-success-background text-status-success-foreground',
    indicator: 'bg-status-success-indicator',
    icon: 'bg-status-success-background text-status-success-foreground',
  },
  warning: {
    badge: 'border-status-warning-border bg-status-warning-background text-status-warning-foreground',
    indicator: 'bg-status-warning-indicator',
    icon: 'bg-status-warning-background text-status-warning-foreground',
  },
  info: {
    badge: 'border-status-info-border bg-status-info-background text-status-info-foreground',
    indicator: 'bg-status-info-indicator',
    icon: 'bg-status-info-background text-status-info-foreground',
  },
  error: {
    badge: 'border-status-error-border bg-status-error-background text-status-error-foreground',
    indicator: 'bg-status-error-indicator',
    icon: 'bg-status-error-background text-status-error-foreground',
  },
  neutral: {
    badge: 'border-status-neutral-border bg-status-neutral-background text-status-neutral-foreground',
    indicator: 'bg-status-neutral-indicator',
    icon: 'bg-status-neutral-background text-status-neutral-foreground',
  },
}
