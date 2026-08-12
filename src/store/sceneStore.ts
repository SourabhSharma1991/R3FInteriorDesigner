import { create } from 'zustand'
import sampleGraph from '../data/sample-scene-graph.json'
import {
  normalizeNode,
  parseSceneGraph,
  translateNode,
  uid,
} from '../lib/sceneGraph'
import type { SceneGraph, SceneNode } from '../types/sceneGraph'

export type ViewMode = '3d' | 'top'
export type TransformMode = 'translate' | 'rotate'

interface ViewOptions {
  mode: ViewMode
  showWalls: boolean
  showFurniture: boolean
  showLabels: boolean
  showGrid: boolean
  wallOpacity: number
}

interface SceneState {
  graph: SceneGraph
  selectedId: string | null
  transformMode: TransformMode
  view: ViewOptions
  error: string | null
  past: SceneGraph[]
  future: SceneGraph[]
  select: (id: string | null) => void
  setTransformMode: (mode: TransformMode) => void
  setView: (patch: Partial<ViewOptions>) => void
  loadGraph: (raw: unknown) => void
  loadSample: () => void
  updateNode: (id: string, patch: Partial<SceneNode>) => void
  moveNode: (id: string, dx: number, dz: number) => void
  addNode: (node: SceneNode) => void
  duplicateNode: (id: string) => void
  deleteNode: (id: string) => void
  undo: () => void
  redo: () => void
  clearError: () => void
}

const initialGraph = parseSceneGraph(sampleGraph)

export const useSceneStore = create<SceneState>((set, get) => {
  /** Applies a change to the graph and pushes the previous version onto the undo stack. */
  const commit = (next: (graph: SceneGraph) => SceneGraph) =>
    set((state) => ({
      graph: next(state.graph),
      past: [...state.past, state.graph].slice(-50),
      future: [],
    }))

  const mapNodes = (id: string, fn: (node: SceneNode) => SceneNode) =>
    commit((graph) => ({
      ...graph,
      nodes: graph.nodes.map((node) => (node.id === id ? fn(node) : node)),
    }))

  return {
    graph: initialGraph,
    selectedId: null,
    transformMode: 'translate',
    view: {
      mode: '3d',
      showWalls: true,
      showFurniture: true,
      showLabels: true,
      showGrid: true,
      wallOpacity: 1,
    },
    error: null,
    past: [],
    future: [],

    select: (id) => set({ selectedId: id }),
    setTransformMode: (transformMode) => set({ transformMode }),
    setView: (patch) => set((state) => ({ view: { ...state.view, ...patch } })),
    clearError: () => set({ error: null }),

    loadGraph: (raw) => {
      try {
        const graph = parseSceneGraph(raw)
        set((state) => ({
          graph,
          selectedId: null,
          error: null,
          past: [...state.past, state.graph].slice(-50),
          future: [],
        }))
      } catch (err) {
        set({ error: err instanceof Error ? err.message : String(err) })
      }
    },

    loadSample: () => get().loadGraph(sampleGraph),

    updateNode: (id, patch) =>
      mapNodes(id, (node) => normalizeNode({ ...node, ...patch } as SceneNode)),

    moveNode: (id, dx, dz) => mapNodes(id, (node) => translateNode(node, dx, dz)),

    addNode: (node) => {
      commit((graph) => ({ ...graph, nodes: [...graph.nodes, node] }))
      set({ selectedId: node.id })
    },

    duplicateNode: (id) => {
      const source = get().graph.nodes.find((n) => n.id === id)
      if (!source) return
      const copy = translateNode({ ...source, id: uid(source.role[0]) }, 0.5, 0.5)
      get().addNode(copy)
    },

    deleteNode: (id) => {
      commit((graph) => ({ ...graph, nodes: graph.nodes.filter((n) => n.id !== id) }))
      if (get().selectedId === id) set({ selectedId: null })
    },

    undo: () =>
      set((state) => {
        const previous = state.past.at(-1)
        if (!previous) return state
        return {
          graph: previous,
          past: state.past.slice(0, -1),
          future: [state.graph, ...state.future].slice(0, 50),
        }
      }),

    redo: () =>
      set((state) => {
        const next = state.future[0]
        if (!next) return state
        return {
          graph: next,
          past: [...state.past, state.graph].slice(-50),
          future: state.future.slice(1),
        }
      }),
  }
})

export const useSelectedNode = () =>
  useSceneStore((state) => state.graph.nodes.find((n) => n.id === state.selectedId) ?? null)
