export interface AccessRevisionTracker {
  update(permissions: readonly string[]): number
}

export function createAccessRevisionTracker(): AccessRevisionTracker {
  let revision = 0
  let previous = '[]'

  return {
    update(permissions) {
      const canonical = JSON.stringify([...new Set(permissions)].sort())
      if (canonical !== previous) {
        previous = canonical
        revision += 1
      }
      return revision
    },
  }
}
