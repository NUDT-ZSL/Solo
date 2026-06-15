import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  GameState,
  GamePhase,
  TurnPhase,
  Card,
  Deck,
  ElementType,
  RuneType,
  BuffEffectType,
  MAX_ENERGY_POOL,
} from './types';
import { GameEngine } from './GameEngine';
import {
  ALL_RUNE_CARDS,
  ALL_ELEMENT_CARDS,
  ALL_CARDS,
  DEFAULT_PLAYER_DECK,
  loadDecksFromStorage,
  saveDecksToStorage,
  buildDeckFromIds,
} from './CardManager';
import { FINISHING_MOVES } from './ComboSystem';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

const ParticleSystem: React.FC<{
  particles: Particle[];
  width: number;
  height: number;
}> = React.memo(({ particles, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>(particles);

  useEffect(() => {
    particlesRef.current = particles;
  }, [particles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      const pts = particlesRef.current;
      for (let i = pts.length - 1; i >= 0; i--) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life -= 1;

        if (p.life <= 0) {
          pts.splice(i, 1);
          continue;
        }

        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    />
  );
});
ParticleSystem.displayName = 'ParticleSystem';

const CardComponent: React.FC<{
  card: Card;
  index: number;
  total: number;
  canPlay: boolean;
  isEnemy?: boolean;
  onClick?: () => void;
}> = React.memo(({ card, index, total, canPlay, isEnemy, onClick }) => {
  const elementClass = card.elementType ? `card-element-${card.elementType}` : '';
  const runeClass = card.runeType ? `card-rune-${card.runeType}` : '';
  const playableClass = canPlay && !isEnemy ? 'card-playable' : '';
  const enemyClass = isEnemy ? 'card-enemy' : '';

  const offsetAngle = total > 1 ? ((index - (total - 1) / 2) / total) * 15 : 0;
  const offsetY = Math.abs(offsetAngle) * 0.5;

  return (
    <div
      className={`game-card ${elementClass} ${runeClass} ${playableClass} ${enemyClass}`}
      style={{
        '--card-ink': card.inkColor,
        transform: `rotate(${offsetAngle}deg) translateY(${offsetY}px)`,
      } as React.CSSProperties}
      onClick={canPlay && onClick ? onClick : undefined}
    >
      <div className="card-glow" />
      <div className="card-inner">
        <div className="card-header">
          <span className="card-cost">{card.cost}</span>
          <span className="card-name">{isEnemy ? '?' : card.name}</span>
        </div>
        {!isEnemy && (
          <>
            <div className="card-art">
              <div className={`ink-anim ink-${card.elementType || card.runeType || 'default'}`} />
            </div>
            <div className="card-power">{card.power}</div>
            <div className="card-desc">{card.description}</div>
          </>
        )}
        {isEnemy && <div className="card-art card-back-art" />}
      </div>
    </div>
  );
});
CardComponent.displayName = 'CardComponent';

const HpBar: React.FC<{
  hp: number;
  maxHp: number;
  shield: number;
  label: string;
  isEnemy?: boolean;
}> = React.memo(({ hp, maxHp, shield, label, isEnemy }) => {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const shieldPct = Math.min(100 - pct, (shield / maxHp) * 100);

  return (
    <div className={`hp-bar-container ${isEnemy ? 'hp-bar-enemy' : 'hp-bar-player'}`}>
      <div className="hp-label">{label}</div>
      <div className="hp-bar-track">
        <div className="hp-bar-fill" style={{ width: `${pct}%` }} />
        {shield > 0 && (
          <div className="hp-bar-shield" style={{ width: `${shieldPct}%`, left: `${pct}%` }} />
        )}
      </div>
      <div className="hp-text">
        {hp}/{maxHp} {shield > 0 && <span className="shield-text">🛡{shield}</span>}
      </div>
    </div>
  );
});
HpBar.displayName = 'HpBar';

const EnergyPoolDisplay: React.FC<{
  playerEnergy: number;
  enemyEnergy: number;
  maxEnergy: number;
  canFinishingMove: boolean;
  onFinishingMove: () => void;
}> = React.memo(({ playerEnergy, enemyEnergy, maxEnergy, canFinishingMove, onFinishingMove }) => {
  const playerPct = (playerEnergy / maxEnergy) * 100;
  const enemyPct = (enemyEnergy / maxEnergy) * 100;

  return (
    <div className="energy-pool-container">
      <div className="energy-pool-outer">
        <svg className="energy-pool-svg" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" className="energy-pool-bg" />
          <circle
            cx="60"
            cy="60"
            r="54"
            className="energy-pool-fill energy-pool-fill-player"
            style={{
              strokeDasharray: `${(playerPct / 100) * 339.29} 339.29`,
            }}
          />
          <circle
            cx="60"
            cy="60"
            r="46"
            className="energy-pool-fill energy-pool-fill-enemy"
            style={{
              strokeDasharray: `${(enemyPct / 100) * 289.03} 289.03`,
            }}
          />
          <text x="60" y="52" textAnchor="middle" className="energy-pool-text-player">
            {playerEnergy}
          </text>
          <text x="60" y="72" textAnchor="middle" className="energy-pool-text-enemy">
            {enemyEnergy}
          </text>
        </svg>
        {canFinishingMove && (
          <button className="finishing-move-btn" onClick={onFinishingMove}>
            咒印终结
          </button>
        )}
      </div>
    </div>
  );
});
EnergyPoolDisplay.displayName = 'EnergyPoolDisplay';

const BuffIcons: React.FC<{
  buffs: GameState['player']['buffs'];
}> = React.memo(({ buffs }) => {
  if (buffs.length === 0) return null;
  return (
    <div className="buff-icons">
      {buffs.map((b) => (
        <div key={b.id} className={`buff-icon buff-${b.effectType}`} title={`${b.name}: ${b.value} (${b.remainingTurns}回合)`}>
          <span className="buff-symbol">
            {b.effectType === BuffEffectType.DamageOverTime ? '🔥' :
             b.effectType === BuffEffectType.Shield ? '🛡' :
             b.effectType === BuffEffectType.PowerBoost ? '⬆' :
             b.effectType === BuffEffectType.PowerReduce ? '⬇' :
             b.effectType === BuffEffectType.HealOverTime ? '💚' :
             b.effectType === BuffEffectType.Stun ? '😵' :
             b.effectType === BuffEffectType.EnergyDrain ? '⚡' : '✦'}
          </span>
          <span className="buff-turns">{b.remainingTurns}</span>
        </div>
      ))}
    </div>
  );
});
BuffIcons.displayName = 'BuffIcons';

const BattleLog: React.FC<{
  logs: string[];
}> = React.memo(({ logs }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="battle-log" ref={ref}>
      {logs.slice(-8).map((log, i) => (
        <div key={i} className="battle-log-entry">{log}</div>
      ))}
    </div>
  );
});
BattleLog.displayName = 'BattleLog';

const DeckBuilder: React.FC<{
  engine: GameEngine;
}> = React.memo(({ engine }) => {
  const [decks, setDecks] = useState<Deck[]>(() => loadDecksFromStorage());
  const [activeDeckIdx, setActiveDeckIdx] = useState(0);
  const [selectedRunes, setSelectedRunes] = useState<string[]>(decks[0]?.runeCardIds || []);
  const [selectedElements, setSelectedElements] = useState<string[]>(decks[0]?.elementCardIds || []);
  const [deckName, setDeckName] = useState(decks[0]?.name || '自定义卡组');

  const activeDeck = decks[activeDeckIdx];

  useEffect(() => {
    if (activeDeck) {
      setSelectedRunes(activeDeck.runeCardIds);
      setSelectedElements(activeDeck.elementCardIds);
      setDeckName(activeDeck.name);
    }
  }, [activeDeckIdx, activeDeck]);

  const saveCurrentDeck = useCallback(() => {
    if (selectedRunes.length !== 6 || selectedElements.length !== 4) return;
    const newDeck = buildDeckFromIds(selectedRunes, selectedElements, deckName);
    const newDecks = [...decks];
    if (activeDeckIdx < newDecks.length) {
      newDecks[activeDeckIdx] = newDeck;
    } else {
      newDecks.push(newDeck);
    }
    setDecks(newDecks);
    saveDecksToStorage(newDecks);
  }, [selectedRunes, selectedElements, deckName, decks, activeDeckIdx]);

  const addNewDeck = useCallback(() => {
    saveCurrentDeck();
    const newDeck: Deck = {
      id: 'deck_' + Date.now(),
      name: '新卡组',
      runeCardIds: [],
      elementCardIds: [],
    };
    const newDecks = [...decks, newDeck];
    setDecks(newDecks);
    setActiveDeckIdx(newDecks.length - 1);
    setSelectedRunes([]);
    setSelectedElements([]);
    setDeckName('新卡组');
    saveDecksToStorage(newDecks);
  }, [decks, saveCurrentDeck]);

  const deleteDeck = useCallback((idx: number) => {
    if (decks.length <= 1) return;
    const newDecks = decks.filter((_, i) => i !== idx);
    setDecks(newDecks);
    saveDecksToStorage(newDecks);
    setActiveDeckIdx(Math.min(activeDeckIdx, newDecks.length - 1));
  }, [decks, activeDeckIdx]);

  const toggleRune = useCallback((cardId: string) => {
    setSelectedRunes((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 6) return prev;
      return [...prev, cardId];
    });
  }, []);

  const toggleElement = useCallback((cardId: string) => {
    setSelectedElements((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 4) return prev;
      return [...prev, cardId];
    });
  }, []);

  const isValid = selectedRunes.length === 6 && selectedElements.length === 4;

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <h2>卡组构筑</h2>
        <button className="btn-back" onClick={() => engine.returnFromDeckBuilder()}>返回</button>
      </div>

      <div className="deck-builder-sidebar">
        <div className="deck-list">
          {decks.map((d, i) => (
            <div key={d.id} className={`deck-list-item ${i === activeDeckIdx ? 'active' : ''}`} onClick={() => { saveCurrentDeck(); setActiveDeckIdx(i); }}>
              <span>{d.name}</span>
              {decks.length > 1 && (
                <button className="btn-delete-deck" onClick={(e) => { e.stopPropagation(); deleteDeck(i); }}>×</button>
              )}
            </div>
          ))}
          <button className="btn-add-deck" onClick={addNewDeck}>+ 新建卡组</button>
        </div>
      </div>

      <div className="deck-builder-main">
        <div className="deck-editor-top">
          <input
            className="deck-name-input"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="卡组名称"
          />
          <div className="deck-counter">
            符文牌: {selectedRunes.length}/6 | 元素牌: {selectedElements.length}/4
          </div>
          <button className="btn-save-deck" disabled={!isValid} onClick={saveCurrentDeck}>
            保存卡组
          </button>
          {isValid && (
            <button
              className="btn-start-game"
              onClick={() => {
                saveCurrentDeck();
                const deck = buildDeckFromIds(selectedRunes, selectedElements, deckName);
                engine.startGame(deck);
              }}
            >
              使用此卡组开始对战
            </button>
          )}
        </div>

        <div className="deck-card-section">
          <h3>符文牌（选择6张）</h3>
          <div className="deck-card-grid">
            {ALL_RUNE_CARDS.map((card) => (
              <div
                key={card.id}
                className={`deck-card-option ${selectedRunes.includes(card.id) ? 'selected' : ''} card-rune-${card.runeType}`}
                onClick={() => toggleRune(card.id)}
              >
                <div className="deck-card-mini">
                  <span className="mini-cost">{card.cost}</span>
                  <span className="mini-name">{card.name}</span>
                  <span className="mini-power">{card.power}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="deck-card-section">
          <h3>元素牌（选择4张）</h3>
          <div className="deck-card-grid">
            {ALL_ELEMENT_CARDS.map((card) => (
              <div
                key={card.id}
                className={`deck-card-option ${selectedElements.includes(card.id) ? 'selected' : ''} card-element-${card.elementType}`}
                onClick={() => toggleElement(card.id)}
              >
                <div className="deck-card-mini">
                  <span className="mini-cost">{card.cost}</span>
                  <span className="mini-name">{card.name}</span>
                  <span className="mini-power">{card.power}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});
DeckBuilder.displayName = 'DeckBuilder';

const GameBoard: React.FC<{
  state: GameState;
  engine: GameEngine;
  particles: Particle[];
  screenSize: { w: number; h: number };
}> = React.memo(({ state, engine, particles, screenSize }) => {
  const canPlay = state.phase === GamePhase.Playing && state.turnPhase === TurnPhase.Play;
  const canFinishingMove = canPlay && state.energyPool.playerEnergy >= MAX_ENERGY_POOL;

  return (
    <div className={`game-board ${state.isShaking ? 'screen-shake' : ''}`}>
      <ParticleSystem particles={particles} width={screenSize.w} height={screenSize.h} />

      <div className="board-top">
        <HpBar hp={state.enemy.hp} maxHp={state.enemy.maxHp} shield={state.enemy.shield} label="敌方咒术师" isEnemy />
        <BuffIcons buffs={state.enemy.buffs} />
        <div className="enemy-hand">
          {state.enemy.hand.map((card, i) => (
            <CardComponent key={i} card={card} index={i} total={state.enemy.hand.length} canPlay={false} isEnemy />
          ))}
        </div>
        <div className="enemy-info">
          能量: {state.enemy.energy}/{state.enemy.maxEnergy} | 牌库: {state.enemy.deck.length}
        </div>
      </div>

      <div className="board-center">
        <EnergyPoolDisplay
          playerEnergy={state.energyPool.playerEnergy}
          enemyEnergy={state.energyPool.enemyEnergy}
          maxEnergy={state.energyPool.maxEnergy}
          canFinishingMove={canFinishingMove}
          onFinishingMove={() => engine.useFinishingMove()}
        />
        {state.lastCombo && (
          <div className="combo-announce">
            <span className="combo-name">{state.lastCombo.comboName}</span>
          </div>
        )}
        {state.showFinishingMove && state.finishingMoveTarget && (
          <div className="finishing-move-overlay">
            <div className="finishing-move-text">
              {FINISHING_MOVES[ElementType.Fire].name}
            </div>
          </div>
        )}
      </div>

      <div className="board-bottom">
        <HpBar hp={state.player.hp} maxHp={state.player.maxHp} shield={state.player.shield} label="你" />
        <BuffIcons buffs={state.player.buffs} />
        <div className="player-info">
          能量: {state.player.energy}/{state.player.maxEnergy} | 牌库: {state.player.deck.length}
          {canPlay && <button className="btn-end-turn" onClick={() => engine.endTurn()}>结束回合</button>}
        </div>
        <div className="player-hand">
          {state.player.hand.map((card, i) => (
            <CardComponent
              key={`${card.id}_${i}`}
              card={card}
              index={i}
              total={state.player.hand.length}
              canPlay={canPlay && card.cost <= state.player.energy}
              onClick={() => engine.playCard(i)}
            />
          ))}
        </div>
      </div>

      <BattleLog logs={state.battleLog} />

      {state.turnPhase === TurnPhase.EnemyTurn && (
        <div className="turn-indicator enemy-turn">敌方回合</div>
      )}
    </div>
  );
});
GameBoard.displayName = 'GameBoard';

const MainMenu: React.FC<{
  engine: GameEngine;
}> = React.memo(({ engine }) => {
  const startWithDefault = useCallback(() => {
    engine.startGame(DEFAULT_PLAYER_DECK);
  }, [engine]);

  return (
    <div className="main-menu">
      <div className="menu-bg-particles" />
      <div className="menu-content">
        <h1 className="game-title">
          <span className="title-char">灵</span>
          <span className="title-char">咒</span>
          <span className="title-char">回</span>
          <span className="title-char">响</span>
        </h1>
        <p className="game-subtitle">Spell Echo — 符文与元素的策略交锋</p>
        <div className="menu-buttons">
          <button className="btn-menu btn-start" onClick={startWithDefault}>
            开始对战
          </button>
          <button className="btn-menu btn-deck" onClick={() => engine.goToDeckBuilder()}>
            卡组构筑
          </button>
        </div>
        <div className="menu-rules">
          <h3>游戏规则</h3>
          <ul>
            <li>每回合获得1点能量，可打出消耗不超能量的卡牌</li>
            <li>符文牌：攻击、防御、回复、干扰四种效果</li>
            <li>元素牌：火、水、风、地，附带特殊效果</li>
            <li>同回合打出符文牌+元素牌可触发组合技</li>
            <li>中央能量池蓄满10点后可释放终结技</li>
            <li>将敌方生命值降至0即可获胜</li>
          </ul>
        </div>
      </div>
    </div>
  );
});
MainMenu.displayName = 'MainMenu';

const GameOverScreen: React.FC<{
  state: GameState;
  engine: GameEngine;
}> = React.memo(({ state, engine }) => {
  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2 className={state.winner === 'player' ? 'victory' : 'defeat'}>
          {state.winner === 'player' ? '胜利！' : '败北...'}
        </h2>
        <p className="game-over-stats">
          用时 {state.turn} 回合 | 你的HP: {state.player.hp} | 敌方HP: {state.enemy.hp}
        </p>
        <div className="game-over-buttons">
          <button className="btn-menu" onClick={() => engine.startGame(DEFAULT_PLAYER_DECK)}>
            再来一局
          </button>
          <button className="btn-menu" onClick={() => engine.returnToMenu()}>
            返回主菜单
          </button>
        </div>
      </div>
    </div>
  );
});
GameOverScreen.displayName = 'GameOverScreen';

export const UIOverlay: React.FC<{
  engine: GameEngine;
}> = ({ engine }) => {
  const [gameState, setGameState] = useState<GameState>(engine.getState());
  const [particles, setParticles] = useState<Particle[]>([]);
  const [screenSize, setScreenSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const unsub = engine.onStateChange((state) => {
      setGameState(state);
    });
    return unsub;
  }, [engine]);

  useEffect(() => {
    const unsub = engine.onEffect((effects) => {
      const newParticles: Particle[] = [];
      for (const effect of effects) {
        const count = effect.type === 'finishingMove' ? 80 : effect.type === 'combo' ? 40 : 20;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1 + Math.random() * 4;
          newParticles.push({
            x: effect.position.x * screenSize.w,
            y: effect.position.y * screenSize.h,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 40 + Math.random() * 60,
            maxLife: 100,
            color: effect.color,
            size: 2 + Math.random() * 4,
          });
        }
      }
      setParticles((prev) => [...prev, ...newParticles]);
    });
    return unsub;
  }, [engine, screenSize]);

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderedContent = useMemo(() => {
    switch (gameState.phase) {
      case GamePhase.Menu:
        return <MainMenu engine={engine} />;
      case GamePhase.DeckBuilder:
        return <DeckBuilder engine={engine} />;
      case GamePhase.Playing:
        return (
          <GameBoard
            state={gameState}
            engine={engine}
            particles={particles}
            screenSize={screenSize}
          />
        );
      case GamePhase.GameOver:
        return (
          <>
            <GameBoard
              state={gameState}
              engine={engine}
              particles={particles}
              screenSize={screenSize}
            />
            <GameOverScreen state={gameState} engine={engine} />
          </>
        );
      default:
        return null;
    }
  }, [gameState, engine, particles, screenSize]);

  return <div className="ui-overlay">{renderedContent}</div>;
};
