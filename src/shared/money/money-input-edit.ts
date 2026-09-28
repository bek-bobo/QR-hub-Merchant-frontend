export interface FormattedMoneyInputEdit {
  readonly value: string
  readonly selectionStart: number
}

function semanticLength(value: string): number {
  return value.replaceAll(' ', '').length
}

function selectionForSemanticOffset(value: string, offset: number): number {
  if (offset <= 0) return 0
  let semanticOffset = 0
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== ' ') semanticOffset += 1
    if (semanticOffset === offset) return index + 1
  }
  return value.length
}

function groupWholeDigits(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatMoneyInputEdit(
  value: string,
  selectionStart: number | null,
): FormattedMoneyInputEdit | null {
  const caret = selectionStart ?? value.length
  const semanticCaret = semanticLength(value.slice(0, caret))
  const compact = value.replaceAll(' ', '')
  if (!/^\d*(?:[.,]\d{0,2})?$/.test(compact)) return null

  const separatorIndex = compact.search(/[.,]/)
  const whole = separatorIndex < 0 ? compact : compact.slice(0, separatorIndex)
  const fraction = separatorIndex < 0 ? '' : compact.slice(separatorIndex)
  const formatted = `${groupWholeDigits(whole)}${fraction}`

  return Object.freeze({
    value: formatted,
    selectionStart: selectionForSemanticOffset(formatted, semanticCaret),
  })
}
