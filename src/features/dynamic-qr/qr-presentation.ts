import type { DynamicQrRow } from '@/shared/contracts/merchant-read'
import { validateCreateLink, type LinkPresentation } from './create-result'

export type QrCopyOutcome = 'copied' | 'failed' | 'stale' | 'unavailable'

export async function writeQrClipboardText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
  await navigator.clipboard.writeText(text)
}

export async function copyExactQrText(
  text: string,
  writeText: (text: string) => Promise<void> = writeQrClipboardText,
): Promise<QrCopyOutcome> {
  try {
    await writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export async function copyExactPresentedLink(
  link: LinkPresentation,
  writeText: (text: string) => Promise<void>,
): Promise<QrCopyOutcome> {
  if (link.kind !== 'available') return 'unavailable'
  return copyExactQrText(link.original, writeText)
}

export function presentDynamicQrRowLink(row: DynamicQrRow): LinkPresentation {
  return presentQrLink(row.link)
}

export function presentQrLink(link: string | null): LinkPresentation {
  return validateCreateLink(link ?? '')
}
