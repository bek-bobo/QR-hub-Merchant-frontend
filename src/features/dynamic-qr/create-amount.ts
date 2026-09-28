export function parseCreateAmount(input: string, minimum = 100000n, maximum = 2000000000n): string | null {
  const trimmed = input.trim()
  if (!/^(?:\d+|\d{1,3}(?: \d{3})+)(?:[.,]\d{1,2})?$/.test(trimmed)) return null
  const [whole, fraction = ''] = trimmed.replaceAll(' ', '').replace(',', '.').split('.')
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0') || '0')
  return minor >= minimum && minor <= maximum ? String(minor) : null
}
