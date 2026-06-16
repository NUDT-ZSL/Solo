import React, { useRef, useState, useEffect } from 'react';
import { BonsaiState, Decoration } from '../utils/bonSaiLogic';

interface MaterialItem {
  id: string;
  category: 'pot' | 'plant' | 'decoration';
  data: any;
}

interface WorkbenchProps {
  state: BonsaiState;
  onStateChange: (newState: BonsaiState) => void;
  workbenchRef?: React.RefObject<HTMLDivElement>;
}

const Workbench: React.FC<WorkbenchProps> = ({ state, onStateChange, workbenchRef }) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = workbenchRef || internalRef;
  const [isDragOver, setIsDragOver] = useState(false);
  const [potHighlight, setPotHighlight] = useState(false);
  const [plantGrow, setPlantGrow] = useState(false);
  const [draggingDeco, setDraggingDeco] = useState<{ id: string; x: number; y: number } | null>(null);
  const [newDecoAnimations, setNewDecoAnimations] = useState<Set<string>>(new Set());
  const [movingDeco, setMovingDeco] = useState<string | null>(null);

  useEffect(() => {
    if (state.plant) {
      setPlantGrow(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPlantGrow(true);
        });
      });
    }
  }, [state.plant?.type]);

  useEffect(() => {
    if (state.decorations.length > 0) {
      const lastDeco = state.decorations[state.decorations.length - 1];
      if (!newDecoAnimations.has(lastDeco.id)) {
        setNewDecoAnimations(prev => new Set(prev).add(lastDeco.id));
        setTimeout(() => {
          setNewDecoAnimations(prev => {
            const next = new Set(prev);
            next.delete(lastDeco.id);
            return next;
          });
        }, 300);
      }
    }
  }, [state.decorations.length]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);

    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const potArea = getPotArea(rect);
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const isOverPot = x >= potArea.x && x <= potArea.x + potArea.width &&
                       y >= potArea.y && y <= potArea.y + potArea.height;
      setPotHighlight(isOverPot);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
    setPotHighlight(false);
  };

  const getPotArea = (rect: DOMRect) => {
    const centerX = rect.width / 2;
    const centerY = rect.height / 2 + 30;
    const potWidth = 160;
    const potHeight = 140;
    return {
      x: centerX - potWidth / 2,
      y: centerY - potHeight / 2,
      width: potWidth,
      height: potHeight
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setPotHighlight(false);

    try {
      const itemData = e.dataTransfer.getData('application/json');
      if (!itemData) return;

      const item: MaterialItem = JSON.parse(itemData);
      
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const potArea = getPotArea(rect);
      const isOverPot = x >= potArea.x && x <= potArea.x + potArea.width &&
                         y >= potArea.y && y <= potArea.y + potArea.height;

      if (item.category === 'pot') {
        onStateChange({
          ...state,
          pot: item.data
        });
      } else if (item.category === 'plant' && (isOverPot || state.pot)) {
        onStateChange({
          ...state,
          plant: item.data
        });
      } else if (item.category === 'decoration') {
        const newDeco: Decoration = {
          ...item.data,
          id: `deco-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          x: x - item.data.width / 2,
          y: y - item.data.height / 2
        };
        onStateChange({
          ...state,
          decorations: [...state.decorations, newDeco]
        });
      }
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  const handleDecoMouseDown = (deco: Decoration, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMovingDeco(deco.id);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startDecoX = deco.x;
    const startDecoY = deco.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setDraggingDeco({
        id: deco.id,
        x: startDecoX + dx,
        y: startDecoY + dy
      });
    };

    const handleMouseUp = () => {
      if (draggingDeco) {
        const updatedDecos = state.decorations.map(d =>
          d.id === deco.id
            ? { ...d, x: draggingDeco.x, y: draggingDeco.y }
            : d
        );
        onStateChange({
          ...state,
          decorations: updatedDecos
        });
      }
      setDraggingDeco(null);
      setMovingDeco(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const renderPot = () => {
    if (!state.pot) return null;
    const pot = state.pot;
    
    return (
      <div className="pot-container">
        <div 
          className="pot-rim"
          style={{
            background: `linear-gradient(180deg, ${pot.gradientStart} 0%, ${pot.gradientEnd} 100%)`,
            opacity: pot.type === 'glass' ? 0.7 : 1,
            border: pot.type === 'glass' ? '2px solid rgba(255,255,255,0.6)' : 'none'
          }}
        />
        <div 
          className="pot-body"
          style={{
            background: `linear-gradient(180deg, ${pot.gradientStart} 0%, ${pot.gradientEnd} 100%)`,
            opacity: pot.type === 'glass' ? 0.5 : 1,
            border: pot.type === 'glass' ? '2px solid rgba(255,255,255,0.6)' : 'none',
            borderTop: 'none'
          }}
        />
        <div className="pot-shadow" />
      </div>
    );
  };

  const renderPlant = () => {
    if (!state.plant) return null;
    const plant = state.plant;

    return (
      <div 
        className={`plant-container ${plantGrow ? 'grow-in' : ''}`}
      >
        <svg viewBox="0 0 120 160" className="plant-svg">
          <defs>
            <linearGradient id="plant-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={plant.gradientStart} />
              <stop offset="100%" stopColor={plant.gradientEnd} />
            </linearGradient>
          </defs>
          {plant.type === 'pothos' && (
            <>
              <path d="M60 150 Q50 110 30 90 Q20 70 40 50" stroke="url(#plant-grad)" strokeWidth="5" fill="none" />
              <path d="M60 150 Q70 110 90 90 Q100 70 80 50" stroke="url(#plant-grad)" strokeWidth="5" fill="none" />
              <ellipse cx="36" cy="70" rx="16" ry="10" fill="url(#plant-grad)" transform="rotate(-30 36 70)" />
              <ellipse cx="84" cy="70" rx="16" ry="10" fill="url(#plant-grad)" transform="rotate(30 84 70)" />
              <ellipse cx="50" cy="100" rx="14" ry="8" fill="url(#plant-grad)" transform="rotate(-15 50 100)" />
              <ellipse cx="70" cy="100" rx="14" ry="8" fill="url(#plant-grad)" transform="rotate(15 70 100)" />
              <ellipse cx="45" cy="130" rx="12" ry="7" fill="url(#plant-grad)" transform="rotate(-10 45 130)" />
              <ellipse cx="75" cy="130" rx="12" ry="7" fill="url(#plant-grad)" transform="rotate(10 75 130)" />
            </>
          )}
          {plant.type === 'succulent' && (
            <>
              <ellipse cx="60" cy="100" rx="45" ry="25" fill="url(#plant-grad)" />
              <ellipse cx="40" cy="90" rx="18" ry="22" fill="url(#plant-grad)" />
              <ellipse cx="80" cy="90" rx="18" ry="22" fill="url(#plant-grad)" />
              <ellipse cx="60" cy="75" rx="15" ry="20" fill="url(#plant-grad)" />
              <ellipse cx="50" cy="110" rx="13" ry="16" fill="url(#plant-grad)" />
              <ellipse cx="70" cy="110" rx="13" ry="16" fill="url(#plant-grad)" />
              <ellipse cx="60" cy="65" rx="10" ry="14" fill="url(#plant-grad)" />
            </>
          )}
          {plant.type === 'cactus' && (
            <>
              <rect x="48" y="40" width="24" height="110" rx="12" fill="url(#plant-grad)" />
              <rect x="20" y="70" width="20" height="45" rx="10" fill="url(#plant-grad)" />
              <rect x="80" y="60" width="20" height="55" rx="10" fill="url(#plant-grad)" />
              <circle cx="60" cy="40" r="6" fill="#FF7043" />
              <line x1="42" y1="60" x2="42" y2="140" stroke="#33691E" strokeWidth="1" strokeDasharray="3 6" />
              <line x1="78" y1="55" x2="78" y2="145" stroke="#33691E" strokeWidth="1" strokeDasharray="3 6" />
              <line x1="60" y1="45" x2="60" y2="150" stroke="#33691E" strokeWidth="1" strokeDasharray="3 6" />
            </>
          )}
        </svg>
      </div>
    );
  };

  const renderDecoration = (deco: Decoration) => {
    const isDragging = movingDeco === deco.id;
    const hasAnimation = newDecoAnimations.has(deco.id);
    
    const displayX = isDragging && draggingDeco ? draggingDeco.x : deco.x;
    const displayY = isDragging && draggingDeco ? draggingDeco.y : deco.y;

    return (
      <div
        key={deco.id}
        className={`decoration-item ${hasAnimation ? 'deco-float-in' : ''}`}
        style={{
          position: 'absolute',
          left: displayX,
          top: displayY,
          width: deco.width,
          height: deco.height,
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: isDragging ? 100 : 10,
          opacity: isDragging ? 0.8 : 1
        }}
        onMouseDown={(e) => handleDecoMouseDown(deco, e)}
      >
        {deco.type === 'stone' && (
          <svg viewBox="0 0 60 45" style={{ width: '100%', height: '100%' }}>
            <ellipse cx="30" cy="28" rx="25" ry="17" fill="#9E9E9E" />
            <ellipse cx="24" cy="22" rx="15" ry="10" fill="#BDBDBD" />
            <ellipse cx="36" cy="25" rx="10" ry="6" fill="#E0E0E0" />
          </svg>
        )}
        {deco.type === 'moss' && (
          <svg viewBox="0 0 60 40" style={{ width: '100%', height: '100%' }}>
            <ellipse cx="30" cy="28" rx="28" ry="14" fill="#558B2F" />
            <ellipse cx="22" cy="22" rx="12" ry="9" fill="#7CB342" />
            <ellipse cx="38" cy="20" rx="10" ry="8" fill="#8BC34A" />
            <ellipse cx="30" cy="24" rx="8" ry="6" fill="#9CCC65" />
          </svg>
        )}
        {deco.type === 'doll' && (
          <svg viewBox="0 0 50 65" style={{ width: '100%', height: '100%' }}>
            <circle cx="25" cy="18" r="11" fill="#FFCCBC" />
            <rect x="17" y="28" width="16" height="24" rx="3" fill="#EF5350" />
            <circle cx="21" cy="16" r="2" fill="#333" />
            <circle cx="29" cy="16" r="2" fill="#333" />
            <path d="M21 23 Q25 26 29 23" stroke="#E57373" strokeWidth="1.5" fill="none" />
            <rect x="14" y="52" width="7" height="9" rx="2" fill="#5D4037" />
            <rect x="29" y="52" width="7" height="9" rx="2" fill="#5D4037" />
          </svg>
        )}
      </div>
    );
  };

  const renderPotOutline = () => {
    if (state.pot) return null;
    
    return (
      <div className={`pot-outline ${potHighlight ? 'highlight' : ''}`}>
        <div className="pot-outline-rim" />
        <div className="pot-outline-body" />
        <div className="pot-outline-label">拖入花盆</div>
      </div>
    );
  };

  return (
    <div 
      ref={ref}
      className={`workbench ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="workbench-surface">
        <div className="pot-area">
          {renderPlant()}
          {renderPot()}
          {renderPotOutline()}
        </div>
        {state.decorations.map(renderDecoration)}
      </div>

      <style>{`
        .workbench {
          width: 100%;
          height: 100%;
          position: relative;
          background: #F5F0E1;
          overflow: hidden;
        }
        
        .workbench.drag-over {
          background: #EFE8D8;
        }
        
        .workbench-surface {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
        
        .pot-area {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
        }
        
        .pot-container {
          position: relative;
          width: 160px;
          height: 140px;
        }
        
        .pot-rim {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 160px;
          height: 20px;
          border-radius: 6px 6px 3px 3px;
          z-index: 2;
        }
        
        .pot-body {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 124px;
          border-radius: 0 0 20px 20px;
          clip-path: polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%);
          z-index: 1;
        }
        
        .pot-shadow {
          position: absolute;
          bottom: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 20px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        
        .plant-container {
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          width: 180px;
          height: 200px;
          z-index: 0;
          transform-origin: bottom center;
          opacity: 0;
          transform: translateX(-50%) scale(0.2);
        }
        
        .plant-container.grow-in {
          animation: plantGrow 0.5s ease-out forwards;
        }
        
        @keyframes plantGrow {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.2);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
        
        .plant-svg {
          width: 100%;
          height: 100%;
        }
        
        .pot-outline {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 160px;
          height: 140px;
          border: 3px dashed #BCAAA4;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .pot-outline.highlight {
          border-color: #81C784;
          border-style: dashed;
          box-shadow: 0 0 20px rgba(129, 199, 132, 0.4);
        }
        
        .pot-outline-rim {
          position: absolute;
          top: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 160px;
          height: 20px;
          border: 3px dashed #BCAAA4;
          border-bottom: none;
          border-radius: 6px 6px 0 0;
        }
        
        .pot-outline.highlight .pot-outline-rim {
          border-color: #81C784;
        }
        
        .pot-outline-body {
          position: absolute;
          top: 17px;
          left: 50%;
          transform: translateX(-50%);
          width: 140px;
          height: 123px;
          border-left: 3px dashed #BCAAA4;
          border-right: 3px dashed #BCAAA4;
          border-bottom: 3px dashed #BCAAA4;
          border-radius: 0 0 20px 20px;
          clip-path: polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%);
        }
        
        .pot-outline.highlight .pot-outline-body {
          border-color: #81C784;
        }
        
        .pot-outline-label {
          color: #8D6E63;
          font-size: 14px;
          z-index: 10;
        }
        
        .pot-outline.highlight .pot-outline-label {
          color: #558B2F;
        }
        
        .decoration-item {
          transition: opacity 0.1s ease;
        }
        
        .decoration-item:hover {
          filter: brightness(1.1);
        }
        
        .deco-float-in {
          animation: decoFloatIn 0.3s ease-out;
        }
        
        @keyframes decoFloatIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Workbench;
