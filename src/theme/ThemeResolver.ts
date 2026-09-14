import type { RoomNode, SceneNode } from '../types/sceneGraph'
import { isFurniture, isOpening, isRoom, isWall } from '../types/sceneGraph'
import type { MaterialSpec, ResolvedMaterialSpec, RoleValue, Theme } from '../types/theme'

/**
 * Turns `scene node (+ sub-part) + active theme` into a material spec.
 *
 * Precedence, highest first:
 *   1. user override        — `overrides[nodeId]` / `overrides[nodeId:part]`
 *   2. node theme role      — `node.themeRole`
 *   3. room rule            — `theme.rooms[roomType | roomId]`
 *   4. node type default    — `theme.nodeTypes[node.type]`, then the role
 *                             inferred from the node's type
 *   5. default material     — `theme.fallback`, then the caller's fallback
 *                             (the app's original hard-coded appearance)
 *
 * At every stage the `<key>.<part>` variant is tried before the bare key, so a
 * theme can style a door panel and its frame differently.
 */

export type ResolutionSource = 'override' | 'themeRole' | 'room' | 'nodeType' | 'default'

/** Element category of a node, used as the key of room rules. */
export type NodeCategory = 'floor' | 'wall' | 'door' | 'window' | 'furniture'

export interface ResolveInput {
  theme: Theme | null
  node: SceneNode
  /** Sub-element of the node, e.g. `frame`, `glass`, `panel`, `legs`. */
  part?: string
  /** Semantic role the calling component suggests for this part. */
  role?: string
  /**
   * Whether a part may use the material of its node when the theme has no
   * entry for the part itself (table legs inherit the table, a window pane
   * does not inherit the window frame). Defaults to `true`.
   */
  inherit?: boolean
  /** Room the node sits in; enables room rules. */
  room?: RoomNode | null
  /** User overrides, keyed by `nodeId` or `nodeId:part`. */
  overrides?: Record<string, MaterialSpec>
  /** Appearance to use when the theme says nothing (the pre-theme look). */
  fallback: ResolvedMaterialSpec
  /** Live view state (selection, wall opacity); wins over the theme. */
  runtime?: ResolvedMaterialSpec
}

export interface Resolution {
  spec: ResolvedMaterialSpec
  source: ResolutionSource
  /** Role or material name that matched, for debugging and the inspector. */
  matched?: string
}

export function nodeCategory(node: SceneNode): NodeCategory {
  if (isRoom(node)) return 'floor'
  if (isWall(node)) return 'wall'
  if (isOpening(node)) return node.type
  return 'furniture'
}

/** The role a node gets when it does not carry an explicit `themeRole`. */
export function inferThemeRole(node: SceneNode): string {
  if (isRoom(node)) return `floor.${node.type}`
  if (isWall(node)) return 'wall.primary'
  if (isOpening(node)) return `${node.type}.default`
  if (isFurniture(node)) return `furniture.${node.type}`
  return 'default'
}

/** `$wall` → `theme.palette.wall`. Plain colours pass through unchanged. */
export function resolveColorToken(theme: Theme, value: string): string | undefined {
  if (!value.startsWith('$')) return value
  return theme.palette[value.slice(1)]
}

const definedEntries = (spec: MaterialSpec): ResolvedMaterialSpec =>
  Object.fromEntries(
    Object.entries(spec).filter(([key, value]) => key !== 'extends' && value !== undefined),
  )

function withTokens(theme: Theme, spec: ResolvedMaterialSpec): ResolvedMaterialSpec {
  const out = { ...spec }
  for (const key of ['color', 'emissive'] as const) {
    const value = out[key]
    if (value === undefined) continue
    const resolved = resolveColorToken(theme, value)
    if (resolved === undefined) delete out[key]
    else out[key] = resolved
  }
  return out
}

/** Expands `extends` chains and palette tokens into a flat spec. */
function expand(theme: Theme, spec: MaterialSpec, seen: Set<string>): ResolvedMaterialSpec {
  const base =
    spec.extends && !seen.has(spec.extends) ? (lookup(theme, spec.extends, seen) ?? {}) : {}
  return withTokens(theme, { ...base, ...definedEntries(spec) })
}

/** Resolves a role name / material name / inline material to a spec. */
function lookup(theme: Theme, value: RoleValue, seen: Set<string>): ResolvedMaterialSpec | null {
  if (typeof value !== 'string') return expand(theme, value, seen)
  if (seen.has(value)) return null
  seen.add(value)
  const material = theme.materials[value]
  if (material) return expand(theme, material, seen)
  const role = theme.roles[value]
  if (role !== undefined) return lookup(theme, role, seen)
  return null
}

/** Tries every `<key>.<part>` before falling back to the bare keys. */
function pick(
  theme: Theme,
  table: Record<string, RoleValue>,
  keys: (string | undefined)[],
  part: string | undefined,
  inherit: boolean,
): { spec: ResolvedMaterialSpec; matched: string } | null {
  const present = keys.filter((key): key is string => Boolean(key))
  const candidates = part
    ? [...present.map((key) => `${key}.${part}`), ...(inherit ? present : [])]
    : present
  for (const key of candidates) {
    const value = table[key]
    if (value === undefined) continue
    const spec = lookup(theme, value, new Set())
    if (spec) return { spec, matched: key }
  }
  return null
}

export function resolveMaterial(input: ResolveInput): Resolution {
  const { theme, node, part, role, room, overrides, fallback, runtime } = input
  const inherit = input.inherit ?? true
  const override = overrides?.[part ? `${node.id}:${part}` : node.id]

  const finish = (
    spec: ResolvedMaterialSpec,
    source: ResolutionSource,
    matched?: string,
  ): Resolution => ({
    spec: { ...fallback, ...spec, ...runtime, ...(override ? definedEntries(override) : {}) },
    source: override ? 'override' : source,
    matched,
  })

  if (!theme) return finish({}, 'default')

  const category = nodeCategory(node)

  if (node.themeRole) {
    const hit = pick(theme, theme.roles, [node.themeRole], part, inherit)
    if (hit) return finish(hit.spec, 'themeRole', hit.matched)
  }

  if (room) {
    const rule = theme.rooms[room.id] ?? theme.rooms[room.type]
    if (rule?.materials) {
      const hit = pick(theme, rule.materials, [category, node.type], part, inherit)
      if (hit) return finish(hit.spec, 'room', `${room.type}/${hit.matched}`)
    }
  }

  const byType = pick(theme, theme.nodeTypes, [node.type], part, inherit)
  if (byType) return finish(byType.spec, 'nodeType', byType.matched)

  const byRole = pick(
    theme,
    theme.roles,
    [role, inferThemeRole(node), `${category}.default`, category],
    part,
    inherit,
  )
  if (byRole) return finish(byRole.spec, 'nodeType', byRole.matched)

  if (theme.fallback) {
    const spec = lookup(theme, theme.fallback, new Set())
    if (spec) return finish(spec, 'default', 'fallback')
  }

  return finish({}, 'default')
}

/** Role names a theme exposes, for pickers in the UI. */
export function themeRoleNames(theme: Theme | null): string[] {
  return theme ? Object.keys(theme.roles).sort() : []
}
