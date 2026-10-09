import { createContext } from 'react'
import type { LocaleRuntime } from './runtime'

export const LocaleContext = createContext<LocaleRuntime | null>(null)
