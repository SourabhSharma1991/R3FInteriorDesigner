import { TransformControls } from '@react-three/drei'
import { useCallback, useEffect, useState } from 'react'
import * as THREE from 'three'
import { anchorOf, round } from '../lib/sceneGraph'
import { useSceneStore } from '../store/sceneStore'
import type { SceneNode } from '../types/sceneGraph'
import { isFurniture } from '../types/sceneGraph'

interface Props {
  node: SceneNode
}

interface ThreeEventTarget {
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

/**
 * Drives a proxy object with the gizmo and writes the resulting translation /
 * rotation back into the scene graph when the drag ends.
 */
export function SelectionGizmo({ node }: Props) {
  const [proxy, setProxy] = useState<THREE.Object3D | null>(null)
  const [controls, setControls] = useState<ThreeEventTarget | null>(null)
  const moveNode = useSceneStore((s) => s.moveNode)
  const updateNode = useSceneStore((s) => s.updateNode)
  const transformMode = useSceneStore((s) => s.transformMode)
  const anchor = anchorOf(node)
  const rotatable = isFurniture(node)
  const mode = rotatable ? transformMode : 'translate'

  useEffect(() => {
    if (!proxy) return
    proxy.position.set(anchor.x, 0, anchor.z)
    proxy.rotation.set(0, rotatable && isFurniture(node) ? (-node.rotation_deg * Math.PI) / 180 : 0, 0)
  }, [anchor.x, anchor.z, node, proxy, rotatable])

  const onDone = useCallback(() => {
    if (!proxy) return
    if (mode === 'translate') {
      const dx = round(proxy.position.x - anchor.x)
      const dz = round(proxy.position.z - anchor.z)
      if (dx !== 0 || dz !== 0) moveNode(node.id, dx, dz)
    } else if (isFurniture(node)) {
      updateNode(node.id, { rotation_deg: round((-proxy.rotation.y * 180) / Math.PI, 1) } as Partial<SceneNode>)
    }
  }, [anchor.x, anchor.z, mode, moveNode, node, proxy, updateNode])

  useEffect(() => {
    if (!controls) return
    controls.addEventListener('mouseUp', onDone)
    return () => controls.removeEventListener('mouseUp', onDone)
  }, [controls, onDone])

  return (
    <>
      <object3D ref={setProxy} />
      {proxy && (
        <TransformControls
          ref={setControls as never}
          object={proxy}
          mode={mode}
          size={0.8}
          showY={mode === 'rotate'}
          showX={mode === 'translate'}
          showZ={mode === 'translate'}
          translationSnap={0.05}
          rotationSnap={Math.PI / 36}
        />
      )}
    </>
  )
}
