import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormField } from './FormField'

function openingTag(html: string, tagName: string): string {
  const match = new RegExp(`<${tagName}\\b[^>]*>`).exec(html)
  if (!match) throw new Error(`Missing <${tagName}> in rendered markup.`)
  return match[0]
}

function openingTagWithId(html: string, id: string): string {
  const match = [...html.matchAll(/<[^/][^>]*>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes(`id="${id}"`))
  if (!match) throw new Error(`Missing element with id ${id} in rendered markup.`)
  return match
}

function attributeValue(tag: string, attribute: string): string | null {
  return new RegExp(`(?:^|\\s)${attribute}="([^"]*)"`).exec(tag)?.[1] ?? null
}

describe('FormField', () => {
  it('associates label, help, and error with an invalid control', () => {
    const html = renderToStaticMarkup(
      <FormField id="amount" label="Summa" helpText="UZS kiriting" errorText="Summa noto‘g‘ri">
        {(controlProps) => <Input {...controlProps} />}
      </FormField>,
    )

    const label = openingTag(html, 'label')
    const input = openingTag(html, 'input')
    const help = openingTagWithId(html, 'amount-help')
    const error = openingTagWithId(html, 'amount-error')
    const describedBy = attributeValue(input, 'aria-describedby')?.split(' ') ?? []

    expect(html).toContain('>Summa</label>')
    expect(attributeValue(label, 'for')).toBe('amount')
    expect(attributeValue(input, 'id')).toBe('amount')
    expect(attributeValue(input, 'aria-invalid')).toBe('true')
    expect(describedBy).toContain('amount-help')
    expect(describedBy).toContain('amount-error')
    expect(attributeValue(help, 'id')).toBe('amount-help')
    expect(attributeValue(error, 'id')).toBe('amount-error')
    expect(attributeValue(error, 'role')).toBe('alert')
  })

  it('keeps a disabled custom select semantic and labelled through the shared primitive', () => {
    const html = renderToStaticMarkup(
      <FormField id="terminal" label="Terminal">
        {(controlProps) => <Select {...controlProps} disabled><option>Tanlang</option></Select>}
      </FormField>,
    )

    expect(html).toContain('role="combobox"')
    expect(html).toContain('data-slot="select"')
    expect(html).toContain('id="terminal"')
    expect(html).toContain('disabled=""')
    expect(html).not.toContain('aria-invalid="true"')
  })
})
