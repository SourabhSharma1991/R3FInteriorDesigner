import { FURNITURE_CATALOG, makeFurniture, roomColor } from '../lib/palette'
import {
  isRectangular,
  polygonArea,
  polygonBBox,
  rectPolygon,
  round,
} from '../lib/sceneGraph'
import { useSceneStore, useSelectedNode } from '../store/sceneStore'
import type {
  FurnitureNode,
  OpeningNode,
  RoomNode,
  SceneNode,
  WallNode,
} from '../types/sceneGraph'
import { isFurniture, isOpening, isRoom, isWall } from '../types/sceneGraph'
import { ColorField, NumberField, SelectField, TextField } from './fields'

const ROOM_TYPES = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'dining',
  'lobby',
  'balcony',
  'sitout',
  'store',
]

function RoomInspector({ room }: { room: RoomNode }) {
  const updateNode = useSceneStore((s) => s.updateNode)
  const addNode = useSceneStore((s) => s.addNode)
  const patch = (p: Partial<RoomNode>) => updateNode(room.id, p as Partial<SceneNode>)
  const bbox = polygonBBox(room.polygon)
  const rectangular = isRectangular(room.polygon)

  const resize = (key: 'x' | 'z' | 'w' | 'd', value: number) => {
    const next = { ...bbox, [key]: key === 'w' || key === 'd' ? Math.max(0.2, value) : value }
    patch({
      polygon: rectPolygon(next),
      dimensions: { ...room.dimensions, width_m: round(next.w), depth_m: round(next.d) },
    })
  }

  return (
    <>
      <TextField label="Label" value={room.label} onChange={(label) => patch({ label })} />
      <SelectField
        label="Type"
        value={room.type}
        options={ROOM_TYPES.includes(room.type) ? ROOM_TYPES : [room.type, ...ROOM_TYPES]}
        onChange={(type) => patch({ type })}
      />
      <ColorField
        label="Floor colour"
        value={roomColor(room.type, room.color)}
        onChange={(color) => patch({ color })}
      />
      <NumberField label="Floor level (m)" value={room.floor_y} onChange={(floor_y) => patch({ floor_y })} />
      {rectangular ? (
        <>
          <NumberField label="Origin X (m)" value={round(bbox.x)} onChange={(v) => resize('x', v)} />
          <NumberField label="Origin Z (m)" value={round(bbox.z)} onChange={(v) => resize('z', v)} />
          <NumberField label="Width (m)" value={round(bbox.w)} min={0.2} onChange={(v) => resize('w', v)} />
          <NumberField label="Depth (m)" value={round(bbox.d)} min={0.2} onChange={(v) => resize('d', v)} />
        </>
      ) : (
        <p className="hint">
          Non-rectangular outline ({room.polygon.length} points) — drag it in the viewport to move it.
        </p>
      )}
      <p className="hint">Floor area: {polygonArea(room.polygon).toFixed(2)} m²</p>

      <h4>Add furniture to this room</h4>
      <div className="catalog">
        {FURNITURE_CATALOG.map((template) => (
          <button
            key={template.type}
            type="button"
            onClick={() => addNode(makeFurniture(template, room.centroid, room.floor_y))}
          >
            {template.label}
          </button>
        ))}
      </div>
    </>
  )
}

function WallInspector({ wall }: { wall: WallNode }) {
  const updateNode = useSceneStore((s) => s.updateNode)
  const patch = (p: Partial<WallNode>) => updateNode(wall.id, p as Partial<SceneNode>)
  return (
    <>
      <NumberField label="Start X (m)" value={wall.start.x} onChange={(x) => patch({ start: { ...wall.start, x } })} />
      <NumberField label="Start Z (m)" value={wall.start.z} onChange={(z) => patch({ start: { ...wall.start, z } })} />
      <NumberField label="End X (m)" value={wall.end.x} onChange={(x) => patch({ end: { ...wall.end, x } })} />
      <NumberField label="End Z (m)" value={wall.end.z} onChange={(z) => patch({ end: { ...wall.end, z } })} />
      <NumberField label="Height (m)" value={wall.height} min={0.1} onChange={(height) => patch({ height })} />
      <NumberField
        label="Thickness (m)"
        value={wall.thickness}
        step={0.01}
        min={0.02}
        onChange={(thickness) => patch({ thickness })}
      />
      <p className="hint">Length: {wall.length_m.toFixed(3)} m</p>
    </>
  )
}

