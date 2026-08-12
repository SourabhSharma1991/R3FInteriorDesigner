import type { FurnitureNode } from '../types/sceneGraph'

interface Props {
  item: FurnitureNode
  selected: boolean
  onSelect: (id: string) => void
}

/** A few types get extra detail so the interior reads as furniture, not boxes. */
export function FurnitureMesh({ item, selected, onSelect }: Props) {
  const { w, d, h } = item.size
  const color = selected ? '#ff8f00' : item.color
  const isBed = item.type.startsWith('bed')
  const isTable = item.type.endsWith('table')

  return (
    <group
      position={[item.position.x, item.floor_y, item.position.z]}
      rotation={[0, (-item.rotation_deg * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(item.id)
      }}
    >
      {isTable ? (
        <>
          <mesh position={[0, h - 0.04, 0]} castShadow>
            <boxGeometry args={[w, 0.08, d]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz], i) => (
            <mesh key={i} position={[(sx * (w - 0.12)) / 2, (h - 0.08) / 2, (sz * (d - 0.12)) / 2]} castShadow>
              <boxGeometry args={[0.06, h - 0.08, 0.06]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={color} roughness={0.75} />
        </mesh>
      )}

      {isBed && (
        <>
          <mesh position={[0, h + 0.08, 0.05]} castShadow>
            <boxGeometry args={[w - 0.08, 0.16, d - 0.2]} />
            <meshStandardMaterial color="#eceff1" roughness={0.9} />
          </mesh>
          <mesh position={[0, h + 0.24, -d / 2 + 0.32]} castShadow>
            <boxGeometry args={[w - 0.35, 0.12, 0.4]} />
            <meshStandardMaterial color="#cfd8dc" roughness={0.9} />
          </mesh>
          <mesh position={[0, h / 2 + 0.35, -d / 2 + 0.03]} castShadow>
            <boxGeometry args={[w, h + 0.7, 0.06]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        </>
      )}

      {item.type === 'sofa' && (
        <mesh position={[0, h / 2 + 0.25, -d / 2 + 0.1]} castShadow>
          <boxGeometry args={[w, h * 0.9, 0.2]} />
          <meshStandardMaterial color={color} roughness={0.8} />
        </mesh>
      )}
    </group>
  )
}
