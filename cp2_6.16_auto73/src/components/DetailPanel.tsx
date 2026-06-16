import { useState, useEffect } from 'react';
import { Dish, Region, Pairing, getRandomPairings } from '@/data/cuisineData';

interface DetailPanelProps {
  selectedRegion: Region | null;
  selectedDish: Dish | null;
  onDishClick: (dish: Dish) => void;
}

export default function DetailPanel({ selectedRegion, selectedDish, onDishClick }: DetailPanelProps) {
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [expandedPairingId, setExpandedPairingId] = useState<string | null>(null);
  const [showPairings, setShowPairings] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  useEffect(() => {
    if (selectedDish) {
      setPanelKey(prev => prev + 1);
    }
  }, [selectedDish]);

  const handleExplorePairings = () => {
    const newPairings = getRandomPairings(3);
    setPairings(newPairings);
    setShowPairings(true);
    setExpandedPairingId(null);
  };

  const togglePairingExpand = (id: string) => {
    setExpandedPairingId(expandedPairingId === id ? null : id);
  };

  if (!selectedRegion) {
    return (
      <div className="detail-empty">
        <div className="empty-icon">🌍</div>
        <h2>探索全球美食</h2>
        <p>点击地图上的彩色圆点，开始你的美食之旅</p>
      </div>
    );
  }

  return (
    <div className="detail-panel-wrapper">
      <div className="dish-cards-section">
        <h3 className="section-title">
          <span className="region-dot" style={{ backgroundColor: selectedRegion.color }}></span>
          {selectedRegion.name} 代表菜品
        </h3>
        <div className="dish-cards-container">
          {selectedRegion.dishes.map((dish) => (
            <div
              key={dish.id}
              className={`dish-card ${selectedDish?.id === dish.id ? 'selected' : ''}`}
              onClick={() => onDishClick(dish)}
            >
              <div
                className="dish-card-image"
                style={{
                  background: `linear-gradient(135deg, ${dish.gradient.from}, ${dish.gradient.to})`
                }}
              >
                <span className="dish-card-emoji">🍽️</span>
              </div>
              <div className="dish-card-content">
                <h4 className="dish-card-title">{dish.name}</h4>
                <p className="dish-card-desc">{dish.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedDish && (
        <div key={panelKey} className="dish-detail-panel fade-in">
          <h2 className="dish-name">{selectedDish.name}</h2>
          <p className="dish-origin">{selectedDish.origin}</p>

          <div className="pairing-section">
            <h4 className="pairing-title">搭配建议</h4>
            <div className="pairing-tags">
              <span className="pairing-tag">
                🥤 {selectedDish.drinkPairing}
              </span>
              <span className="pairing-tag">
                🥗 {selectedDish.sideDish}
              </span>
            </div>
          </div>

          <button className="explore-button" onClick={handleExplorePairings}>
            ✨ 搭配探索
          </button>

          {showPairings && (
            <div className="cross-pairings-section">
              <h4 className="pairing-title">跨文化创意搭配</h4>
              <div className="pairings-waterfall">
                {pairings.map((pairing, index) => (
                  <div
                    key={pairing.id}
                    className={`pairing-card slide-in ${expandedPairingId === pairing.id ? 'expanded' : ''}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => togglePairingExpand(pairing.id)}
                  >
                    <div className="pairing-card-header">
                      <span className="pairing-items">{pairing.items.join(' × ')}</span>
                      <span className="expand-icon">{expandedPairingId === pairing.id ? '−' : '+'}</span>
                    </div>
                    <p className="pairing-description">{pairing.description}</p>
                    {expandedPairingId === pairing.id && (
                      <div className="pairing-full-desc">
                        <p>{pairing.fullDescription}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
