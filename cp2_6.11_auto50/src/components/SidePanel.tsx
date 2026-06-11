import { useMemo } from 'react'
import { SankeyData, FilteredLink } from '../App'
import { Activity, ArrowDownToLine, ArrowUpFromLine, Layers, Filter, X, ChevronRight, BarChart3 } from 'lucide-react'

interface SidePanelProps {
  data: SankeyData | null
  selectedNodeId: string | null
  filteredLinks: FilteredLink[]
  onNodeClick: (nodeId: string) => void
  onRestoreLink: (index: number) => void
  onCloseMobile: () => void
}

function SidePanel({
  data,
  selectedNodeId,
  filteredLinks,
  onNodeClick,
  onRestoreLink,
  onCloseMobile,
}: SidePanelProps) {
  const selectedNode = useMemo(() => {
    if (!data || !selectedNodeId) return null
    return data.nodes.find(n => n.id === selectedNodeId) || null
  }, [data, selectedNodeId])

  const nodeStats = useMemo(() => {
    if (!data || !selectedNodeId) return null

    const upstreamNodes: { id: string; label: string; value: number }[] = []
    const downstreamNodes: { id: string; label: string; value: number }[] = []
    let inputTotal = 0
    let outputTotal = 0

    data.links.forEach(link => {
      if (link.target === selectedNodeId) {
        inputTotal += link.value
        const sourceNode = data.nodes.find(n => n.id === link.source)
        if (sourceNode) {
          upstreamNodes.push({ id: sourceNode.id, label: sourceNode.label, value: link.value })
        }
      }
      if (link.source === selectedNodeId) {
        outputTotal += link.value
        const targetNode = data.nodes.find(n => n.id === link.target)
        if (targetNode) {
          downstreamNodes.push({ id: targetNode.id, label: targetNode.label, value: link.value })
        }
      }
    })

    return {
      inputTotal,
      outputTotal,
      upstreamNodes: upstreamNodes.sort((a, b) => b.value - a.value),
      downstreamNodes: downstreamNodes.sort((a, b) => b.value - a.value),
    }
  }, [data, selectedNodeId])

  const summaryStats = useMemo(() => {
    if (!data) return null
    const totalFlow = data.links.reduce((sum, l) => sum + l.value, 0)
    return {
      nodeCount: data.nodes.length,
      linkCount: data.links.length - filteredLinks.length,
      totalFlow,
    }
  }, [data, filteredLinks])

  return (
    <div className="side-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          {selectedNode ? (
            <><Layers size={18} /> 节点详情</>
          ) : (
            <><BarChart3 size={18} /> 全图概览</>
          )}
        </h3>
        <button className="panel-close mobile-only" onClick={onCloseMobile}>
          <X size={18} />
        </button>
      </div>

      <div className="panel-content">
        {selectedNode ? (
          <div className="detail-view">
            <div className="info-card primary">
              <Activity size={24} />
              <div className="info-text">
                <span className="info-label">节点名称</span>
                <span className="info-value">{selectedNode.label}</span>
              </div>
            </div>

            <div className="stats-grid">
              <div className="info-card">
                <ArrowDownToLine size={20} className="icon-green" />
                <div className="info-text">
                  <span className="info-label">输入总流量</span>
                  <span className="info-value">{nodeStats?.inputTotal.toLocaleString() || 0}</span>
                </div>
              </div>
              <div className="info-card">
                <ArrowUpFromLine size={20} className="icon-red" />
                <div className="info-text">
                  <span className="info-label">输出总流量</span>
                  <span className="info-value">{nodeStats?.outputTotal.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {nodeStats && nodeStats.upstreamNodes.length > 0 && (
              <div className="node-section">
                <h4 className="section-title">上游节点</h4>
                <div className="node-list">
                  {nodeStats.upstreamNodes.map(node => (
                    <button
                      key={node.id}
                      className="node-item"
                      onClick={() => onNodeClick(node.id)}
                    >
                      <span className="node-name">{node.label}</span>
                      <div className="node-right">
                        <span className="node-value">{node.value.toLocaleString()}</span>
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {nodeStats && nodeStats.downstreamNodes.length > 0 && (
              <div className="node-section">
                <h4 className="section-title">下游节点</h4>
                <div className="node-list">
                  {nodeStats.downstreamNodes.map(node => (
                    <button
                      key={node.id}
                      className="node-item"
                      onClick={() => onNodeClick(node.id)}
                    >
                      <span className="node-name">{node.label}</span>
                      <div className="node-right">
                        <span className="node-value">{node.value.toLocaleString()}</span>
                        <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="summary-view">
            {summaryStats ? (
              <>
                <div className="info-card primary">
                  <BarChart3 size={24} />
                  <div className="info-text">
                    <span className="info-label">全图总流量</span>
                    <span className="info-value">{summaryStats.totalFlow.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="info-card">
                    <Layers size={20} />
                    <div className="info-text">
                      <span className="info-label">节点数量</span>
                      <span className="info-value">{summaryStats.nodeCount}</span>
                    </div>
                  </div>
                  <div className="info-card">
                    <Activity size={20} />
                    <div className="info-text">
                      <span className="info-label">连接数量</span>
                      <span className="info-value">{summaryStats.linkCount}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <Activity size={48} />
                <p>上传数据后查看统计</p>
              </div>
            )}
          </div>
        )}

        {filteredLinks.length > 0 && (
          <div className="filter-section">
            <h4 className="section-title">
              <Filter size={16} />
              已过滤 ({filteredLinks.length})
            </h4>
            <div className="filter-list">
              {filteredLinks.map((link, index) => {
                const sourceNode = data?.nodes.find(n => n.id === link.source)
                const targetNode = data?.nodes.find(n => n.id === link.target)
                return (
                  <div key={index} className="filter-item">
                    <span className="filter-name">
                      {sourceNode?.label || link.source} → {targetNode?.label || link.target}
                    </span>
                    <button className="filter-restore" onClick={() => onRestoreLink(index)} title="恢复">
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .side-panel {
          width: 100%;
          height: 100%;
          background: rgba(22, 33, 62, 0.6);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-left: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          flex-direction: column;
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: white;
        }

        .panel-close {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          padding: 4px;
          display: none;
        }

        .panel-close:hover {
          color: white;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
        }

        .panel-content::-webkit-scrollbar {
          width: 6px;
        }

        .panel-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .panel-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          margin-bottom: 12px;
          color: rgba(255, 255, 255, 0.7);
          transition: all 0.2s ease;
        }

        .info-card.primary {
          background: linear-gradient(135deg, rgba(233, 69, 96, 0.15) 0%, rgba(15, 52, 96, 0.15) 100%);
          border-color: rgba(233, 69, 96, 0.2);
          color: white;
        }

        .info-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }

        .info-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 18px;
          font-weight: 600;
          color: white;
        }

        .icon-green {
          color: #4ade80;
        }

        .icon-red {
          color: #f87171;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 12px;
        }

        .stats-grid .info-card {
          margin-bottom: 0;
          padding: 12px;
        }

        .stats-grid .info-value {
          font-size: 15px;
        }

        .node-section {
          margin-top: 16px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 10px;
        }

        .node-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .node-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
        }

        .node-item:hover {
          background: rgba(233, 69, 96, 0.1);
          border-color: rgba(233, 69, 96, 0.2);
        }

        .node-name {
          font-size: 13px;
        }

        .node-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .node-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-family: 'Consolas', 'Monaco', monospace;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.4);
        }

        .empty-state p {
          font-size: 14px;
        }

        .filter-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .filter-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(251, 146, 60, 0.08);
          border: 1px solid rgba(251, 146, 60, 0.15);
          border-radius: 6px;
        }

        .filter-name {
          font-size: 12px;
          color: rgba(251, 146, 60, 0.8);
        }

        .filter-restore {
          background: none;
          border: none;
          color: rgba(251, 146, 60, 0.6);
          cursor: pointer;
          padding: 2px;
          display: flex;
          transition: color 0.2s;
        }

        .filter-restore:hover {
          color: #fb923c;
        }

        .mobile-only {
          display: none;
        }

        @media (max-width: 768px) {
          .mobile-only {
            display: flex;
          }

          .side-panel {
            border-left: none;
          }
        }
      `}</style>
    </div>
  )
}

export default SidePanel
