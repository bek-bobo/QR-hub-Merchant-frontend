import { describe, expect, it } from 'vitest'
import { checkLiterals, inventory, scanText } from './check-i18n-literals.mjs'

const file = 'src/features/Example.tsx'
describe('high-confidence literal release gate', () => {
  it.each([
    '<p>Untranslated text</p>', '<input placeholder="Search"/>', '<button aria-label={"Close"}/>',
    '<button title={ready ? "Delete" : "Wait"}/>', '<p>{ready ? "Ready" : "Pending"}</p>',
    'const columns = [{label: "Amount"}]', 'const toast = {description: "Saved"}',
    '<button aria-label={`Delete ${id}`}/>',
  ])('rejects visible literal %s', (source) => {
    const candidates = scanText(source, file).map((item) => ({ ...item, production: true }))
    expect(candidates.length).toBeGreaterThan(0)
    expect(checkLiterals({ candidates }, [])).not.toEqual([])
  })
  it.each([
    '<p>{message("actions.save")}</p>', '<p>{row.name}</p>',
    '<p className="text-brand" data-testid="Save"/>', '<Link to="/account">{title}</Link>',
    '<p title={kind === "pending" ? message("pending") : row.name}/>',
  ])('allows data, translation calls and technical literals %s', (source) => {
    expect(scanText(source, file)).toEqual([])
  })
  it('requires exact file/surface/text, owner and reason; rejects stale exemptions', () => {
    const candidates = scanText('<p>QRHub</p>', file).map((item) => ({ ...item, production: true }))
    const exception = { file, surface: 'jsx-text', text: 'QRHub', owner: 'brand', reason: 'Brand identifier' }
    expect(checkLiterals({ candidates }, [exception])).toEqual([])
    for (const changed of [{ text: 'Other' }, { file: 'src/features/Other.tsx' }, { surface: 'attribute:title' }, { reason: '' }, { owner: '' }]) expect(checkLiterals({ candidates }, [{ ...exception, ...changed }]).length).toBeGreaterThan(0)
    expect(checkLiterals({ candidates: [] }, [exception])).toHaveLength(1)
  })
  it('excludes proven DEV blocks only, including nested imports; production branches remain scanned', () => {
    expect(scanText('if (import.meta.env.DEV && enabled) { const p = <p>Fixture</p> }', file)[0].devOnly).toBe(true)
    for (const condition of ['!import.meta.env.DEV', 'import.meta.env.DEV === false', 'import.meta.env.DEV || enabled']) expect(scanText(`if (${condition}) { const p = <p>Live</p> }`, file)[0].devOnly).toBe(false)
  })
  it('follows production lazy modules while excluding the gated DemoRoot graph', () => {
    const result = inventory()
    expect(result.productionFiles).toContain('src/features/dashboard/DashboardReadPage.tsx')
    expect(result.productionFiles).toContain('src/features/dynamic-qr/ExportQrPage.tsx')
    expect(result.productionFiles).not.toContain('src/dev/DemoRoot.tsx')
    expect(result.productionFiles).not.toContain('src/app/AppRouter.tsx')
  })
})
