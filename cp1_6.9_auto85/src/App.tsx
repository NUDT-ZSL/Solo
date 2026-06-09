import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import GraphView from './components/GraphView';
import PropertyPanel from './components/PropertyPanel';
import { api, type GraphNode, type GraphLink, type GraphData } from './api';
import './App.css';

type SelectedType = 'node' | 'link' | null;

const NODE_COLOR_PALETTE = ['#e94560', '#0f3460', '#16213e', '#533483', '#00b4a6', '#f59e0b', '#8b5cf6', '#ec4899'];

const validateGraphData = (data: unknown): data is GraphData => {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.nodes) || !Array.isArray(d.links)) return false;
  return (
    (d.nodes as unknown[]).every((n) => n && typeof (n as GraphNode).id === 'string' && typeof (n as GraphNode).name === 'string') &&
    (d.links as unknown[]).every(
      (l) =>
        l &&
        typeof (l as GraphLink).id === 'string' &&
        typeof (l as GraphLink).source !== 'undefined' &&
        typeof (l as GraphLink).target !== 'undefined'
    )
  );
};

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal = ({ open, title, onClose, children }: ModalProps) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

interface MainProps {
  readonly?: boolean;
  initialData?: GraphData;
  snapshotId?: string;
}

const Main = ({ readonly = false, initialData, snapshotId }: MainProps) => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SelectedType>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newlyAdded, setNewlyAdded] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState<string>('');
  const importRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const loadGraph = async () => {
    if (initialData) {
      setNodes(initialData.nodes);
      setLinks(initialData.links);
      return;
    }
    try {
      const data = await api.getGraph();
      setNodes(data.nodes);
      setLinks(data.links);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadGraph();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  const handleCreateNode = async (data: Omit<GraphNode, 'id'>) => {
    try {
      const newNode = await api.createNode(data);
      setNodes((prev) => [...prev, newNode]);
      setNewlyAdded(new Set([newNode.id]));
      setTimeout(() => setNewlyAdded(new Set()), 500);
      setShowNodeModal(false);
      showToast('节点已创建');
    } catch {
      showToast('创建失败');
    }
  };

  const handleCreateLink = async (data: Omit<GraphLink, 'id'>) => {
    try {
      const newLink = await api.createLink(data);
      setLinks((prev) => [...prev, newLink]);
      setNewlyAdded(new Set([newLink.id]));
      setTimeout(() => setNewlyAdded(new Set()), 500);
      setShowLinkModal(false);
      showToast('关系已创建');
    } catch {
      showToast('创建失败');
    }
  };

  const handleUpdateNode = async (id: string, patch: Partial<GraphNode>) => {
    try {
      const updated = await api.updateNode(id, patch);
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch {
      showToast('更新失败');
    }
  };

  const handleDeleteNode = async (id: string) => {
    try {
      setRemovedIds(new Set([id]));
      setTimeout(() => {
        setNodes((prev) => prev.filter((n) => n.id !== id));
        setLinks((prev) => prev.filter((l) => {
          const sid = typeof l.source === 'string' ? l.source : l.source.id;
          const tid = typeof l.target === 'string' ? l.target : l.target.id;
          return sid !== id && tid !== id;
        }));
        setRemovedIds(new Set());
      }, 250);
      await api.deleteNode(id);
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedType(null);
      }
      showToast('节点已删除');
    } catch {
      showToast('删除失败');
    }
  };

  const handleUpdateLink = async (id: string, patch: Partial<GraphLink>) => {
    try {
      const updated = await api.updateLink(id, patch);
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    } catch {
      showToast('更新失败');
    }
  };

  const handleDeleteLink = async (id: string) => {
    try {
      setRemovedIds(new Set([id]));
      setTimeout(() => {
        setLinks((prev) => prev.filter((l) => l.id !== id));
        setRemovedIds(new Set());
      }, 250);
      await api.deleteLink(id);
      if (selectedId === id) {
        setSelectedId(null);
        setSelectedType(null);
      }
      showToast('关系已删除');
    } catch {
      showToast('删除失败');
    }
  };

  const handleSelectNode = (id: string) => {
    setSelectedId(id);
    setSelectedType('node');
    if (window.innerWidth < 768) setPanelOpen(true);
  };

  const handleSelectLink = (id: string) => {
    setSelectedId(id);
    setSelectedType('link');
    if (window.innerWidth < 768) setPanelOpen(true);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memory-graph-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已导出 JSON 文件');
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!validateGraphData(data)) {
        showToast('JSON 格式不合法');
        return;
      }
      await api.replaceGraph(data);
      setNodes(data.nodes);
      setLinks(data.links);
      showToast('已导入图谱');
    } catch {
      showToast('导入失败');
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      const { url } = await api.createSnapshot(graphData);
      const fullUrl = `${window.location.origin}${url}`;
      await navigator.clipboard.writeText(fullUrl);
      showToast('快照链接已复制到剪贴板');
    } catch {
      showToast('生成快照失败');
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className="app-root">
      {readonly && snapshotId && (
        <div className="readonly-banner">
          <span className="banner-icon">🔒</span>
          <span>快照视图 · 只读模式 · ID: {snapshotId}</span>
          <button className="banner-btn" onClick={() => navigate('/')}>进入编辑模式</button>
        </div>
      )}

      <header className="toolbar">
        <div className="toolbar-left">
          <div className="brand">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="10" cy="10" r="5" fill="#e94560" />
              <circle cx="20" cy="18" r="4" fill="#0f3460" />
              <circle cx="8" cy="20" r="3.5" fill="#16213e" />
              <line x1="13.5" y1="11.5" x2="17.5" y2="16" stroke="#ffaa00" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="14.5" x2="8.5" y2="17.5" stroke="#ffaa00" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h1 className="brand-title">记忆图谱</h1>
          </div>

          {!readonly && (
            <>
              <button className="tool-btn primary" onClick={() => setShowNodeModal(true)}>
                <span className="btn-icon">＋</span>新增节点
              </button>
              <button className="tool-btn secondary" onClick={() => setShowLinkModal(true)} disabled={nodes.length < 2}>
                <span className="btn-icon">⟷</span>新增关系
              </button>
            </>
          )}
        </div>

        <div className="toolbar-center">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#888" strokeWidth="1.8" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#888" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              className="search-input"
              placeholder="搜索节点名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setSearchQuery('')}
            />
            {searchQuery && (
              <button className="search-clear" onClick={() => setSearchQuery('')} aria-label="清除">×</button>
            )}
          </div>
        </div>

        <div className="toolbar-right">
          {!readonly && (
            <>
              <button className="tool-btn ghost" onClick={() => importRef.current?.click()}>
                <span className="btn-icon">↥</span>导入
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = '';
                }}
              />
              <button className="tool-btn ghost" onClick={handleExport}>
                <span className="btn-icon">↧</span>导出
              </button>
              <button className="tool-btn accent" onClick={handleCreateSnapshot}>
                <span className="btn-icon">◈</span>快照
              </button>
            </>
          )}
          {isMobile && !readonly && (
            <button className="tool-btn ghost" onClick={() => setPanelOpen((v) => !v)}>
              {panelOpen ? '◀' : '▶'}
            </button>
          )}
        </div>
      </header>

      <main className="main-layout">
        <section className="graph-section" style={{ width: readonly || !isMobile ? (panelOpen ? '70%' : '100%') : '100%' }}>
          <GraphView
            nodes={nodes}
            links={links}
            selectedId={selectedId}
            selectedType={selectedType}
            searchQuery={searchQuery}
            onSelectNode={handleSelectNode}
            onSelectLink={handleSelectLink}
            onBackdropClick={() => {
              setSelectedId(null);
              setSelectedType(null);
            }}
            newlyAddedIds={newlyAdded}
            removedIds={removedIds}
            readonly={readonly}
          />
        </section>

        {(panelOpen || !isMobile) && !readonly ? (
          <aside className={`panel-section ${isMobile ? 'mobile-drawer' : ''}`} style={{ width: isMobile ? '100%' : '30%' }}>
            <PropertyPanel
              selectedId={selectedId}
              selectedType={selectedType}
              nodes={nodes}
              links={links}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onClose={() => {
                setSelectedId(null);
                setSelectedType(null);
              }}
              readonly={readonly}
            />
          </aside>
        ) : panelOpen && readonly ? null : null}

        {readonly && (
          <aside className={`panel-section ${isMobile ? 'mobile-drawer' : ''}`} style={{ width: isMobile ? '100%' : '30%' }}>
            <PropertyPanel
              selectedId={selectedId}
              selectedType={selectedType}
              nodes={nodes}
              links={links}
              onUpdateNode={handleUpdateNode}
              onDeleteNode={handleDeleteNode}
              onUpdateLink={handleUpdateLink}
              onDeleteLink={handleDeleteLink}
              onClose={() => {
                setSelectedId(null);
                setSelectedType(null);
              }}
              readonly={readonly}
            />
          </aside>
        )}
      </main>

      <Modal open={showNodeModal} title="新增节点" onClose={() => setShowNodeModal(false)}>
        <NodeForm nodes={nodes} onSubmit={handleCreateNode} onCancel={() => setShowNodeModal(false)} />
      </Modal>

      <Modal open={showLinkModal} title="新增关系" onClose={() => setShowLinkModal(false)}>
        <LinkForm nodes={nodes} onSubmit={handleCreateLink} onCancel={() => setShowLinkModal(false)} />
      </Modal>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
};

