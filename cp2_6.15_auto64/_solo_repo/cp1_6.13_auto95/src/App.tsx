import React, { useState, useEffect } from 'react';
import axios from 'axios';
import GameBoard from './GameBoard';
import type { GameState, GameConfig } from './types';
import { createInitialState, startGame } from './GameStateManager';

const App: React.FC = () => {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get<GameConfig>('http://localhost:3001/api/config');
        setConfig(response.data);
        setGameState(createInitialState(2, response.data));
        setLoading(false);
      } catch (err) {
        setError('无法连接到服务器，请确保后端API已启动。运行: cd server && npm install && npx ts-node ConfigAPI.ts');
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleStartGame = (playerCount: number) => {
    if (!config || !gameState) return;
    const newState = createInitialState(playerCount, config);
    setGameState(startGame(newState));
  };

  const handleStateChange = (newState: GameState) => {
    setGameState(newState);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a6b3c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#faf3e0',
          fontSize: '20px',
        }}
      >
        正在加载游戏配置...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a6b3c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#faf3e0',
          fontSize: '18px',
          padding: '20px',
          textAlign: 'center',
          gap: '20px',
        }}
      >
        <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
          ⚠️ 连接错误
        </div>
        <div style={{ maxWidth: '500px', lineHeight: 1.6 }}>
          {error}
        </div>
        <div
          style={{
            backgroundColor: '#2d3748',
            padding: '15px 20px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}
        >
          cd server<br />
          npm install<br />
          npx ts-node ConfigAPI.ts
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            borderRadius: '12px',
            border: 'none',
            background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          重试
        </button>
      </div>
    );
  }

  if (!config || !gameState) return null;

  return (
    <GameBoard
      gameState={gameState}
      cells={config.cells}
      cards={config.cards}
      onStateChange={handleStateChange}
      onStartGame={handleStartGame}
    />
  );
};

export default App;
