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

const Preview3D: React.FC<Preview3DProps> = ({ placedItems, artworks, onClose }) => {
  const [rotationY, setRotationY] = useState(-30);
  const [rotationX, setRotationX] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const artworkMap = React.useMemo(() => {
    const map = new Map<string, Artwork>();
    artworks.forEach(a => map.set(a.id, a));
    return map;
  }, [artworks]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

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

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-container" onClick={e => e.stopPropagation()}>
        <div className="preview-header">
          <h2>3D 展厅预览</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div 
          ref={containerRef}
          className={`preview-scene ${isDragging ? 'dragging' : ''}`}
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
      </div>

      <style>{`
        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(44, 44, 44, 0.9);
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
          width: 32px;
          height: 32px;
          border: none;
          background: #8B7D72;
          color: #F5F0EB;
          font-size: 20px;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #5C4F44;
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
        }

        .preview-scene.dragging {
          cursor: grabbing;
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
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #5C4F44;
        }

        .control-btn.reset-btn {
          background: transparent;
          border: 1px solid #8B7D72;
          color: #8B7D72;
        }

        .control-btn.reset-btn:hover {
          background: #5C4F44;
          border-color: #5C4F44;
          color: #F5F0EB;
        }
      `}</style>
    </div>
  );
};

export default Preview3D;
