import { Suspense, useEffect, useState } from 'react'
import './App.css'
import { Viewport } from './scene/Viewport'
import { useSceneStore } from './store/sceneStore'
import { Inspector } from './ui/Inspector'
import { JsonPanel } from './ui/JsonPanel'
import { Outliner } from './ui/Outliner'
import { Toolbar } from './ui/Toolbar'

export default function App() {
  const [showJson, setShowJson] = useState(false)
  const error = useSceneStore((s) => s.error)
  const clearError = useSceneStore((s) => s.clearError)
  const undo = useSceneStore((s) => s.undo)
  const redo = useSceneStore((s) => s.redo)
  const deleteNode = useSceneStore((s) => s.deleteNode)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const id = useSceneStore.getState().selectedId
        if (id) deleteNode(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteNode, redo, undo])

  return (
    <div className="app">
      <Toolbar onToggleJson={() => setShowJson((v) => !v)} />
      <main>
        <Outliner />
        <div className="viewport">
          <Suspense fallback={null}>
            <Viewport />
          </Suspense>
          {showJson && <JsonPanel onClose={() => setShowJson(false)} />}
        </div>
        <Inspector />
      </main>
      {error && (
        <div className="error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={clearError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
