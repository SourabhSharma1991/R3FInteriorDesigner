import { createContext } from 'react'
import type { MaterialSpec, Theme } from '../types/theme'
import type { ThemeManager, ThemeManagerState } from './ThemeManager'

export interface ThemeContextValue extends ThemeManagerState {
  manager: ThemeManager
  setActiveTheme: (id: string | null) => void
  registerTheme: (theme: Theme) => void
  setOverride: (key: string, spec: MaterialSpec | null) => void
  clearOverrides: () => void
}

/** `null` outside a ThemeProvider — components then use their own defaults. */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
