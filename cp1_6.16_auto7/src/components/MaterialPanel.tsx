import React, { useState } from 'react';
import { PotMaterial, Plant, Decoration } from '../utils/bonSaiLogic';

interface MaterialItem {
  id: string;
  category: 'pot' | 'plant' | 'decoration';
  data: PotMaterial | Plant | Omit<Decoration, 'id' | 'x' | 'y'>;
}

interface MaterialPanelProps {
  pots: PotMaterial[];
  plants: Plant[];
  decorations: Omit<Decoration, 'id' | 'x' | 'y'>[];
  selectedPotId: string | null;
  selectedPlantId: string | null;
  onSelectPot: (pot: PotMaterial) => void;
  onSelectPlant: (plant: Plant) => void;
  onDragStart: (item: MaterialItem, e: React.DragEvent) => void;
}

const MaterialPanel: React.FC<MaterialPanelProps> = ({
  pots,
  plants,
  decorations,
  selectedPotId,
  selectedPlantId,
  onSelectPot,
  onSelectPlant,
  onDragStart
}) => {
  const [activeTab, setActiveTab] = useState<'pot' | 'plant' | 'decoration'>('pot');
  const [flashingCard, setFlashingCard] = useState<string | null>(null);
  const [loadedCards, setLoadedCards] = useState<Set<string>>(new Set());
  const [tabFadeKey, setTabFadeKey] = useState(0);

  const tabs = [
    { key: 'pot' as const, label: '花盆' },
    { key: 'plant' as const, label: '植物' },
    { key: 'decoration' as const, label: '装饰' }
  ];

  const handleTabChange = (key: 'pot' | 'plant' | 'decoration') => {
    if (key !== activeTab) {
      setActiveTab(key);
      setTabFadeKey(prev => prev + 1);
    }
  };

  const handleCardClick = (item: MaterialItem) => {
    if (item.category === 'pot') {
      onSelectPot(item.data as PotMaterial);
    } else if (item.category === 'plant') {
      onSelectPlant(item.data as Plant);
    }
    
    setFlashingCard(item.id);
    setTimeout(() => setFlashingCard(null), 300);
  };

  const handleDragStart = (item: MaterialItem, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    onDragStart(item, e);
  };

  const handleImageLoad = (id: string) => {
    setLoadedCards(prev => new Set(prev).add(id));
  };

  const getPotId = (pot: PotMaterial) => `pot-${pot.type}-${pot.color}`;
  const getPlantId = (plant: Plant) => `plant-${plant.type}`;
  const getDecoId = (deco: Omit<Decoration, 'id' | 'x' | 'y'>) => `deco-${deco.type}`;

  const renderPotCard = (pot: PotMaterial) => {
    const id = getPotId(pot);
    const isLoaded = loadedCards.has(id);
    const selected = selectedPotId === id;
    const flashing = flashingCard === id;

    return (
      <div
        key={id}
        className={`material-card ${selected ? 'selected' : ''} ${flashing ? 'flashing' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart({ id, category: 'pot', data: pot }, e)}
        onClick={() => handleCardClick({ id, category: 'pot', data: pot })}
        onMouseEnter={() => handleImageLoad(id)}
      >
        {!isLoaded && <div className="card-placeholder" />}
        <div 
          className={`card-content pot-card ${isLoaded ? 'loaded' : ''}`}
          style={{
            background: `linear-gradient(180deg, ${pot.gradientStart} 0%, ${pot.gradientEnd} 100%)`,
            opacity: pot.type === 'glass' ? 0.7 : 1,
            border: pot.type === 'glass' ? '2px solid rgba(255,255,255,0.5)' : 'none'
          }}
        >
          <div className="pot-shape">
            <div className="pot-rim" />
            <div className="pot-body" />
          </div>
        </div>
        <div className="card-label">{pot.colorName}{pot.type === 'ceramic' ? '陶' : pot.type === 'glass' ? '玻' : '塑'}</div>
      </div>
    );
  };

  const renderPlantCard = (plant: Plant) => {
    const id = getPlantId(plant);
    const isLoaded = loadedCards.has(id);
    const selected = selectedPlantId === id;
    const flashing = flashingCard === id;

    return (
      <div
        key={id}
        className={`material-card ${selected ? 'selected' : ''} ${flashing ? 'flashing' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart({ id, category: 'plant', data: plant }, e)}
        onClick={() => handleCardClick({ id, category: 'plant', data: plant })}
        onMouseEnter={() => handleImageLoad(id)}
      >
        {!isLoaded && <div className="card-placeholder" />}
        <div className={`card-content plant-card ${isLoaded ? 'loaded' : ''}`}>
          <svg viewBox="0 0 60 80" className="plant-icon">
            <defs>
              <linearGradient id={`grad-${plant.type}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={plant.gradientStart} />
                <stop offset="100%" stopColor={plant.gradientEnd} />
              </linearGradient>
            </defs>
            {plant.type === 'pothos' && (
              <>
                <path d="M30 75 Q25 55 15 45 Q10 35 20 25" stroke={`url(#grad-${plant.type})`} strokeWidth="3" fill="none" />
                <path d="M30 75 Q35 55 45 45 Q50 35 40 25" stroke={`url(#grad-${plant.type})`} strokeWidth="3" fill="none" />
                <ellipse cx="18" cy="35" rx="8" ry="5" fill={`url(#grad-${plant.type})`} transform="rotate(-30 18 35)" />
                <ellipse cx="42" cy="35" rx="8" ry="5" fill={`url(#grad-${plant.type})`} transform="rotate(30 42 35)" />
                <ellipse cx="25" cy="50" rx="7" ry="4" fill={`url(#grad-${plant.type})`} transform="rotate(-15 25 50)" />
                <ellipse cx="35" cy="50" rx="7" ry="4" fill={`url(#grad-${plant.type})`} transform="rotate(15 35 50)" />
              </>
            )}
            {plant.type === 'succulent' && (
              <>
                <ellipse cx="30" cy="50" rx="20" ry="12" fill={`url(#grad-${plant.type})`} />
                <ellipse cx="20" cy="45" rx="8" ry="10" fill={`url(#grad-${plant.type})`} />
                <ellipse cx="40" cy="45" rx="8" ry="10" fill={`url(#grad-${plant.type})`} />
                <ellipse cx="30" cy="38" rx="7" ry="9" fill={`url(#grad-${plant.type})`} />
                <ellipse cx="25" cy="55" rx="6" ry="8" fill={`url(#grad-${plant.type})`} />
                <ellipse cx="35" cy="55" rx="6" ry="8" fill={`url(#grad-${plant.type})`} />
              </>
            )}
            {plant.type === 'cactus' && (
              <>
                <rect x="24" y="25" width="12" height="50" rx="6" fill={`url(#grad-${plant.type})`} />
                <rect x="10" y="40" width="10" height="20" rx="5" fill={`url(#grad-${plant.type})`} />
                <rect x="40" y="35" width="10" height="25" rx="5" fill={`url(#grad-${plant.type})`} />
                <circle cx="30" cy="25" r="3" fill="#FF7043" />
              </>
            )}
          </svg>
        </div>
        <div className="card-label">{plant.name}</div>
      </div>
    );
  };

  const renderDecorationCard = (deco: Omit<Decoration, 'id' | 'x' | 'y'>) => {
    const id = getDecoId(deco);
    const isLoaded = loadedCards.has(id);
    const flashing = flashingCard === id;

    return (
      <div
        key={id}
        className={`material-card ${flashing ? 'flashing' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart({ id, category: 'decoration', data: deco }, e)}
        onClick={() => handleCardClick({ id, category: 'decoration', data: deco })}
        onMouseEnter={() => handleImageLoad(id)}
      >
        {!isLoaded && <div className="card-placeholder" />}
        <div className={`card-content deco-card ${isLoaded ? 'loaded' : ''}`}>
          {deco.type === 'stone' && (
            <svg viewBox="0 0 60 60" className="deco-icon">
              <ellipse cx="30" cy="35" rx="20" ry="15" fill="#9E9E9E" />
              <ellipse cx="25" cy="30" rx="12" ry="8" fill="#BDBDBD" />
              <ellipse cx="35" cy="32" rx="8" ry="5" fill="#E0E0E0" />
            </svg>
          )}
          {deco.type === 'moss' && (
            <svg viewBox="0 0 60 60" className="deco-icon">
              <ellipse cx="30" cy="40" rx="22" ry="12" fill="#558B2F" />
              <ellipse cx="25" cy="35" rx="8" ry="6" fill="#7CB342" />
              <ellipse cx="35" cy="33" rx="7" ry="5" fill="#8BC34A" />
              <ellipse cx="28" cy="38" rx="5" ry="4" fill="#9CCC65" />
            </svg>
          )}
          {deco.type === 'doll' && (
            <svg viewBox="0 0 60 70" className="deco-icon">
              <circle cx="30" cy="20" r="12" fill="#FFCCBC" />
              <rect x="22" y="32" width="16" height="25" rx="3" fill="#EF5350" />
              <circle cx="26" cy="18" r="2" fill="#333" />
              <circle cx="34" cy="18" r="2" fill="#333" />
              <path d="M26 25 Q30 28 34 25" stroke="#E57373" strokeWidth="1.5" fill="none" />
              <rect x="18" y="57" width="8" height="10" rx="2" fill="#5D4037" />
              <rect x="34" y="57" width="8" height="10" rx="2" fill="#5D4037" />
            </svg>
          )}
        </div>
        <div className="card-label">{deco.name}</div>
      </div>
    );
  };

  const renderCards = () => {
    switch (activeTab) {
      case 'pot':
        return pots.map(renderPotCard);
      case 'plant':
        return plants.map(renderPlantCard);
      case 'decoration':
        return decorations.map(renderDecorationCard);
    }
  };

  return (
    <div className="material-panel">
      <div className="panel-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="material-grid fade-in" key={tabFadeKey}>
        {renderCards()}
      </div>

      <style>{`
        .material-panel {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          background: #FFFAF0;
          border-right: 1px solid #E8E0D5;
        }
        
        .panel-tabs {
          display: flex;
          padding: 12px;
          gap: 8px;
          background: #F5F0E1;
          border-bottom: 1px solid #E8E0D5;
        }
        
        .tab-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background: #FFFAF0;
          color: #8D6E63;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease-out;
          font-weight: 500;
        }
        
        .tab-btn:hover {
          background: #E8E0D5;
        }
        
        .tab-btn.active {
          background: #D2B48C;
          color: white;
        }
        
        .material-grid {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          align-content: start;
        }
        
        .material-grid.fade-in {
          animation: tabFadeIn 0.3s ease-out forwards;
        }
        
        @keyframes tabFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
            max-height: 0;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            max-height: 2000px;
          }
        }
        
        .material-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          background: white;
          border-radius: 8px;
          cursor: grab;
          transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
          border: 2px solid transparent;
          user-select: none;
        }
        
        .material-card:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(141, 110, 99, 0.2);
          z-index: 10;
        }
        
        .material-card:active {
          cursor: grabbing;
        }
        
        .material-card.selected {
          border-color: #FFB74D;
        }
        
        .material-card.flashing {
          animation: flash 0.3s ease-out;
        }
        
        @keyframes flash {
          0%, 100% { border-color: #FFB74D; box-shadow: 0 0 0 0 rgba(255, 183, 77, 0); }
          50% { border-color: #FF9800; box-shadow: 0 0 20px 5px rgba(255, 183, 77, 0.5); }
        }
        
        .card-placeholder {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          height: 70px;
          background: #E8E0D5;
          border-radius: 6px;
          overflow: hidden;
        }
        
        .card-placeholder::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #D2B48C, transparent);
          animation: scan 1.5s infinite;
        }
        
        @keyframes scan {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        
        .card-content {
          width: 100%;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .card-content.loaded {
          opacity: 1;
        }
        
        .pot-card {
          position: relative;
        }
        
        .pot-shape {
          position: relative;
          width: 50px;
          height: 55px;
        }
        
        .pot-rim {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 50px;
          height: 8px;
          background: inherit;
          border-radius: 3px;
          filter: brightness(0.9);
        }
        
        .pot-body {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          width: 44px;
          height: 48px;
          background: inherit;
          border-radius: 0 0 10px 10px;
          clip-path: polygon(5% 0%, 95% 0%, 100% 100%, 0% 100%);
        }
        
        .plant-card {
          background: #F1F8E9;
        }
        
        .plant-icon {
          width: 50px;
          height: 60px;
        }
        
        .deco-card {
          background: #FFF8E1;
        }
        
        .deco-icon {
          width: 50px;
          height: 50px;
        }
        
        .card-label {
          margin-top: 6px;
          font-size: 12px;
          color: #5D4037;
          text-align: center;
        }
        
        .material-grid::-webkit-scrollbar {
          width: 6px;
        }
        
        .material-grid::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .material-grid::-webkit-scrollbar-thumb {
          background: #D2B48C;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
};

export default MaterialPanel;
