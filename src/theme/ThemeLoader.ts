import type {
  LightSpec,
  MaterialKind,
  MaterialSpec,
  RoleValue,
  RoomRule,
  Theme,
  View2DSettings,
  View3DSettings,
} from '../types/theme'

/**
 * Parses and validates theme JSON. Everything except `id` is optional, so a
 * theme can style only the parts it cares about and inherit the rest.
 */

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function fail(message: string): never {
  throw new Error(`Theme: ${message}`)
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined
const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)

const KINDS: MaterialKind[] = ['standard', 'physical', 'basic', 'lambert']
const SIDES = ['front', 'back', 'double'] as const

function readMaterial(raw: unknown, where: string): MaterialSpec {
  if (!isObj(raw)) fail(`${where}: expected a material object`)
  const kind = str(raw.kind)
  if (kind && !KINDS.includes(kind as MaterialKind)) {
    fail(`${where}.kind: expected one of ${KINDS.join(', ')}`)
  }
  const side = str(raw.side)
  if (side && !SIDES.includes(side as (typeof SIDES)[number])) {
    fail(`${where}.side: expected one of ${SIDES.join(', ')}`)
  }
  return {
    kind: kind as MaterialKind | undefined,
    color: str(raw.color),
    roughness: num(raw.roughness),
    metalness: num(raw.metalness),
    opacity: num(raw.opacity),
    transparent: bool(raw.transparent),
    emissive: str(raw.emissive),
    emissiveIntensity: num(raw.emissiveIntensity),
    side: side as MaterialSpec['side'],
    flatShading: bool(raw.flatShading),
    depthWrite: bool(raw.depthWrite),
    clearcoat: num(raw.clearcoat),
    clearcoatRoughness: num(raw.clearcoatRoughness),
    extends: str(raw.extends),
  }
}

function readRoleValue(raw: unknown, where: string): RoleValue {
  const name = str(raw)
  return name ?? readMaterial(raw, where)
}

function readRecord<T>(raw: unknown, where: string, read: (v: unknown, w: string) => T) {
  if (raw === undefined) return {} as Record<string, T>
  if (!isObj(raw)) fail(`${where}: expected an object`)
  const out: Record<string, T> = {}
  for (const [key, value] of Object.entries(raw)) out[key] = read(value, `${where}.${key}`)
  return out
}

function readLight(raw: unknown, where: string): LightSpec | undefined {
  if (raw === undefined) return undefined
  if (!isObj(raw)) fail(`${where}: expected a light object`)
  const position = Array.isArray(raw.position) && raw.position.length === 3
    ? (raw.position.map((v) => num(v) ?? 0) as [number, number, number])
    : undefined
  return {
    color: str(raw.color),
    intensity: num(raw.intensity),
    position,
    groundColor: str(raw.groundColor),
  }
}

function readGrid(raw: unknown) {
  if (!isObj(raw)) return undefined
  return { cellColor: str(raw.cellColor), sectionColor: str(raw.sectionColor) }
}

function readView3D(raw: unknown): View3DSettings {
  if (!isObj(raw)) return {}
  const directional = Array.isArray(raw.directional)
    ? raw.directional
        .map((light, i) => readLight(light, `view3D.directional[${i}]`))
        .filter((light): light is LightSpec => light !== undefined)
    : undefined
  return {
    background: str(raw.background),
    shadows: bool(raw.shadows),
    ambient: readLight(raw.ambient, 'view3D.ambient'),
    hemisphere: readLight(raw.hemisphere, 'view3D.hemisphere'),
    directional,
    grid: readGrid(raw.grid),
  }
}

function readView2D(raw: unknown): View2DSettings {
  if (!isObj(raw)) return {}
  return {
    background: str(raw.background),
    ambient: readLight(raw.ambient, 'view2D.ambient'),
    grid: readGrid(raw.grid),
    wallOpacity: num(raw.wallOpacity),
  }
}

function readRoomRule(raw: unknown, where: string): RoomRule {
  if (!isObj(raw)) fail(`${where}: expected a room rule object`)
  return { materials: readRecord(raw.materials, `${where}.materials`, readRoleValue) }
}

export function parseTheme(raw: unknown): Theme {
  if (!isObj(raw)) fail('expected a JSON object')
  const id = str(raw.id) ?? fail('missing "id"')
  const theme: Theme = {
    id,
    name: str(raw.name) ?? id,
    description: str(raw.description),
    palette: readRecord(raw.palette, 'palette', (v, w) => str(v) ?? fail(`${w}: expected a colour`)),
    materials: readRecord(raw.materials, 'materials', readMaterial),
    roles: readRecord(raw.roles, 'roles', readRoleValue),
    nodeTypes: readRecord(raw.nodeTypes, 'nodeTypes', readRoleValue),
    rooms: readRecord(raw.rooms, 'rooms', readRoomRule),
    view2D: readView2D(raw.view2D),
    view3D: readView3D(raw.view3D),
    fallback: raw.fallback === undefined ? undefined : readRoleValue(raw.fallback, 'fallback'),
  }
  return theme
}

/** Reads a theme from a `File` (the "import theme" button). */
export async function loadThemeFile(file: File): Promise<Theme> {
  return parseTheme(JSON.parse(await file.text()))
}

/** Reads a theme from a URL (e.g. a theme served from `public/`). */
export async function loadThemeUrl(url: string): Promise<Theme> {
  const response = await fetch(url)
  if (!response.ok) fail(`${url} responded ${response.status}`)
  return parseTheme(await response.json())
}
