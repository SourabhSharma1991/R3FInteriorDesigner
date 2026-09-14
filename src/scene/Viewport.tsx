import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { assignOpenings } from '../lib/wallGeometry'
import { useSceneStore } from '../store/sceneStore'
import { ThemeContext } from '../theme/ThemeContext'
import { useThemeContext, useView2D, useView3D } from '../theme/useTheme'
import { isFurniture, isOpening, isRoom, isWall } from '../types/sceneGraph'
import { FurnitureMesh } from './FurnitureMesh'
import { OpeningMesh } from './OpeningMesh'
import { RoomMesh } from './RoomMesh'
import { SelectionGizmo } from './SelectionGizmo'
import { WallMesh } from './WallMesh'

/** Defaults keep the pre-theme look when no theme (or no setting) is active. */
const DEFAULT_LIGHTING = {
  background: '#eef1f4',
  ambient: { color: '#ffffff', intensity: 0.8 },
  hemisphere: { color: '#ffffff', groundColor: '#b9bfc6', intensity: 0.6 },
  directional: [
    { color: '#ffffff', intensity: 1.6, position: [8, 14, 6] as [number, number, number] },
    { color: '#ffffff', intensity: 0.4, position: [-10, 8, -6] as [number, number, number] },
  ],
  grid: { cellColor: '#c8ccd0', sectionColor: '#8c9299' },
  wallOpacity: 1,
}

/** Presentation settings of the active theme for the current view mode. */
function useThemedLighting() {
  const mode = useSceneStore((s) => s.view.mode)
  const view3D = useView3D()
  const view2D = useView2D()
  const view = mode === 'top' ? view2D : view3D
  const flat = mode === 'top'
  const d = DEFAULT_LIGHTING

  return {
    background: view.background ?? d.background,
    ambient: {
      color: view.ambient?.color ?? d.ambient.color,
      intensity: view.ambient?.intensity ?? d.ambient.intensity,
    },
    hemisphere: {
      color: view3D.hemisphere?.color ?? d.hemisphere.color,
      groundColor: view3D.hemisphere?.groundColor ?? d.hemisphere.groundColor,
      intensity: view3D.hemisphere?.intensity ?? d.hemisphere.intensity,
    },
    directional: (view3D.directional?.length ? view3D.directional : d.directional).map(
      (light, i) => ({
        color: light.color ?? d.directional[Math.min(i, 1)].color,
        intensity: light.intensity ?? d.directional[Math.min(i, 1)].intensity,
        position: light.position ?? d.directional[Math.min(i, 1)].position,
      }),
    ),
    grid: {
      cellColor: view.grid?.cellColor ?? d.grid.cellColor,
      sectionColor: view.grid?.sectionColor ?? d.grid.sectionColor,
    },
    wallOpacity: flat ? (view2D.wallOpacity ?? 1) : 1,
  }
}

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

  const lighting = useThemedLighting()

  return (
    <>
      <ambientLight color={lighting.ambient.color} intensity={lighting.ambient.intensity} />
      <hemisphereLight
        args={[lighting.hemisphere.color, lighting.hemisphere.groundColor, lighting.hemisphere.intensity]}
      />
      {lighting.directional.map((light, i) => (
        <directionalLight
          key={i}
          color={light.color}
          position={light.position}
          intensity={light.intensity}
          castShadow={i === 0}
          shadow-mapSize={[2048, 2048]}
        />
      ))}

      {view.showGrid && (
        <Grid
          args={[60, 60]}
          cellSize={0.5}
          cellColor={lighting.grid.cellColor}
          sectionSize={5}
          sectionColor={lighting.grid.sectionColor}
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
            opacity={view.wallOpacity * lighting.wallOpacity}
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

function Background() {
  const { background } = useThemedLighting()
  return <color attach="background" args={[background]} />
}

export function Viewport() {
  const select = useSceneStore((s) => s.select)
  /** The Canvas renders in its own root, so the theme context is bridged in. */
  const theme = useThemeContext()

  return (
    <Canvas
      shadows
      camera={{ position: [9, 11, 12], fov: 45, near: 0.1, far: 500 }}
      onPointerMissed={() => select(null)}
    >
      <ThemeContext.Provider value={theme}>
        <Background />
        <SceneContents />
        <CameraRig />
      </ThemeContext.Provider>
    </Canvas>
  )
}
