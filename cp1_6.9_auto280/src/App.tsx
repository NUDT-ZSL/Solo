import { useState, useEffect, useCallback, useRef } from 'react';
import Canvas, { type CanvasHandle } from './components/Canvas';
import SparkList from './components/SparkList';
import type { NodeData, EdgeData, Network, ViewMode, TopSpark } from './types';
import { networkApi } from './api';

function parseUrl(): { networkId: string | null } {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('network/')) {
    return { networkId: hash.slice('network/'.length) };
  }
  const url = new URL(window.location.href);
  const n = url.searchParams.get('network');
  if (n) return { networkId: n };
  return { networkId: null };
}

export default function App() {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [network, setNetwork] = useState<Network | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef<CanvasHandle>(null);

  useEffect(() => {
    const { networkId } = parseUrl();
    if (networkId) {
      setNetworkId(networkId);
      loadNetwork(networkId);
    }
  }, []);

  const loadNetwork = async (id: string) => {
    setLoading(true);
    try {
      const net = await networkApi.getById(id);
      setNetwork(net);
      setNodes(net.nodes);
      setEdges(net.edges);
      setReadOnly(true);
    } catch (e) {
      console.error('加载网络失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = useCallback(async () => {
    if (nodes.length === 0) {
      alert('画布为空，无法保存');
      return;
    }
    try {
      const creator = prompt('请输入您的昵称:', '匿名创作者') || '匿名创作者';
      const res = await networkApi.save({ nodes, edges, creator });
      const shareUrl = `${window.location.origin}${window.location.pathname}#network/${res.id}`;
      window.location.hash = `network/${res.id}`;
      setShareToast(`🎉 保存成功！分享链接: ${shareUrl} (已自动复制到剪贴板)`);
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (_) {}
      setNetwork({
        id: res.id,
        nodes: res.nodes,
        edges: res.edges,
        creator,
        createdAt: res.createdAt,
      });
      setTimeout(() => setShareToast(null), 5000);
    } catch (e) {
      console.error('保存失败:', e);
      alert('保存失败，请重试');
    }
  }, [nodes, edges]);

  const handleReset = () => {
    if (!confirm('确定要清空画布吗？此操作不可撤销。')) return;
    setNodes([]);
    setEdges([]);
    setNetwork(null);
    setReadOnly(false);
    setNetworkId(null);
    window.location.hash = '';
    const url = new URL(window.location.href);
    url.searchParams.delete('network');
    window.history.replaceState({}, '', url);
  };

  const handleSparkClick = useCallback(
    (spark: TopSpark) => {
      if (readOnly) return;
      console.log('点击火花:', spark);
    },
    [readOnly]
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="app">
      <div className="top-bar">
        <button
          className={viewMode === 'normal' ? 'active' : ''}
          onClick={() => setViewMode('normal')}
        >
          🎨 普通视图
        </button>
        <button
          className={viewMode === 'heat' ? 'active' : ''}
          onClick={() => setViewMode('heat')}
        >
          🔥 热度视图
        </button>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
        {!readOnly ? (
          <>
            <button onClick={handleSave}>💾 保存分享</button>
            <button onClick={handleReset}>🗑️ 清空</button>
          </>
        ) : (
          <button
            onClick={() => {
              setReadOnly(false);
              window.location.hash = '';
            }}
          >
            ✏️ 开始创作
          </button>
        )}
      </div>

      {readOnly && (
        <div className="read-only-banner">
          👁️ 只读模式 — 您正在浏览他人的灵感网络
        </div>
      )}

      <Canvas
        ref={canvasRef}
        nodes={nodes}
        edges={edges}
        onNodesChange={(updater) => {
          if (readOnly) return;
          if (typeof updater === 'function') {
            const fn = updater as (prev: NodeData[]) => NodeData[];
            setNodes((prev) => fn(prev));
          } else {
            setNodes(updater as NodeData[]);
          }
        }}
        onEdgesChange={(updater) => {
          if (readOnly) return;
          if (typeof updater === 'function') {
            const fn = updater as (prev: EdgeData[]) => EdgeData[];
            setEdges((prev) => fn(prev));
          } else {
            setEdges(updater as EdgeData[]);
          }
        }}
        viewMode={viewMode}
        readOnly={readOnly}
      />

      <SparkList onSparkClick={handleSparkClick} />

      {network && (
        <div className="network-info">
          <div>
            <strong>创作者:</strong> {network.creator}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>创建时间:</strong> {formatDate(network.createdAt)}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>节点数:</strong> {network.nodes.length} ·{' '}
            <strong>连线:</strong> {network.edges.length}
          </div>
        </div>
      )}

      {shareToast && <div className="share-toast">{shareToast}</div>}

      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(26,26,46,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            color: '#fff',
            fontSize: 16,
          }}
        >
          正在加载灵感网络...
        </div>
      )}
    </div>
  );
}
