import type { StatusTone } from './status-tone'

export interface ActiveStatusPresentation {
  readonly label: string
  readonly tone: StatusTone
}

export function presentActiveStatus(statusCode: number): ActiveStatusPresentation {
  return statusCode === 0
    ? { label: 'Faol', tone: 'success' }
    : { label: 'Noma’lum', tone: 'neutral' }
}
