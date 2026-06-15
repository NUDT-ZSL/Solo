import React, { useState, useEffect } from 'react';
import GameHeader from './components/GameHeader';
import NicknameInput from './components/NicknameInput';
import DifficultySelect, { Difficulty } from './components/DifficultySelect';
import GameCanvas from './components/GameCanvas';
import GameOverPanel from './components/GameOverPanel';

type GameState = 'nickname' | 'difficulty' | 'playing' | 'gameover';

const NICKNAME_KEY = 'rhythm_runner_nickname';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('nickname');
  const [nickname, setNickname] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(NICKNAME_KEY);
    if (saved && saved.trim()) {
      setNickname(saved.trim());
      setGameState('difficulty');
    } else {
      setGameState('nickname');
    }
  }, []);

  const handleNicknameSubmit = (name: string) => {
    setNickname(name);
    localStorage.setItem(NICKNAME_KEY, name);
    setGameState('difficulty');
  };

  const handleChangeNickname = () => {
    localStorage.removeItem(NICKNAME_KEY);
    setNickname('');
    setGameState('nickname');
  };

  const handleStartGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState('playing');
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState('gameover');
  };

  const handleBack = () => {
    setGameState('difficulty');
  };

  const handleReplay = () => {
    setGameState('playing');
  };

  return (
    <div className="app-container">
      {(gameState === 'nickname' || gameState === 'difficulty') && <GameHeader />}

      {gameState === 'nickname' && (
        <NicknameInput onSubmit={handleNicknameSubmit} />
      )}

      {gameState === 'difficulty' && (
        <DifficultySelect
          nickname={nickname}
          onStart={handleStartGame}
          onChangeNickname={handleChangeNickname}
        />
      )}

      {gameState === 'playing' && (
        <GameCanvas
          difficulty={difficulty}
          nickname={nickname}
          onGameOver={handleGameOver}
        />
      )}

      {gameState === 'gameover' && (
        <>
          <GameCanvas
            difficulty={difficulty}
            nickname={nickname}
            onGameOver={() => {}}
          />
          <GameOverPanel
            score={finalScore}
            nickname={nickname}
            difficulty={difficulty}
            onBack={handleBack}
            onReplay={handleReplay}
          />
        </>
      )}
    </div>
  );
};

export default App;
