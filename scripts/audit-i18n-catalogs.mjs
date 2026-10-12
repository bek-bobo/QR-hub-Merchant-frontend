import fs from 'node:fs'
import { inventory } from './check-i18n-literals.mjs'
import { logicalCatalog } from './validate-locales.mjs'

// Review evidence only. Dynamic typed references make absence of a literal
// occurrence insufficient proof that a key is unused; this never deletes keys.
const { enabled } = JSON.parse(fs.readFileSync('src/shared/i18n/namespaces.json', 'utf8'))
const source = inventory().productionFiles.filter((file) => !file.includes('/shared/i18n/metadata.generated.'))
  .map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const rows = [], summary = []
function flatten(object, prefix = '', out = {}) {
  for (const [key, value] of Object.entries(object)) {
    if (typeof value === 'string') out[prefix + key] = value
    else flatten(value, prefix + key + '.', out)
  }
  return out
}
for (const namespace of enabled) {
  const catalogs = Object.fromEntries(['uz', 'ru', 'en'].map((locale) => [locale, JSON.parse(fs.readFileSync(`src/locales/${locale}/${namespace}.json`, 'utf8'))]))
  const logical = logicalCatalog(catalogs.uz, 'uz-UZ', namespace)
  const flat = Object.fromEntries(Object.entries(catalogs).map(([locale, value]) => [locale, flatten(value)]))
  const literalUsageUnproven = Object.keys(logical).filter((key) => !source.includes(`'${key}'`) && !source.includes(`"${key}"`))
  const duplicates = Object.entries(flat.uz).filter(([key, text], index, entries) => entries.findIndex(([otherKey, otherText]) => otherText === text && otherKey !== key) >= 0).map(([key]) => key)
  summary.push({ namespace, logicalKeys: Object.keys(logical).length, physicalLeaves: Object.fromEntries(Object.entries(flat).map(([locale, values]) => [locale, Object.keys(values).length])), literalUsageUnproven, duplicateUzKeys: duplicates })
  for (const key of Object.keys(flat.uz)) rows.push({ namespace, key, uz: flat.uz[key], ru: flat.ru[key], en: flat.en[key] })
  for (const key of Object.keys(flat.ru).filter((key) => !(key in flat.uz))) rows.push({ namespace, key, ru: flat.ru[key], context: 'Russian-specific plural category; logical parity validated separately' })
}
fs.writeFileSync('docs/i18n/i18n6-evidence/catalog-review.json', JSON.stringify({ summary, rows }, null, 2) + '\n')
console.log(JSON.stringify(summary.map(({ namespace, logicalKeys, physicalLeaves, literalUsageUnproven, duplicateUzKeys }) => ({ namespace, logicalKeys, physicalLeaves, usageReviewCandidates: literalUsageUnproven.length, duplicateUzKeys: duplicateUzKeys.length })), null, 2))
