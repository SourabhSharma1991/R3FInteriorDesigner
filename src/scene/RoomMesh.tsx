import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { polygonArea } from '../lib/sceneGraph'
import { roomColor } from '../lib/palette'
import type { RoomNode } from '../types/sceneGraph'

interface Props {
  room: RoomNode
  selected: boolean
  showLabel: boolean
  onSelect: (id: string) => void
}

export function RoomMesh({ room, selected, showLabel, onSelect }: Props) {
  const { geometry, area } = useMemo(() => {
    const shape = new THREE.Shape(
      room.polygon.map((p) => new THREE.Vector2(p.x - room.centroid.x, -(p.z - room.centroid.z))),
    )
    const geom = new THREE.ShapeGeometry(shape)
    geom.rotateX(-Math.PI / 2)
    return { geometry: geom, area: polygonArea(room.polygon) }
  }, [room.polygon, room.centroid])

  return (
    <group position={[room.centroid.x, room.floor_y, room.centroid.z]}>
      <mesh
        geometry={geometry}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          onSelect(room.id)
        }}
      >
        <meshStandardMaterial
          color={selected ? '#ffd54f' : roomColor(room.type, room.color)}
          roughness={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {showLabel && (
        <Html position={[0, 0.05, 0]} center distanceFactor={12} zIndexRange={[10, 0]}>
          <div className="room-label">
            {room.label}
            <small>{area.toFixed(1)} m²</small>
          </div>
        </Html>
      )}
    </group>
  )
}
