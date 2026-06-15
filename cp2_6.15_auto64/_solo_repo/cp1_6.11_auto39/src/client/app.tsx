import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createId } from '@paralleldrive/cuid2';
import type { CausalNode, CausalEdge, ActivationState, NetworkListItem } from './types';
import { COLOR_PALETTE } from './types';
import CausalGraph from './CausalGraph';
import NodePanel from './NodePanel';

const MAX_DEPTH = 6;
const ACTIVATION_DURATION = 3000;
const PROPAGATION_STEP_INTERVAL = 500;
const ACTIVATION_PROBABILITY_MULTIPLIER = 0.8;

interface NewNodeDialog {
  x: number;
  y: number;
}

interface WeightSlider {
  edgeId: string;
  x: number;
  y: number;
}

type ActivationMap = Map<string, ActivationState>;

const App: React.FC = () => {
  const [nodes, setNodes] = useState<CausalNode[]>([]);
  const [edges, setEdges] = useState<CausalEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activations, setActivations] = useState<ActivationMap>(new Map());
  const [activatedEdges, setActivatedEdges] = useState<string[]>([]);
  const [maxDepth, setMaxDepth] = useState(0);
  const [totalActivated, setTotalActivated] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [newNodeDialog, setNewNodeDialog] = useState<NewNodeDialog | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeColor, setNewNodeColor] = useState(COLOR_PALETTE[0]);
  const [weightSlider, setWeightSlider] = useState<WeightSlider | null>(null);
  const [saveDialog, setSaveDialog] = useState(false);
  const [networkName, setNetworkName] = useState('');
  const [loadDialog, setLoadDialog] = useState(false);
  const [savedNetworks, setSavedNetworks] = useState<NetworkListItem[]>([]);
  const [propagationPath, setPropagationPath] = useState<string[]>([]);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);
  const [, forceRenderTick] = useState(0);

  const propagationTimerRef = useRef<number | null>(null);
  const activationCleanupRef = useRef<number | null>(null);
  const colorTickRef = useRef<number | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreen = () => {
      const small = window.innerWidth < 1280;
      setIsSmallScreen(small);
      setSidebarOpen(!small);
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  useEffect(() => {
    colorTickRef.current = window.setInterval(() => {
      forceRenderTick(t => (t + 1) % 1000000);
    }, 60);
    return () => {
      if (colorTickRef.current) clearInterval(colorTickRef.current);
    };
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string, count = 12) => {
    const colors = [color, '#FFD700', '#FF8C00', '#FFFFFF'];
    const newParticles = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 80;
      return {
        id: createId(),
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      const ids = new Set(newParticles.map(p => p.id));
      setParticles(prev => prev.filter(p => !ids.has(p.id)));
    }, 800);
  }, []);

  useEffect(() => {
    if (activationCleanupRef.current) clearInterval(activationCleanupRef.current);
    activationCleanupRef.current = window.setInterval(() => {
      const now = Date.now();
      setActivations(prev => {
        let changed = false;
        const next = new Map(prev);
        const toRemove: string[] = [];
        next.forEach((act, id) => {
          if (now - act.activatedAt > ACTIVATION_DURATION) {
            toRemove.push(id);
            changed = true;
          }
        });
        toRemove.forEach(id => next.delete(id));
        return changed ? next : prev;
      });
    }, 80);
    return () => {
      if (activationCleanupRef.current) clearInterval(activationCleanupRef.current);
    };
  }, []);

  const stopSimulation = useCallback(() => {
    if (propagationTimerRef.current) {
      clearTimeout(propagationTimerRef.current);
      propagationTimerRef.current = null;
    }
    setIsSimulating(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, [stopSimulation]);

  const handleTriggerNode = useCallback((startNodeId: string) => {
    if (isSimulating) return;

    const startNode = nodes.find(n => n.id === startNodeId);
    if (!startNode) return;

    if (propagationTimerRef.current) {
      clearTimeout(propagationTimerRef.current);
      propagationTimerRef.current = null;
    }

    const initialActivations: ActivationMap = new Map();
    initialActivations.set(startNodeId, {
      nodeId: startNodeId,
      depth: 0,
      activatedAt: Date.now(),
      isInitial: true,
    });

    const visitedNodes = new Set<string>([startNodeId]);
    const pathSoFar = [startNodeId];
    const activeEdges: string[] = [];

    setActivations(initialActivations);
    setActivatedEdges(activeEdges);
    setMaxDepth(0);
    setTotalActivated(1);
    setPropagationPath(pathSoFar);
    createParticles(startNode.x, startNode.y, '#FFD700', 16);
    setIsSimulating(true);

    const runPropagationStep = (
      currentDepth: number,
      lastActivatedIds: string[],
    ) => {
      if (currentDepth >= MAX_DEPTH) {
        setTimeout(() => stopSimulation(), ACTIVATION_DURATION);
        return;
      }

      propagationTimerRef.current = window.setTimeout(() => {
        const nextActivated: string[] = [];
        const nextEdgeIds: string[] = [];
        const newActivations: ActivationMap = new Map(initialActivations.size > 0 ? initialActivations : new Map());

        setActivations(prevActs => {
          const workingActs = new Map(prevActs);

          lastActivatedIds.forEach(sourceId => {
            const outgoing = edges.filter(e => e.source === sourceId);

            outgoing.forEach(edge => {
              if (visitedNodes.has(edge.target)) return;
              if (nextActivated.includes(edge.target)) return;

              const probability = edge.weight * ACTIVATION_PROBABILITY_MULTIPLIER;
              const roll = Math.random();

              if (roll < probability) {
                visitedNodes.add(edge.target);
                nextActivated.push(edge.target);
                nextEdgeIds.push(edge.id);

                const act: ActivationState = {
                  nodeId: edge.target,
                  depth: currentDepth + 1,
                  activatedAt: Date.now(),
                  isInitial: false,
                };
                workingActs.set(edge.target, act);

                const tn = nodes.find(n => n.id === edge.target);
                if (tn) {
                  createParticles(tn.x, tn.y, '#FF8C00', 10);
                }
              }
            });
          });

          newActivations.forEach((v, k) => {
            if (!workingActs.has(k)) workingActs.set(k, v);
          });

          if (nextActivated.length > 0) {
            setActivatedEdges(prev => {
              const merged = [...prev];
              nextEdgeIds.forEach(id => { if (!merged.includes(id)) merged.push(id); });
              return merged;
            });

            setPropagationPath(prev => {
              const next = [...prev];
              nextActivated.forEach(id => { if (!next.includes(id)) next.push(id); });
              return next;
            });

            setMaxDepth(prev => Math.max(prev, currentDepth + 1));
            setTotalActivated(visitedNodes.size);
          }

          return workingActs;
        });

        if (nextActivated.length > 0 && currentDepth + 1 < MAX_DEPTH) {
          runPropagationStep(currentDepth + 1, nextActivated);
        } else {
          setTimeout(() => stopSimulation(), ACTIVATION_DURATION + 200);
        }
      }, PROPAGATION_STEP_INTERVAL);
    };

    runPropagationStep(0, [startNodeId]);
  }, [isSimulating, nodes, edges, createParticles, stopSimulation]);

  const handleCanvasDoubleClick = useCallback((x: number, y: number) => {
    if (isSimulating) return;
    setNewNodeDialog({ x, y });
    setNewNodeName('');
    setNewNodeColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
  }, [isSimulating]);

  const handleCreateNode = useCallback(() => {
    if (!newNodeDialog || !newNodeName.trim()) return;

    const newNode: CausalNode = {
      id: createId(),
      name: newNodeName.trim().slice(0, 10),
      color: newNodeColor,
      x: newNodeDialog.x,
      y: newNodeDialog.y,
    };

    setNodes(prev => [...prev, newNode]);
    createParticles(newNodeDialog.x, newNodeDialog.y, newNodeColor, 10);
    setNewNodeDialog(null);
    setNewNodeName('');
  }, [newNodeDialog, newNodeName, newNodeColor, createParticles]);

  const handleNodeUpdate = useCallback((id: string, updates: Partial<CausalNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const handleEdgeCreate = useCallback((sourceId: string, targetId: string, sx: number, sy: number) => {
    if (sourceId === targetId) return;

    setEdges(prev => {
      const exists = prev.some(e =>
        (e.source === sourceId && e.target === targetId) ||
        (e.source === targetId && e.target === sourceId)
      );
      if (exists) return prev;
      return [...prev, {
        id: createId(),
        source: sourceId,
        target: targetId,
        weight: 0.5,
      }];
    });
    createParticles(sx, sy, '#00D4FF', 14);
  }, [createParticles]);

  const handleEdgeClick = useCallback((edgeId: string, x: number, y: number) => {
    if (isSimulating) return;
    setWeightSlider({ edgeId, x, y });
  }, [isSimulating]);

  const handleWeightChange = useCallback((edgeId: string, weight: number) => {
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, weight } : e));
  }, []);

  const closeWeightSlider = useCallback(() => setWeightSlider(null), []);
  const handleNodeSelect = useCallback((nodeId: string | null) => setSelectedNodeId(nodeId), []);

  const loadSavedNetworks = useCallback(async () => {
    try {
      const res = await fetch('/api/networks');
      const data = await res.json();
      setSavedNetworks(data.networks || []);
    } catch (e) {
      console.error('Failed to load network list', e);
    }
  }, []);

  const handleSaveNetwork = useCallback(async () => {
    if (!networkName.trim()) return;
    try {
      const payload = {
        name: networkName.trim().slice(0, 50),
        nodes: nodes.map(n => ({ id: n.id, name: n.name, color: n.color, x: n.x, y: n.y })),
        edges,
      };
      const res = await fetch('/api/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSaveDialog(false);
        setNetworkName('');
        loadSavedNetworks();
      }
    } catch (e) {
      console.error('Save failed', e);
    }
  }, [networkName, nodes, edges, loadSavedNetworks]);

  const handleLoadNetwork = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/networks/${id}`);
      if (!res.ok) return;
      const net = await res.json();
      stopSimulation();
      setNodes(net.nodes || []);
      setEdges(net.edges || []);
      setActivations(new Map());
      setActivatedEdges([]);
      setMaxDepth(0);
      setTotalActivated(0);
      setPropagationPath([]);
      setSelectedNodeId(null);
      setLoadDialog(false);
    } catch (e) {
      console.error('Load failed', e);
    }
  }, [stopSimulation]);

  const handleDeleteNetwork = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/networks/${id}`, { method: 'DELETE' });
      loadSavedNetworks();
    } catch (err) {
      console.error('Delete failed', err);
    }
  }, [loadSavedNetworks]);

  const handleOpenLoadDialog = useCallback(() => {
    loadSavedNetworks();
    setLoadDialog(true);
  }, [loadSavedNetworks]);

  const handleReset = useCallback(() => {
    stopSimulation();
    setNodes([]);
    setEdges([]);
    setActivations(new Map());
    setActivatedEdges([]);
    setMaxDepth(0);
    setTotalActivated(0);
    setPropagationPath([]);
    setSelectedNodeId(null);
  }, [stopSimulation]);

  const getNodeColor = useCallback((node: CausalNode): string => {
    return node.color;
  }, []);

  const statsLeftStyle = useMemo(() => ({
    left: isSmallScreen || !sidebarOpen ? 0 : '25%',
  }), [isSmallScreen, sidebarOpen]);

  const propagationTreeNodes = useMemo(() => {
    return propagationPath.map(id => {
      const n = nodes.find(nd => nd.id === id);
      const act = activations.get(id);
      return {
        id,
        name: n?.name ?? id.slice(0, 6),
        isInitial: act?.isInitial ?? false,
      };
    });
  }, [propagationPath, nodes, activations]);

  return (
    <div className="app-container">
      {isSmallScreen && (
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="切换侧边栏"
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      )}

      <NodePanel
        nodes={nodes}
        selectedNodeId={selectedNodeId}
        isSimulating={isSimulating}
        sidebarOpen={sidebarOpen}
        isSmallScreen={isSmallScreen}
        onNodeSelect={handleNodeSelect}
        onTriggerNode={handleTriggerNode}
        onSaveNetwork={() => setSaveDialog(true)}
        onLoadNetwork={handleOpenLoadDialog}
        onReset={handleReset}
      />

      <div className="stats-bar" style={statsLeftStyle}>
        <div className="stat-item">
          <span className="stat-label">激活深度</span>
          <span className={`stat-value ${isSimulating ? 'active' : ''}`}>
            {maxDepth} / {MAX_DEPTH}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">激活节点</span>
          <span className={`stat-value ${isSimulating ? 'active' : ''}`}>
            {totalActivated} / {nodes.length}
          </span>
        </div>
        <div className="propagation-tree" aria-label="传播树图">
          {propagationTreeNodes.length === 0 && (
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: 2 }}>
              尚未触发模拟 · 在侧边栏选择节点并点击「触发」开始
            </span>
          )}
          {propagationTreeNodes.map((item, idx) => (
            <React.Fragment key={item.id + '-' + idx}>
              {idx > 0 && <span className="tree-arrow">→</span>}
              <div className={`tree-node ${item.isInitial ? 'initial' : ''}`}>
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 8, borderRadius: '50%',
                  background: item.isInitial ? '#FFD700' : '#FF8C00',
                  boxShadow: `0 0 6px ${item.isInitial ? '#FFD700' : '#FF8C00'}`,
                  marginRight: 4,
                }} />
                {item.name}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="canvas-container" ref={canvasContainerRef} style={{ paddingTop: 60 }}>
        <CausalGraph
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          activations={activations}
          activatedEdges={activatedEdges}
          isSimulating={isSimulating}
          getNodeColor={getNodeColor}
          weightSlider={weightSlider}
          particles={particles}
          onCanvasDoubleClick={handleCanvasDoubleClick}
          onNodeUpdate={handleNodeUpdate}
          onEdgeCreate={handleEdgeCreate}
          onEdgeClick={handleEdgeClick}
          onWeightChange={handleWeightChange}
          onCloseWeightSlider={closeWeightSlider}
          onNodeSelect={handleNodeSelect}
        />
      </div>

      {newNodeDialog && (
        <div className="modal-overlay" onClick={() => setNewNodeDialog(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">创建节点</h2>
            <div className="form-group">
              <label className="form-label">节点名称（最多 10 字）</label>
              <input
                className="form-input"
                type="text"
                maxLength={10}
                value={newNodeName}
                onChange={e => setNewNodeName(e.target.value.slice(0, 10))}
                placeholder="例如：需求增长"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleCreateNode(); }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">选择代表色</label>
              <div className="color-palette">
                {COLOR_PALETTE.map(color => (
                  <div
                    key={color}
                    className={`color-option ${newNodeColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color, color }}
                    onClick={() => setNewNodeColor(color)}
                  />
                ))}
              </div>
            </div>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setNewNodeDialog(null)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleCreateNode}
                disabled={!newNodeName.trim()}
              >
                创建
              </button>
            </div>
            <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
              💡 按住 Shift + 拖拽节点可快速建立因果连线
            </p>
          </div>
        </div>
      )}

      {saveDialog && (
        <div className="modal-overlay" onClick={() => setSaveDialog(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">保存因果网络</h2>
            <div className="form-group">
              <label className="form-label">网络名称</label>
              <input
                className="form-input"
                type="text"
                maxLength={50}
                value={networkName}
                onChange={e => setNetworkName(e.target.value.slice(0, 50))}
                placeholder="为网络起个名字..."
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') handleSaveNetwork(); }}
              />
            </div>
            <div style={{
              display: 'flex',
              gap: 20,
              padding: '10px 0',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              justifyContent: 'center',
            }}>
              <span>节点数：<b style={{ color: '#00D4FF' }}>{nodes.length}</b></span>
              <span>连线数：<b style={{ color: '#00D4FF' }}>{edges.length}</b></span>
            </div>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setSaveDialog(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveNetwork}
                disabled={!networkName.trim()}
              >
                保存到服务器
              </button>
            </div>
          </div>
        </div>
      )}

      {loadDialog && (
        <div className="modal-overlay" onClick={() => setLoadDialog(false)}>
          <div className="modal-content network-list-modal" onClick={e => e.stopPropagation()} style={{ minWidth: 460, maxWidth: 520 }}>
            <h2 className="modal-title">载入历史网络</h2>
            {savedNetworks.length === 0 ? (
              <div className="empty-state">
                还没有保存过任何网络
                <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  在侧边栏点击「保存网络」开始吧
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 6 }}>
                {savedNetworks.map(net => (
                  <div
                    key={net.id}
                    className="network-item"
                    onClick={() => handleLoadNetwork(net.id)}
                  >
                    <div className="network-info">
                      <div className="network-name">{net.name}</div>
                      <div className="network-date">
                        更新于 {new Date(net.updatedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="network-actions">
                      <button
                        className="network-action-btn load"
                        onClick={() => handleLoadNetwork(net.id)}
                      >
                        载入
                      </button>
                      <button
                        className="network-action-btn delete"
                        onClick={(e) => handleDeleteNetwork(net.id, e)}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setLoadDialog(false)}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
