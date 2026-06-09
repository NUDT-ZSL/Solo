import { useState, useEffect, useCallback } from 'react'
import { Scene } from './components/Scene'
import {
  generateMockData,
  NodeData,
  Dataset,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  CategoryLabel,
} from './utils/dataGenerator'

function App() {
  const [dataset] = useState<Dataset>(() => generateMockData())
  const [hoveredNode, setHoveredNode] = useState<NodeData | null>(null)
  const [resetTrigger, setResetTrigger] = useState(0)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setResetTrigger((prev) => prev + 1)
      }
    },
    []
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const categories: CategoryLabel[] = ['social', 'topic', 'user', 'trend']

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Scene
        dataset={dataset}
        onHoverNodeChange={setHoveredNode}
        resetTrigger={resetTrigger}
      />

      {hoveredNode && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            left: 20,
            bottom: 20,
            minWidth: 180,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
            节点信息
          </div>
          <div style={{ lineHeight: 1.8 }}>
            <div>
              <span style={{ opacity: 0.7 }}>ID：</span>
              <span style={{ fontWeight: 600 }}>#{hoveredNode.id}</span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>权重：</span>
              <span style={{ fontWeight: 600 }}>
                {hoveredNode.weight.toFixed(3)}
              </span>
            </div>
            <div>
              <span style={{ opacity: 0.7 }}>节点半径：</span>
              <span style={{ fontWeight: 600 }}>
                {hoveredNode.baseRadius.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ opacity: 0.7 }}>类别：</span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: hoveredNode.color,
                  marginRight: 4,
                }}
              />
              <span style={{ fontWeight: 600 }}>
                {CATEGORY_LABELS[hoveredNode.category]}
              </span>
            </div>
          </div>
        </div>
      )}

      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          minWidth: 140,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
          图例
        </div>
        {categories.map((cat) => (
          <div key={cat} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: CATEGORY_COLORS[cat] }}
            />
            <span>{CATEGORY_LABELS[cat]}</span>
          </div>
        ))}
      </div>

      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          left: 20,
          top: 20,
          minWidth: 200,
          zIndex: 10,
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 14 }}>
          多维织网
        </div>
        <div style={{ opacity: 0.8, fontSize: 11, lineHeight: 1.6 }}>
          <div>拖拽旋转视角 · 滚轮缩放</div>
          <div>点击节点触发脉冲 · 悬停查看关联</div>
          <div>按 R 键重置视图</div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        <div
          className="glass-panel"
          style={{
            pointerEvents: 'auto',
            cursor: 'pointer',
            padding: '8px 16px',
          }}
          onClick={() => setResetTrigger((prev) => prev + 1)}
        >
          重置 (R)
        </div>
      </div>
    </div>
  )
}

export default App
