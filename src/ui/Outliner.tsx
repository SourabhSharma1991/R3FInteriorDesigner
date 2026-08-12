import { useState } from 'react'
import { nodeTitle, rectPolygon, uid } from '../lib/sceneGraph'
import { polygonCentroid, polygonBBox } from '../lib/sceneGraph'
import { useSceneStore } from '../store/sceneStore'
import type { NodeRole, SceneNode } from '../types/sceneGraph'

const ROLE_LABELS: Record<NodeRole, string> = {
  room: 'Rooms',
  wall: 'Walls',
  opening: 'Doors & windows',
  furniture: 'Furniture',
}

const ROLES: NodeRole[] = ['room', 'opening', 'furniture', 'wall']

function newNode(role: NodeRole): SceneNode {
  if (role === 'room') {
    const polygon = rectPolygon({ x: 0, z: 0, w: 3, d: 3 })
    return {
      id: uid('r'),
      role: 'room',
      type: 'bedroom',
      label: 'New Room',
      polygon,
      bbox: polygonBBox(polygon),
      centroid: polygonCentroid(polygon),
      dimensions: { width_m: 3, depth_m: 3 },
      floor_y: 0,
    }
  }
  if (role === 'wall') {
    return {
      id: uid('w'),
      role: 'wall',
      type: 'wall',
      start: { x: 0, z: 0 },
      end: { x: 3, z: 0 },
      height: 2.8,
      thickness: 0.15,
      length_m: 3,
    }
  }
  return {
    id: uid('o'),
    role: 'opening',
    type: 'door',
    label: 'New Door',
    position: { x: 0, z: 0 },
    width_m: 0.9,
    height_m: 2.1,
    sill_height: 0,
  }
}

export function Outliner() {
  const nodes = useSceneStore((s) => s.graph.nodes)
  const building = useSceneStore((s) => s.graph.building)
  const selectedId = useSceneStore((s) => s.selectedId)
  const select = useSceneStore((s) => s.select)
  const addNode = useSceneStore((s) => s.addNode)
  const [collapsed, setCollapsed] = useState<Partial<Record<NodeRole, boolean>>>({ wall: true })

  return (
    <aside className="panel outliner">
      <h3>{building.name}</h3>
      <div className="row">
        <button type="button" onClick={() => addNode(newNode('room'))}>
          + Room
        </button>
        <button type="button" onClick={() => addNode(newNode('wall'))}>
          + Wall
        </button>
        <button type="button" onClick={() => addNode(newNode('opening'))}>
          + Door
        </button>
      </div>
      {ROLES.map((role) => {
        const group = nodes.filter((n) => n.role === role)
        if (group.length === 0) return null
        return (
          <section key={role}>
            <button
              type="button"
              className="group-header"
              onClick={() => setCollapsed((c) => ({ ...c, [role]: !c[role] }))}
            >
              {collapsed[role] ? '▸' : '▾'} {ROLE_LABELS[role]} <span className="badge">{group.length}</span>
            </button>
            {!collapsed[role] && (
              <ul>
                {group.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      className={node.id === selectedId ? 'selected' : ''}
                      onClick={() => select(node.id)}
                    >
                      {nodeTitle(node)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </aside>
  )
}
