import { useRef } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { loadThemeFile } from '../theme/ThemeLoader'
import { useThemeContext } from '../theme/useTheme'

/**
 * Switches the active theme. Only the appearance changes — the scene graph is
 * never touched, so switching cannot move or resize anything.
 */
export function ThemePicker() {
  const theme = useThemeContext()
  const fileInput = useRef<HTMLInputElement>(null)
  if (!theme) return null

  const importTheme = async (file: File) => {
    try {
      const loaded = await loadThemeFile(file)
      theme.registerTheme(loaded)
      theme.setActiveTheme(loaded.id)
    } catch (err) {
      useSceneStore.setState({ error: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <>
      <label className="check">
        Theme
        <select
          value={theme.activeId ?? ''}
          onChange={(e) => theme.setActiveTheme(e.target.value || null)}
        >
          <option value="">Default (no theme)</option>
          {theme.themes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => fileInput.current?.click()}>
        Import theme
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importTheme(file)
          e.target.value = ''
        }}
      />
    </>
  )
}
