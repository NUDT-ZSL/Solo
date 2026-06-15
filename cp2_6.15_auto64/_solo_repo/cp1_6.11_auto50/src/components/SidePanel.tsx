import { useMemo } from 'react';
import type { SankeyData, SankeyNode, SankeyLink, SelectionState, FilterState, NodeStats } from '../types';

interface SidePanelProps {
  data: SankeyData | null;
  selection: SelectionState;
  filterState: FilterState;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
  onNodeClick: (nodeId: string) => void;
  onRestoreLink: (linkIndex: number) => void;
  onRestoreAll: () => void;
}

function getNodeStats(
  nodeId: string,
  data: SankeyData,
  filteredLinks: number[]
): NodeStats | null {
  const node = data.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const validLinks = data.links.filter((_, i) => !filteredLinks.includes(i));

  const incomingLinks = validLinks.filter(l => {
    const target = typeof l.target === 'string' ? l.target : l.target.id;
    return target === nodeId;
  });

  const outgoingLinks = validLinks.filter(l => {
    const source = typeof l.source === 'string' ? l.source : l.source.id;
    return source === nodeId;
  });

  const totalIn = incomingLinks.reduce((sum, l) => sum + l.value, 0);
  const totalOut = outgoingLinks.reduce((sum, l) => sum + l.value, 0);

  const upstreamNodes = incomingLinks.map(l => {
    const sourceId = typeof l.source === 'string' ? l.source : l.source?.id;
    const sourceNode = data.nodes.find(n => n.id === sourceId);
    return {
      id: sourceNode?.id || '',
      label: sourceNode?.label || '',
      value: l.value
    };
  }).filter(n => n.id);

  const downstreamNodes = outgoingLinks.map(l => {
    const targetId = typeof l.target === 'string' ? l.target : l.target?.id;
    const targetNode = data.nodes.find(n => n.id === targetId);
    return {
      id: targetNode?.id || '',
      label: targetNode?.label || '',
      value: l.value
    };
  }).filter(n => n.id);

  return {
    id: node.id,
    label: node.label,
    totalIn,
    totalOut,
    upstreamNodes,
    downstreamNodes
  };
}

