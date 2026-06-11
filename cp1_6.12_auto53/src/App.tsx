import { useCallback, useRef, useEffect, useState } from 'react'
import { useStore } from './store'
import { parseCode } from './parser'
import { Editor } from './editor'
import { Graph } from './graph'

export default function App() {
  const {
    sourceCode,
    sourceLines,
    nodes,
    edges,
    selectedNodeId,
    filterEntryPoint,
    filterRecursive,
    splitPosition,
    fileName,
    setSourceData,
    setParseResult,
    setSelectedNode,
    toggleFilterEntryPoint,
    toggleFilterRecursive,
    setSplitPosition,
  } = useStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingSplit = useRef(false)

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > 500 * 1024) {
        alert('文件大小超过500KB限制')
        return
      }
      if (!/\.(js|ts|jsx|tsx|mjs|cjs)$/.test(file.name)) {
        alert('请上传 .js 或 .ts 文件')
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const code = e.target?.result as string
        const lines = code.split('\n')
        setSourceData(code, lines, file.name)
        const result = parseCode(code)
        setParseResult(result.nodes, result.edges)
        setSelectedNode(null)
      }
      reader.readAsText(file)
    },
    [setSourceData, setParseResult, setSelectedNode]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(selectedNodeId === nodeId ? null : nodeId)
    },
    [selectedNodeId, setSelectedNode]
  )

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplit.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setSplitPosition(Math.max(15, Math.min(85, pct)))
    }
    const onMouseUp = () => {
      isDraggingSplit.current = false
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [setSplitPosition])

  const hasData = sourceLines.length > 0

  return (
    <div className="app-root">
      <header className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-brand">
            <span className="brand-icon">⬡</span>
            <span className="brand-text">CodeFlow</span>
          </div>
          <button
            className="toolbar-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="btn-icon">↑</span>
            上传文件
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.ts,.jsx,.tsx,.mjs,.cjs"
            onChange={onFileChange}
            style={{ display: 'none' }}
          />
          {hasData && (
            <>
              <button
                className={`toolbar-btn${filterEntryPoint ? ' toolbar-btn-active' : ''}`}
                onClick={toggleFilterEntryPoint}
              >
                仅显示入口函数
              </button>
              <button
                className={`toolbar-btn${filterRecursive ? ' toolbar-btn-active' : ''}`}
                onClick={toggleFilterRecursive}
              >
                显示循环调用
              </button>
            </>
          )}
        </div>
        {fileName && (
          <div className="toolbar-filename">
            <span className="filename-dot" />
            {fileName}
          </div>
        )}
      </header>

      <main
        className={`main-content${!hasData ? ' main-content-empty' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {!hasData && (
          <div className={`upload-zone${isDragging ? ' upload-zone-active' : ''}`}>
            <div className="upload-icon">{'</>'}</div>
            <div className="upload-title">拖拽文件到此处或点击上传</div>
            <div className="upload-subtitle">
              支持 .js / .ts 文件，最大 500KB
            </div>
            <button
              className="upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              选择文件
            </button>
          </div>
        )}

        {hasData && (
          <>
            <div
              className="panel-editor"
              style={{ width: `${splitPosition}%` }}
            >
              <div className="panel-header">
                <span className="panel-dot panel-dot-green" />
                源码
                {selectedNode && (
                  <span className="panel-info">
                    {selectedNode.name}
                    <span className="panel-info-detail">
                      L{selectedNode.startLine}-{selectedNode.endLine} ·{' '}
                      {selectedNode.statementCount} stmts ·{' '}
                      {selectedNode.complexity}
                    </span>
                  </span>
                )}
              </div>
              <Editor sourceLines={sourceLines} selectedNode={selectedNode} />
            </div>

            <div
              className="splitter"
              onMouseDown={() => {
                isDraggingSplit.current = true
              }}
            >
              <div className="splitter-line" />
            </div>

            <div
              className="panel-graph"
              style={{ width: `${100 - splitPosition}%` }}
            >
              <div className="panel-header">
                <span className="panel-dot panel-dot-blue" />
                调用关系图
                <span className="panel-info">
                  {nodes.length} 函数 · {edges.length} 调用
                </span>
              </div>
              <Graph
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
                filterEntryPoint={filterEntryPoint}
                filterRecursive={filterRecursive}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
