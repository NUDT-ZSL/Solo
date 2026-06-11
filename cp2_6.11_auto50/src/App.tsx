import { useState, useRef, useCallback } from 'react'
import SankeyChart from './components/SankeyChart'
import SidePanel from './components/SidePanel'
import { Upload, Download, FileJson, AlertCircle, X, Menu } from 'lucide-react'

export interface SankeyNode {
  id: string
  label: string
}

export interface SankeyLink {
  source: string
  target: string
  value: number
}

export interface SankeyData {
  nodes: SankeyNode[]
  links: SankeyLink[]
}

export interface FilteredLink {
  source: string
  target: string
  value: number
}

export interface HighlightState {
  type: 'node' | 'link' | null
  id: string | null
}

function App() {
  const [data, setData] = useState<SankeyData | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<HighlightState>({ type: null, id: null })
  const [filteredLinks, setFilteredLinks] = useState<FilteredLink[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chartRef = useRef<{ exportPNG: () => void }>(null)

  const validateData = useCallback((jsonData: unknown): SankeyData | null => {
    if (!jsonData || typeof jsonData !== 'object') {
      setError('数据格式错误：需要包含 nodes 和 links 数组的对象')
      return null
    }

    const obj = jsonData as Record<string, unknown>

    if (!Array.isArray(obj.nodes)) {
      setError('数据格式错误：缺少 nodes 数组')
      return null
    }

    if (!Array.isArray(obj.links)) {
      setError('数据格式错误：缺少 links 数组')
      return null
    }

    const nodeIds = new Set<string>()
    const nodes: SankeyNode[] = []

    for (let i = 0; i < obj.nodes.length; i++) {
      const node = obj.nodes[i] as Record<string, unknown>
      if (!node.id || !node.label) {
        setError(`数据格式错误：第 ${i + 1} 个节点缺少 id 或 label`)
        return null
      }
      if (nodeIds.has(node.id as string)) {
        setError(`数据格式错误：节点 id 重复 - ${node.id}`)
        return null
      }
      nodeIds.add(node.id as string)
      nodes.push({ id: node.id as string, label: node.label as string })
    }

    const links: SankeyLink[] = []
    for (let i = 0; i < obj.links.length; i++) {
      const link = obj.links[i] as Record<string, unknown>
      if (!link.source || !link.target || link.value === undefined) {
        setError(`数据格式错误：第 ${i + 1} 个链接缺少 source、target 或 value`)
        return null
      }
      if (!nodeIds.has(link.source as string)) {
        setError(`数据格式错误：第 ${i + 1} 个链接的 source 节点不存在 - ${link.source}`)
        return null
      }
      if (!nodeIds.has(link.target as string)) {
        setError(`数据格式错误：第 ${i + 1} 个链接的 target 节点不存在 - ${link.target}`)
        return null
      }
      const val = Number(link.value)
      if (isNaN(val) || val <= 0) {
        setError(`数据格式错误：第 ${i + 1} 个链接的 value 必须是正数`)
        return null
      }
      links.push({
        source: link.source as string,
        target: link.target as string,
        value: val,
      })
    }

    setError(null)
    return { nodes, links }
  }, [])

  const processFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('文件格式错误：请上传 JSON 文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string)
        const validData = validateData(json)
        if (validData) {
          setData(validData)
          setSelectedNodeId(null)
          setHighlight({ type: null, id: null })
          setFilteredLinks([])
        }
      } catch {
        setError('文件解析错误：无效的 JSON 格式')
      }
    }
    reader.onerror = () => {
      setError('文件读取失败')
    }
    reader.readAsText(file)
  }, [validateData])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [processFile])

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
    setHighlight({ type: 'node', id: nodeId })
  }, [])

  const handleLinkClick = useCallback((sourceId: string, targetId: string) => {
    setHighlight({ type: 'link', id: `${sourceId}->${targetId}` })
    setSelectedNodeId(null)
  }, [])

  const handleBackgroundClick = useCallback(() => {
    setHighlight({ type: null, id: null })
  }, [])

  const handleLinkFilter = useCallback((source: string, target: string, value: number) => {
    setFilteredLinks(prev => [...prev, { source, target, value }])
  }, [])

  const restoreLink = useCallback((index: number) => {
    setFilteredLinks(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleExport = useCallback(() => {
    chartRef.current?.exportPNG()
  }, [])

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-left">
          <h1 className="app-title">桑基图可视化</h1>
          <span className="header-subtitle">交互式能量流/资金流分析</span>
        </div>
        <div className="header-actions">
          {data && (
            <button className="btn btn-primary" onClick={handleExport}>
              <Download size={18} />
              <span>导出 PNG</span>
            </button>
          )}
          <button
            className="btn btn-secondary mobile-only"
            onClick={() => setMobilePanelOpen(!mobilePanelOpen)}
          >
            <Menu size={18} />
          </button>
        </div>
      </div>

      <div className="app-main">
        <div className="chart-area">
          {!data ? (
            <div
              className={`upload-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon">
                <FileJson size={64} />
              </div>
              <h2 className="upload-title">上传 JSON 数据文件</h2>
              <p className="upload-desc">
                拖拽文件到此处，或点击选择文件
              </p>
              <div className="upload-format">
                <p>文件格式示例：</p>
                <pre>{`{
  "nodes": [
    {"id": "A", "label": "源节点"},
    {"id": "B", "label": "目标节点"}
  ],
  "links": [
    {"source": "A", "target": "B", "value": 100}
  ]
}`}</pre>
              </div>
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                <Upload size={18} />
                <span>选择文件</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <SankeyChart
              ref={chartRef}
              data={data}
              selectedNodeId={selectedNodeId}
              highlight={highlight}
              filteredLinks={filteredLinks}
              onNodeClick={handleNodeClick}
              onLinkClick={handleLinkClick}
              onBackgroundClick={handleBackgroundClick}
              onLinkFilter={handleLinkFilter}
            />
          )}
        </div>

        <div className={`side-panel-wrapper ${mobilePanelOpen ? 'open' : ''}`}>
          <SidePanel
            data={data}
            selectedNodeId={selectedNodeId}
            filteredLinks={filteredLinks}
            onNodeClick={handleNodeClick}
            onRestoreLink={restoreLink}
            onCloseMobile={() => setMobilePanelOpen(false)}
          />
        </div>
      </div>

      {error && (
        <div className="error-toast">
          <div className="error-content">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button className="error-close" onClick={() => setError(null)}>
            <X size={18} />
          </button>
        </div>
      )}

      <style>{`
        .app-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background-color: #1A1A2E;
        }

        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: linear-gradient(135deg, rgba(22, 33, 62, 0.8) 0%, rgba(26, 26, 46, 0.9) 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .app-title {
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #E94560 0%, #0F3460 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.5);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-primary {
          background: linear-gradient(135deg, #E94560 0%, #0F3460 100%);
          color: white;
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(233, 69, 96, 0.4);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .mobile-only {
          display: none;
        }

        .app-main {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .chart-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        .upload-zone {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 40px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px dashed transparent;
        }

        .upload-zone:hover,
        .upload-zone.dragging {
          border-color: rgba(233, 69, 96, 0.5);
          background: rgba(233, 69, 96, 0.03);
        }

        .upload-icon {
          color: #E94560;
          opacity: 0.8;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .upload-title {
          font-size: 24px;
          font-weight: 600;
          color: white;
        }

        .upload-desc {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
        }

        .upload-format {
          background: rgba(0, 0, 0, 0.3);
          padding: 16px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .upload-format p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 8px;
        }

        .upload-format pre {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
          font-family: 'Consolas', 'Monaco', monospace;
          line-height: 1.6;
        }

        .side-panel-wrapper {
          width: 300px;
          flex-shrink: 0;
          z-index: 5;
        }

        .error-toast {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(220, 53, 69, 0.95);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          z-index: 100;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: white;
        }

        .error-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.8;
          padding: 4px;
          display: flex;
        }

        .error-close:hover {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .mobile-only {
            display: flex;
          }

          .side-panel-wrapper {
            position: absolute;
            top: 0;
            right: 0;
            height: 100%;
            transform: translateX(100%);
            transition: transform 0.3s ease;
          }

          .side-panel-wrapper.open {
            transform: translateX(0);
          }

          .header-subtitle {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

export default App
