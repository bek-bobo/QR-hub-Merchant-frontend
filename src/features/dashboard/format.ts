const previewAmountFormatter = new Intl.NumberFormat('uz-UZ', {
  maximumFractionDigits: 2,
})

export function formatPreviewTiyin(value: unknown): string {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    !Number.isInteger(value)
  ) {
    return '—'
  }

  return `${previewAmountFormatter.format(value / 100)} UZS`
}
