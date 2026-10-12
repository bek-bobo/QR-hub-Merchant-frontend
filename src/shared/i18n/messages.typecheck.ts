import { createMessages } from './messages'
import type { LocaleRuntime } from './runtime'

// Compiled by the normal application typecheck; never imported into production.
export function assertMessageTypes(runtime: LocaleRuntime) {
  const { message, critical } = createMessages(runtime, 'common')
  message('actions.save'); message('greeting', { name: 'Merchant' }); message('items', { count: 0 })
  critical('items', { count: 1 })
  // @ts-expect-error Unknown namespace must fail.
  createMessages(runtime, 'futureFeature')
  // @ts-expect-error Misspelled key must fail.
  message('actions.saev')
  // @ts-expect-error Required interpolation must fail when absent.
  message('greeting')
  // @ts-expect-error Unknown interpolation name must fail.
  message('greeting', { other: 'A' })
  // @ts-expect-error Extra interpolation must fail.
  message('greeting', { name: 'A', other: 'B' })
  // @ts-expect-error Count must be numeric.
  message('items', { count: '0' })
  // @ts-expect-error Critical messages enforce the same parameters.
  critical('items', {})
  // @ts-expect-error Parameter-free messages reject options/engine control arguments.
  message('actions.save', { lng: 'en' })
  // @ts-expect-error Arbitrary values cannot be interpolation data.
  message('greeting', { name: undefined })
}
