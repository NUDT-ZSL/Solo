import React, { useState, useEffect, useCallback } from 'react';
import type { SkillNode } from './types';
import { skillsApi } from './utils/http';
import SkillTree from './components/SkillTree';
import NodeEditor from './components/NodeEditor';
import PathPlanner from './components/PathPlanner';

type RightPanel = 'editor' | 'path';

const App: React.FC = () => {
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<RightPanel>('editor');
  const [addingChildFor, setAddingChildFor] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    try {
      const data = await skillsApi.getAll();
      setNodes(data);
    } catch {
      console.error('Failed to fetch nodes');
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setActivePanel('editor');
  };

  const handleAddChild = (parentId: string) => {
    setAddingChildFor(parentId);
    setActivePanel('editor');
  };

  const handleReset = async () => {
    try {
      await skillsApi.reset();
      setSelectedId(null);
      setAddingChildFor(null);
      fetchNodes();
    } catch {
      console.error('Failed to reset');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <nav
        style={{
          height: 64,
          background: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🌳</span>
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 20,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              letterSpacing: -0.5,
            }}
          >
            SkillTrove
          </span>
        </div>
        <button
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
          }}
        >
          🔄 一键重置
        </button>
      </nav>

      <div
        className="main-layout"
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <div
          className="tree-panel"
          style={{
            width: 420,
            background: '#f8f9fa',
            borderRight: '1px solid #e0e0e0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#2c3e50' }}>
              技能树
            </span>
            <span style={{ fontSize: 12, color: '#90a4ae' }}>
              {nodes.length} 个节点
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <SkillTree
              nodes={nodes}
              selectedId={selectedId}
              onSelect={handleSelect}
              onAddChild={handleAddChild}
            />
          </div>
        </div>

        <div
          className="right-panel"
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid #e0e0e0',
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setActivePanel('editor')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: activePanel === 'editor' ? '#fff' : '#f8f9fa',
                border: 'none',
                borderBottom: activePanel === 'editor' ? '2px solid #2c3e50' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activePanel === 'editor' ? 600 : 400,
                color: activePanel === 'editor' ? '#2c3e50' : '#78909c',
                transition: 'all 0.2s ease',
              }}
            >
              ✏️ 节点编辑
            </button>
            <button
              onClick={() => setActivePanel('path')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: activePanel === 'path' ? '#fff' : '#f8f9fa',
                border: 'none',
                borderBottom: activePanel === 'path' ? '2px solid #2c3e50' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: activePanel === 'path' ? 600 : 400,
                color: activePanel === 'path' ? '#2c3e50' : '#78909c',
                transition: 'all 0.2s ease',
              }}
            >
              🗺️ 学习路径
            </button>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {activePanel === 'editor' ? (
              <NodeEditor
                nodes={nodes}
                selectedId={addingChildFor || selectedId}
                onRefresh={fetchNodes}
                onAddChild={handleAddChild}
              />
            ) : (
              <PathPlanner onRefresh={fetchNodes} />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .main-layout {
            flex-direction: column !important;
          }
          .tree-panel {
            width: 100% !important;
            height: 45vh !important;
            border-right: none !important;
            border-bottom: 1px solid #e0e0e0 !important;
          }
          .right-panel {
            flex: 1 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
