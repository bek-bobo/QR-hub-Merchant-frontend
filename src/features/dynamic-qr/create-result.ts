import type { ReadScope } from '@/shared/contracts/merchant-read'
import type { CreateQrControllerState } from './create-qr'

export type AcceptedLinkScheme = 'https:' | 'http:'
export type LinkPresentation =
  | { readonly kind: 'available'; readonly original: string }
  | { readonly kind: 'unavailable' }

/** Product-approved live presentation accepts the canonical HTTPS link returned by create. */
export const liveCreateLinkSchemes: readonly AcceptedLinkScheme[] = Object.freeze(['https:'])

export function validateCreateLink(
  original: string,
  allowedSchemes: readonly AcceptedLinkScheme[] = liveCreateLinkSchemes,
): LinkPresentation {
  if (!original || original !== original.trim()) return { kind: 'unavailable' }
  let parsed: URL
  try { parsed = new URL(original) } catch { return { kind: 'unavailable' } }
  if (!parsed.hostname || parsed.username || parsed.password ||
    !allowedSchemes.some((scheme) => scheme === parsed.protocol)) return { kind: 'unavailable' }
  return { kind: 'available', original }
}

export type CreateResultModel =
  | { readonly kind: 'confirmed'; readonly pkey: string; readonly terminalName: string;
      readonly amountMinor: string; readonly currencyCode: string; readonly link: LinkPresentation; readonly scope: ReadScope }
  | { readonly kind: 'unknown'; readonly scope: ReadScope }
  | { readonly kind: 'rejected' | 'not-sent'; readonly reason: string; readonly scope: ReadScope }

export function presentCreateResult(
  state: CreateQrControllerState,
  allowedSchemes: readonly AcceptedLinkScheme[] = liveCreateLinkSchemes,
): CreateResultModel | null {
  if (state.closed || !state.intent) return null
  const { outcome, intent } = state
  if (outcome.kind === 'confirmed') return {
    kind: 'confirmed',
    pkey: outcome.data.pkey,
    terminalName: intent.terminalName,
    amountMinor: intent.amountMinor,
    currencyCode: intent.currencyCode,
    link: validateCreateLink(outcome.data.link, allowedSchemes),
    scope: intent.scope,
  }
  if (outcome.kind === 'unknown') return { kind: 'unknown', scope: intent.scope }
  if (outcome.kind === 'rejected' || outcome.kind === 'not-sent') {
    return { kind: outcome.kind, reason: outcome.reason, scope: intent.scope }
  }
  return null
}

function sameScope(left: ReadScope, right: ReadScope): boolean {
  return left.source === right.source && left.sessionScopeId === right.sessionScopeId &&
    left.accessRevision === right.accessRevision
}

export async function copyExactCreateLink(input: {
  readonly result: CreateResultModel
  readonly currentScope: () => ReadScope
  readonly canCreate: () => boolean
  readonly writeText: (text: string) => Promise<void>
}): Promise<'copied' | 'unavailable' | 'failed' | 'stale'> {
  if (input.result.kind !== 'confirmed' || input.result.link.kind !== 'available') return 'unavailable'
  if (!sameScope(input.result.scope, input.currentScope()) || !input.canCreate()) return 'stale'
  try {
    await input.writeText(input.result.link.original)
    return sameScope(input.result.scope, input.currentScope()) && input.canCreate() ? 'copied' : 'stale'
  } catch {
    return sameScope(input.result.scope, input.currentScope()) && input.canCreate() ? 'failed' : 'stale'
  }
}
