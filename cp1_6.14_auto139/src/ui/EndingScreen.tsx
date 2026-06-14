import React from 'react';

interface EndingScreenProps {
  endingType: 'good' | 'normal' | 'bad';
  endingTitle: string;
  text: string;
  onRestart: () => void;
}

const EndingScreen: React.FC<EndingScreenProps> = ({ endingType, endingTitle, text, onRestart }) => {
  const getGradient = () => {
    switch (endingType) {
      case 'good':
        return 'linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ff6347 100%)';
      case 'bad':
        return 'linear-gradient(135deg, #2c3e50 0%, #1a1a2e 50%, #0d0d1a 100%)';
      default:
        return 'linear-gradient(135deg, #4a5568 0%, #2d3748 50%, #1a202c 100%)';
    }
  };

  const getTitleColor = () => {
    switch (endingType) {
      case 'good':
        return '#ffd700';
      case 'bad':
        return '#5c6bc0';
      default:
        return '#a0aec0';
    }
  };

  return (
    <div className="ending-screen">
      <div className="ending-overlay" style={{ background: getGradient() }}></div>
      <div className="ending-content">
        <h2 className="ending-title" style={{ color: getTitleColor() }}>
          {endingTitle}
        </h2>
        <p className="ending-text">{text}</p>
        <button className="game-btn primary" onClick={onRestart}>
          重新开始
        </button>
      </div>
    </div>
  );
};

export default EndingScreen;
