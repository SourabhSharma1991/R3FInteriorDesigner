import { useSelectionColor, useThemedMaterial } from '../theme/useTheme'
import type { FurnitureNode } from '../types/sceneGraph'

interface Props {
  item: FurnitureNode
  selected: boolean
  onSelect: (id: string) => void
}

/** A few types get extra detail so the interior reads as furniture, not boxes. */
export function FurnitureMesh({ item, selected, onSelect }: Props) {
  const { w, d, h } = item.size
  const isBed = item.type.startsWith('bed')
  const isTable = item.type.endsWith('table')
  const isPlant = item.type === 'plant'

  const selectionColor = useSelectionColor('#ff8f00')
  const highlight = selected ? { color: selectionColor } : undefined
  const body = { color: item.color, roughness: 0.75 }

  const bodyMaterial = useThemedMaterial(item, { fallback: body, runtime: highlight })
  const topMaterial = useThemedMaterial(item, {
    part: 'top',
    fallback: { ...body, roughness: 0.6 },
    runtime: highlight,
  })
  const legMaterial = useThemedMaterial(item, {
    part: 'legs',
    fallback: { ...body, roughness: 0.7 },
    runtime: highlight,
  })
  const mattressMaterial = useThemedMaterial(item, {
    part: 'mattress',
    role: 'bedding.mattress',
    inherit: false,
    fallback: { color: '#eceff1', roughness: 0.9 },
  })
  const pillowMaterial = useThemedMaterial(item, {
    part: 'pillow',
    role: 'bedding.pillow',
    inherit: false,
    fallback: { color: '#cfd8dc', roughness: 0.9 },
  })
  const headboardMaterial = useThemedMaterial(item, {
    part: 'headboard',
    fallback: { ...body, roughness: 0.7 },
    runtime: highlight,
  })
  const backrestMaterial = useThemedMaterial(item, {
    part: 'backrest',
    fallback: { ...body, roughness: 0.8 },
    runtime: highlight,
  })
  const potMaterial = useThemedMaterial(item, {
    part: 'pot',
    role: 'plant.pot',
    inherit: false,
    fallback: { color: '#bf7f5f', roughness: 0.85 },
    runtime: highlight,
  })
  const foliageMaterial = useThemedMaterial(item, {
    part: 'foliage',
    role: 'plant.foliage',
    inherit: false,
    fallback: { color: item.color, roughness: 0.9, flatShading: true },
  })

  return (
    <group
      position={[item.position.x, item.floor_y, item.position.z]}
      rotation={[0, (-item.rotation_deg * Math.PI) / 180, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(item.id)
      }}
    >
      {isPlant ? (
        <>
          <mesh position={[0, h * 0.16, 0]} material={potMaterial} castShadow receiveShadow>
            <cylinderGeometry args={[w * 0.36, w * 0.26, h * 0.32, 16]} />
          </mesh>
          <mesh position={[0, h * 0.62, 0]} material={foliageMaterial} castShadow>
            <sphereGeometry args={[Math.min(w, d) * 0.52, 12, 10]} />
          </mesh>
          <mesh position={[w * 0.18, h * 0.84, -d * 0.12]} material={foliageMaterial} castShadow>
            <sphereGeometry args={[Math.min(w, d) * 0.34, 10, 8]} />
          </mesh>
        </>
      ) : isTable ? (
        <>
          <mesh position={[0, h - 0.04, 0]} material={topMaterial} castShadow>
            <boxGeometry args={[w, 0.08, d]} />
          </mesh>
          {[
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ].map(([sx, sz], i) => (
            <mesh
              key={i}
              position={[(sx * (w - 0.12)) / 2, (h - 0.08) / 2, (sz * (d - 0.12)) / 2]}
              material={legMaterial}
              castShadow
            >
              <boxGeometry args={[0.06, h - 0.08, 0.06]} />
            </mesh>
          ))}
        </>
      ) : (
        <mesh position={[0, h / 2, 0]} material={bodyMaterial} castShadow receiveShadow>
          <boxGeometry args={[w, h, d]} />
        </mesh>
      )}

      {isBed && (
        <>
          <mesh position={[0, h + 0.08, 0.05]} material={mattressMaterial} castShadow>
            <boxGeometry args={[w - 0.08, 0.16, d - 0.2]} />
          </mesh>
          <mesh position={[0, h + 0.24, -d / 2 + 0.32]} material={pillowMaterial} castShadow>
            <boxGeometry args={[w - 0.35, 0.12, 0.4]} />
          </mesh>
          <mesh
            position={[0, h / 2 + 0.35, -d / 2 + 0.03]}
            material={headboardMaterial}
            castShadow
          >
            <boxGeometry args={[w, h + 0.7, 0.06]} />
          </mesh>
        </>
      )}

      {item.type === 'sofa' && (
        <mesh position={[0, h / 2 + 0.25, -d / 2 + 0.1]} material={backrestMaterial} castShadow>
          <boxGeometry args={[w, h * 0.9, 0.2]} />
        </mesh>
      )}
    </group>
  )
}
