import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedItem, Artwork } from './types';

interface Preview3DProps {
  placedItems: PlacedItem[];
  artworks: Artwork[];
  onClose: () => void;
}

const ROOM_WIDTH = 800;
const ROOM_HEIGHT = 400;
const ROOM_DEPTH = 600;
const TIMEOUT_DURATION = 1000;

type LoadState = 'loading' | 'ready' | 'timeout';

const Preview3D: React.FC<Preview3DProps> = ({ placedItems, artworks, onClose }) => {
  const [rotationY, setRotationY] = useState(-30);
  const [rotationX, setRotationX] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(performance.now());

  const artworkMap = React.useMemo(() => {
    const map = new Map<string, Artwork>();
    artworks.forEach(a => map.set(a.id, a));
    return map;
  }, [artworks]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    
    const timer = window.setTimeout(() => {
      setLoadState(prev => {
        if (prev === 'loading') {
          return 'timeout';
        }
        return prev;
      });
    }, TIMEOUT_DURATION);
    timeoutRef.current = timer;

    const checkTimer = window.setTimeout(() => {
      const elapsed = performance.now() - startTimeRef.current;
      if (elapsed < TIMEOUT_DURATION) {
        setLoadState('ready');
      }
    }, 50);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      clearTimeout(checkTimer);
    };
  }, []);

  const handleContentLoad = useCallback(() => {
    if (loadState !== 'timeout') {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoadState('ready');
    }
  }, [loadState]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (loadState !== 'ready') return;
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [loadState]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    
    setRotationY(prev => prev + deltaX * 0.5);
    setRotationX(prev => Math.max(-60, Math.min(60, prev - deltaY * 0.5)));
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const renderArtwork = (item: PlacedItem) => {
    const artwork = artworkMap.get(item.artworkId);
    if (!artwork) return null;

    const scaleX = item.scale * (artwork.width / 80);
    const scaleY = item.scale * (artwork.height / 80);
    const posX = (item.x - ROOM_WIDTH / 2) * 0.8;
    const posZ = (item.y - 300) * 0.8;
    const posY = artwork.type === 'sculpture' ? -50 : -100;

    if (artwork.type === 'painting') {
      return (
        <div
          key={item.id}
          className="artwork-3d painting-3d"
          style={{
            transform: `translate3d(${posX}px, ${posY}px, ${posZ}px) rotateY(${item.rotation}deg) scale(${scaleX}, ${scaleY})`,
            '--artwork-color': artwork.color
          } as React.CSSProperties}
        />
      );
    } else {
      return (
        <div
          key={item.id}
          className="artwork-3d sculpture-3d"
          style={{
            transform: `translate3d(${posX}px, ${posY}px, ${posZ}px) rotateY(${item.rotation}deg) scale(${scaleX})`,
            '--artwork-color': artwork.color
          } as React.CSSProperties}
        />
      );
    }
  };

  const renderFallbackView = () => (
    <div className="fallback-view">
      <div className="fallback-icon">⚠</div>
      <h3>预览加载超时</h3>
      <p>您的浏览器CSS 3D渲染可能受限</p>
      <div className="fallback-summary">
        <div className="summary-item">
          <span className="summary-label">艺术品数量</span>
          <span className="summary-value">{placedItems.length} 件</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">画作品类</span>
          <span className="summary-value">
            {placedItems.filter(i => {
              const a = artworkMap.get(i.artworkId);
              return a?.type === 'painting';
            }).length} 画作 · 
            {placedItems.filter(i => {
              const a = artworkMap.get(i.artworkId);
              return a?.type === 'sculpture';
            }).length} 雕塑
          </span>
        </div>
      </div>
      <div className="fallback-grid">
        {placedItems.slice(0, 8).map(item => {
          const a = artworkMap.get(item.artworkId);
          if (!a) return null;
          return (
            <div key={item.id} className="fallback-item">
              <div 
                className={`fallback-thumb ${a.type}`}
                style={{ backgroundColor: a.color }}
              />
              <div className="fallback-name">{a.title}</div>
              <div className="fallback-pos">({item.x}, {item.y})</div>
            </div>
          );
        })}
      </div>
      <button className="retry-btn" onClick={() => {
        setLoadState('loading');
        startTimeRef.current = performance.now();
        setTimeout(() => {
          const elapsed = performance.now() - startTimeRef.current;
          if (elapsed < TIMEOUT_DURATION) {
            handleContentLoad();
          }
        }, 30);
      }}>
        重新尝试
      </button>
    </div>
  );

  const renderLoadingView = () => (
    <div className="loading-view">
      <div className="loading-spinner" />
      <p>正在生成3D预览...</p>
      <p className="loading-timeout">若超过1秒将显示简化视图</p>
    </div>
  );

  const renderContentView = () => (
    <div 
      ref={containerRef}
      className={`preview-scene ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onLoadCapture={handleContentLoad}
      style={{ cursor: loadState === 'ready' ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
    >
      <div 
        className="room"
        style={{
          transform: `rotateX(${rotationX}deg) rotateY(${rotationY}deg)`
        }}
      >
        <div className="room-face floor" />
        <div className="room-face ceiling" />
        <div className="room-face back-wall" />
        <div className="room-face left-wall" />
        <div className="room-face right-wall" />
        
        {placedItems.map(renderArtwork)}
        
        <div className="spotlight spotlight-1" />
        <div className="spotlight spotlight-2" />
        <div className="spotlight spotlight-3" />
      </div>
    </div>
  );

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-container" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <h2>3D 展厅预览</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        {loadState === 'loading' && renderLoadingView()}
        {loadState === 'timeout' && renderFallbackView()}
        {loadState === 'ready' && renderContentView()}
        
        {loadState === 'ready' && (
          <div className="preview-controls">
            <div className="control-info">
              <span>拖拽旋转视角 · 当前角度: ({Math.round(rotationY)}°, {Math.round(rotationX)}°)</span>
            </div>
            <div className="control-buttons">
              <button 
                className="control-btn" 
                onClick={() => setRotationY(prev => prev - 30)}
              >
                ←
              </button>
              <button 
                className="control-btn" 
                onClick={() => setRotationY(prev => prev + 30)}
              >
                →
              </button>
              <button 
                className="control-btn reset-btn" 
                onClick={() => { setRotationY(-30); setRotationX(15); }}
              >
                重置视角
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(44, 44, 44, 0.92);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .preview-container {
          background: #F5F0EB;
          border-radius: 8px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: slideUp 0.4s ease;
          max-height: 90vh;
          overflow: auto;
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .preview-header h2 {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 0;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          background: #8B7D72;
          color: #F5F0EB;
          font-size: 20px;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .close-btn:hover {
          background: #6F6359;
          transform: scale(1.05);
        }

        .close-btn:active {
          background: #5C4F44;
          transform: scale(0.98);
        }

        .preview-scene {
          width: 700px;
          height: 500px;
          perspective: 1500px;
          perspective-origin: 50% 50%;
          background: linear-gradient(180deg, #1A1A1A 0%, #2C2C2C 100%);
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .preview-scene.dragging {
          cursor: grabbing;
        }

        .loading-view {
          width: 700px;
          height: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #1A1A1A 0%, #2C2C2C 100%);
          border-radius: 4px;
          color: #8B7D72;
          gap: 12px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(139, 125, 114, 0.2);
          border-top-color: #8B7D72;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-view p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          margin: 0;
        }

        .loading-timeout {
          font-size: 13px !important;
          opacity: 0.7;
          font-style: italic;
        }

        .fallback-view {
          width: 700px;
          min-height: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          border-radius: 4px;
          padding: 40px;
          box-sizing: border-box;
          gap: 16px;
        }

        .fallback-icon {
          font-size: 48px;
          color: #C4956A;
        }

        .fallback-view h3 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #2C2C2C;
          margin: 0;
        }

        .fallback-view > p {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-style: italic;
          color: #8B7D72;
          margin: 0;
        }

        .fallback-summary {
          display: flex;
          gap: 24px;
          margin: 8px 0;
          padding: 16px 24px;
          background: #F5F0EB;
          border-radius: 4px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .summary-label {
          font-family: 'Cormorant Garamond', serif;
          font-size: 12px;
          color: #8B7D72;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .summary-value {
          font-family: 'Playfair Display', serif;
          font-size: 16px;
          font-weight: 600;
          color: #2C2C2C;
        }

        .fallback-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          width: 100%;
          max-width: 500px;
        }

        .fallback-item {
          background: #F5F0EB;
          padding: 12px;
          border-radius: 4px;
          text-align: center;
        }

        .fallback-thumb {
          width: 40px;
          height: 40px;
          margin: 0 auto 8px;
          border: 2px solid #8B7D72;
        }

        .fallback-thumb.sculpture {
          border-radius: 50%;
        }

        .fallback-name {
          font-family: 'Playfair Display', serif;
          font-size: 11px;
          color: #2C2C2C;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fallback-pos {
          font-family: 'Cormorant Garamond', serif;
          font-size: 10px;
          color: #8B7D72;
        }

        .retry-btn {
          margin-top: 8px;
          padding: 10px 24px;
          background: #8B7D72;
          color: #F5F0EB;
          border: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border-radius: 2px;
          transition: background-color 0.2s ease, transform 0.2s ease;
          letter-spacing: 1px;
        }

        .retry-btn:hover {
          background: #6F6359;
        }

        .retry-btn:active {
          background: #5C4F44;
          transform: scale(0.98);
        }

        .room {
          width: 0;
          height: 0;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.1s ease-out;
        }

        .room-face {
          position: absolute;
          background: #FFFFFF;
          border: 1px solid rgba(139, 125, 114, 0.2);
        }

        .floor {
          width: ${ROOM_WIDTH}px;
          height: ${ROOM_DEPTH}px;
          transform: translate(-50%, -50%) rotateX(90deg) translateZ(-${ROOM_HEIGHT / 2}px);
          background: 
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(139, 125, 114, 0.1) 40px,
              rgba(139, 125, 114, 0.1) 41px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 40px,
              rgba(139, 125, 114, 0.1) 40px,
              rgba(139, 125, 114, 0.1) 41px
            ),
            #FAFAFA;
        }

        .ceiling {
          width: ${ROOM_WIDTH}px;
          height: ${ROOM_DEPTH}px;
          transform: translate(-50%, -50%) rotateX(-90deg) translateZ(-${ROOM_HEIGHT / 2}px);
          background: #F5F0EB;
        }

        .back-wall {
          width: ${ROOM_WIDTH}px;
          height: ${ROOM_HEIGHT}px;
          transform: translate(-50%, -50%) translateZ(-${ROOM_DEPTH / 2}px);
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F0EB 100%);
        }

        .left-wall {
          width: ${ROOM_DEPTH}px;
          height: ${ROOM_HEIGHT}px;
          transform: translate(-50%, -50%) rotateY(90deg) translateZ(-${ROOM_WIDTH / 2}px);
          background: linear-gradient(90deg, #F5F0EB 0%, #FFFFFF 100%);
        }

        .right-wall {
          width: ${ROOM_DEPTH}px;
          height: ${ROOM_HEIGHT}px;
          transform: translate(-50%, -50%) rotateY(-90deg) translateZ(-${ROOM_WIDTH / 2}px);
          background: linear-gradient(270deg, #F5F0EB 0%, #FFFFFF 100%);
        }

        .artwork-3d {
          position: absolute;
          transform-style: preserve-3d;
          transition: transform 0.3s ease;
        }

        .painting-3d {
          width: 80px;
          height: 60px;
          margin-left: -40px;
          margin-top: -30px;
          background: var(--artwork-color);
          border: 4px solid #8B7D72;
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.3),
            inset 0 0 0 2px rgba(255, 255, 255, 0.2);
        }

        .sculpture-3d {
          width: 50px;
          height: 70px;
          margin-left: -25px;
          margin-top: -35px;
          background: var(--artwork-color);
          border-radius: 50% 50% 40% 40%;
          box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.4),
            inset 0 0 0 2px rgba(255, 255, 255, 0.3);
        }

        .spotlight {
          position: absolute;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .spotlight-1 {
          transform: translate(-50%, -50%) rotateX(90deg) translateZ(-${ROOM_HEIGHT / 2 - 1}px) translateX(-200px) translateZ(-150px);
        }

        .spotlight-2 {
          transform: translate(-50%, -50%) rotateX(90deg) translateZ(-${ROOM_HEIGHT / 2 - 1}px);
        }

        .spotlight-3 {
          transform: translate(-50%, -50%) rotateX(90deg) translateZ(-${ROOM_HEIGHT / 2 - 1}px) translateX(200px) translateZ(150px);
        }

        .preview-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #FFFFFF;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(44, 44, 44, 0.1);
        }

        .control-info {
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          font-style: italic;
          color: #8B7D72;
        }

        .control-buttons {
          display: flex;
          gap: 8px;
        }

        .control-btn {
          padding: 8px 16px;
          background: #8B7D72;
          color: #F5F0EB;
          border: none;
          font-family: 'Cormorant Garamond', serif;
          font-size: 14px;
          cursor: pointer;
          border-radius: 2px;
          transition: background-color 0.2s ease, transform 0.2s ease;
          min-width: 40px;
        }

        .control-btn:hover {
          background: #6F6359;
        }

        .control-btn:active {
          background: #5C4F44;
          transform: scale(0.96);
        }

        .control-btn.reset-btn {
          background: transparent;
          border: 1px solid #8B7D72;
          color: #8B7D72;
        }

        .control-btn.reset-btn:hover {
          background: #8B7D72;
          border-color: #8B7D72;
          color: #F5F0EB;
        }

        .control-btn.reset-btn:active {
          background: #5C4F44;
          border-color: #5C4F44;
        }
      `}</style>
    </div>
  );
};

export default Preview3D;