interface NodeFormProps {
  nodes: GraphNode[];
  onSubmit: (data: Omit<GraphNode, 'id'>) => void;
  onCancel: () => void;
}

const NodeForm = ({ onSubmit, onCancel }: NodeFormProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(NODE_COLOR_PALETTE[Math.floor(Math.random() * 3)]);
  const [size, setSize] = useState(22);
  const canSubmit = name.trim().length > 0;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ name: name.trim(), description, color, size });
      }}
    >
      <div className="field-group">
        <label className="field-label">名称 *</label>
        <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：张三" autoFocus />
      </div>
      <div className="field-group">
        <label className="field-label">描述</label>
        <textarea className="field-input textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="备注信息..." />
      </div>
      <div className="field-group">
        <label className="field-label">颜色</label>
        <div className="color-picker">
          {NODE_COLOR_PALETTE.map((c) => (
            <button
              type="button"
              key={c}
              className={`color-swatch ${color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input type="color" className="custom-color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label className="field-label">大小</label>
          <span className="field-value">{size}px</span>
        </div>
        <input type="range" min={12} max={45} value={size} onChange={(e) => setSize(Number(e.target.value))} className="range-slider" />
      </div>
      <div className="form-actions">
        <button type="button" className="tool-btn ghost" onClick={onCancel}>取消</button>
        <button type="submit" className="tool-btn primary" disabled={!canSubmit}>创建</button>
      </div>
    </form>
  );
};

interface LinkFormProps {
  nodes: GraphNode[];
  onSubmit: (data: Omit<GraphLink, 'id'>) => void;
  onCancel: () => void;
}

const LinkForm = ({ nodes, onSubmit, onCancel }: LinkFormProps) => {
  const [source, setSource] = useState(nodes[0]?.id || '');
  const [target, setTarget] = useState(nodes[1]?.id || '');
  const [type, setType] = useState('朋友');
  const [weight, setWeight] = useState(5);
  const canSubmit = source && target && source !== target;

  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit({ source, target, type, weight });
      }}
    >
      <div className="field-row">
        <div className="field-group half">
          <label className="field-label">源节点 *</label>
          <select className="field-input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">选择...</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === target}>{n.name}</option>
            ))}
          </select>
        </div>
        <div className="field-group half">
          <label className="field-label">目标节点 *</label>
          <select className="field-input" value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">选择...</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id} disabled={n.id === source}>{n.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-group">
        <label className="field-label">关系类型</label>
        <div className="type-chips">
          {['朋友', '同事', '家人', '同学', '认识', '合作伙伴'].map((t) => (
            <button
              type="button"
              key={t}
              className={`type-chip ${type === t ? 'active' : ''}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <input className="field-input mt8" value={type} onChange={(e) => setType(e.target.value)} placeholder="自定义..." />
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label className="field-label">权重</label>
          <span className="field-value">{weight}/10</span>
        </div>
        <input type="range" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="range-slider" />
        <div className="weight-bar">
          <div className="weight-fill" style={{ width: `${(weight / 10) * 100}%` }} />
        </div>
      </div>
      {source === target && <p className="form-error">源节点与目标节点不能相同</p>}
      <div className="form-actions">
        <button type="button" className="tool-btn ghost" onClick={onCancel}>取消</button>
        <button type="submit" className="tool-btn primary" disabled={!canSubmit}>创建</button>
      </div>
    </form>
  );
};

const SnapshotPage = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getSnapshot(id).then((snap) => {
      setData(snap.data);
      setLoading(false);
    }).catch(() => {
      setNotFound(true);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>加载快照中...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="loading-screen">
        <h2 style={{ color: '#e94560' }}>快照不存在</h2>
        <p>该快照可能已过期或链接有误。</p>
        <button className="tool-btn primary" onClick={() => window.location.href = '/'}>返回首页</button>
      </div>
    );
  }

  return data ? <Main readonly initialData={data} snapshotId={id} /> : null;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/snapshot/:id" element={<SnapshotPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
