import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { validateCreateLink, type LinkPresentation } from './create-result'

export type QrCopyOutcome = 'copied' | 'failed' | 'stale' | 'unavailable'

export async function copyExactPresentedLink(
  link: LinkPresentation,
  writeText: (text: string) => Promise<void>,
): Promise<QrCopyOutcome> {
  if (link.kind !== 'available') return 'unavailable'
  try {
    await writeText(link.original)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function presentDynamicQrRowLink(row: DynamicQrRow): LinkPresentation {
  return presentQrLink(row.link)
}

export function presentQrLink(link: string | null): LinkPresentation {
  return validateCreateLink(link ?? '')
}
