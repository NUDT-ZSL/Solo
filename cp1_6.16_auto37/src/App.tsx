import React, { useState, useEffect, useCallback } from 'react';
import Battlefield from '@/components/Battlefield';
import DiceRoller from '@/components/DiceRoller';
import CombatLog from '@/components/CombatLog';
import {
  Character,
  DiceResult,
  GameState,
  createInitialState,
  startBattle,
  resolveTurn,
  cloneCharacter,
} from '@/gameLogic';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch('/api/characters', {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: Character[] = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          setAvailableCharacters(data);
          setError(null);
        } else {
          throw new Error('Invalid data format');
        }
      } catch (err) {
        const fallbackCharacters: Character[] = [
          { id: 'warrior', name: '狂战士', maxHp: 120, currentHp: 120, attack: 15, skillName: '重击', skillPower: 1.5 },
          { id: 'mage', name: '火焰法师', maxHp: 80, currentHp: 80, attack: 10, skillName: '火球术', skillPower: 2.0 },
          { id: 'archer', name: '精灵射手', maxHp: 90, currentHp: 90, attack: 12, skillName: '穿透箭', skillPower: 1.8 },
          { id: 'healer', name: '神圣牧师', maxHp: 70, currentHp: 70, attack: 8, skillName: '圣光打击', skillPower: 1.2 },
          { id: 'rogue', name: '暗影刺客', maxHp: 85, currentHp: 85, attack: 18, skillName: '背刺', skillPower: 2.2 },
          { id: 'knight', name: '圣骑士', maxHp: 150, currentHp: 150, attack: 10, skillName: '审判', skillPower: 1.4 },
        ];
        setAvailableCharacters(fallbackCharacters);
        setError('后端服务未启动，使用本地模拟数据');
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleCharacterSelect = useCallback((character: Character) => {
    setSelectedCharacters(prev => {
      const isSelected = prev.some(c => c.id === character.id);
      if (isSelected) {
        return prev.filter(c => c.id !== character.id);
      } else if (prev.length < 3) {
        return [...prev, character];
      }
      return prev;
    });
  }, []);

  const handleStartBattle = useCallback(() => {
    if (selectedCharacters.length !== 3) return;

    const playerTeam = selectedCharacters.map(c => cloneCharacter(c));
    const shuffled = [...availableCharacters]
      .filter(c => !selectedCharacters.some(sc => sc.id === c.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const enemyTeam = shuffled.map(c => cloneCharacter(c));

    setGameState(startBattle(playerTeam, enemyTeam));
  }, [selectedCharacters, availableCharacters]);

  const handleSelectTarget = useCallback((targetId: string) => {
    setGameState(prev => ({
      ...prev,
      selectedTargetId: targetId,
    }));
  }, []);

  const handleRollComplete = useCallback((result: DiceResult) => {
    setGameState(prev => {
      const { newState } = resolveTurn(prev, result);
      
      if (newState.phase === 'finished' && newState.battleRecord) {
        fetch('/api/battle/records', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newState.battleRecord),
        }).catch(() => {});
      }
      
      return newState;
    });

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        lastDamage: null,
      }));
    }, 1000);
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(createInitialState());
    setSelectedCharacters([]);
  }, []);

  const setIsRolling = useCallback((rolling: boolean) => {
    setGameState(prev => ({
      ...prev,
      isRolling: rolling,
    }));
  }, []);

  if (loading) {
    return (
      <div className="app-loading">
        <div style={{ color: '#ECF0F1', fontSize: '20px' }}>加载中...</div>
      </div>
    );
  }

  if (gameState.phase === 'select') {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">战术骰子推演工具</h1>
          <p className="app-subtitle">组建你的队伍，开始战斗！</p>
          {error && (
            <div className="error-message" style={{ color: '#E74C3C', marginTop: '8px', fontSize: '14px' }}>
              {error}
            </div>
          )}
        </header>

        <div className="selection-section">
          <div className="selection-info">
            <span style={{ color: '#BDC3C7' }}>已选择: </span>
            <span style={{ color: '#F1C40F', fontWeight: 'bold' }}>{selectedCharacters.length}/3</span>
          </div>

          <div className="character-grid">
            {availableCharacters.map(character => {
              const isSelected = selectedCharacters.some(c => c.id === character.id);
              const isDisabled = !isSelected && selectedCharacters.length >= 3;
              
              return (
                <div
                  key={character.id}
                  onClick={() => !isDisabled && handleCharacterSelect(character)}
                  className={`
                    selection-card
                    ${isSelected ? 'selected' : ''}
                    ${isDisabled ? 'disabled' : ''}
                  `}
                >
                  <div className="selection-card-name">{character.name}</div>
                  <div className="selection-card-skill">
                    {character.skillName} · {character.skillPower}x
                  </div>
                  <div className="selection-card-stats">
                    <div>
                      <span className="stat-label">HP:</span>
                      <span className="stat-value">{character.maxHp}</span>
                    </div>
                    <div>
                      <span className="stat-label">攻击:</span>
                      <span className="stat-value">{character.attack}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="selected-check">✓</div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleStartBattle}
            disabled={selectedCharacters.length !== 3}
            className="start-button"
          >
            开始战斗
          </button>
        </div>

        <style>{`
          .app-loading {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1A252F;
          }

          .app-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #1A252F 0%, #2C3E50 50%, #1A252F 100%);
            padding: 40px 20px;
          }

          .app-header {
            text-align: center;
            margin-bottom: 40px;
          }

          .app-title {
            color: #F1C40F;
            font-size: 36px;
            font-weight: bold;
            margin: 0 0 8px 0;
            text-shadow: 0 0 20px rgba(241, 196, 15, 0.3);
          }

          .app-subtitle {
            color: #BDC3C7;
            font-size: 18px;
            margin: 0;
          }

          .selection-section {
            max-width: 900px;
            margin: 0 auto;
          }

          .selection-info {
            text-align: center;
            font-size: 18px;
            margin-bottom: 24px;
          }

          .character-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
          }

          .selection-card {
            background: #2C3E50;
            border: 3px solid transparent;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s ease-out;
            position: relative;
            color: #ECF0F1;
          }

          .selection-card:hover:not(.disabled) {
            transform: scale(1.05);
            border-color: #F1C40F;
            box-shadow: 0 0 20px rgba(241, 196, 15, 0.4);
          }

          .selection-card.selected {
            border-color: #F1C40F;
            background: linear-gradient(135deg, #2C3E50 0%, rgba(241, 196, 15, 0.1) 100%);
            box-shadow: 0 0 20px rgba(241, 196, 15, 0.4);
          }

          .selection-card.disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .selection-card-name {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #ECF0F1;
          }

          .selection-card-skill {
            font-size: 13px;
            color: #F1C40F;
            margin-bottom: 16px;
          }

          .selection-card-stats {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
          }

          .stat-label {
            color: #BDC3C7;
            margin-right: 4px;
          }

          .stat-value {
            color: #ECF0F1;
            font-weight: bold;
          }

          .selected-check {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 28px;
            height: 28px;
            background: #F1C40F;
            color: #2C3E50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
          }

          .start-button {
            display: block;
            width: 100%;
            max-width: 300px;
            margin: 0 auto;
            padding: 18px 48px;
            font-size: 20px;
            font-weight: bold;
            color: #2C3E50;
            background: linear-gradient(145deg, #F1C40F 0%, #F39C12 100%);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease-out;
            box-shadow: 0 4px 15px rgba(241, 196, 15, 0.4);
          }

          .start-button:hover:not(:disabled) {
            background: linear-gradient(145deg, #F4D03F 0%, #F5AB35 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(241, 196, 15, 0.5);
          }

          .start-button:disabled {
            background: #7F8C8D;
            cursor: not-allowed;
            opacity: 0.6;
            box-shadow: none;
          }

          @media (max-width: 768px) {
            .app-title {
              font-size: 28px;
            }

            .character-grid {
              grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
              gap: 12px;
            }

            .selection-card {
              padding: 16px;
            }
          }
        `}</style>
      </div>
    );
  }

  const currentAttacker = gameState.currentTurn === 'player'
    ? gameState.playerTeam[gameState.currentAttackerIndex]
    : gameState.enemyTeam[gameState.currentAttackerIndex];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">战术骰子推演工具</h1>
        {gameState.phase !== 'finished' && currentAttacker && (
          <div className="turn-indicator">
            当前回合: 
            <span style={{ color: gameState.currentTurn === 'player' ? '#3498DB' : '#E74C3C', marginLeft: '8px' }}>
              {gameState.currentTurn === 'player' ? '我方' : '敌方'} - {currentAttacker.name}
            </span>
          </div>
        )}
      </header>

      {gameState.phase === 'finished' && (
        <div className="result-overlay">
          <div className="result-card">
            <div
              className="result-title"
              style={{ color: gameState.battleRecord?.winner === 'player' ? '#2ECC71' : '#E74C3C' }}
            >
              {gameState.battleRecord?.winner === 'player' ? '胜利！' : '失败...'}
            </div>
            <div className="result-subtitle" style={{ color: '#BDC3C7' }}>
              {gameState.battleRecord?.winner === 'player' 
                ? '恭喜你赢得了这场战斗！' 
                : '很遗憾，你的队伍被击败了...'}
            </div>
            <button onClick={handleRestart} className="restart-button">
              再来一局
            </button>
          </div>
        </div>
      )}

      <div className="battle-layout">
        <div className="battlefield-section">
          <Battlefield
            playerTeam={gameState.playerTeam}
            enemyTeam={gameState.enemyTeam}
            selectedTargetId={gameState.selectedTargetId}
            onSelectTarget={handleSelectTarget}
            currentTurn={gameState.currentTurn}
            currentAttackerIndex={gameState.currentAttackerIndex}
            lastDamage={gameState.lastDamage}
          />
        </div>

        <div className="center-section">
          <DiceRoller
            onRollComplete={handleRollComplete}
            isRolling={gameState.isRolling}
            setIsRolling={setIsRolling}
            disabled={gameState.phase !== 'battle' || gameState.currentTurn !== 'player'}
          />
        </div>

        <div className="log-section">
          <CombatLog logs={gameState.logs} />
        </div>
      </div>

      <style>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #1A252F 0%, #2C3E50 50%, #1A252F 100%);
          padding: 24px;
          position: relative;
        }

        .app-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .app-title {
          color: #F1C40F;
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 12px 0;
          text-shadow: 0 0 20px rgba(241, 196, 15, 0.3);
        }

        .turn-indicator {
          font-size: 16px;
          color: #ECF0F1;
        }

        .result-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.3s ease-out;
        }

        .result-card {
          background: #2C3E50;
          border: 2px solid #F1C40F;
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          animation: scaleIn 0.5s ease-out;
        }

        .result-title {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 16px;
        }

        .result-subtitle {
          font-size: 18px;
          margin-bottom: 32px;
        }

        .restart-button {
          padding: 16px 48px;
          font-size: 18px;
          font-weight: bold;
          color: #2C3E50;
          background: linear-gradient(145deg, #F1C40F 0%, #F39C12 100%);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease-out;
        }

        .restart-button:hover {
          background: linear-gradient(145deg, #F4D03F 0%, #F5AB35 100%);
          transform: translateY(-2px);
        }

        .battle-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
          max-width: 1600px;
          margin: 0 auto;
        }

        .battlefield-section {
          flex: 2;
          min-width: 0;
        }

        .center-section {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .log-section {
          flex: 1;
          min-width: 300px;
          max-width: 400px;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .app-container {
            padding: 16px;
          }

          .app-title {
            font-size: 22px;
          }

          .battle-layout {
            flex-direction: column;
            gap: 16px;
          }

          .log-section {
            width: 100%;
            max-width: none;
          }

          .result-card {
            padding: 32px 24px;
            margin: 0 16px;
          }

          .result-title {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
