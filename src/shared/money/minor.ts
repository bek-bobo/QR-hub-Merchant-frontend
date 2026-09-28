export interface MinorAmountInput {
  readonly minorUnits: string | number
  readonly currency: string
  readonly scale: number
}

export type MinorValueInput = Omit<MinorAmountInput, 'currency'>

function exactMinorUnits(value: string | number): bigint {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new TypeError('Minor units must be an exact safe integer.')
    }
    return BigInt(value)
  }

  if (!/^(0|-?[1-9]\d*)$/.test(value)) {
    throw new TypeError('Minor units must be a canonical integer string.')
  }

  return BigInt(value)
}

function validateScale(scale: number): void {
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 20) {
    throw new TypeError('Money scale is invalid.')
  }
}

function groupWholeDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatMinorValue(input: MinorValueInput): string {
  validateScale(input.scale)

  const minorUnits = exactMinorUnits(input.minorUnits)
  const negative = minorUnits < 0n
  const absolute = negative ? -minorUnits : minorUnits
  const divisor = 10n ** BigInt(input.scale)
  const whole = groupWholeDigits(String(absolute / divisor))
  const fraction = absolute % divisor
  const decimal = input.scale === 0
    ? whole
    : `${whole}.${String(fraction).padStart(input.scale, '0')}`

  return `${negative ? '-' : ''}${decimal}`
}

export function formatMinorUnits(input: MinorAmountInput): string {
  if (!/^[A-Z]{3}$/.test(input.currency)) {
    throw new TypeError('Currency must be a three-letter uppercase code.')
  }

  return `${formatMinorValue(input)} ${input.currency}`
}

export const formatMoney = formatMinorUnits
