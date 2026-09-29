import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MetadataId } from './MetadataId'

describe('MetadataId', () => {
  it('renders a short identifier unchanged', () => {
    const value = 'QR-17'

    const html = renderToStaticMarkup(<MetadataId value={value} />)

    expect(html).toContain('>QR-17</span>')
    expect(html).toContain('title="QR-17"')
    expect(value).toBe('QR-17')
  })

  it('keeps the full original long identifier in text and the native title', () => {
    const value = '01234567-89ab-cdef-0123-456789abcdef'

    const html = renderToStaticMarkup(<MetadataId value={value} />)

    expect(html).toContain('>01234567-89ab-cdef-0123-456789abcdef</span>')
    expect(html).toContain('title="01234567-89ab-cdef-0123-456789abcdef"')
    expect(html).not.toContain('…')
    expect(value).toBe('01234567-89ab-cdef-0123-456789abcdef')
  })
})
