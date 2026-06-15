import { useState, useEffect } from 'react';
import { KnowledgeNode, ProgressRecord } from '../App';

interface LearningPathProps {
  nodes: KnowledgeNode[];
  progress: ProgressRecord[];
  targetNodeId: string | null;
  onProgressChange: () => void;
}

interface PathNode extends KnowledgeNode {
  status: 'completed' | 'in_progress' | 'not_started';
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#4caf50',
  in_progress: '#ff9800',
  not_started: '#757575',
};

export default function LearningPath({ nodes, progress, targetNodeId, onProgressChange }: LearningPathProps) {
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string>(targetNodeId || '');
  const [dragOver, setDragOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (targetNodeId) {
      setSelectedTarget(targetNodeId);
      generatePath(targetNodeId);
    }
  }, [targetNodeId]);

  async function generatePath(targetId: string) {
    if (!targetId) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/path/generate?targetId=${targetId}`);
      const data = await res.json();
      const progressMap = new Map(progress.map(p => [p.nodeId, p.status]));
      const nodesWithStatus = data.nodes.map((node: KnowledgeNode) => ({
        ...node,
        status: (progressMap.get(node.id) || 'not_started') as 'completed' | 'in_progress' | 'not_started',
      }));
      setPathNodes(nodesWithStatus);
    } catch (error) {
      console.error('Failed to generate path:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  useEffect(() => {
    if (pathNodes.length > 0) {
      const progressMap = new Map(progress.map(p => [p.nodeId, p.status]));
      setPathNodes(prev => prev.map(node => ({
        ...node,
        status: (progressMap.get(node.id) || node.status) as 'completed' | 'in_progress' | 'not_started',
      })));
    }
  }, [progress]);

  const handleGenerate = () => {
    if (selectedTarget) {
      generatePath(selectedTarget);
    }
  };

  const markComplete = async (nodeId: string) => {
    try {
      await fetch(`/api/progress/${nodeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      onProgressChange();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('nodeId', nodeId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const nodeId = e.dataTransfer.getData('nodeId');
    if (nodeId) {
      markComplete(nodeId);
    }
  };

  const getCurrentNodeIndex = () => {
    for (let i = 0; i < pathNodes.length; i++) {
      if (pathNodes[i].status !== 'completed') {
        return i;
      }
    }
    return pathNodes.length;
  };

  const currentIndex = getCurrentNodeIndex();
  const completedCount = pathNodes.filter(n => n.status === 'completed').length;
  const progressPercent = pathNodes.length > 0 ? (completedCount / pathNodes.length) * 100 : 0;

  return (
    <div style={{ backgroundColor: '#1e1e1e', padding: '24px', borderRadius: '12px', minHeight: 'calc(100vh - 180px)' }}>
      <h1 className="page-title">学习路径</h1>

      <div className="select-target">
        <label htmlFor="target-select">选择目标知识点：</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select
            id="target-select"
            value={selectedTarget}
            onChange={(e) => setSelectedTarget(e.target.value)}
          >
            <option value="">请选择...</option>
            {nodes.map(node => (
              <option key={node.id} value={node.id}>{node.name} ({node.category})</option>
            ))}
          </select>
          <button onClick={handleGenerate} disabled={!selectedTarget || isGenerating}>
            {isGenerating ? '生成中...' : '生成路径'}
          </button>
        </div>
      </div>

      {pathNodes.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <span style={{ color: '#888', fontSize: '14px' }}>总进度：</span>
              <span style={{ color: '#64b5f6', fontSize: '24px', fontWeight: '700', marginLeft: '8px' }}>
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <div style={{ color: '#888', fontSize: '14px' }}>
              已完成 {completedCount} / {pathNodes.length} 个知识点
            </div>
          </div>

          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{ marginBottom: '32px' }}
          >
            {dragOver ? '释放以标记完成 ✓' : '拖拽节点卡片到此处标记为已完成'}
          </div>

          <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', minWidth: 'max-content', padding: '20px 40px' }}>
              {pathNodes.map((node, index) => (
                <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <div
                    draggable={node.status !== 'completed'}
                    onDragStart={(e) => handleDragStart(e, node.id)}
                    className={`card ${node.status === 'completed' ? 'completed-node' : ''} ${index === currentIndex ? 'current-node' : ''}`}
                    style={{
                      width: '200px',
                      height: '100px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      cursor: node.status === 'completed' ? 'default' : 'grab',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: STATUS_COLORS[node.status],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {node.status === 'completed' ? '✓' : index + 1}
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>{node.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>{node.category}</span>
                      {node.status !== 'completed' && (
                        <button
                          onClick={() => markComplete(node.id)}
                          style={{ height: '28px', padding: '0 12px', fontSize: '12px', borderRadius: '6px' }}
                        >
                          标记完成
                        </button>
                      )}
                    </div>
                  </div>

                  {index < pathNodes.length - 1 && (
                    <svg width="60" height="40" style={{ flexShrink: 0, overflow: 'visible' }}>
                      <line
                        x1="0"
                        y1="20"
                        x2="44"
                        y2="20"
                        stroke="#757575"
                        strokeWidth="2"
                      />
                      <polygon
                        points="44,14 56,20 44,26"
                        fill="#757575"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '32px', display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#4caf50' }}></div>
              <span style={{ fontSize: '13px', color: '#888' }}>已完成</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ff9800' }}></div>
              <span style={{ fontSize: '13px', color: '#888' }}>进行中</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#757575' }}></div>
              <span style={{ fontSize: '13px', color: '#888' }}>未开始</span>
            </div>
          </div>
        </>
      )}

      {pathNodes.length === 0 && !isGenerating && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
          <p style={{ fontSize: '16px' }}>选择一个目标知识点，生成你的专属学习路径</p>
        </div>
      )}
    </div>
  );
}
