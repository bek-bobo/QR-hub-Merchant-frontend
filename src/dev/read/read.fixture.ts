import type {
  DynamicQrRow,
  Money,
  TerminalOption,
} from '@/shared/contracts/merchant-read'

// D3-READ-DEMO-ONLY
export const D3_READ_FIXED_INSTANT = new Date('2026-09-15T07:00:00Z')

export const d3TerminalOptions = Object.freeze([
  Object.freeze({ id: 'T-01', name: 'Asosiy terminal' }),
  Object.freeze({ id: 'T-02', name: 'Chilonzor terminal' }),
]) satisfies readonly TerminalOption[]

export interface D3DynamicQrFixtureRow extends DynamicQrRow {
  readonly terminalId: string
}

function money(minorUnits: string): Money {
  return Object.freeze({ minorUnits, currency: 'UZS', scale: 2 })
}

function row(
  sequence: number,
  createdAt: string,
  terminalId: 'T-01' | 'T-02',
  statusCode: number,
  amountMinorUnits: string,
  rrn: string | null,
): D3DynamicQrFixtureRow {
  const terminal = d3TerminalOptions.find((item) => item.id === terminalId)!
  return Object.freeze({
    pkey: `D3-QR-DEMO-${String(sequence).padStart(3, '0')}`,
    createdAt,
    terminalId,
    terminalName: terminal.name,
    merchantName: sequence % 4 === 0 ? 'QRHub Demo Savdo' : 'QRHub Demo Merchant',
    amount: money(String(amountMinorUnits)),
    statusCode,
    rrn,
  })
}

export const d3DynamicQrRows = Object.freeze([
  row(23, '2026-09-15T18:45:00', 'T-01', 50, '12500000', '860001000023'),
  row(22, '2026-09-15T15:30:00', 'T-02', 0, '890000', null),
  row(21, '2026-09-15T12:10:00', 'T-01', 10, '3400000', '860001000021'),
  row(20, '2026-09-15T09:00:00', 'T-02', 5, '775000', null),
  row(19, '2026-09-14T19:20:00', 'T-01', 20, '1999000', null),
  row(18, '2026-09-14T16:05:00', 'T-02', 25, '6450000', '860001000018'),
  row(17, '2026-09-14T11:45:00', 'T-01', 50, '2500000', '860001000017'),
  row(16, '2026-09-14T08:20:00', 'T-02', 777, '130000', null),
  row(15, '2026-09-13T17:30:00', 'T-01', 0, '960000', null),
  row(14, '2026-09-13T13:15:00', 'T-02', 10, '4200000', '860001000014'),
  row(13, '2026-09-13T09:10:00', 'T-01', 50, '8150000', '860001000013'),
  row(12, '2026-09-12T18:05:00', 'T-02', 5, '560000', null),
  row(11, '2026-09-12T14:25:00', 'T-01', 20, '1750000', null),
  row(10, '2026-09-12T10:40:00', 'T-02', 50, '9900000', '860001000010'),
  row(9, '2026-09-11T16:55:00', 'T-01', 0, '225000', null),
  row(8, '2026-09-11T12:35:00', 'T-02', 10, '3150000', '860001000008'),
  row(7, '2026-09-11T08:50:00', 'T-01', 50, '4800000', '860001000007'),
  row(6, '2026-09-10T17:10:00', 'T-02', 5, '1100000', null),
  row(5, '2026-09-10T13:05:00', 'T-01', 20, '2850000', null),
  row(4, '2026-09-10T09:25:00', 'T-02', 50, '7200000', '860001000004'),
  row(3, '2026-09-09T18:00:00', 'T-01', 0, '450000', null),
  row(2, '2026-09-09T12:15:00', 'T-02', 10, '1650000', '860001000002'),
  row(1, '2026-09-09T08:05:00', 'T-01', 50, '5300000', '860001000001'),
])
