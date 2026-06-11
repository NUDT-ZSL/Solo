import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createId } from '@paralleldrive/cuid2';
import type { CausalNode, CausalEdge, ActivationState, PropagationStats, NetworkListItem } from './types';
import { COLOR_PALETTE } from './types';
import CausalGraph from './CausalGraph';
import NodePanel from './NodePanel';

const MAX_DEPTH = 6;
const ACTIVATION_DURATION = 3000;
const PROPAGATION_INTERVAL = 500;
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

interface SaveDialog {
  isOpen: boolean;
}

interface LoadDialog {
  isOpen: boolean;
}

const App: React.FC = () => {
  const [nodes, setNodes] = useState<CausalNode[]>([]);
  const [edges, setEdges] = useState<CausalEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activations, setActivations] = useState<Map<string, ActivationState>>(new Map());
  const [stats, setStats] = useState<PropagationStats>({ maxDepth: 0, totalActivated: 0, activatedEdges: [] });
  const [isSimulating, setIsSimulating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [newNodeDialog, setNewNodeDialog] = useState<NewNodeDialog | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeColor, setNewNodeColor] = useState(COLOR_PALETTE[0]);
  const [weightSlider, setWeightSlider] = useState<WeightSlider | null>(null);
  const [saveDialog, setSaveDialog] = useState<SaveDialog>({ isOpen: false });
  const [networkName, setNetworkName] = useState('');
  const [loadDialog, setLoadDialog] = useState<LoadDialog>({ isOpen: false });
  const [savedNetworks, setSavedNetworks] = useState<NetworkListItem[]>([]);
  const [propagationPath, setPropagationPath] = useState<string[]>([]);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);

  const propagationTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreen = () => {
      setIsSmallScreen(window.innerWidth < 1280);
      if (window.innerWidth < 1280) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const createParticles = useCallback((x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 8 }, () => ({
      id: createId(),
      x: x + (Math.random() - 0.5) * 100,
      y: y + (Math.random() - 0.5) * 100,
      color,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 800);
  }, []);

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
    createParticles(newNodeDialog.x, newNodeDialog.y, newNodeColor);
    setNewNodeDialog(null);
    setNewNodeName('');
  }, [newNodeDialog, newNodeName, newNodeColor, createParticles]);

  const handleNodeUpdate = useCallback((id: string, updates: Partial<CausalNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const handleEdgeCreate = useCallback((sourceId: string, targetId: string, sourceX: number, sourceY: number) => {
    if (sourceId === targetId) return;
    
    const exists = edges.some(e => 
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId)
    );
    
    if (exists) return;
    
    const newEdge: CausalEdge = {
      id: createId(),
      source: sourceId,
      target: targetId,
      weight: 0.5,
    };
    
    setEdges(prev => [...prev, newEdge]);
    createParticles(sourceX, sourceY, '#00D4FF');
  }, [edges, createParticles]);

  const handleEdgeClick = useCallback((edgeId: string, x: number, y: number) => {
    if (isSimulating) return;
    setWeightSlider({ edgeId, x, y });
  }, [isSimulating]);

  const handleWeightChange = useCallback((edgeId: string, weight: number) => {
    setEdges(prev => prev.map(e => e.id === edgeId ? { ...e, weight } : e));
  }, []);

  const closeWeightSlider = useCallback(() => {
    setWeightSlider(null);
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleTriggerNode = useCallback((nodeId: string) => {
    if (isSimulating) return;
    
    const initialActivation: ActivationState = {
      nodeId,
      depth: 0,
      activatedAt: Date.now(),
      isInitial: true,
    };
    
    const newActivations = new Map<string, ActivationState>();
    newActivations.set(nodeId, initialActivation);
    
    setActivations(newActivations);
    setStats({ maxDepth: 0, totalActivated: 1, activatedEdges: [] });
    setPropagationPath([nodeId]);
    setIsSimulating(true);
    
    const visitedNodes = new Set<string>([nodeId]);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      createParticles(node.x, node.y, '#FFD700');
    }
    
    const propagate = (currentDepth: number, currentActivations: Map<string, ActivationState>, currentActivatedEdges: string[]) => {
      if (currentDepth >= MAX_DEPTH) {
        setIsSimulating(false);
        return;
      }
      
      const nextActivations = new Map(currentActivations);
      const nextActivatedEdges = [...currentActivatedEdges];
      let newNodesActivated = false;
      let newMaxDepth = currentDepth;
      
      currentActivations.forEach((activation, _nodeId) => {
        if (activation.depth !== currentDepth) return;
        
        const outgoingEdges = edges.filter(e => e.source === _nodeId);
        
        outgoingEdges.forEach(edge => {
          if (visitedNodes.has(edge.target)) return;
          
          const probability = edge.weight * ACTIVATION_PROBABILITY_MULTIPLIER;
          if (Math.random() < probability) {
            visitedNodes.add(edge.target);
            newNodesActivated = true;
            
            const newActivation: ActivationState = {
              nodeId: edge.target,
              depth: currentDepth + 1,
              activatedAt: Date.now(),
              isInitial: false,
            };
            
            nextActivations.set(edge.target, newActivation);
            nextActivatedEdges.push(edge.id);
            newMaxDepth = Math.max(newMaxDepth, currentDepth + 1);
            
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode) {
              createParticles(targetNode.x, targetNode.y, '#FF8C00');
            }
            
            setPropagationPath(prev => [...prev, edge.target]);
          }
        });
      });
      
      if (newNodesActivated) {
        setActivations(nextActivations);
        setStats(prev => ({
          maxDepth: newMaxDepth,
          totalActivated: nextActivations.size,
          activatedEdges: nextActivatedEdges,
        }));
      }
      
      if (newNodesActivated && currentDepth + 1 < MAX_DEPTH) {
        propagationTimerRef.current = window.setTimeout(() => {
          propagate(currentDepth + 1, nextActivations, nextActivatedEdges);
        }, PROPAGATION_INTERVAL);
      } else {
        propagationTimerRef.current = window.setTimeout(() => {
          setIsSimulating(false);
        }, ACTIVATION_DURATION);
      }
    };
    
    propagationTimerRef.current = window.setTimeout(() => {
      propagate(0, newActivations, []);
    }, PROPAGATION_INTERVAL);
  }, [isSimulating, nodes, edges, createParticles]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setActivations(prev => {
        const next = new Map(prev);
        let changed = false;
        next.forEach((activation, nodeId) => {
          if (now - activation.activatedAt > ACTIVATION_DURATION) {
            next.delete(nodeId);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 100);
    
    return () => {
      clearInterval(cleanup);
      if (propagationTimerRef.current) {
        clearTimeout(propagationTimerRef.current);
      }
    };
  }, []);

  const loadSavedNetworks = useCallback(async () => {
    try {
      const res = await fetch('/api/networks');
      const data = await res.json();
      setSavedNetworks(data.networks || []);
    } catch (e) {
      console.error('Failed to load networks:', e);
    }
  }, []);

  const handleSaveNetwork = useCallback(async () => {
    if (!networkName.trim()) return;
    
    try {
      const cleanNodes = nodes.map(({ id, name, color, x, y }) => ({ id, name, color, x, y }));
      const res = await fetch('/api/networks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: networkName.trim(),
          nodes: cleanNodes,
          edges,
        }),
      });
      
      if (res.ok) {
        setSaveDialog({ isOpen: false });
        setNetworkName('');
        loadSavedNetworks();
      }
    } catch (e) {
      console.error('Failed to save network:', e);
    }
  }, [networkName, nodes, edges, loadSavedNetworks]);

  const handleLoadNetwork = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/networks/${id}`);
      if (res.ok) {
        const network = await res.json();
        setNodes(network.nodes);
        setEdges(network.edges);
        setActivations(new Map());
        setStats({ maxDepth: 0, totalActivated: 0, activatedEdges: [] });
        setPropagationPath([]);
        setSelectedNodeId(null);
        setLoadDialog({ isOpen: false });
      }
    } catch (e) {
      console.error('Failed to load network:', e);
    }
  }, []);

  const handleDeleteNetwork = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/networks/${id}`, { method: 'DELETE' });
      loadSavedNetworks();
    } catch (e) {
      console.error('Failed to delete network:', e);
    }
  }, [loadSavedNetworks]);

  const handleOpenLoadDialog = useCallback(() => {
    loadSavedNetworks();
    setLoadDialog({ isOpen: true });
  }, [loadSavedNetworks]);

  const handleReset = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setActivations(new Map());
    setStats({ maxDepth: 0, totalActivated: 0, activatedEdges: [] });
    setPropagationPath([]);
    setSelectedNodeId(null);
  }, []);

  const getNodeActivationColor = useCallback((node: CausalNode): string => {
    const activation = activations.get(node.id);
    if (!activation) return node.color;
    
    const elapsed = Date.now() - activation.activatedAt;
    const progress = Math.min(elapsed / ACTIVATION_DURATION, 1);
    
    const startColor = activation.isInitial ? '#FFD700' : node.color;
    const endColor = '#FF8C00';
    
    if (progress < 0.5) {
      const t = progress * 2;
      return interpolateColor(startColor, endColor, t);
    } else {
      const t = (progress - 0.5) * 2;
      return interpolateColor(endColor, node.color, t);
    }
  }, [activations]);

  const interpolateColor = (color1: string, color2: string, t: number): string => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      {isSmallScreen && (
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
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
        onSaveNetwork={() => setSaveDialog({ isOpen: true })}
        onLoadNetwork={handleOpenLoadDialog}
        onReset={handleReset}
      />
      
      <div className="stats-bar" style={{ left: isSmallScreen || !sidebarOpen ? 0 : '25%' }}>
        <div className="stat-item">
          <span className="stat-label">激活深度</span>
          <span className={`stat-value ${isSimulating ? 'active' : ''}`}>{stats.maxDepth} / {MAX_DEPTH}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">激活节点</span>
          <span className={`stat-value ${isSimulating ? 'active' : ''}`}>{stats.totalActivated} / {nodes.length}</span>
        </div>
        <div className="propagation-tree">
          {propagationPath.map((nodeId, index) => {
            const node = nodes.find(n => n.id === nodeId);
            const activation = activations.get(nodeId);
            return (
              <React.Fragment key={nodeId}>
                {index > 0 && <span className="tree-arrow">→</span>}
                <div className={`tree-node ${activation?.isInitial ? 'initial' : ''}`}>
                  {node?.name || nodeId.slice(0, 6)}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      <div className="canvas-container" ref={canvasRef}>
        <CausalGraph
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          activations={activations}
          activatedEdges={stats.activatedEdges}
          isSimulating={isSimulating}
          getNodeColor={getNodeActivationColor}
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
            <h2 className="modal-title">创建新节点</h2>
            <div className="form-group">
              <label className="form-label">节点名称（最多10个字符）</label>
              <input
                className="form-input"
                type="text"
                value={newNodeName}
                onChange={e => setNewNodeName(e.target.value.slice(0, 10))}
                placeholder="输入节点名称..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateNode()}
              />
            </div>
            <div className="form-group">
              <label className="form-label">选择颜色</label>
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
              <button className="btn btn-secondary" onClick={() => setNewNodeDialog(null)}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateNode}
                disabled={!newNodeName.trim()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      
      {saveDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setSaveDialog({ isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">保存网络</h2>
            <div className="form-group">
              <label className="form-label">网络名称</label>
              <input
                className="form-input"
                type="text"
                value={networkName}
                onChange={e => setNetworkName(e.target.value.slice(0, 50))}
                placeholder="输入网络名称..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSaveNetwork()}
              />
            </div>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setSaveDialog({ isOpen: false })}>
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveNetwork}
                disabled={!networkName.trim()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      
      {loadDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setLoadDialog({ isOpen: false })}>
          <div className="modal-content network-list-modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">载入网络</h2>
            {savedNetworks.length === 0 ? (
              <div className="empty-state">暂无保存的网络</div>
            ) : (
              savedNetworks.map(network => (
                <div
                  key={network.id}
                  className="network-item"
                  onClick={() => handleLoadNetwork(network.id)}
                >
                  <div className="network-info">
                    <div className="network-name">{network.name}</div>
                    <div className="network-date">
                      更新于 {new Date(network.updatedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="network-actions">
                    <button
                      className="network-action-btn load"
                      onClick={() => handleLoadNetwork(network.id)}
                    >
                      载入
                    </button>
                    <button
                      className="network-action-btn delete"
                      onClick={(e) => handleDeleteNetwork(network.id, e)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setLoadDialog({ isOpen: false })}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
