import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import Timeline from './components/Timeline';
import NodeEditor from './components/NodeEditor';
import { TimelineNode } from './types';

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

function App() {
  const [nodes, setNodes] = useState<TimelineNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleCanvasClick = useCallback((position: number) => {
    const newNode: TimelineNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position,
      date: getTodayDate(),
      title: '',
      description: '',
      icon: 'star',
      importance: 3,
    };
    setNodes(prev => [...prev, newNode].sort((a, b) => a.position - b.position));
  }, []);

  const handleNodeDrag = useCallback((id: string, position: number) => {
    setNodes(prev => prev.map(node => 
      node.id === id ? { ...node, position } : node
    ).sort((a, b) => a.position - b.position));
  }, []);

  const handleNodeClick = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const handleUpdateNode = useCallback((id: string, updates: Partial<TimelineNode>) => {
    setNodes(prev => prev.map(node => 
      node.id === id ? { ...node, ...updates } : node
    ));
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes(prev => prev.filter(node => node.id !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const handleCloseEditor = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleExportPNG = useCallback(async () => {
    if (timelineRef.current) {
      try {
        const canvas = await html2canvas(timelineRef.current, {
          backgroundColor: '#FFFFFF',
          scale: 2,
          height: 400,
        });
        const link = document.createElement('a');
        link.download = `timeline-${getTodayDate()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (error) {
        console.error('Export failed:', error);
      }
    }
  }, []);

  const selectedNode = nodes.find(node => node.id === selectedNodeId) || null;

  return (
    <div style={styles.container}>
      <div style={styles.mainArea}>
        <div style={styles.header}>
          <h1 style={styles.title}>时间线生成器</h1>
          <button 
            style={styles.exportButton}
            onClick={handleExportPNG}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4338CA';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4F46E5';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
          >
            导出为PNG
          </button>
        </div>

        <div 
          ref={timelineRef}
          style={styles.canvas}
        >
          <Timeline
            nodes={nodes}
            zoom={zoom}
            onCanvasClick={handleCanvasClick}
            onNodeDrag={handleNodeDrag}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
          />
        </div>

        <div style={styles.zoomControl}>
          <span style={styles.zoomLabel}>缩放: {zoom.toFixed(1)}x</span>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={styles.zoomSlider}
          />
        </div>
      </div>

      <NodeEditor
        node={selectedNode}
        isOpen={!!selectedNodeId}
        onClose={handleCloseEditor}
        onUpdate={handleUpdateNode}
        onDelete={handleDeleteNode}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  mainArea: {
    width: '70%',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    gap: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1E293B',
  },
  exportButton: {
    backgroundColor: '#4F46E5',
    color: '#FFFFFF',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  canvas: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    overflow: 'auto',
    position: 'relative',
    minHeight: '400px',
  },
  zoomControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#FFFFFF',
    padding: '12px 16px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  zoomLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#475569',
    minWidth: '80px',
  },
  zoomSlider: {
    flex: 1,
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    background: '#E2E8F0',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
};

export default App;
