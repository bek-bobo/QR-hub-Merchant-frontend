interface NormalizeColumnOrderOptions {
  readonly defaultOrder: readonly string[]
  readonly savedOrder: unknown
  readonly fixedIds?: readonly string[]
}

function uniqueKnownIds(ids: readonly string[], excluded: ReadonlySet<string>): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (excluded.has(id) || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

export function defaultColumnOrder(
  defaultOrder: readonly string[],
  fixedIds: readonly string[] = [],
): string[] {
  return uniqueKnownIds(defaultOrder, new Set(fixedIds))
}

export function normalizeColumnOrder({
  defaultOrder,
  savedOrder,
  fixedIds = [],
}: NormalizeColumnOrderOptions): string[] {
  const currentDefault = defaultColumnOrder(defaultOrder, fixedIds)
  if (!Array.isArray(savedOrder)) return currentDefault

  const known = new Set(currentDefault)
  const fixed = new Set(fixedIds)
  const seen = new Set<string>()
  const resolved: string[] = []

  for (const candidate of savedOrder) {
    if (
      typeof candidate !== 'string' ||
      fixed.has(candidate) ||
      !known.has(candidate) ||
      seen.has(candidate)
    ) {
      continue
    }
    seen.add(candidate)
    resolved.push(candidate)
  }

  for (let defaultIndex = 0; defaultIndex < currentDefault.length; defaultIndex += 1) {
    const missingId = currentDefault[defaultIndex]
    if (seen.has(missingId)) continue

    let insertionIndex = -1
    for (let precedingIndex = defaultIndex - 1; precedingIndex >= 0; precedingIndex -= 1) {
      const precedingPosition = resolved.indexOf(currentDefault[precedingIndex])
      if (precedingPosition >= 0) {
        insertionIndex = precedingPosition + 1
        break
      }
    }

    if (insertionIndex < 0) {
      for (
        let followingIndex = defaultIndex + 1;
        followingIndex < currentDefault.length;
        followingIndex += 1
      ) {
        const followingPosition = resolved.indexOf(currentDefault[followingIndex])
        if (followingPosition >= 0) {
          insertionIndex = followingPosition
          break
        }
      }
    }

    if (insertionIndex < 0) insertionIndex = resolved.length
    resolved.splice(insertionIndex, 0, missingId)
    seen.add(missingId)
  }

  return resolved
}

function moveColumn(
  order: readonly string[],
  columnId: string,
  offset: -1 | 1,
): string[] {
  const currentIndex = order.indexOf(columnId)
  const targetIndex = currentIndex + offset
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= order.length) {
    return [...order]
  }

  const next = [...order]
  const [column] = next.splice(currentIndex, 1)
  next.splice(targetIndex, 0, column)
  return next
}

export function moveColumnUp(order: readonly string[], columnId: string): string[] {
  return moveColumn(order, columnId, -1)
}

export function moveColumnDown(order: readonly string[], columnId: string): string[] {
  return moveColumn(order, columnId, 1)
}

export function moveColumnToTarget(
  order: readonly string[],
  sourceId: string,
  targetId: string,
): string[] {
  const sourceIndex = order.indexOf(sourceId)
  const targetIndex = order.indexOf(targetId)
  if (sourceId === targetId || sourceIndex < 0 || targetIndex < 0) return [...order]

  const next = [...order]
  const [column] = next.splice(sourceIndex, 1)
  next.splice(targetIndex, 0, column)
  return next
}
