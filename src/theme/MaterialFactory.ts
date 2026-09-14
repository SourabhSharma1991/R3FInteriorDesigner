import * as THREE from 'three'
import type { ResolvedMaterialSpec } from '../types/theme'

/**
 * Builds Three.js materials from resolved specs and caches them, so switching
 * themes or re-rendering never allocates a material that already exists.
 */

const SIDES = {
  front: THREE.FrontSide,
  back: THREE.BackSide,
  double: THREE.DoubleSide,
} as const

/** Stable key: same properties in any order produce the same string. */
function cacheKey(spec: ResolvedMaterialSpec): string {
  return Object.entries(spec)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('|')
}

function build(spec: ResolvedMaterialSpec): THREE.Material {
  const common = {
    color: spec.color ?? '#ffffff',
    opacity: spec.opacity ?? 1,
    transparent: spec.transparent ?? (spec.opacity !== undefined && spec.opacity < 1),
    depthWrite: spec.depthWrite ?? true,
    side: SIDES[spec.side ?? 'front'],
  }

  if (spec.kind === 'basic') return new THREE.MeshBasicMaterial(common)
  if (spec.kind === 'lambert') {
    return new THREE.MeshLambertMaterial({
      ...common,
      emissive: spec.emissive,
      emissiveIntensity: spec.emissiveIntensity,
    })
  }

  const standard = {
    ...common,
    roughness: spec.roughness ?? 0.8,
    metalness: spec.metalness ?? 0,
    flatShading: spec.flatShading ?? false,
    emissive: spec.emissive,
    emissiveIntensity: spec.emissiveIntensity,
  }

  if (spec.kind === 'physical') {
    return new THREE.MeshPhysicalMaterial({
      ...standard,
      clearcoat: spec.clearcoat,
      clearcoatRoughness: spec.clearcoatRoughness,
    })
  }
  return new THREE.MeshStandardMaterial(standard)
}

export class MaterialFactory {
  private cache = new Map<string, THREE.Material>()

  get(spec: ResolvedMaterialSpec): THREE.Material {
    const key = cacheKey(spec)
    const cached = this.cache.get(key)
    if (cached) return cached
    const material = build(spec)
    material.name = key
    this.cache.set(key, material)
    return material
  }

  get size(): number {
    return this.cache.size
  }

  /** Frees every cached material. Call when the factory goes out of use. */
  dispose(): void {
    for (const material of this.cache.values()) material.dispose()
    this.cache.clear()
  }
}