function OpeningInspector({ opening }: { opening: OpeningNode }) {
  const updateNode = useSceneStore((s) => s.updateNode)
  const patch = (p: Partial<OpeningNode>) => updateNode(opening.id, p as Partial<SceneNode>)
  return (
    <>
      <TextField label="Label" value={opening.label} onChange={(label) => patch({ label })} />
      <SelectField
        label="Kind"
        value={opening.type}
        options={['door', 'window']}
        onChange={(type) => patch({ type: type as OpeningNode['type'] })}
      />
      <NumberField label="X (m)" value={opening.position.x} onChange={(x) => patch({ position: { ...opening.position, x } })} />
      <NumberField label="Z (m)" value={opening.position.z} onChange={(z) => patch({ position: { ...opening.position, z } })} />
      <NumberField label="Width (m)" value={opening.width_m} min={0.2} onChange={(width_m) => patch({ width_m })} />
      <NumberField label="Height (m)" value={opening.height_m} min={0.2} onChange={(height_m) => patch({ height_m })} />
      <NumberField label="Sill height (m)" value={opening.sill_height} onChange={(sill_height) => patch({ sill_height })} />
      <p className="hint">The opening is carved out of the nearest wall automatically.</p>
    </>
  )
}

function FurnitureInspector({ item }: { item: FurnitureNode }) {
  const updateNode = useSceneStore((s) => s.updateNode)
  const patch = (p: Partial<FurnitureNode>) => updateNode(item.id, p as Partial<SceneNode>)
  return (
    <>
      <TextField label="Label" value={item.label} onChange={(label) => patch({ label })} />
      <NumberField label="X (m)" value={item.position.x} onChange={(x) => patch({ position: { ...item.position, x } })} />
      <NumberField label="Z (m)" value={item.position.z} onChange={(z) => patch({ position: { ...item.position, z } })} />
      <NumberField label="Rotation (°)" value={item.rotation_deg} step={5} onChange={(rotation_deg) => patch({ rotation_deg })} />
      <NumberField label="Width (m)" value={item.size.w} min={0.05} onChange={(w) => patch({ size: { ...item.size, w } })} />
      <NumberField label="Depth (m)" value={item.size.d} min={0.05} onChange={(d) => patch({ size: { ...item.size, d } })} />
      <NumberField label="Height (m)" value={item.size.h} min={0.05} onChange={(h) => patch({ size: { ...item.size, h } })} />
      <ColorField label="Colour" value={item.color} onChange={(color) => patch({ color })} />
    </>
  )
}

export function Inspector() {
  const node = useSelectedNode()
  const deleteNode = useSceneStore((s) => s.deleteNode)
  const duplicateNode = useSceneStore((s) => s.duplicateNode)
  const transformMode = useSceneStore((s) => s.transformMode)
  const setTransformMode = useSceneStore((s) => s.setTransformMode)

  if (!node) {
    return (
      <aside className="panel inspector">
        <h3>Inspector</h3>
        <p className="hint">
          Select a room, wall, door or furniture item — in the viewport or in the outliner — to edit it.
        </p>
      </aside>
    )
  }

  return (
    <aside className="panel inspector">
      <h3>
        {node.role} · <span className="mono">{node.id}</span>
      </h3>
      {isFurniture(node) && (
        <div className="segmented">
          {(['translate', 'rotate'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={transformMode === mode ? 'active' : ''}
              onClick={() => setTransformMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      )}
      {isRoom(node) && <RoomInspector room={node} />}
      {isWall(node) && <WallInspector wall={node} />}
      {isOpening(node) && <OpeningInspector opening={node} />}
      {isFurniture(node) && <FurnitureInspector item={node} />}
      <div className="row">
        <button type="button" onClick={() => duplicateNode(node.id)}>
          Duplicate
        </button>
        <button type="button" className="danger" onClick={() => deleteNode(node.id)}>
          Delete
        </button>
      </div>
    </aside>
  )
}
