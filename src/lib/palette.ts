import type { FurnitureNode } from '../types/sceneGraph'
import { round, uid } from './sceneGraph'

export const ROOM_COLORS: Record<string, string> = {
  living_room: '#cfe3d4',
  bedroom: '#dcd3ef',
  kitchen: '#f6dfc0',
  bathroom: '#cfe3ef',
  dining: '#e9dfc7',
  lobby: '#e4e4e4',
  balcony: '#d7e8cf',
  sitout: '#d7e8cf',
  default: '#e3e3e3',
}

export const roomColor = (type: string, override?: string) =>
  override ?? ROOM_COLORS[type] ?? ROOM_COLORS.default

export interface FurnitureTemplate {
  type: string
  label: string
  size: { w: number; d: number; h: number }
  color: string
}

export const FURNITURE_CATALOG: FurnitureTemplate[] = [
  { type: 'bed_double', label: 'Double Bed', size: { w: 1.6, d: 2.0, h: 0.5 }, color: '#8d6e63' },
  { type: 'bed_single', label: 'Single Bed', size: { w: 0.9, d: 1.9, h: 0.5 }, color: '#a1887f' },
  { type: 'wardrobe', label: 'Wardrobe', size: { w: 1.8, d: 0.6, h: 2.1 }, color: '#6d4c41' },
  { type: 'sofa', label: 'Sofa', size: { w: 2.0, d: 0.9, h: 0.8 }, color: '#546e7a' },
  { type: 'coffee_table', label: 'Coffee Table', size: { w: 1.1, d: 0.6, h: 0.4 }, color: '#795548' },
  { type: 'dining_table', label: 'Dining Table', size: { w: 1.5, d: 0.9, h: 0.75 }, color: '#8d6e63' },
  { type: 'chair', label: 'Chair', size: { w: 0.45, d: 0.45, h: 0.9 }, color: '#9e9e9e' },
  { type: 'kitchen_counter', label: 'Kitchen Counter', size: { w: 2.4, d: 0.6, h: 0.9 }, color: '#455a64' },
  { type: 'fridge', label: 'Refrigerator', size: { w: 0.7, d: 0.7, h: 1.8 }, color: '#b0bec5' },
  { type: 'tv_unit', label: 'TV Unit', size: { w: 1.6, d: 0.4, h: 0.5 }, color: '#37474f' },
  { type: 'toilet', label: 'Toilet', size: { w: 0.4, d: 0.7, h: 0.8 }, color: '#eceff1' },
  { type: 'washbasin', label: 'Wash Basin', size: { w: 0.6, d: 0.45, h: 0.9 }, color: '#eceff1' },
]

export function makeFurniture(
  template: FurnitureTemplate,
  position: { x: number; z: number },
  floorY = 0,
): FurnitureNode {
  return {
    id: uid('f'),
    role: 'furniture',
    type: template.type,
    label: template.label,
    position: { x: round(position.x), z: round(position.z) },
    rotation_deg: 0,
    size: { ...template.size },
    color: template.color,
    floor_y: floorY,
  }
}
