import type { StatusTone } from '@/shared/presentation/status-tone'

interface CashierTerminalStatusPresentation {
  readonly label: string
  readonly tone: StatusTone
}

export function presentCashierTerminalStatus(statusCode: number): CashierTerminalStatusPresentation {
  if (statusCode === 0) return { label: 'Faol', tone: 'success' }
  if (statusCode === 1) return { label: 'Faol emas', tone: 'neutral' }
  return { label: 'Noma’lum', tone: 'neutral' }
}
