import React, { useState, useEffect, useMemo } from 'react';
import type { GameState, CellConfig, Card, Player } from './types';
import { PLAYER_COLORS } from './types';
import PlayerAvatar from './PlayerAvatar';
import {
  rollDice,
  buyProperty,
  buildHouse,
  payRent,
  movePlayer,
  movePlayerToPosition,
  adjustPlayerCash,
  sendToJail,
  checkBankruptcy,
  nextTurn,
  drawRandomCard,
  getRankings,
  getPlayerAssets,
  calculateRent,
} from './GameStateManager';

interface GameBoardProps {
  gameState: GameState;
  cells: CellConfig[];
  cards: Card[];
  onStateChange: (state: GameState) => void;
  onStartGame: (playerCount: number) => void;
}

const CELL_COLORS: Record<string, string> = {
  brown: '#8b4513',
  cyan: '#06b6d4',
  pink: '#ec4899',
  orange: '#f97316',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  purple: '#a855f7',
  railway: '#4b5563',
  utility: '#6b7280',
};

const CELL_TYPE_BG: Record<string, string> = {
  start: '#10b981',
  chance: '#fbbf24',
  fate: '#8b5cf6',
  tax: '#dc2626',
  jail: '#1f2937',
  parking: '#60a5fa',
  property: '#faf3e0',
  railway: '#faf3e0',
  utility: '#faf3e0',
};

const HouseIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const DiceFace: React.FC<{ value: number }> = ({ value }) => {
  const dots = useMemo(() => {
    const positions: Record<number, Array<{ x: number; y: number }>> = {
      1: [{ x: 50, y: 50 }],
      2: [{ x: 25, y: 25 }, { x: 75, y: 75 }],
      3: [{ x: 25, y: 25 }, { x: 50, y: 50 }, { x: 75, y: 75 }],
      4: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
      5: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 50, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
      6: [{ x: 25, y: 25 }, { x: 75, y: 25 }, { x: 25, y: 50 }, { x: 75, y: 50 }, { x: 25, y: 75 }, { x: 75, y: 75 }],
    };
    return positions[value] || [];
  }, [value]);

  return (
    <div style={{
      width: '60px',
      height: '60px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '2px solid #8b5a2b',
      position: 'relative',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      {dots.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#1f2937',
            left: `calc(${pos.x}% - 6px)`,
            top: `calc(${pos.y}% - 6px)`,
          }}
        />
      ))}
    </div>
  );
};

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  cells,
  cards,
  onStateChange,
  onStartGame,
}) => {
  const [cellSize, setCellSize] = useState(80);
  const [diceAnimValue, setDiceAnimValue] = useState<number | null>(null);
  const [showDiceAnim, setShowDiceAnim] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [playerCount, setPlayerCount] = useState(2);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setCellSize(mobile ? 60 : 80);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const boardSize = 10 * cellSize;
  const innerAreaSize = 8 * cellSize;
  const innerAreaOffset = cellSize;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const rankings = useMemo(
    () => getRankings(gameState.players, gameState.properties, cells),
    [gameState.players, gameState.properties, cells]
  );

  const handleRollDice = async () => {
    if (!gameState.gameStarted || gameState.isRolling || gameState.gameOver) return;
    if (currentPlayer.isBankrupt) return;
    if (gameState.currentCard) return;

    onStateChange({ ...gameState, isRolling: true });
    setShowDiceAnim(true);

    const animInterval = setInterval(() => {
      setDiceAnimValue(Math.floor(Math.random() * 6) + 1);
    }, 100);

    await new Promise((resolve) => setTimeout(resolve, 800));
    clearInterval(animInterval);

    const dice = rollDice();
    setDiceAnimValue(dice);
    setShowDiceAnim(false);

    let newState = { ...gameState, diceValue: dice, isRolling: false };

    if (currentPlayer.inJail && dice !== 6) {
      setTimeout(() => {
        onStateChange(nextTurn(newState));
      }, 500);
      return;
    }

    newState = movePlayer(newState, currentPlayer.id, dice, cells);
    newState = checkBankruptcy(newState);

    setTimeout(() => {
      const landedCell = cells[newState.players[gameState.currentPlayerIndex].position];
      handleCellEffect(newState, landedCell);
    }, dice * 300 + 200);
  };

  const handleCellEffect = (state: GameState, cell: CellConfig) => {
    let newState = state;
    const player = newState.players[gameState.currentPlayerIndex];

    if (cell.type === 'property' || cell.type === 'railway' || cell.type === 'utility') {
      const property = newState.properties[cell.id];
      if (property && property.ownerId && property.ownerId !== player.id) {
        newState = payRent(newState, player.id, cell.id, cells);
        newState = checkBankruptcy(newState);
        onStateChange(newState);
        setTimeout(() => onStateChange(nextTurn(newState)), 1000);
        return;
      }
    }

    if (cell.type === 'tax') {
      const taxAmount = cell.name.includes('所得') ? 200 : 100;
      newState = adjustPlayerCash(newState, player.id, -taxAmount);
      newState = checkBankruptcy(newState);
      onStateChange(newState);
      setTimeout(() => onStateChange(nextTurn(newState)), 1000);
      return;
    }

    if (cell.type === 'chance' || cell.type === 'fate') {
      const card = drawRandomCard(cards.filter((c) => c.type === cell.type));
      newState = { ...newState, currentCard: card };
      setShowCard(true);
      onStateChange(newState);
      return;
    }

    if (cell.type === 'jail' && cell.id !== 10) {
      newState = sendToJail(newState, player.id);
      onStateChange(newState);
      setTimeout(() => onStateChange(nextTurn(newState)), 1000);
      return;
    }

    onStateChange(newState);
  };

  const handleCardClose = () => {
    if (!gameState.currentCard) return;
    const card = gameState.currentCard;
    let newState = { ...gameState, currentCard: null };
    const player = newState.players[gameState.currentPlayerIndex];

    switch (card.effect.type) {
      case 'money':
        newState = adjustPlayerCash(newState, player.id, card.effect.amount);
        break;
      case 'move':
        newState = movePlayer(newState, player.id, card.effect.steps, cells);
        break;
      case 'jail':
        newState = sendToJail(newState, player.id);
        break;
      case 'position':
        newState = movePlayerToPosition(newState, player.id, card.effect.position, cells);
        break;
    }

    newState = checkBankruptcy(newState);
    setShowCard(false);
    onStateChange(newState);

    setTimeout(() => {
      if (card.effect.type === 'move' || card.effect.type === 'position') {
        const landedCell = cells[newState.players[gameState.currentPlayerIndex].position];
        if (landedCell.type !== 'chance' && landedCell.type !== 'fate') {
          handleCellEffect(newState, landedCell);
        }
      } else {
        onStateChange(nextTurn(newState));
      }
    }, 500);
  };

  const handleBuy = () => {
    if (!currentPlayer || !gameState.gameStarted) return;
    const cell = cells[currentPlayer.position];
    if (!cell || !cell.price) return;
    const property = gameState.properties[cell.id];
    if (!property || property.ownerId !== null) return;
    if (currentPlayer.cash < cell.price) return;

    const newState = buyProperty(gameState, currentPlayer.id, cell.id, cells);
    onStateChange(newState);
    setTimeout(() => onStateChange(nextTurn(newState)), 500);
  };

  const handleBuild = () => {
    if (!currentPlayer || !gameState.gameStarted) return;
    const cell = cells[currentPlayer.position];
    if (!cell || !cell.price) return;
    const property = gameState.properties[cell.id];
    if (!property || property.ownerId !== currentPlayer.id || property.level >= 3) return;

    const newState = buildHouse(gameState, currentPlayer.id, cell.id, cells);
    onStateChange(newState);
  };

  const handleSkip = () => {
    onStateChange(nextTurn(gameState));
  };

  const renderCell = (cell: CellConfig) => {
    const bgColor = CELL_TYPE_BG[cell.type] || '#faf3e0';
    const property = gameState.properties[cell.id];
    const owner = property?.ownerId
      ? gameState.players.find((p) => p.id === property.ownerId)
      : null;
    const ownerColor = owner ? owner.color : 'transparent';
    const isLanded = gameState.players.some((p) => p.position === cell.id && !p.isBankrupt);

    return (
      <div
        key={cell.id}
        style={{
          position: 'absolute',
          left: `${cell.gridX * cellSize}px`,
          top: `${cell.gridY * cellSize}px`,
          width: `${cellSize}px`,
          height: `${cellSize}px`,
          backgroundColor: bgColor,
          border: '2px solid #8b5a2b',
          boxSizing: 'border-box',
          boxShadow: isLanded ? 'inset 0 0 12px rgba(245,158,11,0.6)' : 'none',
          transition: 'box-shadow 300ms',
        }}
      >
        {cell.colorGroup && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${cellSize * 0.18}px`,
              backgroundColor: CELL_COLORS[cell.colorGroup] || '#9ca3af',
              borderBottom: '1px solid #8b5a2b',
            }}
          />
        )}
        {owner && cell.type !== 'start' && cell.type !== 'tax' && (
          <div
            style={{
              position: 'absolute',
              inset: 2,
              border: `3px solid ${ownerColor}`,
              borderRadius: '4px',
              pointerEvents: 'none',
            }}
          />
        )}
        {property && property.level > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {Array.from({ length: property.level }).map((_, i) => (
              <HouseIcon key={i} size={cellSize * 0.2} color={ownerColor || '#8b5a2b'} />
            ))}
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: cell.colorGroup ? cellSize * 0.2 : 4,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: isMobile ? '10px' : '14px',
            fontWeight: 600,
            color: '#ffffff',
            textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            padding: '0 2px',
            lineHeight: 1.2,
            pointerEvents: 'none',
          }}
        >
          {cell.name}
        </div>
        {cell.price && cell.type === 'property' && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              right: 4,
              fontSize: '10px',
              fontWeight: 'bold',
              color: '#1a6b3c',
              textShadow: '1px 1px 0 #fff',
            }}
          >
            ${cell.price}
          </div>
        )}
      </div>
    );
  };

  const canBuy = useMemo(() => {
    if (!currentPlayer || !gameState.gameStarted || gameState.isRolling || gameState.currentCard) return false;
    const cell = cells[currentPlayer.position];
    const property = gameState.properties[cell.id];
    return (
      property &&
      property.ownerId === null &&
      (cell.type === 'property' || cell.type === 'railway' || cell.type === 'utility') &&
      currentPlayer.cash >= (cell.price || 0)
    );
  }, [currentPlayer, gameState.gameStarted, gameState.isRolling, gameState.currentCard, cells, gameState.properties]);

  const canBuild = useMemo(() => {
    if (!currentPlayer || !gameState.gameStarted || gameState.isRolling || gameState.currentCard) return false;
    const cell = cells[currentPlayer.position];
    const property = gameState.properties[cell.id];
    return (
      property &&
      property.ownerId === currentPlayer.id &&
      property.level < 3 &&
      cell.type === 'property' &&
      currentPlayer.cash >= Math.floor((cell.price || 0) * 0.5)
    );
  }, [currentPlayer, gameState.gameStarted, gameState.isRolling, gameState.currentCard, cells, gameState.properties]);

  const canSkip = useMemo(() => {
    if (!currentPlayer || !gameState.gameStarted || gameState.isRolling || gameState.currentCard) return false;
    const cell = cells[currentPlayer.position];
    const property = gameState.properties[cell.id];
    if (cell.type === 'property' || cell.type === 'railway' || cell.type === 'utility') {
      if (property && property.ownerId === null) return true;
    }
    return !canBuy && !canBuild;
  }, [currentPlayer, gameState.gameStarted, gameState.isRolling, gameState.currentCard, cells, gameState.properties, canBuy, canBuild]);

  const currentPlayerAssets = currentPlayer
    ? getPlayerAssets(currentPlayer, gameState.properties, cells)
    : { totalAssets: 0, propertyCount: 0 };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 150ms, filter 150ms',
  };

  const buttonHoverStyle = {
    transform: 'scale(1.05)',
    filter: 'brightness(1.1)',
  };

  const buttonActiveStyle = {
    transform: 'scale(0.95)',
  };

  if (!gameState.gameStarted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#1a6b3c',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '30px',
          padding: '20px',
        }}
      >
        <h1 style={{ color: '#faf3e0', fontSize: '48px', margin: 0, textShadow: '3px 3px 0 #8b5a2b' }}>
          大富翁
        </h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: '#faf3e0', fontSize: '18px' }}>玩家数量：</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setPlayerCount(n)}
              style={{
                ...buttonStyle,
                opacity: playerCount === n ? 1 : 0.5,
                transform: playerCount === n ? 'scale(1.1)' : 'scale(1)',
              }}
              onMouseEnter={(e) => {
                if (playerCount !== n) Object.assign(e.currentTarget.style, buttonHoverStyle);
              }}
              onMouseLeave={(e) => {
                if (playerCount !== n) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }
              }}
              onMouseDown={(e) => Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              {n}人
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          {Array.from({ length: playerCount }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: PLAYER_COLORS[i],
                border: '3px solid #faf3e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
        <button
          onClick={() => onStartGame(playerCount)}
          style={{ ...buttonStyle, padding: '15px 40px', fontSize: '20px' }}
          onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.filter = 'brightness(1)';
          }}
          onMouseDown={(e) => Object.assign(e.currentTarget.style, buttonActiveStyle)}
          onMouseUp={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
        >
          开始游戏
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a6b3c',
        padding: isMobile ? '10px' : '20px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '15px' : '30px',
        alignItems: 'flex-start',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: `${boardSize}px`,
          height: `${boardSize}px`,
          backgroundColor: '#faf3e0',
          border: '4px solid #8b5a2b',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          flexShrink: 0,
        }}
      >
        {cells.map(renderCell)}

        <div
          style={{
            position: 'absolute',
            left: `${innerAreaOffset}px`,
            top: `${innerAreaOffset}px`,
            width: `${innerAreaSize}px`,
            height: `${innerAreaSize}px`,
            backgroundColor: '#1a6b3c',
            border: '3px solid #8b5a2b',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '15px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: currentPlayer?.isBankrupt ? '#9ca3af' : currentPlayer?.color,
              border: `2px solid ${currentPlayer?.isBankrupt ? '#6b7280' : currentPlayer?.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {currentPlayer?.name.charAt(0)}
          </div>
          <div style={{ color: '#faf3e0', fontSize: '18px', fontWeight: 'bold' }}>
            {currentPlayer?.name}
          </div>
          <div style={{ color: '#faf3e0', fontSize: '14px' }}>
            第 {gameState.turn} 回合
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', fontSize: '12px' }}>现金</div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                ${currentPlayer?.cash}
              </div>
            </div>
            <div style={{ width: '1px', height: '30px', backgroundColor: '#8b5a2b' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: '#fbbf24', fontSize: '12px' }}>资产</div>
              <div style={{ color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>
                ${currentPlayerAssets.totalAssets}
              </div>
            </div>
          </div>
        </div>

        {gameState.players.map((player, idx) => (
          <PlayerAvatar
            key={player.id}
            player={player}
            cellSize={cellSize}
            playerIndex={idx}
            totalPlayers={gameState.players.length}
          />
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: '15px',
          width: isMobile ? `${boardSize}px` : '280px',
          overflowX: isMobile ? 'auto' : 'visible',
        }}
      >
        <div
          style={{
            backgroundColor: '#faf3e0',
            border: '3px solid #8b5a2b',
            borderRadius: '12px',
            padding: '15px',
            minWidth: isMobile ? '250px' : 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1a6b3c', fontSize: '16px' }}>
            🎲 骰子
          </h3>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '80px',
              marginBottom: '15px',
            }}
          >
            {showDiceAnim || diceAnimValue ? (
              <DiceFace value={diceAnimValue || 1} />
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '14px' }}>等待掷骰</div>
            )}
          </div>
          <button
            onClick={handleRollDice}
            disabled={gameState.isRolling || !gameState.gameStarted || gameState.gameOver || !!gameState.currentCard}
            style={{
              ...buttonStyle,
              width: '100%',
              opacity: gameState.isRolling || !gameState.gameStarted || gameState.gameOver || !!gameState.currentCard ? 0.5 : 1,
              cursor: gameState.isRolling || !gameState.gameStarted || gameState.gameOver || !!gameState.currentCard ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!gameState.isRolling && gameState.gameStarted && !gameState.gameOver && !gameState.currentCard) {
                Object.assign(e.currentTarget.style, buttonHoverStyle);
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.filter = 'brightness(1)';
            }}
            onMouseDown={(e) => {
              if (!gameState.isRolling && gameState.gameStarted && !gameState.gameOver && !gameState.currentCard) {
                Object.assign(e.currentTarget.style, buttonActiveStyle);
              }
            }}
            onMouseUp={(e) => {
              if (!gameState.isRolling && gameState.gameStarted && !gameState.gameOver && !gameState.currentCard) {
                Object.assign(e.currentTarget.style, buttonHoverStyle);
              }
            }}
          >
            {gameState.isRolling ? '掷骰中...' : '掷骰子'}
          </button>
        </div>

        <div
          style={{
            backgroundColor: '#faf3e0',
            border: '3px solid #8b5a2b',
            borderRadius: '12px',
            padding: '15px',
            minWidth: isMobile ? '250px' : 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1a6b3c', fontSize: '16px' }}>
            操作
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleBuy}
              disabled={!canBuy}
              style={{
                ...buttonStyle,
                opacity: canBuy ? 1 : 0.4,
                cursor: canBuy ? 'pointer' : 'not-allowed',
                background: canBuy ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)' : buttonStyle.background,
              }}
              onMouseEnter={(e) => canBuy && Object.assign(e.currentTarget.style, buttonHoverStyle)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => canBuy && Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => canBuy && Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              购买地产
            </button>
            <button
              onClick={handleBuild}
              disabled={!canBuild}
              style={{
                ...buttonStyle,
                opacity: canBuild ? 1 : 0.4,
                cursor: canBuild ? 'pointer' : 'not-allowed',
                background: canBuild ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)' : buttonStyle.background,
              }}
              onMouseEnter={(e) => canBuild && Object.assign(e.currentTarget.style, buttonHoverStyle)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => canBuild && Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => canBuild && Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              建造房屋
            </button>
            <button
              onClick={handleSkip}
              disabled={!canSkip}
              style={{
                ...buttonStyle,
                opacity: canSkip ? 1 : 0.4,
                cursor: canSkip ? 'pointer' : 'not-allowed',
                background: canSkip ? 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)' : buttonStyle.background,
              }}
              onMouseEnter={(e) => canSkip && Object.assign(e.currentTarget.style, buttonHoverStyle)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => canSkip && Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => canSkip && Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              结束回合
            </button>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#faf3e0',
            border: '3px solid #8b5a2b',
            borderRadius: '12px',
            padding: '15px',
            minWidth: isMobile ? '280px' : 'auto',
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#1a6b3c', fontSize: '16px' }}>
            🏆 排行榜
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {rankings.map(({ player, totalAssets, propertyCount }, idx) => {
              const fadeIn = {
                animation: 'fadeIn 500ms ease-in-out',
              };
              return (
                <div
                  key={player.id}
                  style={{
                    ...fadeIn,
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '0 8px',
                    borderRadius: '8px',
                    backgroundColor: idx === 0 ? 'rgba(245,158,11,0.1)' : 'transparent',
                    opacity: player.isBankrupt ? 0.5 : 1,
                    filter: player.isBankrupt ? 'grayscale(100%)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: player.color,
                      border: '2px solid #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                    }}
                  >
                    {player.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: player.isBankrupt ? '#9ca3af' : '#1a6b3c',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {player.name}
                      {player.isBankrupt && ' (破产)'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      ${player.cash} · {propertyCount} 地产
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: '#f59e0b',
                      flexShrink: 0,
                    }}
                  >
                    ${totalAssets}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {gameState.message && (
          <div
            style={{
              backgroundColor: '#1a6b3c',
              border: '2px solid #8b5a2b',
              borderRadius: '8px',
              padding: '10px 15px',
              color: '#faf3e0',
              fontSize: '13px',
              textAlign: 'center',
              minWidth: isMobile ? '250px' : 'auto',
            }}
          >
            {gameState.message}
          </div>
        )}
      </div>

      {showCard && gameState.currentCard && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={handleCardClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              animation: 'slideUp 400ms ease-out',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: gameState.currentCard.type === 'chance' ? '#fbbf24' : '#8b5cf6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              {gameState.currentCard.type === 'chance' ? '🎲' : '🔮'}
            </div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '20px' }}>
              {gameState.currentCard.title}
            </h3>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '16px' }}>
              {gameState.currentCard.description}
            </p>
            <button
              onClick={handleCardClose}
              style={{
                ...buttonStyle,
                width: '100%',
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              继续
            </button>
          </div>
        </div>
      )}

      {gameState.gameOver && gameState.winnerId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            style={{
              width: '320px',
              backgroundColor: '#faf3e0',
              borderRadius: '20px',
              padding: '32px',
              border: '4px solid #f59e0b',
              textAlign: 'center',
              animation: 'slideUp 400ms ease-out',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏆</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1a6b3c', fontSize: '28px' }}>
              游戏结束！
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '18px' }}>
              {gameState.players.find((p) => p.id === gameState.winnerId)?.name} 获胜！
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                ...buttonStyle,
                width: '100%',
                padding: '14px',
                fontSize: '16px',
              }}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => Object.assign(e.currentTarget.style, buttonActiveStyle)}
              onMouseUp={(e) => Object.assign(e.currentTarget.style, buttonHoverStyle)}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default GameBoard;
