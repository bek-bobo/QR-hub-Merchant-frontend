export const DYNAMIC_QR_DEFAULT_COLUMN_ORDER = [
  'qrId',
  'createdAt',
  'terminal',
  'merchant',
  'amount',
  'status',
  'rrn',
] as const

export type DynamicQrColumnId = (typeof DYNAMIC_QR_DEFAULT_COLUMN_ORDER)[number]
