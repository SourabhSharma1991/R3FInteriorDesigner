import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { Theme } from '../types/theme'
import { BUILTIN_THEMES } from './builtinThemes'
import { ThemeContext } from './ThemeContext'
import type { ThemeContextValue } from './ThemeContext'
import { ThemeManager } from './ThemeManager'

const STORAGE_KEY = 'r3f-interior-designer.theme'

const storedThemeId = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const storeThemeId = (id: string | null) => {
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode / storage disabled — the theme just is not remembered.
  }
}

interface Props {
  children: ReactNode
  themes?: Theme[]
  /** `null` (the default) starts with the app's original appearance. */
  defaultThemeId?: string | null
  /** Remember the picked theme in localStorage. */
  persist?: boolean
}

export function ThemeProvider({
  children,
  themes = BUILTIN_THEMES,
  defaultThemeId = null,
  persist = true,
}: Props) {
  const [manager] = useState(
    () => new ThemeManager(themes, (persist ? storedThemeId() : null) ?? defaultThemeId),
  )
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState)

  const setActiveTheme = useCallback(
    (id: string | null) => {
      manager.setActive(id)
      if (persist) storeThemeId(id)
    },
    [manager, persist],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...state,
      manager,
      setActiveTheme,
      registerTheme: (theme) => void manager.register(theme),
      setOverride: (key, spec) => manager.setOverride(key, spec),
      clearOverrides: () => manager.clearOverrides(),
    }),
    [manager, setActiveTheme, state],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
