import { describe, expect, it } from 'vitest'
import { classifyXlsxResponse, fallbackXlsxFilename, filenameFromDisposition, xlsxMime } from './xlsx-download'

const zipSmoke = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])

describe('XLSX response classification', () => {
  it('accepts only expected MIME and ZIP opening signature as a transport smoke check', async () => {
    const response = new Response(zipSmoke, { headers: {
      'content-type': `${xlsxMime}; charset=binary`,
      'content-disposition': 'attachment; filename="report.xlsx"',
    } })
    const file = await classifyXlsxResponse(response)
    expect(file.blob).toBeInstanceOf(Blob)
    expect(file.filename).toBe('report.xlsx')
  })

  it('classifies a 200 JSON business failure without exposing server text', async () => {
    const response = new Response(JSON.stringify({ success: false,
      error: { code: 5001, tag: 'EXPORT_FAILED', stack: 'private trace' } }),
    { headers: { 'content-type': 'application/json' } })
    await expect(classifyXlsxResponse(response)).rejects.toMatchObject({
      kind: 'business', code: 5001, tag: 'EXPORT_FAILED',
    })
  })

  it.each([
    ['HTML gateway response', '<html>gateway</html>', 'text/html'],
    ['octet stream without evidence', zipSmoke, 'application/octet-stream'],
    ['empty body', '', xlsxMime],
    ['wrong signature', '{"success":true}', xlsxMime],
  ])('rejects %s before download', async (_label, body, mime) => {
    const response = new Response(body, { headers: { 'content-type': mime } })
    await expect(classifyXlsxResponse(response)).rejects.toMatchObject({ kind: 'contract' })
  })

  it.each([null, '', 'attachment; filename="../steal.xlsx"',
    'attachment; filename="report.csv"', 'attachment; filename="a/b.xlsx"',
    'attachment; filename="a\\b.xlsx"', 'attachment; filename="bad\r\nname.xlsx"',
    'attachment; filename="bad\0name.xlsx"', 'attachment; filename="bad\rname.xlsx"',
    'attachment; filename="bad\nname.xlsx"', 'attachment; filename="bad\tname.xlsx"',
    'attachment; filename="bad\x1fname.xlsx"', 'attachment; filename="bad\x7fname.xlsx"'])
  ('falls back for absent or unsafe filename %s', (header) => {
    expect(filenameFromDisposition(header)).toBe(fallbackXlsxFilename)
  })

  it('accepts a safe Unicode name with the exact .xlsx extension', () => {
    expect(filenameFromDisposition('attachment; filename="To‘lov hisobot 2026.xlsx"'))
      .toBe('To‘lov hisobot 2026.xlsx')
  })

  it.each(["To'lov 2026.xlsx", 'To’lov 2026.xlsx', 'Toʻlov 2026.xlsx',
    'Toʼlov 2026.xlsx', 'Қўқон hisobot.xlsx'])
  ('preserves a safe human-language filename exactly: %s', (name) => {
    expect(filenameFromDisposition(`attachment; filename="${name}"`)).toBe(name)
  })

  it.each(['report!draft.xlsx', 'report;draft.xlsx', 'report.csv'])
  ('keeps unsupported punctuation or extension behind fallback: %s', (name) => {
    expect(filenameFromDisposition(`attachment; filename="${name}"`))
      .toBe(fallbackXlsxFilename)
  })
})
