import { renderToStaticMarkup } from '@/test/locale-fixture'
import { describe, expect, it } from 'vitest'
import { UzbekPhoneInput } from './UzbekPhoneInput'

describe('UzbekPhoneInput', () => {
  it('shows a fixed country prefix and keeps only formatted local digits editable', () => {
    const html = renderToStaticMarkup(
      <UzbekPhoneInput
        id="synthetic-phone"
        value="881017980"
        onValueChange={() => undefined}
      />,
    )

    expect(html).toContain('>+998</span>')
    expect(html).toContain('type="tel"')
    expect(html).toContain('inputMode="tel"')
    expect(html).toContain('value="88 101 79 80"')
    expect(html).not.toContain('value="+998')
  })

  it('keeps the prefix visible for empty state and connects invalid feedback', () => {
    const html = renderToStaticMarkup(
      <UzbekPhoneInput
        id="synthetic-phone"
        value=""
        onValueChange={() => undefined}
        aria-invalid="true"
        aria-describedby="synthetic-phone-error"
      />,
    )

    expect(html).toContain('>+998</span>')
    expect(html).toContain('value=""')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="synthetic-phone-prefix synthetic-phone-error"')
  })
})
