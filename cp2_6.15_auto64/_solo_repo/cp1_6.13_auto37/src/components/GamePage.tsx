import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, HexCoord, TowerType, GameAction, PlaceAction, UpgradeAction, SkipAction } from '../types';
import { GameRenderer } from '../renderer';
import { GameNetwork } from '../network';
import { canPlaceTower, canUpgradeTower, PLACE_COST, UPGRADE_COST, MAX_TOWER_LEVEL } from '../gameEngine';
import { findCell } from '../mapGenerator';
import TowerSelector from './TowerSelector';

interface GamePageProps {
  gameState: GameState;
  playerId: 1 | 2;
  roomId: string;
  playerName: string;
  opponentName: string;
  network: GameNetwork;
}

export default function GamePage({
  gameState,
  playerId,
  roomId,
  playerName,
  opponentName,
  network,
}: GamePageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const [selectedCell, setSelectedCell] = useState<HexCoord | null>(null);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType | null>(null);
  const [showTowerSelector, setShowTowerSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const [isOpponentTurn, setIsOpponentTurn] = useState(false);
  const [thinkingDots, setThinkingDots] = useState('');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const renderer = new GameRenderer({
      canvas,
      onCellClick: handleCellClick,
    });

    rendererRef.current = renderer;
    renderer.start();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setState(gameState, playerId);
    }
  }, [gameState, playerId]);

  useEffect(() => {
    setIsOpponentTurn(gameState.currentPlayer !== playerId && gameState.phase === 'playing');
  }, [gameState.currentPlayer, playerId, gameState.phase]);

  useEffect(() => {
    if (isOpponentTurn) {
      const interval = setInterval(() => {
        setThinkingDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    } else {
      setThinkingDots('');
    }
  }, [isOpponentTurn]);

  const handleCellClick = useCallback((coord: HexCoord) => {
    if (gameState.phase !== 'playing') return;
    if (gameState.currentPlayer !== playerId) return;

    const cell = findCell(gameState.map, coord);
    if (!cell) return;

    if (cell.owner !== playerId) {
      return;
    }

    setSelectedCell(coord);

    if (cell.tower) {
      if (cell.tower.owner === playerId && cell.tower.level < MAX_TOWER_LEVEL) {
        setSelectedTowerType(null);
        setShowTowerSelector(false);
      }
    } else {
      setShowTowerSelector(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setSelectorPosition({
          x: rect.width / 2,
          y: rect.height / 2,
        });
      }
    }
  }, [gameState, playerId]);

  const handleTowerSelect = (type: TowerType) => {
    if (selectedTowerType === type) {
      setSelectedTowerType(null);
    } else {
      setSelectedTowerType(type);
    }
  };

  const handlePlace = () => {
    if (!selectedCell || !selectedTowerType) return;
    if (!canPlaceTower(gameState, selectedCell, playerId)) return;

    const action: PlaceAction = {
      type: 'place',
      coord: selectedCell,
      towerType: selectedTowerType,
      playerId,
    };

    sendAction(action);
    resetSelection();
  };

  const handleUpgrade = () => {
    if (!selectedCell) return;
    if (!canUpgradeTower(gameState, selectedCell, playerId)) return;

    const action: UpgradeAction = {
      type: 'upgrade',
      coord: selectedCell,
      playerId,
    };

    sendAction(action);
    resetSelection();
  };

  const handleSkip = () => {
    const action: SkipAction = {
      type: 'skip',
      playerId,
    };

    sendAction(action);
    resetSelection();
  };

  const sendAction = (action: GameAction) => {
    network.sendAction(action, roomId, playerId);
  };

  const resetSelection = () => {
    setSelectedCell(null);
    setSelectedTowerType(null);
    setShowTowerSelector(false);
  };

  const currentPlayer = gameState.players.find(p => p.id === playerId);
  const isMyTurn = gameState.currentPlayer === playerId && gameState.phase === 'playing';
  const canPlace = selectedCell && selectedTowerType && canPlaceTower(gameState, selectedCell, playerId);
  const canUpgrade = selectedCell && canUpgradeTower(gameState, selectedCell, playerId);

  const playerColor = playerId === 1 ? '#63b3ed' : '#fc8181';

  const selectedCellData = selectedCell ? findCell(gameState.map, selectedCell) : null;
  const hasTower = selectedCellData?.tower !== null;

  return (
    <div className="game-page">
      <header className="game-header">
        <h1 className="game-title-small">ChainReactor</h1>
        <div className="game-info">
          <span className="turn-info">
            回合 {gameState.turn} | {isMyTurn ? '你的回合' : `${opponentName}的回合`}
          </span>
        </div>
      </header>

      <div className="game-main">
        <div className="map-container">
          <canvas ref={canvasRef} className="game-canvas" />
          
          {isOpponentTurn && (
            <div className="opponent-thinking">
              <div className="thinking-spinner"></div>
              <span>{opponentName} 思考中{thinkingDots}</span>
            </div>
          )}

          {showTowerSelector && (
            <div className="tower-selector-overlay" onClick={() => setShowTowerSelector(false)}>
              <TowerSelector
                selectedType={selectedTowerType}
                onSelect={handleTowerSelect}
                position={selectorPosition}
                onClose={() => setShowTowerSelector(false)}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="control-panel">
          <div className="energy-section">
            <span className="energy-label">能量点数</span>
            <span className="energy-value" style={{ color: playerColor }}>
              {currentPlayer?.energy || 0}
            </span>
          </div>

          <div className="tower-selection">
            <span className="section-label">选择塔类型</span>
            <div className="tower-buttons">
              <button
                className={`tower-btn fire ${selectedTowerType === 'fire' ? 'selected' : ''}`}
                onClick={() => handleTowerSelect('fire')}
                title="火塔"
              >
                🔥
              </button>
              <button
                className={`tower-btn ice ${selectedTowerType === 'ice' ? 'selected' : ''}`}
                onClick={() => handleTowerSelect('ice')}
                title="冰塔"
              >
                ❄️
              </button>
              <button
                className={`tower-btn electric ${selectedTowerType === 'electric' ? 'selected' : ''}`}
                onClick={() => handleTowerSelect('electric')}
                title="电塔"
              >
                ⚡
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button
              className="action-btn place-btn"
              onClick={handlePlace}
              disabled={!canPlace || !isMyTurn}
            >
              放置 ({PLACE_COST}点)
            </button>
            <button
              className="action-btn upgrade-btn"
              onClick={handleUpgrade}
              disabled={!canUpgrade || !isMyTurn || hasTower === false}
            >
              升级 ({UPGRADE_COST}点)
            </button>
            <button
              className="action-btn skip-btn"
              onClick={handleSkip}
              disabled={!isMyTurn}
            >
              跳过回合
            </button>
          </div>

          {selectedCellData && (
            <div className="selected-info">
              <span className="section-label">选中格子</span>
              <div className="cell-details">
                <p>位置: ({selectedCellData.coord.q}, {selectedCellData.coord.r})</p>
                {selectedCellData.tower ? (
                  <p>
                    塔: {selectedCellData.tower.type === 'fire' ? '🔥火' : selectedCellData.tower.type === 'ice' ? '❄️冰' : '⚡电'}
                    {' '}Lv.{selectedCellData.tower.level}
                  </p>
                ) : (
                  <p>状态: 空</p>
                )}
              </div>
            </div>
          )}

          <div className="players-info">
            <div className="player-badge player1">
              <span className="player-color" style={{ backgroundColor: '#63b3ed' }}></span>
              <span>{playerId === 1 ? playerName : opponentName}</span>
            </div>
            <div className="vs-text">VS</div>
            <div className="player-badge player2">
              <span className="player-color" style={{ backgroundColor: '#fc8181' }}></span>
              <span>{playerId === 2 ? playerName : opponentName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
