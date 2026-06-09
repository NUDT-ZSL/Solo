import { useState, useCallback, useEffect, useRef } from 'react';
import Canvas from './components/Canvas';
import Preview from './components/Preview';
import { DialogueNode, Connection, HistoryState, generateId, NODE_STYLE_PRESETS } from './types';
import axios from 'axios';

type Toast = { id: string; message: string };

const MAX_HISTORY = 20;

export default function App() {
  const [nodes, setNodes] = useState<DialogueNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveParticleRef = useRef<HTMLDivElement>(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const showToast = useCallback((message: string) => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 1500);
  }, []);

  const saveHistory = useCallback((newNodes: DialogueNode[], newConnections: Connection[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: JSON.parse(JSON.stringify(newNodes)), connections: JSON.parse(JSON.stringify(newConnections)) });
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(newHistory.length - MAX_HISTORY);
      }
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setConnections(JSON.parse(JSON.stringify(state.connections)));
      setHistoryIndex(newIndex);
      showToast('↶ 撤销操作');
    }
  }, [history, historyIndex, showToast]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setConnections(JSON.parse(JSON.stringify(state.connections)));
      setHistoryIndex(newIndex);
      showToast('↷ 重做操作');
    }
  }, [history, historyIndex, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Delete' && selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNodeId]);

  useEffect(() => {
    if (history.length === 0 && nodes.length === 0) {
      setHistory([{ nodes: [], connections: [] }]);
      setHistoryIndex(0);
    }
  }, []);

  const updateNodes = useCallback((newNodes: DialogueNode[], recordHistory = true) => {
    if (recordHistory) saveHistory(newNodes, connections);
    setNodes(newNodes);
  }, [connections, saveHistory]);

  const updateConnections = useCallback((newConnections: Connection[], recordHistory = true) => {
    if (recordHistory) saveHistory(nodes, newConnections);
    setConnections(newConnections);
  }, [nodes, saveHistory]);

  const deleteNode = useCallback((nodeId: string) => {
    const newNodes = nodes.filter(n => n.id !== nodeId);
    const newConnections = connections.filter(c => c.from !== nodeId && c.to !== nodeId);
    saveHistory(newNodes, newConnections);
    setNodes(newNodes);
    setConnections(newConnections);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    showToast('✕ 删除节点');
  }, [nodes, connections, selectedNodeId, saveHistory, showToast]);

  const handleSave = async () => {
    if (saveParticleRef.current) {
      saveParticleRef.current.style.animation = 'none';
      void saveParticleRef.current.offsetWidth;
      saveParticleRef.current.style.animation = 'saveParticle 1.2s ease-out forwards';
    }
    try {
      const res = await axios.post('/api/save', { nodes, connections, savedAt: new Date().toISOString() });
      if (res.data.success) {
        showToast(`✓ 已保存: ${res.data.filename}`);
      }
    } catch {
      showToast('✓ 已保存到本地');
      const blob = new Blob([JSON.stringify({ nodes, connections }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dialogue_tree_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.data) await loadProjectData(data.data);
        else await loadProjectData(data);
        showToast('✓ 项目已加载');
      } catch {
        showToast('✕ 文件格式错误');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadProjectData = async (data: { nodes: DialogueNode[]; connections: Connection[] }) => {
    const newNodes = data.nodes.map((n, i) => ({ ...n, _flyIn: true, _delay: i * 50 } as DialogueNode & { _flyIn?: boolean; _delay?: number }));
    saveHistory(data.nodes, data.connections);
    setNodes(data.nodes);
    setConnections(data.connections);
    setSelectedNodeId(null);
  };

  const updateSelectedNode = useCallback((updates: Partial<DialogueNode>) => {
    if (!selectedNodeId) return;
    const newNodes = nodes.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n);
    saveHistory(newNodes, connections);
    setNodes(newNodes);
  }, [selectedNodeId, nodes, connections, saveHistory]);

  return (
    <div style={styles.app}>
      <style>{globalStyles}</style>

      <div style={styles.toolbar} className="toolbar">
        <div style={styles.toolbarTitle}>对话织网</div>
        <div style={styles.toolbarButtons}>
          <ToolButton icon="↶" title="撤销 (Ctrl+Z)" onClick={undo} disabled={historyIndex <= 0} />
          <ToolButton icon="↷" title="重做 (Ctrl+Shift+Z)" onClick={redo} disabled={historyIndex >= history.length - 1} />
          <div style={{ width: 1, height: 28, background: '#3a3a5e', margin: '0 8px' }} />
          <ToolButton icon="💾" title="保存项目" onClick={handleSave} />
          <ToolButton icon="📂" title="加载项目" onClick={() => fileInputRef.current?.click()} />
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
          <div style={{ width: 1, height: 28, background: '#3a3a5e', margin: '0 8px' }} />
          <ToolButton icon="▶" title="预览对话" onClick={() => { setPreviewProgress(0); setIsPreviewMode(true); }} accent />
        </div>
      </div>

      <div style={styles.mainContent}>
        <Canvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          onNodesChange={(n) => setNodes(n)}
          onConnectionsChange={(c) => setConnections(c)}
          onSelectNode={setSelectedNodeId}
          onSaveHistory={saveHistory}
          onShowToast={showToast}
        />

        <div style={styles.sidePanel}>
          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>节点属性</div>
            {selectedNode ? (
              <>
                <div style={styles.panelLabel}>节点标题</div>
                <input
                  style={styles.textInput}
                  value={selectedNode.title}
                  maxLength={20}
                  onChange={(e) => updateSelectedNode({ title: e.target.value })}
                  placeholder="输入标题..."
                />
                <div style={styles.panelLabel}>对话内容</div>
                <textarea
                  style={{ ...styles.textInput, minHeight: 80, resize: 'vertical' }}
                  value={selectedNode.content}
                  maxLength={200}
                  onChange={(e) => updateSelectedNode({ content: e.target.value })}
                  placeholder="输入对话内容..."
                />

                <div style={styles.panelLabel}>背景配色</div>
                <div style={styles.colorGrid}>
                  {NODE_STYLE_PRESETS.map((preset) => (
                    <div
                      key={preset.name}
                      title={preset.name}
                      onClick={() => updateSelectedNode({ bgColor: preset.gradientStart })}
                      style={{
                        ...styles.colorSwatch,
                        background: `linear-gradient(135deg, ${preset.gradientStart}, ${preset.gradientEnd})`,
                        outline: selectedNode.bgColor === preset.gradientStart ? '2px solid #e94560' : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>

                <div style={styles.panelLabel}>角色头像颜色</div>
                <div style={styles.huePickerWrap}>
                  <input
                    type="color"
                    value={selectedNode.avatarColor}
                    onChange={(e) => updateSelectedNode({ avatarColor: e.target.value })}
                    style={styles.huePicker}
                  />
                  <div style={{ ...styles.colorSwatch, background: selectedNode.avatarColor, borderRadius: '50%' }} />
                </div>

                <div style={styles.panelLabel}>打字速度: {selectedNode.typingSpeed}ms/字</div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={selectedNode.typingSpeed}
                  onChange={(e) => updateSelectedNode({ typingSpeed: Number(e.target.value) })}
                  style={styles.slider}
                />

                <button style={styles.deleteBtn} onClick={() => deleteNode(selectedNode.id)}>
                  删除节点
                </button>
              </>
            ) : (
              <div style={styles.emptyHint}>
                选中一个节点查看属性<br />
                <span style={{ opacity: 0.6, fontSize: 12 }}>双击画布创建新节点<br />Shift+拖拽连接节点</span>
              </div>
            )}
          </div>

          <div style={styles.panelSection}>
            <div style={styles.panelTitle}>统计信息</div>
            <div style={styles.statRow}><span>节点数量</span><span style={{ color: '#e94560', fontWeight: 600 }}>{nodes.length}</span></div>
            <div style={styles.statRow}><span>连接数量</span><span style={{ color: '#4ade80', fontWeight: 600 }}>{connections.length}</span></div>
            <div style={styles.statRow}><span>历史步数</span><span>{history.length}/{MAX_HISTORY}</span></div>
          </div>
        </div>
      </div>

      <div style={styles.toastContainer}>
        {toasts.map(t => (
          <div key={t.id} style={styles.toast} className="toast">{t.message}</div>
        ))}
      </div>

      <div ref={saveParticleRef} style={styles.saveParticle} />

      {isPreviewMode && (
        <Preview
          nodes={nodes}
          connections={connections}
          progress={previewProgress}
          onProgress={setPreviewProgress}
          onClose={() => setIsPreviewMode(false)}
        />
      )}
    </div>
  );
}

function ToolButton({ icon, title, onClick, disabled, accent }: {
  icon: string; title: string; onClick: () => void; disabled?: boolean; accent?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...styles.toolButton,
        ...(accent ? { background: 'linear-gradient(135deg, #e94560, #c73651)', color: '#fff' } : {}),
        ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
      }}
      className="tool-btn"
    >
      {icon}
    </button>
  );
}

const styles = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#0f0f23',
  } as React.CSSProperties,
  toolbar: {
    height: 56,
    background: 'linear-gradient(180deg, #16162e 0%, #121228 100%)',
    borderBottom: '1px solid #2a2a4e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    zIndex: 100,
  } as React.CSSProperties,
  toolbarTitle: {
    fontSize: 18,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e94560, #ff6b6b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 1,
  } as React.CSSProperties,
  toolbarButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  } as React.CSSProperties,
  toolButton: {
    width: 40,
    height: 40,
    border: 'none',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    color: '#e0e0f0',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  } as React.CSSProperties,
  mainContent: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
    position: 'relative',
  } as React.CSSProperties,
  sidePanel: {
    width: 280,
    background: '#121228',
    borderLeft: '1px solid #2a2a4e',
    padding: 16,
    overflowY: 'auto',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  } as React.CSSProperties,
  panelSection: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #2a2a4e',
  } as React.CSSProperties,
  panelTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#8888aa',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as React.CSSProperties,
  panelLabel: {
    fontSize: 12,
    color: '#aaaacc',
    margin: '10px 0 6px',
  } as React.CSSProperties,
  textInput: {
    width: '100%',
    background: '#0a0a1a',
    border: '1px solid #2a2a4e',
    borderRadius: 6,
    padding: '8px 10px',
    color: '#fff',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border 0.2s',
  } as React.CSSProperties,
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
  } as React.CSSProperties,
  colorSwatch: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'transform 0.2s',
    border: '1px solid rgba(255,255,255,0.1)',
  } as React.CSSProperties,
  huePickerWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  } as React.CSSProperties,
  huePicker: {
    flex: 1,
    height: 32,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  slider: {
    width: '100%',
    accentColor: '#e94560',
  } as React.CSSProperties,
  deleteBtn: {
    marginTop: 16,
    width: '100%',
    padding: '10px',
    background: 'rgba(233,69,96,0.15)',
    border: '1px solid rgba(233,69,96,0.3)',
    color: '#e94560',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  } as React.CSSProperties,
  emptyHint: {
    color: '#6666aa',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 1.8,
    padding: '20px 0',
  } as React.CSSProperties,
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: 13,
    color: '#aaaacc',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  } as React.CSSProperties,
  toastContainer: {
    position: 'fixed',
    left: 20,
    top: 80,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 1000,
    pointerEvents: 'none',
  } as React.CSSProperties,
  toast: {
    padding: '10px 18px',
    background: 'rgba(0,0,0,0.75)',
    color: '#fff',
    borderRadius: 8,
    fontSize: 13,
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    animation: 'toastFade 1.5s ease forwards',
  } as React.CSSProperties,
  saveParticle: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: 10,
    height: 10,
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 999,
  } as React.CSSProperties,
};

