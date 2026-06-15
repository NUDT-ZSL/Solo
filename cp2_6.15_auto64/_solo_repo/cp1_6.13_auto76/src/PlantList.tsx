import React from 'react';
import { Plant, getWaterWarning, getDaysUntilNextWater } from './App';

interface PlantListProps {
  plants: Plant[];
  onPlantClick: (id: string) => void;
}

const PlantList: React.FC<PlantListProps> = ({ plants, onPlantClick }) => {
  if (plants.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🌱</div>
        <h3>还没有植物</h3>
        <p>点击右上角 + 号添加你的第一株植物吧！</p>
      </div>
    );
  }

  return (
    <div className="plant-grid">
      {plants.map((plant) => {
        const warning = getWaterWarning(plant);
        const daysLeft = getDaysUntilNextWater(plant);

        return (
          <div
            key={plant._id}
            className={`plant-card ${warning === 'red' ? 'warning-red' : warning === 'orange' ? 'warning-orange' : ''}`}
            onClick={() => onPlantClick(plant._id)}
          >
            {warning !== 'none' && (
              <div className={`warning-badge ${warning}`}>!</div>
            )}

            {plant.photoUrl ? (
              <img src={plant.photoUrl} alt={plant.name} className="plant-photo" />
            ) : (
              <div className="plant-photo-placeholder">🌿</div>
            )}

            <div className="plant-name">{plant.name}</div>
            <div className="plant-species">{plant.species || '未知品种'}</div>

            <div className="plant-water-info">
              <div className="water-days">
                {daysLeft === 0 ? '今天' : daysLeft}
              </div>
              <div className="water-label">
                {daysLeft === 0 ? '需要浇水' : daysLeft === 1 ? '天后浇水' : '天后浇水'}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlantList;
