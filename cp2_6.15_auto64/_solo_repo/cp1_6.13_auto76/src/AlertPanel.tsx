import React from 'react';
import { differenceInDays } from 'date-fns';
import { Plant, getWaterWarning } from './App';

interface AlertPanelProps {
  plants: Plant[];
  isOpen: boolean;
  onToggle: () => void;
  onPlantClick: (id: string) => void;
}

const AlertPanel: React.FC<AlertPanelProps> = ({ plants, isOpen, onToggle, onPlantClick }) => {
  const alertPlants = plants
    .map((plant) => {
      const warning = getWaterWarning(plant);
      const daysSinceWater = plant.lastWatered
        ? differenceInDays(new Date(), new Date(plant.lastWatered))
        : 999;
      return { plant, warning, daysSinceWater };
    })
    .filter((p) => p.warning !== 'none')
    .sort((a, b) => {
      const priority = { red: 0, orange: 1, none: 2 };
      return priority[a.warning] - priority[b.warning];
    });

  return (
    <div className="alert-panel-container">
      {isOpen && (
        <div className="alert-panel">
          <h3>🔔 养护预警</h3>
          <div className="alert-list">
            {alertPlants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#a8a29e', fontSize: '14px' }}>
                所有植物状态良好 🌿
              </div>
            ) : (
              alertPlants.map(({ plant, warning, daysSinceWater }) => (
                <div
                  key={plant._id}
                  className={`alert-item ${warning}`}
                  onClick={() => onPlantClick(plant._id)}
                  style={{ cursor: 'pointer' }}
                >
                  {plant.photoUrl ? (
                    <img src={plant.photoUrl} alt="" className="alert-item-thumb" />
                  ) : (
                    <div
                      className="alert-item-thumb"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}
                    >
                      🌿
                    </div>
                  )}
                  <div className="alert-item-info">
                    <div className="alert-item-name">{plant.name}</div>
                    <div className="alert-item-desc">
                      {plant.lastWatered
                        ? `距上次浇水 ${daysSinceWater} 天`
                        : '还没浇过水'}
                    </div>
                  </div>
                  <div className={`alert-item-days ${warning}`}>
                    {warning === 'red' ? '紧急' : '注意'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <button className="alert-toggle-btn" onClick={onToggle} title="预警面板">
        🔔
        {alertPlants.length > 0 && (
          <span className="badge-count">{alertPlants.length}</span>
        )}
      </button>
    </div>
  );
};

export default AlertPanel;
