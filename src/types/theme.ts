/**
 * Theme schema. A theme says *how things look*; it never says what exists or
 * where it is — that stays in the scene graph.
 */

export type MaterialKind = 'standard' | 'physical' | 'basic' | 'lambert'

/** Three.js material properties. Colours may be a palette token (`$wall`). */
export interface MaterialSpec {
  kind?: MaterialKind
  color?: string
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
  emissive?: string
  emissiveIntensity?: number
  side?: 'front' | 'back' | 'double'
  flatShading?: boolean
  depthWrite?: boolean
  clearcoat?: number
  clearcoatRoughness?: number
  /** Inherit another entry of `theme.materials` and override a few fields. */
  extends?: string
}

/** A role either points at a named material or inlines one. */
export type RoleValue = string | MaterialSpec

/**
 * Room-specific styling. Keys are element categories (`floor`, `wall`,
 * `furniture`, `door`, `window`) or `<category>.<part>` pairs, mapped to a
 * role name or an inline material.
 */
export interface RoomRule {
  materials?: Record<string, RoleValue>
}

export interface LightSpec {
  color?: string
  intensity?: number
  position?: [number, number, number]
  /** Second colour of a hemisphere light. */
  groundColor?: string
}

export interface View3DSettings {
  background?: string
  shadows?: boolean
  ambient?: LightSpec
  hemisphere?: LightSpec
  directional?: LightSpec[]
  grid?: { cellColor?: string; sectionColor?: string }
}

export interface View2DSettings {
  background?: string
  /** Flat top-down look: lights are flattened towards ambient. */
  ambient?: LightSpec
  grid?: { cellColor?: string; sectionColor?: string }
  /** Wall opacity applied on top of the user's slider, 0–1. */
  wallOpacity?: number
}

export interface Theme {
  id: string
  name: string
  description?: string
  palette: Record<string, string>
  materials: Record<string, MaterialSpec>
  /** Semantic role → material, e.g. `wall.primary` → `wall`. */
  roles: Record<string, RoleValue>
  /** `node.type` → role, used when a node carries no `themeRole`. */
  nodeTypes: Record<string, RoleValue>
  /** Room type or room id → styling for the things inside that room. */
  rooms: Record<string, RoomRule>
  view2D: View2DSettings
  view3D: View3DSettings
  /** Role used when nothing else matches; defaults to the built-in look. */
  fallback?: RoleValue
}

/** A spec with every token resolved and ready for the material factory. */
export type ResolvedMaterialSpec = Omit<MaterialSpec, 'extends'>
