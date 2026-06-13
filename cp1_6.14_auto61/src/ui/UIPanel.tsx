import React, { useState, useEffect } from 'react';
import { GameEvent, eventBus } from '../engine/EventBus';
import { PlantType, PLANT_CONFIGS } from '../types/gameTypes';

interface UIPanelProps {
  onSelectPlant: (plant: PlantType | null) => void;
  selectedPlant: PlantType | null;
}

const UIPanel: React.FC<UIPanelProps> = ({ onSelectPlant, selectedPlant }) => {
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(5);
  const [sunlight, setSunlight] = useState(50);
  const [wave, setWave] = useState(0);

  useEffect(() => {
    const scoreUnsub = eventBus.on(GameEvent.SCORE_UPDATE, (data) => {
      setScore(data as number);
    });

    const healthUnsub = eventBus.on(GameEvent.HEALTH_UPDATE, (data) => {
      setHealth(data as number);
    });

    const sunlightUnsub = eventBus.on(GameEvent.SUNLIGHT_UPDATE, (data) => {
      setSunlight(data as number);
    });

    const waveUnsub = eventBus.on(GameEvent.WAVE_START, (data) => {
      const { waveNumber } = data as { waveNumber: number };
      setWave(waveNumber);
    });

    return () => {
      scoreUnsub();
      healthUnsub();
      sunlightUnsub();
      waveUnsub();
    };
  }, []);

  const plants: PlantType[] = ['sunflower', 'peashooter', 'wallnut'];

  const handlePlantClick = (plant: PlantType) => {
    if (sunlight < PLANT_CONFIGS[plant].cost) return;

    if (selectedPlant === plant) {
      onSelectPlant(null);
    } else {
      onSelectPlant(plant);
    }
  };

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 5; i++) {
      hearts.push(
        <span
          key={i}
          className="heart"
          style={{ opacity: i < health ? 1 : 0.3 }}
        >
          ❤️
        </span>
      );
    }
    return hearts;
  };

  return (
    <div className="ui-panel">
      <div className="top-bar">
        <div className="left-section">
          <div className="sunlight">
            <span className="sun-icon">☀️</span>
            <span className="sunlight-value">{sunlight}</span>
          </div>
          <div className="wave-info">
            <span className="wave-label">波次</span>
            <span className="wave-value">{wave}</span>
          </div>
        </div>

        <div className="center-section">
          <div className="health-bar">
            {renderHearts()}
          </div>
        </div>

        <div className="right-section">
          <div className="score">
            <span className="score-label">得分</span>
            <span className="score-value">{score}</span>
          </div>
        </div>
      </div>

      <div className="bottom-bar">
        <div className="plant-selector">
          {plants.map((plant) => {
            const config = PLANT_CONFIGS[plant];
            const canAfford = sunlight >= config.cost;
            const isSelected = selectedPlant === plant;

            return (
              <div
                key={plant}
                className={`plant-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
                onClick={() => handlePlantClick(plant)}
              >
                <div className={`plant-icon plant-${plant}`}>
                  {plant === 'sunflower' && '🌻'}
                  {plant === 'peashooter' && '🌱'}
                  {plant === 'wallnut' && '🥜'}
                </div>
                <div className="plant-name">{config.name}</div>
                <div className="plant-cost">
                  <span className="cost-icon">☀️</span>
                  {config.cost}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UIPanel;
