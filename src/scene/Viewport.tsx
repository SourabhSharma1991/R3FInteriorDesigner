import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { assignOpenings } from '../lib/wallGeometry'
import { useSceneStore } from '../store/sceneStore'
import { isFurniture, isOpening, isRoom, isWall } from '../types/sceneGraph'
import { FurnitureMesh } from './FurnitureMesh'
import { OpeningMesh } from './OpeningMesh'
import { RoomMesh } from './RoomMesh'
import { SelectionGizmo } from './SelectionGizmo'
import { WallMesh } from './WallMesh'

function SceneContents() {
  const graph = useSceneStore((s) => s.graph)
  const view = useSceneStore((s) => s.view)
  const selectedId = useSceneStore((s) => s.selectedId)
  const select = useSceneStore((s) => s.select)
  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null

  const rooms = useMemo(() => graph.nodes.filter(isRoom), [graph.nodes])
  const walls = useMemo(() => graph.nodes.filter(isWall), [graph.nodes])
  const openings = useMemo(() => graph.nodes.filter(isOpening), [graph.nodes])
  const furniture = useMemo(() => graph.nodes.filter(isFurniture), [graph.nodes])
  const hostedByWall = useMemo(() => assignOpenings(walls, openings), [walls, openings])

  /** Wall orientation for each opening, so doors sit flush in their wall. */
  const openingFrames = useMemo(() => {
    const frames = new Map<string, { rotationY: number; thickness: number }>()
    for (const wall of walls) {
      const rotationY = Math.atan2(-(wall.end.z - wall.start.z), wall.end.x - wall.start.x)
      for (const { opening } of hostedByWall.get(wall.id) ?? []) {
        frames.set(opening.id, { rotationY, thickness: wall.thickness })
      }
    }
    return frames
  }, [walls, hostedByWall])

  return (
    <>
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#ffffff', '#b9bfc6', 0.6]} />
      <directionalLight position={[8, 14, 6]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
      <directionalLight position={[-10, 8, -6]} intensity={0.4} />

      {view.showGrid && (
        <Grid
          args={[60, 60]}
          cellSize={0.5}
          cellColor="#c8ccd0"
          sectionSize={5}
          sectionColor="#8c9299"
          position={[0, -0.01, 0]}
          infiniteGrid
          fadeDistance={70}
        />
      )}

      {rooms.map((room) => (
        <RoomMesh
          key={room.id}
          room={room}
          selected={room.id === selectedId}
          showLabel={view.showLabels}
          onSelect={select}
        />
      ))}

      {view.showWalls &&
        walls.map((wall) => (
          <WallMesh
            key={wall.id}
            wall={wall}
            hosted={hostedByWall.get(wall.id) ?? []}
            selected={wall.id === selectedId}
            opacity={view.wallOpacity}
            onSelect={select}
          />
        ))}

      {openings.map((opening) => (
        <OpeningMesh
          key={opening.id}
          opening={opening}
          rotationY={openingFrames.get(opening.id)?.rotationY ?? 0}
          thickness={openingFrames.get(opening.id)?.thickness ?? 0.15}
          selected={opening.id === selectedId}
          onSelect={select}
        />
      ))}

      {view.showFurniture &&
        furniture.map((item) => (
          <FurnitureMesh
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={select}
          />
        ))}

      {selected && <SelectionGizmo node={selected} />}
    </>
  )
}

function CameraRig() {
  const mode = useSceneStore((s) => s.view.mode)
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const ctrl = controls.current
    if (!ctrl) return
    if (mode === 'top') {
      ctrl.object.position.set(0, 22, 0.01)
      ctrl.target.set(0, 0, 0)
    } else {
      ctrl.object.position.set(9, 11, 12)
      ctrl.target.set(0, 0, 0)
    }
    ctrl.update()
  }, [mode])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate={mode === '3d'}
      maxPolarAngle={Math.PI / 2.05}
      enableDamping
    />
  )
}

export function Viewport() {
  const select = useSceneStore((s) => s.select)
  return (
    <Canvas
      shadows
      camera={{ position: [9, 11, 12], fov: 45, near: 0.1, far: 500 }}
      onPointerMissed={() => select(null)}
    >
      <color attach="background" args={['#eef1f4']} />
      <SceneContents />
      <CameraRig />
    </Canvas>
  )
}
