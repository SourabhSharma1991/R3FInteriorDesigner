import { useSelectionColor, useThemedMaterial } from '../theme/useTheme'
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

  const selectionColor = useSelectionColor('#ff8f00')
  const highlight = selected ? { color: selectionColor } : undefined

  const frameMaterial = useThemedMaterial(opening, {
    part: 'frame',
    role: `${opening.type}.frame`,
    inherit: false,
    fallback: { color: '#efebe9', roughness: 0.8 },
    runtime: highlight,
  })
  const panelMaterial = useThemedMaterial(opening, {
    part: 'panel',
    role: 'door.panel',
    fallback: { color: '#8d6e63', roughness: 0.6 },
    runtime: highlight,
  })
  const handleMaterial = useThemedMaterial(opening, {
    part: 'handle',
    role: 'door.handle',
    inherit: false,
    fallback: { color: '#ffd54f', metalness: 0.8, roughness: 0.3 },
  })
  const glassMaterial = useThemedMaterial(opening, {
    part: 'glass',
    role: 'window.glass',
    inherit: false,
    fallback: { color: '#90caf9', transparent: true, opacity: 0.35, roughness: 0.1 },
    runtime: highlight,
  })

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
        <mesh
          key={side}
          position={[(side * (w - frame)) / 2, h / 2, 0]}
          material={frameMaterial}
          castShadow
        >
          <boxGeometry args={[frame, h, thickness + 0.02]} />
        </mesh>
      ))}
      <mesh position={[0, h - frame / 2, 0]} material={frameMaterial} castShadow>
        <boxGeometry args={[w, frame, thickness + 0.02]} />
      </mesh>
      {isDoor ? (
        <>
          <mesh position={[0, (h - frame) / 2, 0]} material={panelMaterial} castShadow>
            <boxGeometry args={[w - frame * 2, h - frame, 0.04]} />
          </mesh>
          <mesh position={[w / 2 - 0.22, h / 2, 0.05]} material={handleMaterial}>
            <sphereGeometry args={[0.035, 12, 12]} />
          </mesh>
        </>
      ) : (
        <mesh position={[0, (h - frame) / 2, 0]} material={glassMaterial}>
          <boxGeometry args={[w - frame * 2, h - frame, 0.02]} />
        </mesh>
      )}
    </group>
  )
}
