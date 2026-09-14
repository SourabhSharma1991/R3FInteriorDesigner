import { useContext, useMemo } from 'react'
import type * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import type { RoomNode, SceneNode } from '../types/sceneGraph'
import { isRoom } from '../types/sceneGraph'
import type { ResolvedMaterialSpec, Theme, View2DSettings, View3DSettings } from '../types/theme'
import { MaterialFactory } from './MaterialFactory'
import { ThemeContext } from './ThemeContext'
import type { ThemeContextValue } from './ThemeContext'
import { resolveMaterial } from './ThemeResolver'
import type { Resolution } from './ThemeResolver'

export function useThemeContext(): ThemeContextValue | null {
  return useContext(ThemeContext)
}

export function useActiveTheme(): Theme | null {
  return useContext(ThemeContext)?.active ?? null
}

/** Rooms of the current graph, cached per nodes array. */
const roomCache = new WeakMap<SceneNode[], RoomNode[]>()

function roomsOf(nodes: SceneNode[]): RoomNode[] {
  const cached = roomCache.get(nodes)
  if (cached) return cached
  const rooms = nodes.filter(isRoom)
  roomCache.set(nodes, rooms)
  return rooms
}

function pointInPolygon(point: { x: number; z: number }, polygon: RoomNode['polygon']): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const straddles = a.z > point.z !== b.z > point.z
    if (straddles && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside
    }
  }
  return inside
}

/**
 * Room a node belongs to, for room rules. Read-only geometry lookup — it never
 * changes the scene graph.
 */
export function findRoomForNode(rooms: RoomNode[], node: SceneNode): RoomNode | null {
  if (isRoom(node)) return node
  const point =
    node.role === 'wall'
      ? { x: (node.start.x + node.end.x) / 2, z: (node.start.z + node.end.z) / 2 }
      : node.position
  return rooms.find((room) => pointInPolygon(point, room.polygon)) ?? null
}

export function useRoomForNode(node: SceneNode): RoomNode | null {
  const nodes = useSceneStore((s) => s.graph.nodes)
  return useMemo(() => findRoomForNode(roomsOf(nodes), node), [nodes, node])
}

export interface ThemedMaterialOptions {
  /** Sub-element of the node, e.g. `frame`, `glass`, `panel`, `legs`. */
  part?: string
  /** Semantic role this part defaults to, e.g. `window.glass`. */
  role?: string
  /** Whether the part may reuse its node's material; see the resolver. */
  inherit?: boolean
  /** Appearance used when no theme is active or the theme is silent. */
  fallback: ResolvedMaterialSpec
  /** Live view state (selection highlight, wall opacity); wins over the theme. */
  runtime?: ResolvedMaterialSpec
}

/** Resolved spec for a node/part, without building a material. */
export function useResolvedMaterial(node: SceneNode, options: ThemedMaterialOptions): Resolution {
  const theme = useActiveTheme()
  const overrides = useThemeContext()?.overrides
  const room = useRoomForNode(node)
  const { part, role, inherit, fallback, runtime } = options
  return resolveMaterial({ theme, node, part, role, inherit, room, overrides, fallback, runtime })
}

/**
 * Cached Three.js material for a node/part under the active theme. Identical
 * specs share one material instance, so a theme switch rebuilds no geometry
 * and allocates at most one material per distinct appearance.
 */
export function useThemedMaterial(node: SceneNode, options: ThemedMaterialOptions): THREE.Material {
  const context = useThemeContext()
  const { spec } = useResolvedMaterial(node, options)
  return (context?.manager.materials ?? standaloneFactory).get(spec)
}

/** Meshes rendered outside a ThemeProvider still get cached materials. */
const standaloneFactory = new MaterialFactory()

export function useView3D(): View3DSettings {
  return useActiveTheme()?.view3D ?? {}
}

export function useView2D(): View2DSettings {
  return useActiveTheme()?.view2D ?? {}
}

/** Theme selection colour, falling back to the app's original highlight. */
export function useSelectionColor(fallback: string): string {
  return useActiveTheme()?.palette.selection ?? fallback
}
