import React from 'react';
import type { CausalNode } from './types';

interface NodePanelProps {
  nodes: CausalNode[];
  selectedNodeId: string | null;
  isSimulating: boolean;
  sidebarOpen: boolean;
  isSmallScreen: boolean;
  onNodeSelect: (nodeId: string | null) => void;
  onTriggerNode: (nodeId: string) => void;
  onSaveNetwork: () => void;
  onLoadNetwork: () => void;
  onReset: () => void;
}

const NodePanel: React.FC<NodePanelProps> = ({
  nodes,
  selectedNodeId,
  isSimulating,
  sidebarOpen,
  isSmallScreen,
  onNodeSelect,
  onTriggerNode,
  onSaveNetwork,
  onLoadNetwork,
  onReset,
}) => {
  return (
    <aside
      className={`sidebar ${sidebarOpen ? (isSmallScreen ? 'open' : '') : (isSmallScreen ? 'collapsed' : '')}`}
    >
      <div className="sidebar-title">因果织网</div>

      <div style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(0, 212, 255, 0.08)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        fontSize: 11,
        color: 'rgba(255,255,255,0.75)',
        lineHeight: 1.6,
      }}>
        <div style={{ color: '#00D4FF', fontWeight: 600, marginBottom: 4, letterSpacing: 1 }}>
          操作提示
        </div>
        <div>· 双击画布空白处创建节点</div>
        <div>· 拖拽节点可调整位置</div>
        <div>· Shift + 拖拽节点可连线</div>
        <div>· 点击连线中点调整权重</div>
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'space-between',
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        alignItems: 'center',
      }}>
        <span style={{ letterSpacing: 2 }}>节点列表</span>
        <span>
          <span style={{ color: '#00D4FF', fontWeight: 700, fontSize: 14 }}>{nodes.length}</span>
          <span style={{ margin: '0 4px' }}>个</span>
        </span>
      </div>

      <div className="node-list">
        {nodes.length === 0 ? (
          <div style={{
            padding: '30px 10px',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 12,
            lineHeight: 1.8,
          }}>
            画布还是空的
            <br />
            双击右侧画布开始创建第一个节点吧 🌟
          </div>
        ) : (
          nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                className={`node-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onNodeSelect(node.id)}
              >
                <div
                  className="node-color-dot"
                  style={{
                    backgroundColor: node.color,
                    boxShadow: `0 0 8px ${node.color}`,
                  }}
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div className="node-name" title={node.name}>
                    {node.name}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.35)',
                  }}>
                    ID: {node.id.slice(0, 6)}
                  </div>
                </div>
                <button
                  className="node-trigger-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNodeSelect(node.id);
                    onTriggerNode(node.id);
                  }}
                  disabled={isSimulating}
                  style={{
                    opacity: isSimulating ? 0.4 : 1,
                    cursor: isSimulating ? 'not-allowed' : 'pointer',
                  }}
                  title="从该节点触发模拟"
                >
                  触发
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-actions">
        <button
          className="sidebar-btn save"
          onClick={onSaveNetwork}
          disabled={nodes.length === 0}
          style={{ opacity: nodes.length === 0 ? 0.4 : 1, cursor: nodes.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span>保存网络</span>
        </button>

        <button
          className="sidebar-btn load"
          onClick={onLoadNetwork}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>载入网络</span>
        </button>

        <button
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid rgba(255, 107, 107, 0.4)',
            borderRadius: 8,
            fontSize: '0.9rem',
            background: 'rgba(255, 107, 107, 0.08)',
            color: '#FF8A8A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: nodes.length === 0 ? 'not-allowed' : 'pointer',
            opacity: nodes.length === 0 ? 0.3 : 1,
            transition: 'all 0.3s ease',
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
          onClick={onReset}
          disabled={nodes.length === 0}
          onMouseEnter={(e) => {
            if (nodes.length > 0) {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 107, 107, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          <span>清空画布</span>
        </button>
      </div>

      <div style={{
        marginTop: 'auto',
        paddingTop: 15,
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontSize: 10,
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'center',
        lineHeight: 1.7,
      }}>
        <div>因果织网 · Causal Weave</div>
        <div>交互式因果网络模拟器</div>
      </div>
    </aside>
  );
};

export default NodePanel;
