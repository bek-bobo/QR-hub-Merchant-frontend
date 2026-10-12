import type { MessageCatalog } from './generated'
import { emergencyCopy } from './emergency-copy'
import type { LocaleRuntime, MessageResult } from './runtime'

export type MessageNamespace = keyof MessageCatalog
export type MessageSource = Pick<LocaleRuntime, 'resolve'>
type MessageKey<N extends MessageNamespace> = Extract<keyof MessageCatalog[N], string>
type Arguments<N extends MessageNamespace, K extends MessageKey<N>> =
  MessageCatalog[N][K] extends Record<string, never>
    ? [params?: MessageCatalog[N][K]] : [params: MessageCatalog[N][K]]

// Plain text only. Future rich messages need a separately guarded node/slot API;
// never route catalog HTML through dangerouslySetInnerHTML or unguarded Trans.
export function createMessages<N extends MessageNamespace>(runtime: MessageSource, namespace: N) {
  return {
    message<K extends MessageKey<N>>(key: K, ...args: Arguments<N, K>): string {
      const result = runtime.resolve(namespace, key, args[0])
      return result.status === 'resolved' ? result.text : emergencyCopy.message
    },
    critical<K extends MessageKey<N>>(key: K, ...args: Arguments<N, K>): MessageResult {
      return runtime.resolve(namespace, key, args[0])
    },
  }
}