export default function SidePanel({
  data,
  selection,
  filterState,
  fileName,
  isOpen,
  onClose,
  onNodeClick,
  onRestoreLink,
  onRestoreAll
}: SidePanelProps) {
  const selectedNodeStats = useMemo(() => {
    if (!data || selection.type !== 'node' || !selection.data) return null;
    const node = selection.data as SankeyNode;
    return getNodeStats(node.id, data, filterState.filteredLinks);
  }, [data, selection, filterState.filteredLinks]);

  const selectedLinkInfo = useMemo(() => {
    if (!data || selection.type !== 'link' || !selection.data) return null;
    const link = selection.data as SankeyLink;
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as SankeyNode)?.id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as SankeyNode)?.id;
    const sourceNode = data.nodes.find(n => n.id === sourceId);
    const targetNode = data.nodes.find(n => n.id === targetId);
    return {
      sourceLabel: sourceNode?.label || sourceId || '',
      targetLabel: targetNode?.label || targetId || '',
      value: link.value,
      index: link.index
    };
  }, [data, selection]);

  const overallStats = useMemo(() => {
    if (!data) return null;
    const validLinks = data.links.filter((_, i) => !filterState.filteredLinks.includes(i));
    const totalFlow = validLinks.reduce((sum, l) => sum + l.value, 0);
    const nodeCount = data.nodes.length;
    const linkCount = validLinks.length;
    return { totalFlow, nodeCount, linkCount };
  }, [data, filterState.filteredLinks]);

  const filteredLinkItems = useMemo(() => {
    if (!data || filterState.filteredLinks.length === 0) return [];
    return filterState.filteredLinks.map(idx => {
      const link = data.links[idx];
      if (!link) return null;
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as SankeyNode)?.id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as SankeyNode)?.id;
      const sourceNode = data.nodes.find(n => n.id === sourceId);
      const targetNode = data.nodes.find(n => n.id === targetId);
      return {
        index: idx,
        sourceLabel: sourceNode?.label || sourceId || '',
        targetLabel: targetNode?.label || targetId || '',
        value: link.value
      };
    }).filter(Boolean) as { index: number; sourceLabel: string; targetLabel: string; value: number }[];
  }, [data, filterState.filteredLinks]);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
  };

  return (
    <aside className={`side-panel ${isOpen ? 'open' : ''}`}>
      <div className="panel-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 className="panel-title">数据面板</h2>
            <p className="panel-subtitle">
              {fileName ? fileName : '桑基图分析'}
            </p>
          </div>
          <button
            className="mobile-close-btn"
            onClick={onClose}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              color: '#8892B0',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '20px'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="panel-content">
        {!data ? (
          <div className="empty-state">
            <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="empty-state-text">
              请上传 JSON 数据文件<br />
              以开始分析
            </p>
          </div>
        ) : (
          <>
            {selection.type === 'node' && selectedNodeStats ? (
              <>
                <div className="stats-section">
                  <div className="node-title">
                    {selectedNodeStats.label}
                    <div className="node-id">ID: {selectedNodeStats.id}</div>
                  </div>
                </div>

                <div className="stats-section">
                  <div className="stats-section-title">流量统计</div>
                  <div className="stats-card">
                    <div className="stats-card-label">输入总流量</div>
                    <div className="stats-card-value in">
                      {formatNumber(selectedNodeStats.totalIn)}
                    </div>
                  </div>
                  <div className="stats-card">
                    <div className="stats-card-label">输出总流量</div>
                    <div className="stats-card-value out">
                      {formatNumber(selectedNodeStats.totalOut)}
                    </div>
                  </div>
                </div>

                {selectedNodeStats.upstreamNodes.length > 0 && (
                  <div className="stats-section">
                    <div className="stats-section-title">上游节点</div>
                    {selectedNodeStats.upstreamNodes.map(n => (
                      <div
                        key={n.id}
                        className="node-list-item"
                        onClick={() => onNodeClick(n.id)}
                      >
                        <span className="node-list-name">{n.label}</span>
                        <span className="node-list-value in">{formatNumber(n.value)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedNodeStats.downstreamNodes.length > 0 && (
                  <div className="stats-section">
                    <div className="stats-section-title">下游节点</div>
                    {selectedNodeStats.downstreamNodes.map(n => (
                      <div
                        key={n.id}
                        className="node-list-item"
                        onClick={() => onNodeClick(n.id)}
                      >
                        <span className="node-list-name">{n.label}</span>
                        <span className="node-list-value out">{formatNumber(n.value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : selection.type === 'link' && selectedLinkInfo ? (
              <>
                <div className="stats-section">
                  <div className="node-title">
                    流量详情
                    <div className="node-id">#{selectedLinkInfo.index}</div>
                  </div>
                </div>

                <div className="stats-section">
                  <div className="stats-section-title">连接信息</div>
                  <div className="flow-row">
                    <span className="flow-label">源节点</span>
                    <span className="flow-value">{selectedLinkInfo.sourceLabel}</span>
                  </div>
                  <div className="flow-row">
                    <span className="flow-label">目标节点</span>
                    <span className="flow-value">{selectedLinkInfo.targetLabel}</span>
                  </div>
                  <div className="flow-row">
                    <span className="flow-label">流量值</span>
                    <span className="flow-value out">{formatNumber(selectedLinkInfo.value)}</span>
                  </div>
                </div>

                <div className="stats-section">
                  <div className="stats-section-title">提示</div>
                  <div style={{
                    background: 'rgba(233, 69, 96, 0.1)',
                    border: '1px solid rgba(233, 69, 96, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '12px',
                    color: '#E8E8E8',
                    lineHeight: 1.6
                  }}>
                    双击桑基图中的流量带可以将其过滤，过滤后可在此面板恢复。
                  </div>
                </div>
              </>
            ) : (
              <>
                {overallStats && (
                  <div className="stats-section">
                    <div className="stats-section-title">全图概览</div>
                    <div className="stats-card">
                      <div className="stats-card-label">总流量</div>
                      <div className="stats-card-value">{formatNumber(overallStats.totalFlow)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div className="stats-card" style={{ flex: 1 }}>
                        <div className="stats-card-label">节点数</div>
                        <div className="stats-card-value small">{overallStats.nodeCount}</div>
                      </div>
                      <div className="stats-card" style={{ flex: 1 }}>
                        <div className="stats-card-label">连接数</div>
                        <div className="stats-card-value small">{overallStats.linkCount}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="stats-section">
                  <div className="stats-section-title">操作说明</div>
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    fontSize: '12px',
                    color: '#8892B0',
                    lineHeight: 1.8
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#E94560' }}>●</span> 拖拽节点调整位置
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#E94560' }}>●</span> 点击元素高亮路径
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ color: '#E94560' }}>●</span> 双击流量带过滤
                    </div>
                    <div>
                      <span style={{ color: '#E94560' }}>●</span> 滚轮缩放平移画布
                    </div>
                  </div>
                </div>
              </>
            )}

            {filteredLinkItems.length > 0 && (
              <div className="stats-section">
                <div className="stats-section-title" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>已过滤 ({filteredLinkItems.length})</span>
                </div>
                {filteredLinkItems.map(item => (
                  <div key={item.index} className="filter-item">
                    <div className="filter-item-name">
                      <div style={{ fontSize: '13px', marginBottom: '2px' }}>
                        {item.sourceLabel} → {item.targetLabel}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8892B0' }}>
                        流量: {formatNumber(item.value)}
                      </div>
                    </div>
                    <button
                      className="filter-restore-btn"
                      onClick={() => onRestoreLink(item.index)}
                    >
                      恢复
                    </button>
                  </div>
                ))}
                <button className="restore-all-btn" onClick={onRestoreAll}>
                  恢复所有过滤
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
