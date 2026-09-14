import { useSceneStore } from '../store/sceneStore'
import { inferThemeRole, themeRoleNames } from '../theme/ThemeResolver'
import { useActiveTheme, useResolvedMaterial, useThemeContext } from '../theme/useTheme'
import type { SceneNode } from '../types/sceneGraph'
import { ColorField, SelectField } from './fields'

/**
 * Appearance of the selected node: the semantic role stored on the node (part
 * of the scene graph) and the user colour override (part of the theme layer).
 */
export function AppearanceSection({ node }: { node: SceneNode }) {
  const context = useThemeContext()
  const theme = useActiveTheme()
  const updateNode = useSceneStore((s) => s.updateNode)
  const resolution = useResolvedMaterial(node, { fallback: {} })
  const override = context?.overrides[node.id]
  const inferred = inferThemeRole(node)

  if (!context) return null

  return (
    <>
      <h4>Appearance</h4>
      {theme ? (
        <SelectField
          label="Theme role"
          value={node.themeRole ?? ''}
          options={['', ...themeRoleNames(theme)]}
          onChange={(themeRole) => updateNode(node.id, { themeRole: themeRole || undefined })}
        />
      ) : (
        <p className="hint">No theme active — the node keeps its own colours.</p>
      )}
      <ColorField
        label="Override colour"
        value={override?.color ?? resolution.spec.color ?? '#ffffff'}
        onChange={(color) => context.setOverride(node.id, { ...override, color })}
      />
      <div className="row">
        <button
          type="button"
          disabled={!override}
          onClick={() => context.setOverride(node.id, null)}
        >
          Clear override
        </button>
      </div>
      <p className="hint">
        Resolved from <strong>{resolution.source}</strong>
        {resolution.matched ? ` · ${resolution.matched}` : ''} · inferred role{' '}
        <span className="mono">{inferred}</span>
      </p>
    </>
  )
}
