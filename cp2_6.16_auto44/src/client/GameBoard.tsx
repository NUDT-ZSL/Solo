import React, { useState, useEffect } from 'react';
import { GameState, ArrowDirection, Player, GAME_CONFIG } from '../shared/types';

interface GameBoardProps {
  gameState: GameState;
}

interface HitEffect {
  id: string;
  trackIndex: number;
  result: 'perfect' | 'good';
  player: Player;
}

const DIRECTION_TO_INDEX: Record<ArrowDirection, number> = {
  left: 0,
  down: 1,
  up: 2,
  right: 3,
};

const GameBoard: React.FC<GameBoardProps> = ({ gameState }) => {
  const [hitEffects, setHitEffects] = useState<HitEffect[]>([]);

  useEffect(() => {
    const newEffects: HitEffect[] = [];

    gameState.arrows.forEach(arrow => {
      if (arrow.hit && arrow.hitResult && arrow.hitResult !== 'miss') {
        const trackIndex = DIRECTION_TO_INDEX[arrow.direction];
        const existing = hitEffects.find(e => e.id === arrow.id);
        if (!existing) {
          newEffects.push({
            id: arrow.id,
            trackIndex,
            result: arrow.hitResult as 'perfect' | 'good',
            player: arrow.player,
          });
        }
      }
    });

    if (newEffects.length > 0) {
      setHitEffects(prev => [...prev, ...newEffects]);

      setTimeout(() => {
        setHitEffects(prev => prev.filter(e => !newEffects.find(ne => ne.id === e.id)));
      }, 800);
    }
  }, [gameState.arrows, hitEffects]);

  const renderArrow = (arrow: GameState['arrows'][0]) => {
    const trackIndex = DIRECTION_TO_INDEX[arrow.direction];
    const trackWidth = 70;
    const trackGap = 12;
    const trackOffset = trackIndex * (trackWidth + trackGap);
    const arrowTop = arrow.y;

    let arrowClass = `arrow ${arrow.direction}`;
    if (arrow.hit) arrowClass += ' hit';
    if (arrow.missed) arrowClass += ' miss';

    return (
      <div
        key={arrow.id}
        className={arrowClass}
        style={{
          left: `calc(50% - ${(4 * trackWidth + 3 * trackGap) / 2 + trackOffset + trackWidth / 2}px)`,
          top: `${arrowTop}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="arrow-inner"></div>
      </div>
    );
  };

  const renderTrack = (direction: ArrowDirection) => {
    return (
      <div className="track" key={direction}>
        <div className="track-judge-line"></div>
        <div className="track-label">{direction === 'up' ? '↑' : direction === 'down' ? '↓' : direction === 'left' ? '←' : '→'}</div>
      </div>
    );
  };

  const renderCharacter = (player: Player) => {
    const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
    let charClass = 'character';
    if (playerState.isHit) charClass += ' hit';
    if (playerState.isSpecialAttacking) charClass += ' special-attack';

    return (
      <div className={charClass}>
        <div className="character-body">
          <div className="character-eye left"></div>
          <div className="character-eye right"></div>
        </div>
      </div>
    );
  };

  const renderHealthBar = (player: Player) => {
    const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
    const healthPercent = (playerState.health / playerState.maxHealth) * 100;
    const isLow = healthPercent < 30;

    return (
      <>
        <div className="health-bar-container">
          <div
            className={`health-bar ${isLow ? 'low' : ''}`}
            style={{ width: `${healthPercent}%` }}
          ></div>
        </div>
        <div className="health-text">
          {playerState.health} / {playerState.maxHealth}
        </div>
      </>
    );
  };

  const renderCombo = (player: Player) => {
    const playerState = player === 'player1' ? gameState.player1 : gameState.player2;
    const isSpecial = playerState.combo >= GAME_CONFIG.SPECIAL_COMBO_THRESHOLD;

    return (
      <div className={`combo-display ${playerState.combo > 0 ? 'active' : ''} ${isSpecial ? 'special' : ''}`}>
        {playerState.combo > 0 ? `${playerState.combo} COMBO` : ''}
        {isSpecial && <div style={{ fontSize: '16px' }}>特殊攻击!</div>}
      </div>
    );
  };

  const renderHitEffects = (player: Player) => {
    const trackWidth = 70;
    const trackGap = 12;

    return hitEffects
      .filter(e => e.player === player)
      .map(effect => {
        const trackOffset = effect.trackIndex * (trackWidth + trackGap);
        const particles = Array.from({ length: 8 }).map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          const distance = 30 + Math.random() * 20;
          return {
            tx: `${Math.cos(angle) * distance}px`,
            ty: `${Math.sin(angle) * distance}px`,
            delay: `${i * 0.02}s`,
          };
        });

        return (
          <div
            key={effect.id}
            className="hit-effect"
            style={{
              left: `calc(50% - ${(4 * trackWidth + 3 * trackGap) / 2 + trackOffset + trackWidth / 2}px)`,
            }}
          >
            {particles.map((p, i) => (
              <div
                key={i}
                className="hit-effect-particle"
                style={{
                  left: '50%',
                  top: '50%',
                  '--tx': p.tx,
                  '--ty': p.ty,
                  animationDelay: p.delay,
                } as React.CSSProperties}
              />
            ))}
            <div className={`hit-text ${effect.result}`}>
              {effect.result === 'perfect' ? 'PERFECT!' : 'GOOD!'}
            </div>
          </div>
        );
      });
  };

  const player1Arrows = gameState.arrows.filter(a => a.player === 'player1');
  const player2Arrows = gameState.arrows.filter(a => a.player === 'player2');

  const difficultyText = ['简单', '普通', '困难'][gameState.currentDifficulty];

  return (
    <div className="game-board">
      <div className={`game-timer ${gameState.timeRemaining <= 10 ? 'warning' : ''}`}>
        {gameState.timeRemaining}
      </div>
      <div className="difficulty-indicator">
        难度: {difficultyText}
      </div>

      <div className="vs-divider">VS</div>

      <div className="player-side player1">
        <div className="player-info">
          <div className="player-name">玩家1</div>
          {renderCharacter('player1')}
          {renderHealthBar('player1')}
          {renderCombo('player1')}
        </div>

        <div className="track-container" style={{ position: 'relative' }}>
          {(['left', 'down', 'up', 'right'] as ArrowDirection[]).map((dir) =>
            renderTrack(dir)
          )}
          {player1Arrows.map(renderArrow)}
          {renderHitEffects('player1')}
        </div>
      </div>

      <div className="player-side player2">
        <div className="player-info">
          <div className="player-name">玩家2</div>
          {renderCharacter('player2')}
          {renderHealthBar('player2')}
          {renderCombo('player2')}
        </div>

        <div className="track-container" style={{ position: 'relative' }}>
          {(['left', 'down', 'up', 'right'] as ArrowDirection[]).map((dir) =>
            renderTrack(dir)
          )}
          {player2Arrows.map(renderArrow)}
          {renderHitEffects('player2')}
        </div>
      </div>
    </div>
  );
};

export default React.memo(GameBoard);
