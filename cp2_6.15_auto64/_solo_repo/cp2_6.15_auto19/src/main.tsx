import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import UploadZone from './modules/upload/UploadZone';
import PointCloudScene from './modules/pointcloud/PointCloudScene';
import { PointData, UploadFileInfo, HighlightedPoint } from './utils/types';
import { createMarkerTool, MarkerTool } from './modules/marker/MarkerTool';

const App: React.FC = () => {
  const [pointData, setPointData] = useState<PointData | null>(null);
  const [fileInfo, setFileInfo] = useState<UploadFileInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [brushActive, setBrushActive] = useState(false);
  const [highlightedPoints, setHighlightedPoints] = useState<HighlightedPoint[]>([]);
  const [thumbnailDataUrl, setThumbnailDataUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  const markerToolRef = useRef<MarkerTool>(createMarkerTool());
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const updateHighlights = () => {
      if (brushActive) {
        const points = markerToolRef.current.getHighlightedPoints();
        setHighlightedPoints(points);
      }
      animationFrameRef.current = requestAnimationFrame(updateHighlights);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateHighlights);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [brushActive]);

  const handleFileUpload = useCallback((file: File) => {
    setFileInfo({
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading'
    });
  }, []);

  const handleParseProgress = useCallback((progress: number) => {
    setFileInfo(prev => prev ? { ...prev, progress, status: 'processing' } : null);
  }, []);

  const handleParseComplete = useCallback((data: PointData) => {
    setPointData(data);
    setFileInfo(prev => prev ? { ...prev, progress: 100, status: 'complete' } : null);
    
    if (data) {
      const canvas = document.createElement('canvas');
      canvas.width = 150;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(0, 0, 150, 150);
        
        const { min, max } = data.boundingBox;
        const scaleX = 140 / (max[0] - min[0] || 1);
        const scaleY = 140 / (max[2] - min[2] || 1);
        const scale = Math.min(scaleX, scaleY);
        
        const positions = data.position;
        const colors = data.color;
        const step = Math.max(1, Math.floor(positions.length / 3 / 5000));
        
        for (let i = 0; i < positions.length; i += 3 * step) {
          const x = 5 + (positions[i] - min[0]) * scale;
          const y = 5 + (max[2] - positions[i + 2]) * scale;
          
          const r = Math.floor(colors[i] * 255);
          const g = Math.floor(colors[i + 1] * 255);
          const b = Math.floor(colors[i + 2] * 255);
          
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, 2, 2);
        }
        
        setThumbnailDataUrl(canvas.toDataURL());
      }
    }
  }, []);

  const handleParseError = useCallback((error: string) => {
    setFileInfo(prev => prev ? { ...prev, status: 'error' } : null);
    console.error('Parse error:', error);
  }, []);

  const toggleBrush = useCallback(() => {
    const newState = !brushActive;
    setBrushActive(newState);
    markerToolRef.current.setActive(newState);
    if (!newState) {
      markerToolRef.current.clearHighlights();
      setHighlightedPoints([]);
    }
  }, [brushActive]);

  const handlePointHover = useCallback((pointIndex: number, position: [number, number, number], screenPos: { x: number; y: number }) => {
    if (brushActive && markerToolRef.current) {
      markerToolRef.current.addHighlightedPoint(pointIndex, position, screenPos);
      
      const colors = pointData?.color;
      if (colors) {
        markerToolRef.current.addMarker(
          pointIndex,
          position,
          [colors[pointIndex * 3], colors[pointIndex * 3 + 1], colors[pointIndex * 3 + 2]]
        );
      }
    }
  }, [brushActive, pointData]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="app-container">
      <div 
        className={`overlay ${isMobile && sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      
      <button 
        className="menu-button"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">PointCloud Viewer</h1>
          {isMobile && (
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="sidebar-content">
          <UploadZone
            onFileUpload={handleFileUpload}
            onParseProgress={handleParseProgress}
            onParseComplete={handleParseComplete}
            onParseError={handleParseError}
          />
          
          {fileInfo && (
            <div className="file-info">
              <div className="file-name">{fileInfo.name}</div>
              <div className="file-size">{formatFileSize(fileInfo.size)}</div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${fileInfo.progress}%` }}
                  />
                </div>
              </div>
              <div className="progress-text">
                {fileInfo.status === 'processing' && (
                  <><span className="loading-indicator"></span>处理中... {fileInfo.progress.toFixed(0)}%</>
                )}
                {fileInfo.status === 'complete' && '✓ 处理完成'}
                {fileInfo.status === 'error' && '✗ 处理失败'}
              </div>
            </div>
          )}
          
          {pointData && (
            <div className="info-panel">
              <div className="info-title">点云信息</div>
              <div className="info-item">
                <span className="info-label">总点数</span>
                <span className="info-value">{pointData.totalPoints.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">LOD级别</span>
                <span className="info-value">Level {pointData.lodLevel}</span>
              </div>
              <div className="info-item">
                <span className="info-label">渲染点数</span>
                <span className="info-value">{(pointData.position.length / 3).toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">包围盒半径</span>
                <span className="info-value">{pointData.boundingBox.radius.toFixed(2)}m</span>
              </div>
              <div className="info-item">
                <span className="info-label">中心点</span>
                <span className="info-value">
                  ({pointData.boundingBox.center[0].toFixed(2)}, 
                  {pointData.boundingBox.center[1].toFixed(2)}, 
                  {pointData.boundingBox.center[2].toFixed(2)})
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="toolbar">
          <button
            className={`toolbar-btn ${brushActive ? 'active' : ''}`}
            onClick={toggleBrush}
            title={brushActive ? '关闭画笔工具' : '开启画笔工具'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </button>
        </div>

        {thumbnailDataUrl && (
          <div className="thumbnail-container">
            <div className="thumbnail-header">俯视预览</div>
            <div className="thumbnail-content">
              <img 
                src={thumbnailDataUrl} 
                alt="Point cloud thumbnail" 
                className="thumbnail-canvas"
              />
            </div>
          </div>
        )}

        {highlightedPoints.map((point, index) => (
          <div
            key={`${point.index}-${index}`}
            className="floating-label"
            style={{
              left: point.screenPosition.x + 15,
              top: point.screenPosition.y - 10
            }}
          >
            Elev: {point.position[2].toFixed(3)}m, 
            Pos: ({point.position[0].toFixed(2)}, {point.position[1].toFixed(2)}, {point.position[2].toFixed(2)})
          </div>
        ))}

        <div className="scene-container">
          <PointCloudScene
            pointData={pointData}
            brushActive={brushActive}
            onPointHover={handlePointHover}
            markerTool={markerToolRef.current}
          />
        </div>

        <div className="status-bar">
          {brushActive ? (
            <><span style={{ color: '#ffd700' }}>●</span> 画笔模式已开启 - 在点云上移动鼠标标记点</>
          ) : pointData ? (
            <>拖拽旋转视角 · 滚轮缩放 · 点击工具栏画笔按钮开始标记</>
          ) : (
            <>请在左侧上传PLY格式的点云文件</>
          )}
        </div>
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
