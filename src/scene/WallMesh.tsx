import { useMemo } from 'react'
import { buildWallLayout, wallMidpoint } from '../lib/wallGeometry'
import type { OpeningNode, WallNode } from '../types/sceneGraph'

interface Props {
  wall: WallNode
  hosted: { opening: OpeningNode; t: number }[]
  selected: boolean
  opacity: number
  onSelect: (id: string) => void
}

export function WallMesh({ wall, hosted, selected, opacity, onSelect }: Props) {
  const layout = useMemo(() => buildWallLayout(wall, hosted), [wall, hosted])
  const mid = wallMidpoint(wall)

  return (
    <group position={[mid.x, 0, mid.z]} rotation={[0, layout.rotationY, 0]}>
      {layout.pieces.map((piece, i) => (
        <mesh
          key={i}
          position={piece.center}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation()
            onSelect(wall.id)
          }}
        >
          <boxGeometry args={piece.size} />
          <meshStandardMaterial
            color={selected ? '#ffb300' : '#f2efe9'}
            roughness={0.95}
            transparent
            opacity={opacity}
            depthWrite={opacity > 0.95}
          />
        </mesh>
      ))}
    </group>
  )
}
