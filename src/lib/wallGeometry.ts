import type { OpeningNode, Vec2, WallNode } from '../types/sceneGraph'

export interface WallPiece {
  /** Offset from the wall midpoint, in wall-local coordinates rotated to world. */
  center: [number, number, number]
  size: [number, number, number]
}

export interface WallLayout {
  /** Rotation around Y that aligns a box' local X axis with the wall direction. */
  rotationY: number
  length: number
  pieces: WallPiece[]
  /** Openings that were resolved onto this wall, with their offset along it. */
  hostedOpenings: { opening: OpeningNode; t: number }[]
}

const EPS = 1e-4

function projectOnWall(wall: WallNode, p: Vec2) {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const length = Math.hypot(dx, dz) || EPS
  const ux = dx / length
  const uz = dz / length
  const rx = p.x - wall.start.x
  const rz = p.z - wall.start.z
  return { t: rx * ux + rz * uz, perp: Math.abs(rx * uz - rz * ux), length }
}

/**
 * Finds the wall each opening belongs to: the closest wall whose axis passes
 * through the opening position and that is long enough to host it.
 */
export function assignOpenings(
  walls: WallNode[],
  openings: OpeningNode[],
): Map<string, { opening: OpeningNode; t: number }[]> {
  const byWall = new Map<string, { opening: OpeningNode; t: number }[]>()
  for (const opening of openings) {
    let best: { wall: WallNode; t: number; perp: number } | null = null
    for (const wall of walls) {
      const { t, perp, length } = projectOnWall(wall, opening.position)
      const margin = opening.width_m / 2
      if (t < -margin || t > length + margin) continue
      if (perp > wall.thickness / 2 + 0.25) continue
      if (!best || perp < best.perp) best = { wall, t, perp }
    }
    if (!best) continue
    const list = byWall.get(best.wall.id) ?? []
    list.push({ opening, t: best.t })
    byWall.set(best.wall.id, list)
  }
  return byWall
}

/**
 * Splits a wall into solid boxes, carving out every hosted opening and keeping
 * the lintel above it (and the sill below, for windows).
 */
export function buildWallLayout(
  wall: WallNode,
  hosted: { opening: OpeningNode; t: number }[] = [],
): WallLayout {
  const dx = wall.end.x - wall.start.x
  const dz = wall.end.z - wall.start.z
  const length = Math.hypot(dx, dz)
  const rotationY = Math.atan2(-dz, dx)
  const half = length / 2
  const pieces: WallPiece[] = []

  const holes = hosted
    .map(({ opening, t }) => ({
      opening,
      from: Math.max(0, t - opening.width_m / 2),
      to: Math.min(length, t + opening.width_m / 2),
    }))
    .filter((h) => h.to - h.from > EPS)
    .sort((a, b) => a.from - b.from)

  const push = (from: number, to: number, yFrom: number, yTo: number) => {
    const w = to - from
    const h = yTo - yFrom
    if (w <= 0.01 || h <= 0.01) return
    pieces.push({
      center: [(from + to) / 2 - half, (yFrom + yTo) / 2, 0],
      size: [w, h, wall.thickness],
    })
  }

  let cursor = 0
  for (const hole of holes) {
    if (hole.from > cursor) push(cursor, hole.from, 0, wall.height)
    const head = Math.min(wall.height, hole.opening.sill_height + hole.opening.height_m)
    if (hole.opening.sill_height > 0.01) push(hole.from, hole.to, 0, hole.opening.sill_height)
    if (head < wall.height) push(hole.from, hole.to, head, wall.height)
    cursor = Math.max(cursor, hole.to)
  }
  if (cursor < length) push(cursor, length, 0, wall.height)

  return { rotationY, length, pieces, hostedOpenings: hosted }
}

export function wallMidpoint(wall: WallNode): Vec2 {
  return { x: (wall.start.x + wall.end.x) / 2, z: (wall.start.z + wall.end.z) / 2 }
}
