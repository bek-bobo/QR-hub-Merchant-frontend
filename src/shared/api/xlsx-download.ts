import { safeBusinessError, safeContractError } from './errors'

export const fallbackXlsxFilename = 'dynamic-qrs.xlsx'
export const xlsxMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

export interface XlsxDownload {
  readonly blob: Blob
  readonly filename: string
}

function hasForbiddenFilenameCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (character === '/' || character === '\\' || code < 0x20 || code === 0x7f) return true
  }
  return false
}

export function filenameFromDisposition(header: string | null): string {
  if (!header) return fallbackXlsxFilename
  const match = /(?:^|;)\s*filename\s*=\s*(?:"([^"]*)"|([^;]*))/i.exec(header)
  const candidate = (match?.[1] ?? match?.[2] ?? '').trim()
  // These apostrophes occur in human-language names; none are path syntax.
  if (!candidate || candidate.includes('..') || hasForbiddenFilenameCharacter(candidate) ||
    !/^[\p{L}\p{N} _().'\u2018\u2019-]+\.xlsx$/u.test(candidate)) return fallbackXlsxFilename
  return candidate
}

export async function classifyXlsxResponse(response: Response): Promise<XlsxDownload> {
  if (!response.ok) throw safeContractError()
  const mime = response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mime === 'application/json') {
    let payload: unknown
    try { payload = await response.json() } catch { throw safeContractError() }
    if (typeof payload === 'object' && payload !== null && !Array.isArray(payload)) {
      const envelope = payload as Record<string, unknown>
      const error = envelope.error
      if (envelope.success === false && typeof error === 'object' && error !== null && !Array.isArray(error)) {
        const detail = error as Record<string, unknown>
        if (Number.isSafeInteger(detail.code) && typeof detail.tag === 'string' && detail.tag.length > 0) {
          throw safeBusinessError({ code: detail.code as number, tag: detail.tag })
        }
      }
    }
    throw safeContractError()
  }
  if (mime !== xlsxMime) throw safeContractError()
  const blob = await response.blob()
  if (blob.size < 4) throw safeContractError()
  const signature = new Uint8Array(await blob.slice(0, 4).arrayBuffer())
  if (signature[0] !== 0x50 || signature[1] !== 0x4b || signature[2] !== 0x03 || signature[3] !== 0x04) {
    throw safeContractError()
  }
  return { blob, filename: filenameFromDisposition(response.headers.get('content-disposition')) }
}