const globalStyles = `
  @keyframes toastFade {
    0% { opacity: 0; transform: translateX(-20px); }
    15% { opacity: 1; transform: translateX(0); }
    75% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0; transform: translateX(-10px); }
  }
  @keyframes saveParticle {
    0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.8); transform: scale(1); opacity: 1; }
    50% { box-shadow: 0 0 0 60px rgba(74,222,128,0.2), 0 0 0 120px rgba(74,222,128,0.1); opacity: 0.8; }
    100% { box-shadow: 0 0 0 100px rgba(74,222,128,0), 0 0 0 200px rgba(74,222,128,0); opacity: 0; transform: scale(3); }
  }
  .tool-btn:hover:not(:disabled) {
    transform: rotate(10deg) scale(1.1);
    background: rgba(233,69,96,0.2);
  }
  .tool-btn:active:not(:disabled) {
    animation: btnBounce 0.3s ease;
  }
  @keyframes btnBounce {
    0% { transform: scale(1); }
    30% { transform: scale(0.95); }
    60% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  @media (max-width: 1024px) {
    .toolbar {
      flex-direction: column;
      height: auto;
      padding: 12px;
      gap: 10px;
    }
    .toolbar-buttons {
      flex-wrap: wrap;
      justify-content: center;
    }
  }
`;
