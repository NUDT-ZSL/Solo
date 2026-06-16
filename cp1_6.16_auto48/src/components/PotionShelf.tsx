import React from 'react';
import { FinishedPotion, Material } from '../gameLogic';

interface PotionShelfProps {
  potions: FinishedPotion[];
  materials: Material[];
}

const PotionShelf: React.FC<PotionShelfProps> = ({ potions, materials }) => {
  const grid = Array.from({ length: 9 }).map((_, i) => potions[i] || null);

  return (
    <div className="potion-shelf">
      <h2 className="panel-title">🏺 成品架</h2>
      <div className="potions-grid">
        {grid.map((potion, index) => (
          <div key={index} className={`potion-slot ${potion ? 'filled' : 'empty'}`}
            title={potion ? potion.name : '空槽位'}
          >
            {potion ? (
              <div className={`potion-bottle ${potion.quality >= 4 ? 'premium' : ''}`}
                style={{ '--potion-color': potion.color } as React.CSSProperties}
              >
                <div className="bottle-cap" />
                <div className="bottle-neck" />
                <div className="bottle-body">
                  <div 
                    className="bottle-liquid" 
                    style={{ backgroundColor: potion.color }}
                  />
                </div>
                <div className="potion-label">
                  <span className="potion-name">{potion.name}</span>
                  <span className="potion-quality">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={`mini-star ${i < potion.quality ? 'filled' : ''}`}
                      >
                        ⭐
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            ) : (
              <span className="empty-slot">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PotionShelf;
