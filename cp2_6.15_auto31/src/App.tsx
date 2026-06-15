import { useEffect, useRef, useState, useCallback } from 'react';
import { useGraphData } from './Graph/useGraphData';
import { GraphEngine } from './Graph/graphEngine';
import './App.css';

function App() {
  const {
    markdownText,
    treeData,
    collapsedNodes,
    updateMarkdown,
    toggleNodeCollapse,
    moveNode,
    downloadMarkdown,
  } = useGraphData();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphEngineRef = useRef<GraphEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (canvasRef.current && containerRef.current) {
      const engine = new GraphEngine(canvasRef.current);
      graphEngineRef.current = engine;

      const updateSize = () => {
        if (containerRef.current && graphEngineRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          graphEngineRef.current.resize(rect.width, rect.height);
        }
      };

      updateSize();
      window.addEventListener('resize', updateSize);

      engine.setOnClickNode((nodeId) => {
        toggleNodeCollapse(nodeId);
      });

      engine.setOnDropNode((sourceId, targetId) => {
        moveNode(sourceId, targetId);
      });

      engine.startRenderLoop();

      return () => {
        window.removeEventListener('resize', updateSize);
        engine.destroy();
      };
    }
  }, [toggleNodeCollapse, moveNode]);

  useEffect(() => {
    if (graphEngineRef.current && treeData.length > 0) {
      graphEngineRef.current.setData(treeData);
    }
  }, [treeData]);

  useEffect(() => {
    if (graphEngineRef.current) {
      graphEngineRef.current.updateNodeVisibility(collapsedNodes);
    }
  }, [collapsedNodes]);

  const handleExportPNG = useCallback(() => {
    if (graphEngineRef.current) {
      const dataUrl = graphEngineRef.current.exportPNG();
      const a = document.createElement('a');
      a.href = dataUrl;
      const now = new Date();
      const fileName = `mindmap-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.png`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateMarkdown(e.target.value);
  };

  return (
    <div className="app-container">
      <header className="toolbar">
        <div className="toolbar-title">思维导图编辑器</div>
        <div className="toolbar-buttons">
          <button className="btn btn-export-png" onClick={handleExportPNG}>
            {isMobile ? '🖼️' : '导出PNG'}
          </button>
          <button className="btn btn-export-md" onClick={downloadMarkdown}>
            {isMobile ? '📝' : '导出Markdown'}
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="input-panel">
          <div className="input-header">Markdown 输入</div>
          <textarea
            className="markdown-input"
            value={markdownText}
            onChange={handleTextChange}
            placeholder="使用 # 号表示层级，例如：\n# 一级标题\n## 二级标题\n### 三级标题"
            spellCheck={false}
          />
        </div>
        <div className="graph-panel" ref={containerRef}>
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
