import { useRef } from 'react'
import { serializeSceneGraph } from '../lib/sceneGraph'
import { useSceneStore } from '../store/sceneStore'

export function Toolbar({ onToggleJson }: { onToggleJson: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const graph = useSceneStore((s) => s.graph)
  const view = useSceneStore((s) => s.view)
  const setView = useSceneStore((s) => s.setView)
  const loadGraph = useSceneStore((s) => s.loadGraph)
  const loadSample = useSceneStore((s) => s.loadSample)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const canUndo = useSceneStore((s) => s.past.length > 0)
  const canRedo = useSceneStore((s) => s.future.length > 0)

  const importFile = async (file: File) => {
    try {
      loadGraph(JSON.parse(await file.text()))
    } catch (err) {
      useSceneStore.setState({ error: err instanceof Error ? err.message : String(err) })
    }
  }

  const exportFile = () => {
    const blob = new Blob([serializeSceneGraph(graph)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${graph.building.name.replace(/\s+/g, '-').toLowerCase()}-scene-graph.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="toolbar">
      <strong>R3F Interior Designer</strong>

      <div className="segmented">
        {(['3d', 'top'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={view.mode === mode ? 'active' : ''}
            onClick={() => setView({ mode })}
          >
            {mode === '3d' ? '3D' : 'Top'}
          </button>
        ))}
      </div>

      <label className="check">
        <input type="checkbox" checked={view.showWalls} onChange={(e) => setView({ showWalls: e.target.checked })} />
        Walls
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={view.showFurniture}
          onChange={(e) => setView({ showFurniture: e.target.checked })}
        />
        Furniture
      </label>
      <label className="check">
        <input type="checkbox" checked={view.showLabels} onChange={(e) => setView({ showLabels: e.target.checked })} />
        Labels
      </label>
      <label className="check">
        <input type="checkbox" checked={view.showGrid} onChange={(e) => setView({ showGrid: e.target.checked })} />
        Grid
      </label>
      <label className="check">
        Wall opacity
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={view.wallOpacity}
          onChange={(e) => setView({ wallOpacity: Number(e.target.value) })}
        />
      </label>

      <span className="spacer" />

      <button type="button" onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        Redo
      </button>
      <button type="button" onClick={() => fileInput.current?.click()}>
        Import JSON
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importFile(file)
          e.target.value = ''
        }}
      />
      <button type="button" onClick={exportFile}>
        Export JSON
      </button>
      <button type="button" onClick={onToggleJson}>
        JSON panel
      </button>
      <button type="button" onClick={loadSample}>
        Reset sample
      </button>
    </header>
  )
}
