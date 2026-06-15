import React, { useEffect, useRef, useState } from 'react';
import { useMindMapStore } from './store';
import MindMapCanvas from './components/MindMapCanvas';
import NoteEditor from './components/NoteEditor';
import Toolbar from './components/Toolbar';

const App: React.FC = () => {
  const { nodes, selectedNodeId, connectWebSocket, loadNodes } = useMindMapStore();
  const [showNotePanel, setShowNotePanel] = useState(false);
  const [showNav, setShowNav] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileNote, setShowMobileNote] = useState(false);

  useEffect(() => {
    connectWebSocket();
    loadNodes();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 768);
      if (w >= 1024) {
        setShowNav(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedNodeId) {
      setShowNotePanel(true);
      if (isMobile) setShowMobileNote(true);
    }
  }, [selectedNodeId]);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="app-container">
      <Toolbar
        onToggleNav={() => setShowNav(!showNav)}
        onToggleNote={() => {
          if (isMobile) setShowMobileNote(!showMobileNote);
          else setShowNotePanel(!showNotePanel);
        }}
        isMobile={isMobile}
      />
      <div className="main-content">
        {!isMobile && showNav && (
          <div className="nav-panel">
            <div className="nav-title">导航</div>
            <MiniMap nodes={nodes} />
          </div>
        )}
        <div className="canvas-area">
          <MindMapCanvas />
        </div>
        {!isMobile && showNotePanel && selectedNode && (
          <div className="note-panel">
            <NoteEditor nodeId={selectedNode.id} onClose={() => setShowNotePanel(false)} />
          </div>
        )}
      </div>
      {isMobile && showMobileNote && selectedNode && (
        <div className="mobile-note-drawer">
          <NoteEditor nodeId={selectedNode.id} onClose={() => setShowMobileNote(false)} />
        </div>
      )}
    </div>
  );
};

const MiniMap: React.FC<{ nodes: any[] }> = ({ nodes }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 180, h = 140;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(w / rangeX, h / rangeY) * 0.8;
    const offX = (w - rangeX * scale) / 2;
    const offY = (h - rangeY * scale) / 2;

    nodes.forEach(n => {
      const sx = (n.x - minX) * scale + offX;
      const sy = (n.y - minY) * scale + offY;
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = n.parentId ? '#ff9800' : '#4caf50';
      ctx.fill();
    });

    nodes.filter(n => n.parentId).forEach(n => {
      const parent = nodes.find(p => p.id === n.parentId);
      if (!parent) return;
      const sx1 = (parent.x - minX) * scale + offX;
      const sy1 = (parent.y - minY) * scale + offY;
      const sx2 = (n.x - minX) * scale + offX;
      const sy2 = (n.y - minY) * scale + offY;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });
  }, [nodes]);

  return <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 4 }} />;
};

export default App;
