import enp5 from '@/locales/en/p5.json'
import rup5 from '@/locales/ru/p5.json'
import uzp5 from '@/locales/uz/p5.json'
import encashiers from '@/locales/en/cashiers.json'
import rucashiers from '@/locales/ru/cashiers.json'
import uzcashiers from '@/locales/uz/cashiers.json'
import enbankAccounts from '@/locales/en/bankAccounts.json'
import rubankAccounts from '@/locales/ru/bankAccounts.json'
import uzbankAccounts from '@/locales/uz/bankAccounts.json'
import enterminals from '@/locales/en/terminals.json'
import ruterminals from '@/locales/ru/terminals.json'
import uzterminals from '@/locales/uz/terminals.json'
import enstaticQr from '@/locales/en/staticQr.json'
import rustaticQr from '@/locales/ru/staticQr.json'
import uzstaticQr from '@/locales/uz/staticQr.json'
import uzdynamicQr from '@/locales/uz/dynamicQr.json'
import rudynamicQr from '@/locales/ru/dynamicQr.json'
import endynamicQr from '@/locales/en/dynamicQr.json'
import uzdashboard from '@/locales/uz/dashboard.json'
import rudashboard from '@/locales/ru/dashboard.json'
import endashboard from '@/locales/en/dashboard.json'
import enaccount from '@/locales/en/account.json'
import ruaccount from '@/locales/ru/account.json'
import uzaccount from '@/locales/uz/account.json'
import enauth from '@/locales/en/auth.json'
import ruauth from '@/locales/ru/auth.json'
import uzauth from '@/locales/uz/auth.json'
import enshell from '@/locales/en/shell.json'
import rushell from '@/locales/ru/shell.json'
import uzshell from '@/locales/uz/shell.json'
import uzCommon from '@/locales/uz/common.json'
import ruCommon from '@/locales/ru/common.json'
import enCommon from '@/locales/en/common.json'
import manifest from './namespaces.json'
import { messageMetadata } from './metadata.generated'
import { languageRegistry, type SupportedLocale } from './registry'

export const namespaceManifest = manifest
export const resources = {
  uz: { p5: uzp5, cashiers: uzcashiers, bankAccounts: uzbankAccounts, terminals: uzterminals, staticQr: uzstaticQr, common: uzCommon, shell: uzshell, auth: uzauth, account: uzaccount, dashboard: uzdashboard, dynamicQr: uzdynamicQr }, ru: { p5: rup5, cashiers: rucashiers, bankAccounts: rubankAccounts, terminals: ruterminals, staticQr: rustaticQr, common: ruCommon, shell: rushell, auth: ruauth, account: ruaccount, dashboard: rudashboard, dynamicQr: rudynamicQr }, en: { p5: enp5, cashiers: encashiers, bankAccounts: enbankAccounts, terminals: enterminals, staticQr: enstaticQr, common: enCommon, shell: enshell, auth: enauth, account: enaccount, dashboard: endashboard, dynamicQr: endynamicQr },
} satisfies Record<SupportedLocale, Record<keyof typeof messageMetadata, unknown>>

export interface MessageDescriptor { readonly plural: boolean; readonly params: readonly string[]; readonly interpolations: readonly string[] }
export const descriptors: Readonly<Record<string, Readonly<Record<string, MessageDescriptor>>>> = messageMetadata

export function resourceAt(catalog: unknown, key: string): unknown {
  let value = catalog
  for (const segment of key.split('.')) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, segment)) return undefined
    value = Reflect.get(value, segment)
  }
  return value
}

export function validTemplate(value: unknown, descriptor: MessageDescriptor, namespace: string, key: string, zero = false): value is string {
  if (typeof value !== 'string' || !value.trim() || value === key || value === `${namespace}.${key}`
    || value === `${namespace}:${key}` || /^[A-Za-z][A-Za-z0-9]*(?:[.:][A-Za-z][A-Za-z0-9]*)+$/.test(value)
    || value.includes('$t(') || /<\/?[A-Za-z]/.test(value)) return false
  const params = [...new Set([...value.matchAll(/{{\s*([A-Za-z][A-Za-z0-9]*)\s*}}/g)].map((match) => match[1]))].sort()
  const expected = descriptor.interpolations.filter((param) => param !== 'count' || !zero || params.includes('count'))
  return !/[{}]/.test(value.replace(/{{\s*[A-Za-z][A-Za-z0-9]*\s*}}/g, ''))
    && JSON.stringify(params) === JSON.stringify(expected)
}

export function validLocaleResources(locale: SupportedLocale, getBundle: (locale: SupportedLocale, namespace: string) => unknown): boolean {
  return namespaceManifest.enabled.every((namespace) => {
    const bundle = getBundle(locale, namespace)
    const catalog = descriptors[namespace]
    if (!catalog) return false
    const expected = new Set<string>()
    for (const [key, descriptor] of Object.entries(catalog)) {
      const variants = descriptor.plural
        ? new Intl.PluralRules(languageRegistry[locale].intlLocale).resolvedOptions().pluralCategories.map((category) => `${key}_${category}`)
        : [key]
      for (const variant of variants) {
        expected.add(variant)
        if (!validTemplate(resourceAt(bundle, variant), descriptor, namespace, key)) return false
      }
      if (descriptor.plural && resourceAt(bundle, `${key}_zero`) !== undefined) {
        expected.add(`${key}_zero`)
        if (!validTemplate(resourceAt(bundle, `${key}_zero`), descriptor, namespace, key, true)) return false
      }
    }
    function check(node: unknown, prefix = ''): boolean {
      if (!node || typeof node !== 'object' || Array.isArray(node) || !Object.keys(node).length) return false
      return Object.entries(node).every(([key, value]) => typeof value === 'string'
        ? expected.delete(`${prefix}${key}`)
        : check(value, `${prefix}${key}.`))
    }
    return check(bundle) && expected.size === 0
  })
}
