import type { OpeningNode } from '../types/sceneGraph'

interface Props {
  opening: OpeningNode
  /** Rotation of the host wall; openings without a host wall face +X. */
  rotationY: number
  thickness: number
  selected: boolean
  onSelect: (id: string) => void
}

export function OpeningMesh({ opening, rotationY, thickness, selected, onSelect }: Props) {
  const { width_m: w, height_m: h, sill_height: sill } = opening
  const frame = 0.06
  const isDoor = opening.type === 'door'
  const color = selected ? '#ff8f00' : isDoor ? '#8d6e63' : '#90caf9'

  return (
    <group
      position={[opening.position.x, sill, opening.position.z]}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(opening.id)
      }}
    >
      {/* jambs + head */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * (w - frame)) / 2, h / 2, 0]} castShadow>
          <boxGeometry args={[frame, h, thickness + 0.02]} />
          <meshStandardMaterial color="#efebe9" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, h - frame / 2, 0]} castShadow>
        <boxGeometry args={[w, frame, thickness + 0.02]} />
        <meshStandardMaterial color="#efebe9" roughness={0.8} />
      </mesh>
      {isDoor ? (
        <>
          <mesh position={[0, (h - frame) / 2, 0]} castShadow>
            <boxGeometry args={[w - frame * 2, h - frame, 0.04]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
          <mesh position={[w / 2 - 0.22, h / 2, 0.05]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial color="#ffd54f" metalness={0.8} roughness={0.3} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, (h - frame) / 2, 0]}>
          <boxGeometry args={[w - frame * 2, h - frame, 0.02]} />
          <meshStandardMaterial color={color} transparent opacity={0.35} roughness={0.1} />
        </mesh>
      )}
    </group>
  )
}
