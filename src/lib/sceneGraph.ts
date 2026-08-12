import type {
  BBox,
  FurnitureNode,
  OpeningNode,
  RoomNode,
  SceneGraph,
  SceneNode,
  Vec2,
  WallNode,
} from '../types/sceneGraph'
import { isFurniture, isOpening, isRoom, isWall } from '../types/sceneGraph'

export function uid(prefix = 'n'): string {
  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`
}

export function polygonBBox(polygon: Vec2[]): BBox {
  const xs = polygon.map((p) => p.x)
  const zs = polygon.map((p) => p.z)
  const x = Math.min(...xs)
  const z = Math.min(...zs)
  return { x, z, w: Math.max(...xs) - x, d: Math.max(...zs) - z }
}

/** Signed area of the polygon, in square meters. */
export function polygonArea(polygon: Vec2[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.z - b.x * a.z
  }
  return Math.abs(sum) / 2
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  let cx = 0
  let cz = 0
  let a2 = 0
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.z - b.x * a.z
    a2 += cross
    cx += (a.x + b.x) * cross
    cz += (a.z + b.z) * cross
  }
  if (Math.abs(a2) < 1e-9) {
    const bbox = polygonBBox(polygon)
    return { x: bbox.x + bbox.w / 2, z: bbox.z + bbox.d / 2 }
  }
  return { x: cx / (3 * a2), z: cz / (3 * a2) }
}

export function rectPolygon(bbox: BBox): Vec2[] {
  return [
    { x: bbox.x, z: bbox.z },
    { x: bbox.x + bbox.w, z: bbox.z },
    { x: bbox.x + bbox.w, z: bbox.z + bbox.d },
    { x: bbox.x, z: bbox.z + bbox.d },
  ]
}

export function isRectangular(polygon: Vec2[]): boolean {
  if (polygon.length !== 4) return false
  const bbox = polygonBBox(polygon)
  return polygon.every(
    (p) =>
      (near(p.x, bbox.x) || near(p.x, bbox.x + bbox.w)) &&
      (near(p.z, bbox.z) || near(p.z, bbox.z + bbox.d)),
  )
}

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps

/** Keeps derived fields (bbox, centroid, length) consistent after an edit. */
export function normalizeNode(node: SceneNode): SceneNode {
  if (isRoom(node)) {
    const bbox = polygonBBox(node.polygon)
    return { ...node, bbox, centroid: polygonCentroid(node.polygon) }
  }
  if (isWall(node)) {
    return { ...node, length_m: round(distance(node.start, node.end), 3) }
  }
  return node
}

export const distance = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.z - a.z)
export const round = (v: number, digits = 3) => Number(v.toFixed(digits))

export function anchorOf(node: SceneNode): Vec2 {
  if (isRoom(node)) return node.centroid
  if (isWall(node)) return { x: (node.start.x + node.end.x) / 2, z: (node.start.z + node.end.z) / 2 }
  return node.position
}

/** Translates a node in the ground plane, keeping derived fields in sync. */
export function translateNode(node: SceneNode, dx: number, dz: number): SceneNode {
  const shift = (p: Vec2): Vec2 => ({ x: round(p.x + dx), z: round(p.z + dz) })
  if (isRoom(node)) {
    return normalizeNode({ ...node, polygon: node.polygon.map(shift) })
  }
  if (isWall(node)) {
    return { ...node, start: shift(node.start), end: shift(node.end) }
  }
  return { ...node, position: shift(node.position) }
}

export function nodeTitle(node: SceneNode): string {
  if (isWall(node)) return node.label ?? `Wall ${node.length_m.toFixed(2)}m`
  return node.label || node.type
}

function fail(message: string): never {
  throw new Error(message)
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function readVec2(value: unknown, where: string): Vec2 {
  if (!isObj(value) || typeof value.x !== 'number' || typeof value.z !== 'number') {
    fail(`${where}: expected {x, z} numbers`)
  }
  return { x: value.x, z: value.z }
}

function readNumber(value: unknown, where: string, fallback?: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (fallback !== undefined) return fallback
  return fail(`${where}: expected a number`)
}

function parseNode(raw: unknown, index: number): SceneNode {
  const where = `nodes[${index}]`
  if (!isObj(raw)) fail(`${where}: expected an object`)
  const role = raw.role
  const id = typeof raw.id === 'string' && raw.id ? raw.id : uid()
  const type = typeof raw.type === 'string' ? raw.type : String(role ?? 'unknown')
  const label = typeof raw.label === 'string' ? raw.label : ''

  if (role === 'room') {
    if (!Array.isArray(raw.polygon) || raw.polygon.length < 3) {
      fail(`${where}: a room needs a polygon with at least 3 points`)
    }
    const polygon = raw.polygon.map((p, i) => readVec2(p, `${where}.polygon[${i}]`))
    const bbox = polygonBBox(polygon)
    const dims = isObj(raw.dimensions) ? raw.dimensions : {}
    const room: RoomNode = {
      id,
      role: 'room',
      type,
      label: label || type,
      polygon,
      bbox,
      centroid: polygonCentroid(polygon),
      dimensions: {
        width_m: readNumber(dims.width_m, `${where}.dimensions.width_m`, bbox.w),
        depth_m: readNumber(dims.depth_m, `${where}.dimensions.depth_m`, bbox.d),
        label: typeof dims.label === 'string' ? dims.label : undefined,
      },
      floor_y: readNumber(raw.floor_y, `${where}.floor_y`, 0),
      color: typeof raw.color === 'string' ? raw.color : undefined,
    }
    return room
  }

  if (role === 'wall') {
    const start = readVec2(raw.start, `${where}.start`)
    const end = readVec2(raw.end, `${where}.end`)
    const wall: WallNode = {
      id,
      role: 'wall',
      type: 'wall',
      label: typeof raw.label === 'string' ? raw.label : undefined,
      start,
      end,
      height: readNumber(raw.height, `${where}.height`, 2.8),
      thickness: readNumber(raw.thickness, `${where}.thickness`, 0.15),
      length_m: round(distance(start, end)),
    }
    return wall
  }

  if (role === 'opening') {
    const opening: OpeningNode = {
      id,
      role: 'opening',
      type: type === 'window' ? 'window' : 'door',
      label: label || type,
      position: readVec2(raw.position, `${where}.position`),
      width_m: readNumber(raw.width_m, `${where}.width_m`, 0.9),
      height_m: readNumber(raw.height_m, `${where}.height_m`, 2.1),
      sill_height: readNumber(raw.sill_height, `${where}.sill_height`, 0),
    }
    return opening
  }

  if (role === 'furniture') {
    const size = isObj(raw.size) ? raw.size : {}
    const furniture: FurnitureNode = {
      id,
      role: 'furniture',
      type,
      label: label || type,
      position: readVec2(raw.position, `${where}.position`),
      rotation_deg: readNumber(raw.rotation_deg, `${where}.rotation_deg`, 0),
      size: {
        w: readNumber(size.w, `${where}.size.w`, 1),
        d: readNumber(size.d, `${where}.size.d`, 1),
        h: readNumber(size.h, `${where}.size.h`, 1),
      },
      color: typeof raw.color === 'string' ? raw.color : '#a1887f',
      floor_y: readNumber(raw.floor_y, `${where}.floor_y`, 0),
    }
    return furniture
  }

  return fail(`${where}: unsupported role "${String(role)}"`)
}

/** Parses and validates an unknown value into a SceneGraph. Throws on invalid input. */
export function parseSceneGraph(raw: unknown): SceneGraph {
  if (!isObj(raw)) fail('Scene graph must be a JSON object')
  if (!Array.isArray(raw.nodes)) fail('Scene graph must have a "nodes" array')
  const building = isObj(raw.building) ? raw.building : {}
  return {
    version: typeof raw.version === 'string' ? raw.version : '1.0',
    units: typeof raw.units === 'string' ? raw.units : 'meters',
    origin: typeof raw.origin === 'string' ? raw.origin : undefined,
    scale_px_per_m:
      typeof raw.scale_px_per_m === 'number' ? raw.scale_px_per_m : undefined,
    image_size: isObj(raw.image_size)
      ? { w: Number(raw.image_size.w), h: Number(raw.image_size.h) }
      : undefined,
    source: typeof raw.source === 'string' ? raw.source : undefined,
    building: {
      name: typeof building.name === 'string' ? building.name : 'Untitled',
      total_carpet_area_sqm:
        typeof building.total_carpet_area_sqm === 'number'
          ? building.total_carpet_area_sqm
          : undefined,
    },
    nodes: raw.nodes.map(parseNode),
    summary: undefined,
  }
}

export function withSummary(graph: SceneGraph): SceneGraph {
  return {
    ...graph,
    summary: {
      rooms: graph.nodes.filter(isRoom).length,
      wall_segments: graph.nodes.filter(isWall).length,
      doors: graph.nodes.filter((n) => isOpening(n) && n.type === 'door').length,
      windows: graph.nodes.filter((n) => isOpening(n) && n.type === 'window').length,
      furniture: graph.nodes.filter(isFurniture).length,
    },
  }
}

export function serializeSceneGraph(graph: SceneGraph): string {
  return JSON.stringify(withSummary(graph), null, 2)
}
