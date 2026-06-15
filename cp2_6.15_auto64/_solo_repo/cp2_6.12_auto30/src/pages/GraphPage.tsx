import React, { useState, useEffect, useCallback } from 'react';
import KnowledgeGraph from '../components/KnowledgeGraph';

interface GraphNode {
  id: string;
  name: string;
  category: 'tech' | 'literature' | 'history' | 'philosophy' | 'art' | 'general';
  refCount: number;
}

interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface NoteSummary {
  id: string;
  content: string;
  book_title: string;
  created_at: string;
}

const GraphPage: React.FC = () => {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/graph');
      if (res.ok) setData(await res.json());
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGraph(); }, [fetchGraph]);

  const fetchTagNotes = useCallback(async (tagId: string): Promise<NoteSummary[]> => {
    try {
      const res = await fetch(`/api/tags/${tagId}/notes`);
      if (res.ok) return await res.json();
    } catch { }
    return [];
  }, []);

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const categoryLegend = [
    { key: 'tech', label: '科技蓝', color: '#5b8db8' },
    { key: 'literature', label: '文学绿', color: '#6aaf6a' },
    { key: 'history', label: '历史橙', color: '#e8a848' },
    { key: 'philosophy', label: '哲学紫', color: '#9b7db8' },
    { key: 'art', label: '艺术粉', color: '#d4789c' },
    { key: 'general', label: '通用灰', color: '#95a5a6' },
  ];

  return (
    <div className="page-container" ref={containerRef} style={isFullscreen ? { padding: 20, background: 'var(--bg)', height: '100vh' } : {}}>
      <div className="page-header">
        <h1 className="page-title">知识图谱</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchGraph}>🔄 刷新</button>
          <button className="btn btn-secondary btn-sm" onClick={toggleFullscreen}>
            {isFullscreen ? '⬜ 退出全屏' : '⛶ 全屏'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
        padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 8,
        backdropFilter: 'blur(4px)',
      }}>
        {categoryLegend.map(c => (
          <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{c.label}</span>
          </div>
        ))}
        <span style={{ fontSize: 12, color: 'var(--text-light)', marginLeft: 8 }}>
          节点大小 = 引用次数 | 连线粗细 = 共现频次 | 双击查看关联笔记
        </span>
      </div>

      {loading ? (
        <div className="empty-state"><p>加载知识图谱中...</p></div>
      ) : (
        <div style={{
          animation: 'scaleIn 0.5s ease',
          background: '#fff',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <KnowledgeGraph data={data} onTagNotesRequest={fetchTagNotes} />
        </div>
      )}
    </div>
  );
};

export default GraphPage;
