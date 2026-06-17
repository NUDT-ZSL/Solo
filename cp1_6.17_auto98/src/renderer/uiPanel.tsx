import React from 'react';
import { useGameStore, TowerType, TOWER_STATS } from '../store/gameStore';

const UIPanel: React.FC = () => {
  const { lives, score, selectedTowerType, gameOver, setSelectedTowerType, resetGame } = useGameStore();

  const towerTypes: TowerType[] = ['arrow', 'cannon', 'magic'];

  return (
    <>
      <TopBar lives={lives} score={score} />
      <TowerSelector
        selectedType={selectedTowerType}
        towerTypes={towerTypes}
        onSelect={setSelectedTowerType}
      />
      {gameOver && <GameOverModal score={score} onRestart={resetGame} />}
    </>
  );
};

const TopBar: React.FC<{ lives: number; score: number }> = ({ lives, score }) => {
  return (
    <div
      style={{
        width: 800,
        height: 50,
        backgroundColor: '#1A1A2E',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20, color: '#FF4500' }}>❤</span>
        <span style={{ fontSize: 20, fontWeight: 'bold' }}>{lives}</span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 'bold', color: '#FFD700' }}>
        得分: {score}
      </div>
    </div>
  );
};

const TowerSelector: React.FC<{
  selectedType: TowerType;
  towerTypes: TowerType[];
  onSelect: (type: TowerType) => void;
}> = ({ selectedType, towerTypes, onSelect }) => {
  return (
    <div
      style={{
        width: 800,
        height: 80,
        backgroundColor: '#16213E',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {towerTypes.map((type) => {
        const stats = TOWER_STATS[type];
        const isSelected = selectedType === type;
        return (
          <div
            key={type}
            onClick={() => onSelect(type)}
            style={{
              width: 180,
              height: 60,
              backgroundColor: '#0F3460',
              borderRadius: 8,
              border: isSelected ? `2px solid #FFD700` : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 10,
              boxSizing: 'border-box',
              transition: 'all 0.2s',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                backgroundColor: stats.color,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              {type === 'arrow' ? '箭' : type === 'cannon' ? '炮' : '魔'}
            </div>
            <div style={{ color: 'white', fontSize: 12 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 2 }}>
                {stats.name}
              </div>
              <div style={{ opacity: 0.8 }}>
                射程{stats.range} | 伤害{stats.damage}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GameOverModal: React.FC<{ score: number; onRestart: () => void }> = ({ score, onRestart }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 800,
        height: 730,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, sans-serif',
        zIndex: 100,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          minWidth: 300,
        }}
      >
        <h2 style={{ color: '#1A1A2E', margin: 0, marginBottom: 16, fontSize: 28 }}>
          游戏结束
        </h2>
        <p style={{ color: '#16213E', fontSize: 20, margin: 0, marginBottom: 24 }}>
          最终得分: <span style={{ color: '#FFD700', fontWeight: 'bold' }}>{score}</span>
        </p>
        <button
          onClick={onRestart}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            padding: '12px 36px',
            fontSize: 16,
            fontWeight: 'bold',
            backgroundColor: hovered ? '#FFD700' : '#16213E',
            color: hovered ? '#16213E' : 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          重新开始
        </button>
      </div>
    </div>
  );
};

export default UIPanel;
