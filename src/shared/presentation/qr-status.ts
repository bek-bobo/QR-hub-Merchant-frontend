import type { StatusTone } from './status-tone'

export interface QrStatusPresentation {
  readonly label: string
  readonly tone: StatusTone
}

export function presentQrStatus(statusCode: number): QrStatusPresentation {
  switch (statusCode) {
    case 0:
      return { label: 'Yangi', tone: 'info' }
    case 5:
      return { label: 'Muddati o‘tgan', tone: 'error' }
    case 10:
      return { label: 'Jarayonda', tone: 'warning' }
    case 20:
      return { label: 'Bekor qilingan', tone: 'error' }
    case 25:
      return { label: 'Rad etilgan', tone: 'error' }
    case 50:
      return { label: 'Muvaffaqiyatli', tone: 'success' }
    default:
      return { label: 'Noma’lum', tone: 'neutral' }
  }
}
