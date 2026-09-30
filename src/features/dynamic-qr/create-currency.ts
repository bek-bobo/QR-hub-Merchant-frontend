import type { CurrencyOption } from '@/shared/contracts/currency.contract'

export function resolveCreateUzsCode(
  currencies: readonly CurrencyOption[] | undefined,
): string {
  return currencies?.find((currency) => currency.code === 'UZS')?.code ?? ''
}
