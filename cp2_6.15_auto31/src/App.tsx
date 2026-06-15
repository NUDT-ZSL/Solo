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
  const treeDataRef = useRef(treeData);
  const collapsedRef = useRef(collapsedNodes);
  const [isMobile, setIsMobile] = useState(false);

  treeDataRef.current = treeData;
  collapsedRef.current = collapsedNodes;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let engine: GraphEngine | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let ready = false;
    let retries = 0;
    let initTimer: number | null = null;

    const applyData = () => {
      if (!engine) return;
      if (treeDataRef.current && treeDataRef.current.length > 0) {
        engine.setData(treeDataRef.current);
      }
      if (collapsedRef.current) {
        engine.updateNodeVisibility(collapsedRef.current);
      }
    };

    const doInit = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) {
        retries++;
        if (retries < 50) {
          initTimer = window.setTimeout(doInit, 50);
        }
        return;
      }

      engine = new GraphEngine(canvas);
      graphEngineRef.current = engine;

      engine.resize(rect.width, rect.height);

      engine.setOnClickNode((nodeId) => {
        toggleNodeCollapse(nodeId);
      });

      engine.setOnDropNode((sourceId, targetId) => {
        moveNode(sourceId, targetId);
      });

      engine.startRenderLoop();

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (engine) {
            engine.resize(entry.contentRect.width, entry.contentRect.height);
          }
        }
      });
      resizeObserver.observe(container);

      ready = true;
      applyData();
    };

    doInit();

    return () => {
      if (initTimer) clearTimeout(initTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (engine) engine.destroy();
      if (graphEngineRef.current === engine) graphEngineRef.current = null;
    };
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
    if (!graphEngineRef.current) {
      alert('导图尚未加载完成');
      return;
    }
    try {
      const dataUrl = graphEngineRef.current.exportPNG();
      if (!dataUrl || dataUrl.length < 100) {
        alert('导图内容为空');
        return;
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const fileName = `mindmap-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.png`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('PNG导出失败:', e);
      alert('导出失败：' + (e as Error).message);
    }
  }, []);

  const handleExportMD = useCallback(() => {
    try {
      downloadMarkdown();
    } catch (e) {
      console.error('MD导出失败:', e);
      alert('导出失败：' + (e as Error).message);
    }
  }, [downloadMarkdown]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateMarkdown(e.target.value);
  };

  return (
    <div className="app-container">
      <header className="toolbar">
        <div className="toolbar-title">思维导图编辑器</div>
        <div className="toolbar-buttons">
          <button className="btn btn-export-png" onClick={handleExportPNG} title="导出PNG图片">
            {isMobile ? '🖼️' : '导出PNG'}
          </button>
          <button className="btn btn-export-md" onClick={handleExportMD} title="导出Markdown文件">
            {isMobile ? '📝' : '导出Markdown'}
          </button>
        </div>
      </header>
      <div className="main-content">
        <div className="input-panel">
          <div className="input-header">Markdown 输入（使用 # 表示层级）</div>
          <textarea
            className="markdown-input"
            value={markdownText}
            onChange={handleTextChange}
            placeholder={'# 一级标题\n## 二级标题\n### 三级标题\n#### 四级标题'}
            spellCheck={false}
          />
        </div>
        <div className="graph-panel" ref={containerRef}>
          <canvas ref={canvasRef} className="graph-canvas" />
        </div>
      </div>
    </div>
  );
}

export default App;
