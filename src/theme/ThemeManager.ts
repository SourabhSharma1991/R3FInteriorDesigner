import type { MaterialSpec, Theme } from '../types/theme'
import { MaterialFactory } from './MaterialFactory'

/**
 * Owns the registry of themes, which one is active, and the per-node user
 * overrides. Framework-agnostic — React subscribes to it in ThemeProvider.
 */

export interface ThemeManagerState {
  themes: Theme[]
  activeId: string | null
  active: Theme | null
  /** Keyed by `nodeId` or `nodeId:part`. */
  overrides: Record<string, MaterialSpec>
}

export class ThemeManager {
  readonly materials = new MaterialFactory()
  private themes = new Map<string, Theme>()
  private activeId: string | null = null
  private overrides: Record<string, MaterialSpec> = {}
  private listeners = new Set<() => void>()
  private snapshot: ThemeManagerState = { themes: [], activeId: null, active: null, overrides: {} }

  constructor(themes: Theme[] = [], activeId: string | null = null) {
    for (const theme of themes) this.themes.set(theme.id, theme)
    if (activeId && this.themes.has(activeId)) this.activeId = activeId
    this.publish()
  }

  getState = (): ThemeManagerState => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  get(id: string): Theme | undefined {
    return this.themes.get(id)
  }

  /** Adds (or replaces) a theme. Returns it so callers can activate it. */
  register(theme: Theme): Theme {
    this.themes.set(theme.id, theme)
    this.publish()
    return theme
  }

  unregister(id: string): void {
    if (!this.themes.delete(id)) return
    if (this.activeId === id) this.activeId = null
    this.publish()
  }

  /** `null` restores the app's default, theme-less appearance. */
  setActive(id: string | null): void {
    if (id !== null && !this.themes.has(id)) return
    if (this.activeId === id) return
    this.activeId = id
    this.publish()
  }

  setOverride(key: string, spec: MaterialSpec | null): void {
    if (spec === null) {
      if (!(key in this.overrides)) return
      const { [key]: _removed, ...rest } = this.overrides
      this.overrides = rest
    } else {
      this.overrides = { ...this.overrides, [key]: spec }
    }
    this.publish()
  }

  clearOverrides(): void {
    if (Object.keys(this.overrides).length === 0) return
    this.overrides = {}
    this.publish()
  }

  dispose(): void {
    this.materials.dispose()
    this.listeners.clear()
  }

  private publish(): void {
    this.snapshot = {
      themes: [...this.themes.values()],
      activeId: this.activeId,
      active: this.activeId ? (this.themes.get(this.activeId) ?? null) : null,
      overrides: this.overrides,
    }
    for (const listener of this.listeners) listener()
  }
}
