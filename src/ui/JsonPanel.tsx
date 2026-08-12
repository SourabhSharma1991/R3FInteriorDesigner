import { useState } from 'react'
import { serializeSceneGraph } from '../lib/sceneGraph'
import { useSceneStore } from '../store/sceneStore'

export function JsonPanel({ onClose }: { onClose: () => void }) {
  const graph = useSceneStore((s) => s.graph)
  const loadGraph = useSceneStore((s) => s.loadGraph)
  const [tab, setTab] = useState<'current' | 'paste'>('current')
  const [draft, setDraft] = useState('')

  return (
    <section className="json-panel">
      <div className="row">
        <div className="segmented">
          {(['current', 'paste'] as const).map((t) => (
            <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t === 'current' ? 'Current scene graph' : 'Paste scene graph'}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {tab === 'current' ? (
        <textarea readOnly value={serializeSceneGraph(graph)} spellCheck={false} />
      ) : (
        <>
          <textarea
            value={draft}
            spellCheck={false}
            placeholder="Paste a scene_graph.json here…"
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="row">
            <button
              type="button"
              onClick={() => {
                try {
                  loadGraph(JSON.parse(draft))
                } catch (err) {
                  useSceneStore.setState({ error: err instanceof Error ? err.message : String(err) })
                }
              }}
            >
              Load into viewport
            </button>
          </div>
        </>
      )}
    </section>
  )
}
