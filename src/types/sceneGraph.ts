export interface Vec2 {
  x: number
  z: number
}

export interface BBox {
  x: number
  z: number
  w: number
  d: number
}

export interface RoomNode {
  id: string
  role: 'room'
  type: string
  label: string
  polygon: Vec2[]
  bbox: BBox
  centroid: Vec2
  dimensions: { width_m: number; depth_m: number; label?: string }
  floor_y: number
  color?: string
}

export interface WallNode {
  id: string
  role: 'wall'
  type: 'wall'
  label?: string
  start: Vec2
  end: Vec2
  height: number
  thickness: number
  length_m: number
}

export interface OpeningNode {
  id: string
  role: 'opening'
  type: 'door' | 'window'
  label: string
  position: Vec2
  width_m: number
  height_m: number
  sill_height: number
}

/**
 * Furniture is an extension of the floor-plan schema: the importer never
 * requires it, the exporter always round-trips it.
 */
export interface FurnitureNode {
  id: string
  role: 'furniture'
  type: string
  label: string
  position: Vec2
  rotation_deg: number
  size: { w: number; d: number; h: number }
  color: string
  floor_y: number
}

export type SceneNode = RoomNode | WallNode | OpeningNode | FurnitureNode
export type NodeRole = SceneNode['role']

export interface SceneGraph {
  version: string
  units: string
  origin?: string
  scale_px_per_m?: number
  image_size?: { w: number; h: number }
  source?: string
  building: { name: string; total_carpet_area_sqm?: number }
  nodes: SceneNode[]
  summary?: Record<string, number>
}

export const isRoom = (n: SceneNode): n is RoomNode => n.role === 'room'
export const isWall = (n: SceneNode): n is WallNode => n.role === 'wall'
export const isOpening = (n: SceneNode): n is OpeningNode => n.role === 'opening'
export const isFurniture = (n: SceneNode): n is FurnitureNode => n.role === 'furniture'
