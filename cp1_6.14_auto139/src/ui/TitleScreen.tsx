import React from 'react';

interface TitleScreenProps {
  hasSave: boolean;
  onStartNew: () => void;
  onContinue: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({ hasSave, onStartNew, onContinue }) => {
  return (
    <div className="title-screen">
      <div className="title-content">
        <h1 className="game-title">EchoRealm</h1>
        <p className="game-subtitle">回声之境</p>
        <div className="title-buttons">
          {hasSave && (
            <button className="game-btn primary" onClick={onContinue}>
              继续游戏
            </button>
          )}
          <button className="game-btn" onClick={onStartNew}>
            新游戏
          </button>
        </div>
      </div>
      <div className="title-fog"></div>
    </div>
  );
};

export default TitleScreen;
