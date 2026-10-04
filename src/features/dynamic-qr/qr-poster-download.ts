// A single image-only A4 page, matching the admin poster PDF output.
// Browser compression replaces the reference project's jsPDF dependency.
export function createPosterPdf(compressedRgb: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets = [0]
  let length = 0
  const append = (value: string | Uint8Array) => {
    const bytes = typeof value === 'string' ? encoder.encode(value) : value
    chunks.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string) => {
    offsets[id] = length
    append(`${id} 0 obj\n${body}\nendobj\n`)
  }
  append('%PDF-1.4\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Poster 4 0 R >> >> /Contents 5 0 R >>')
  offsets[4] = length
  append(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressedRgb.length} >>\nstream\n`)
  append(compressedRgb)
  append('\nendstream\nendobj\n')
  const content = 'q\n595.28 0 0 841.89 0 0 cm\n/Poster Do\nQ\n'
  object(5, `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`)
  const xref = length
  append('xref\n0 6\n0000000000 65535 f \n')
  for (const offset of offsets.slice(1)) append(`${String(offset).padStart(10, '0')} 00000 n \n`)
  append(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  const result = new Uint8Array(length)
  let cursor = 0
  for (const chunk of chunks) { result.set(chunk, cursor); cursor += chunk.length }
  return result
}

function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  try { anchor.click() } finally { anchor.remove() }
}

export function downloadPosterPng(canvas: HTMLCanvasElement, filename: string) {
  downloadUrl(canvas.toDataURL('image/png'), filename)
}

export async function downloadPosterPdf(canvas: HTMLCanvasElement, filename: string) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data
  const rgb = new Uint8Array(canvas.width * canvas.height * 3)
  for (let source = 0, target = 0; source < rgba.length; source += 4) {
    rgb[target++] = rgba[source]!
    rgb[target++] = rgba[source + 1]!
    rgb[target++] = rgba[source + 2]!
  }
  const stream = new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  const pdf = createPosterPdf(compressed, canvas.width, canvas.height)
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
  try { downloadUrl(url, filename) } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
