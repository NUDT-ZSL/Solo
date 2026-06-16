import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Engine, Action, GameState, Card, MinionOnBoard } from './gameEngine';
import CardComponent from './CardComponent';

type SelectionMode = 'none' | 'targeting_spell' | 'attacking';
type FullscreenEffectType = 'none' | 'damage' | 'heal';

interface AnimState {
  [instanceId: string]: 'idle' | 'attacking' | 'hit' | 'dying';
}

interface SlashEffect {
  id: string;
  fromInstanceId: string;
  toInstanceId: string | 'hero';
  fromSide: 'player' | 'ai';
  toSide: 'player' | 'ai';
}

interface FloatingNumber {
  id: string;
  value: number;
  type: 'damage' | 'heal';
  x: number;
  y: number;
}

interface Props {
  engine: Engine;
}

const genId = () => `fx_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const GameBoard: React.FC<Props> = ({ engine }) => {
  const [gameState, setGameState] = useState<GameState>(() => engine.getState());
  const [animState, setAnimState] = useState<AnimState>({});
  const [heroHitState, setHeroHitState] = useState<{ player?: boolean; ai?: boolean }>({});
  const [banner, setBanner] = useState<{ text: string; visible: boolean } | null>(null);
  const [fullscreenEffect, setFullscreenEffect] = useState<FullscreenEffectType>('none');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<MinionOnBoard | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [actionQueue, setActionQueue] = useState<Action[]>([]);
  const [showGameOver, setShowGameOver] = useState<string | null>(null);
  const [slashEffects, setSlashEffects] = useState<SlashEffect[]>([]);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  const refreshState = useCallback(() => {
    setGameState({ ...engine.getState() });
  }, [engine]);

  const addFloatingNumber = useCallback((value: number, type: 'damage' | 'heal', x: number, y: number) => {
    const id = genId();
    setFloatingNumbers((prev) => [...prev, { id, value, type, x, y ]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((n) => n.id !== id);
    }, 600);
  }, []);

  const addSlashEffect = useCallback(
    (fromInstanceId: string, toInstanceId: string | 'hero', fromSide: 'player' | 'ai', toSide: 'player' | 'ai') => {
      const id = genId();
      setSlashEffects((prev) => [...prev, { id, fromInstanceId, toInstanceId, fromSide, toSide }]);
      setTimeout(() => {
        setSlashEffects((prev) => prev.filter((s) => s.id !== id);
      }, 150);
    },
    [],
  );

  const getMinionScreenPos = useCallback((instanceId: string) => {
    const el = document.querySelector(`[data-instance-id="${instanceId}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const getHeroScreenPos = useCallback((side: 'player' | 'ai') => {
    const el = document.querySelector(`.hero-${side} .heroAvatar`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, []);

  const processActions = useCallback(
    async (actions: Action[]) => {
      if (actions.length === 0) {
        refreshState();
        return;
      }
      setActionQueue((prev) => [...prev, ...actions]);
      if (processingRef.current) return;
      processingRef.current = true;

      const run = async () => {
        while (true) {
          let current: Action | undefined;
          setActionQueue((prev) => {
            if (prev.length === 0) return prev;
            const [first, ...rest] = prev;
            current = first;
            return rest;
          });
          await new Promise((r) => setTimeout(r, 0));
          if (!current) break;
          const a = current as Action;
          refreshState();
          await handleActionVisual(a);
        }
        processingRef.current = false;
        refreshState();
      };
      run();
    },
    [refreshState],
  );

  const handleActionVisual = (action: Action): Promise<void> => {
    return new Promise((resolve) => {
      switch (action.type) {
        case 'START_TURN': {
          const text = action.player === 'player' ? '你的回合' : '对手回合';
          setBanner({ text, visible: true });
          setTimeout(() => setBanner(null), 1000);
          setTimeout(resolve, 600);
          break;
        }
        case 'PLAY_CARD': {
          if (action.payload?.type === 'spell') {
            setTimeout(resolve, 200);
          } else {
            setTimeout(resolve, 300);
          }
          break;
        }
        case 'SPELL_EFFECT': {
          const effect = action.payload?.effect;
          const tgt = action.payload?.targetInstanceId;
          const targetOwner = action.payload?.targetOwner;
          const isHero = action.payload?.targetIsHero;
          const value = action.payload?.value || 0;
          if (effect === 'damage') {
            setFullscreenEffect('damage');
            setTimeout(() => setFullscreenEffect('none'), 150);
            setTimeout(() => {
              if (tgt) {
                const pos = getMinionScreenPos(tgt);
                if (pos) addFloatingNumber(value, 'damage', pos.x, pos.y - 40);
              } else if (isHero) {
                const pos = getHeroScreenPos(targetOwner);
                if (pos) addFloatingNumber(value, 'damage', pos.x, pos.y);
              }
            }, 80);
          } else if (effect === 'heal') {
            setFullscreenEffect('heal');
            setTimeout(() => setFullscreenEffect('none'), 100);
            setTimeout(() => {
              if (tgt) {
                const pos = getMinionScreenPos(tgt);
                if (pos) addFloatingNumber(value, 'heal', pos.x, pos.y - 40);
              } else if (isHero) {
                const pos = getHeroScreenPos(targetOwner);
                if (pos) addFloatingNumber(value, 'heal', pos.x, pos.y);
              }
            }, 80);
          }
          if (tgt) {
            setAnimState((prev) => ({ ...prev, [tgt]: 'hit' }));
            setTimeout(() => setAnimState((prev) => ({ ...prev, [tgt]: 'idle' })), 350);
          } else if (isHero) {
            setHeroHitState((prev) => ({ ...prev, [targetOwner]: true }));
            setTimeout(() => setHeroHitState((prev) => ({ ...prev, [targetOwner]: false })), 350);
          }
          setTimeout(resolve, 400);
          break;
        }
        case 'ATTACK': {
          const atkId = action.payload?.attackerInstanceId;
          const tgtId = action.payload?.targetInstanceId;
          const targetOwner = action.payload?.targetOwner;
          const isHero = action.payload?.targetIsHero;
          const dmgToTarget = action.payload?.damageToTarget || 0;
          const dmgToAttacker = action.payload?.damageToAttacker || 0;
          const attackerSide = action.player;
          const targetSide = targetOwner;
          setAnimState((prev) => ({ ...prev, [atkId]: 'attacking' }));
          setTimeout(() => {
            addSlashEffect(atkId, tgtId || 'hero', attackerSide, targetSide);
            if (tgtId && !isHero) {
              setAnimState((prev) => ({ ...prev, [tgtId]: 'hit' });
            } else if (isHero) {
              setHeroHitState((prev) => ({ ...prev, [targetOwner]: true }));
              setTimeout(() => setHeroHitState((prev) => ({ ...prev, [targetOwner]: false })), 350);
            }
            setTimeout(() => {
              const tgtPos = tgtId && !isHero ? getMinionScreenPos(tgtId) : isHero ? getHeroScreenPos(targetSide) : null;
              if (tgtPos) addFloatingNumber(dmgToTarget, 'damage', tgtPos.x, tgtPos.y - 40);
              if (dmgToAttacker > 0) {
                const atkPos = getMinionScreenPos(atkId);
                if (atkPos) addFloatingNumber(dmgToAttacker, 'damage', atkPos.x, atkPos.y - 40);
              }
            }, 60);
            setTimeout(() => {
              setAnimState((prev) => ({
                ...prev,
                [atkId]: 'idle',
                ...(tgtId ? { [tgtId]: 'idle' } : {}),
              }));
            }, 250);
          }, 250);
          setTimeout(resolve, 700);
          break;
        }
        case 'TAKE_FATIGUE': {
          const dmg = action.payload?.damage || 0;
          setHeroHitState((prev) => ({ ...prev, [action.player]: true });
          setTimeout(() => {
            const pos = getHeroScreenPos(action.player);
            if (pos) addFloatingNumber(dmg, 'damage', pos.x, pos.y);
          }, 80);
          setTimeout(() => setHeroHitState((prev) => ({ ...prev, [action.player]: false })), 350);
          setTimeout(resolve, 400);
          break;
        }
        case 'MINION_DEATH': {
          const id = action.payload?.instanceId;
          if (id) {
            setAnimState((prev) => ({ ...prev, [id]: 'dying' });
            setTimeout(() => {
              setAnimState((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              });
              refreshState();
            }, 350);
          }
          setTimeout(resolve, 400);
          break;
        }
        case 'GAME_OVER': {
          const w = action.payload?.winner;
          setShowGameOver(w === 'player' ? '胜利！' : w === 'ai' ? '失败...' : '平局');
          setTimeout(resolve, 500);
          break;
        }
        default:
          setTimeout(resolve, 50);
      }
    });
  };

  useEffect(() => {
    const init = engine.startGame();
    processActions(init);
  }, [engine, processActions]);

  useEffect(() => {
    if (gameState.gameOver) return;
    if (gameState.currentPlayer !== 'ai') return;
    setAiThinking(true);
    const { actions, delay } = engine.aiDecide();
    const t = setTimeout(() => {
      setAiThinking(false);
      processActions(actions);
    }, delay);
    return () => clearTimeout(t);
  }, [gameState.currentPlayer, gameState.gameOver, engine, processActions]);

  const endTurn = useCallback(() => {
    if (gameState.currentPlayer !== 'player' || gameState.gameOver) return;
    clearSelection();
    const actions = engine.endTurn();
    processActions(actions);
  }, [gameState, engine, processActions]);

  const clearSelection = useCallback(() => {
    setSelectionMode('none');
    setSelectedCard(null);
    setSelectedAttacker(null);
  }, []);

  const onHandCardPointerDown = useCallback(
    (_e: React.PointerEvent, cardId: string) => {
      if (gameState.currentPlayer !== 'player' || gameState.gameOver) return;
      const card = gameState.player.hand.find((c) => c.id === cardId);
      if (!card) return;
      if (card.cost > gameState.player.hero.mana) return;
      setSelectedCard(card);
      if (card.type === 'spell' && card.targetType && card.targetType !== 'none') {
        setSelectionMode('targeting_spell');
      }
    },
    [gameState],
  );

  const onHandCardClick = useCallback(
    (cardId: string) => {
      if (gameState.currentPlayer !== 'player' || gameState.gameOver) return;
      const card = gameState.player.hand.find((c) => c.id === cardId);
      if (!card) return;
      if (card.cost > gameState.player.hero.mana) return;
      if (card.type === 'minion' || (card.type === 'spell' && (!card.targetType || card.targetType === 'none'))) {
        clearSelection();
        const actions = engine.playCard('player', cardId);
        processActions(actions);
      }
    },
    [gameState, engine, processActions, clearSelection],
  );

  const onBoardMinionClick = useCallback(
    (_cardId: string, instanceId?: string) => {
      if (!instanceId) return;
      if (gameState.gameOver) return;

      if (selectionMode === 'targeting_spell' && selectedCard) {
        const target = gameState.ai.board.find((m) => m.instanceId === instanceId);
        const friendly = gameState.player.board.find((m) => m.instanceId === instanceId);
        const tt = selectedCard.targetType;
        let ok = false;
        if (tt === 'any') ok = true;
        if (tt === 'enemy' && target) ok = true;
        if (tt === 'friendly' && friendly) ok = true;
        if (ok) {
          const actions = engine.playCard('player', selectedCard.id, instanceId);
          clearSelection();
          processActions(actions);
        }
        return;
      }

      if (selectionMode === 'attacking' && selectedAttacker) {
        const target = gameState.ai.board.find((m) => m.instanceId === instanceId);
        if (target) {
          const actions = engine.attack(selectedAttacker.instanceId, instanceId);
          clearSelection();
          processActions(actions);
        }
        return;
      }

      if (gameState.currentPlayer === 'player') {
        const own = gameState.player.board.find((m) => m.instanceId === instanceId);
        if (own && own.canAttack && !own.hasAttacked) {
          setSelectedAttacker(own);
          setSelectionMode('attacking');
        }
      }
    },
    [gameState, selectionMode, selectedCard, selectedAttacker, engine, processActions, clearSelection],
  );

  const onEnemyHeroClick = useCallback(() => {
    if (gameState.gameOver) return;
    if (selectionMode === 'targeting_spell' && selectedCard) {
      const tt = selectedCard.targetType;
      if (tt === 'any' || tt === 'enemy') {
        const actions = engine.playCard('player', selectedCard.id, 'hero_enemy');
        clearSelection();
        processActions(actions);
      }
      return;
    }
    if (selectionMode === 'attacking' && selectedAttacker) {
      const actions = engine.attack(selectedAttacker.instanceId, 'hero');
      clearSelection();
      processActions(actions);
    }
  }, [gameState, selectionMode, selectedCard, selectedAttacker, engine, processActions, clearSelection]);

  const onSelfHeroClick = useCallback(() => {
    if (gameState.gameOver) return;
    if (selectionMode === 'targeting_spell' && selectedCard) {
      const tt = selectedCard.targetType;
      if (tt === 'any' || tt === 'friendly') {
        if (selectedCard.effect === 'damage') {
          const actions = engine.playCard('player', selectedCard.id, 'hero_self');
          clearSelection();
          processActions(actions);
        } else if (selectedCard.effect === 'heal') {
          const actions = engine.playCard('player', selectedCard.id);
          clearSelection();
          processActions(actions);
        }
      }
    }
  }, [gameState, selectionMode, selectedCard, engine, processActions, clearSelection]);

  const restartGame = useCallback(() => {
    window.location.reload();
  }, []);

  const handCards = gameState.player.hand;
  const aiHandCards = gameState.ai.hand;
  const playerBoard = gameState.player.board;
  const aiBoard = gameState.ai.board;
  const isPlayerTurn = gameState.currentPlayer === 'player' && !gameState.gameOver;

  const handCardStyles = useMemo(() => {
    const n = handCards.length;
    return handCards.map((_, i) => {
      if (n === 1) return { left: '50%', translate: '-50%', rotate: 0 };
      const spread = Math.min(n * 28, 360);
      const totalAngle = spread;
      const start = -totalAngle / 2;
      const step = totalAngle / (n - 1 || 1);
      const angle = start + step * i;
      const rad = (angle * Math.PI) / 180;
      const radius = 320;
      const y = radius * (1 - Math.cos(rad));
      const x = radius * Math.sin(rad);
      return {
        left: `calc(50% + ${x}px)`,
        bottom: `-${y - 40}px`,
        translate: '-50% 0',
        rotate: `${angle}deg`,
        zIndex: 100 + i,
      };
    });
  }, [handCards.length]);

  const aiHandCardStyles = useMemo(() => {
    const n = aiHandCards.length;
    return aiHandCards.map((_, i) => {
      if (n === 1) return { left: '50%', translate: '-50%', rotate: 0 };
      const spread = Math.min(n * 26, 340);
      const totalAngle = spread;
      const start = -totalAngle / 2;
      const step = totalAngle / (n - 1 || 1);
      const angle = start + step * i;
      const rad = (angle * Math.PI) / 180;
      const radius = 320;
      const y = radius * (1 - Math.cos(rad));
      const x = radius * Math.sin(rad);
      return {
        left: `calc(50% + ${x}px)`,
        top: `-${y - 40}px`,
        translate: '-50% 0',
        rotate: `${-angle}deg`,
        zIndex: 100 + i,
      };
    });
  }, [aiHandCards.length]);

  const targetingAny = selectionMode === 'targeting_spell' && (selectedCard?.targetType === 'any');
  const targetingEnemy = selectionMode === 'targeting_spell' && (selectedCard?.targetType === 'enemy' || selectedCard?.targetType === 'any');
  const targetingFriendly = selectionMode === 'targeting_spell' && (selectedCard?.targetType === 'friendly' || selectedCard?.targetType === 'any');

  const playerLowHp = gameState.player.hero.health <= 10 && gameState.player.hero.health > 0;
  const aiLowHp = gameState.ai.hero.health <= 10 && gameState.ai.hero.health > 0;

  return (
    <div className="gameRoot" ref={boardRef}>
      <div className={`fullscreenEffect fullscreen-${fullscreenEffect}`} />

      {slashEffects.map((slash) => (
        <SlashEffect key={slash.id} slash={slash} />
      ))}

      {floatingNumbers.map((fn) => (
        <div
          key={fn.id}
          className={`floatingNumber floatingNumber-${fn.type}`}
          style={{ left: fn.x, top: fn.y }}
        >
          {fn.type === 'damage' ? '-' : '+'}{Math.abs(fn.value)}
        </div>
      ))}

      <div className="topHud">
        <HeroPanel
          side="ai"
          hero={gameState.ai.hero}
          isHit={!!heroHitState.ai}
          isThinking={aiThinking}
          isLowHealth={aiLowHp}
          deckCount={gameState.ai.deck.length}
          handCount={gameState.ai.hand.length}
          targetable={targetingEnemy}
          onClick={onEnemyHeroClick}
        />
        <div className="turnInfo">
          <div className="turnNum">第 {gameState.turn} 回合</div>
          <button
            className={`endTurnBtn ${isPlayerTurn ? 'active' : ''}`}
            onClick={endTurn}
            disabled={!isPlayerTurn}
          >
            结束回合
          </button>
        </div>
        <HeroPanel
          side="player"
          hero={gameState.player.hero}
          isHit={!!heroHitState.player}
          isLowHealth={playerLowHp}
          deckCount={gameState.player.deck.length}
          handCount={gameState.player.hand.length}
          targetable={targetingFriendly}
          onClick={onSelfHeroClick}
        />
      </div>

      <div className="aiHandArea">
        {aiHandCards.map((card, i) => (
        <div
          key={card.id}
          className="aiHandCard"
          style={aiHandCardStyles[i]}
          data-ai-card-id={card.id}
        >
          <div className="aiCardBack">
          <div className="aiCardBackInner">
            <div className="aiCardLogo">♠</div>
          </div>
          </div>
        </div>
        ))}
      </div>

      <div className="manaBar aiMana">
        <ManaCrystals current={gameState.ai.hero.mana} max={gameState.ai.hero.maxMana} />
      </div>

      <div className="battlefield">
        <div className="boardSide aiBoard">
          <BoardRow
            minions={aiBoard}
            location="board_ai"
            animState={animState}
            targetable={targetingEnemy}
            onCardClick={onBoardMinionClick}
          />
        </div>
        <div className="battlefieldDivider" />
        <div className="boardSide playerBoard">
          <BoardRow
            minions={playerBoard}
            location="board_player"
            animState={animState}
            canAttackOwnTurn={isPlayerTurn}
            selectedAttackerId={selectedAttacker?.instanceId}
            targetable={targetingFriendly}
            isAttacking={selectionMode === 'attacking'}
            onCardClick={onBoardMinionClick}
          />
        </div>
      </div>

      <div className="manaBar playerMana">
        <ManaCrystals current={gameState.player.hero.mana} max={gameState.player.hero.maxMana} />
      </div>

      <div className="handArea">
        {handCards.map((card, i) => {
          const canPlay = card.cost <= gameState.player.hero.mana && isPlayerTurn;
          const isSelected = selectedCard?.id === card.id;
          return (
            <CardComponent
              key={card.id}
              card={card}
              location="hand"
              index={i}
              total={handCards.length}
              canDrag={canPlay}
              canPlay={canPlay}
              isSelected={isSelected}
              style={handCardStyles[i]}
              onPointerDown={onHandCardPointerDown}
              onClick={onHandCardClick}
            />
          );
        })}
      </div>

      {banner && banner.visible && <div className="turnBanner">{banner.text}</div>}

      {selectionMode !== 'none' && (
        <div className="selectionHint">
          {selectionMode === 'targeting_spell' && '选择目标（点击屏幕外取消）'}
          {selectionMode === 'attacking' && '选择攻击目标（点击屏幕外取消）'}
          <button className="cancelBtn" onClick={clearSelection}>取消</button>
        </div>
      )}

      {showGameOver && (
        <div className="gameOverOverlay" onClick={restartGame}>
          <div className="gameOverBox">
            <div className="gameOverTitle">{showGameOver}</div>
            <div className="gameOverSub">点击重新开始</div>
          </div>
        </div>
      )}
    </div>
  );
};

const SlashEffect: React.FC<{ slash: SlashEffect }> = ({ slash }) => {
  const [lineRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const fromPos = slash.fromInstanceId !== 'hero'
        ? document.querySelector(`[data-instance-id="${slash.fromInstanceId}"]`)?.getBoundingClientRect()
        : document.querySelector(`.hero-${slash.fromSide} .heroAvatar`)?.getBoundingClientRect();

      const toPos = slash.toInstanceId !== 'hero'
        ? document.querySelector(`[data-instance-id="${slash.toInstanceId}"]`)?.getBoundingClientRect()
        : document.querySelector(`.hero-${slash.toSide} .heroAvatar`)?.getBoundingClientRect();

      if (!fromPos || !toPos) return;

      const x1 = fromPos.left + fromPos.width / 2;
      const y1 = fromPos.top + fromPos.height / 2;
      const x2 = toPos.left + toPos.width / 2;
      const y2 = toPos.top + toPos.height / 2;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      setStyle({
        left: x1,
        top: y1,
        width: length,
        transform: `rotate(${angle}deg)`,
        opacity: 1,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [slash]);

  return <div ref={lineRef} className="slashLine" style={style} />;
};

const ManaCrystals: React.FC<{ current: number; max: number }> = ({ current, max }) => {
  const arr = new Array(12).fill(0);
  return (
    <div className="manaCrystals">
      {arr.map((_, i) => {
        let cls = 'crystal';
        if (i >= max) cls += ' crystal-empty';
        else if (i < current) cls += ' crystal-full';
        else cls += ' crystal-used';
        return <div key={i} className={cls} />;
      })}
      <div className="manaText">{current}/{max}</div>
    </div>
  );
};

const HeroPanel: React.FC<{
  side: 'player' | 'ai';
  hero: { health: number; maxHealth: number; mana: number; maxMana: number };
  isHit: boolean;
  isThinking?: boolean;
  isLowHealth?: boolean;
  deckCount: number;
  handCount: number;
  targetable?: boolean;
  onClick?: () => void;
}> = ({ side, hero, isHit, isThinking, isLowHealth, deckCount, handCount, targetable, onClick }) => {
  const pct = Math.max(0, (hero.health / hero.maxHealth) * 100;
  const r = Math.round(255 * (1 - hero.health / hero.maxHealth));
  const g = Math.round(200 * (hero.health / hero.maxHealth));
  const hpColor = `rgb(${r}, ${g}, 60)`;
  const reversed = side === 'ai';
  return (
    <div className={`heroPanel hero-${side} ${isHit ? 'hero-hit' : ''} ${targetable ? 'hero-targetable' : ''} ${isThinking ? 'hero-thinking' : ''} ${isLowHealth ? 'hero-lowHealth' : ''}`} onClick={onClick}>
      {isLowHealth && <div className="hero-dangerAura" />}
      {reversed && <div className="heroInfo">
        <div className="heroCounts">牌库: {deckCount} | 手牌: {handCount}</div>
        <div className="hpBarOuter">
          <div className="hpBarFill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hpColor}, #ff6b6b)` }} />
          <div className="hpText">{hero.health} / {hero.maxHealth}</div>
        </div>
      </div>}
      <div className="heroAvatar">
        <div className="avatarRing" />
        <div className="avatarInner" style={{ background: `linear-gradient(135deg, ${side === 'player' ? '#4facfe' : '#ff512f'}, ${side === 'player' ? '#00f2fe' : '#f09819'})` }}>
          <span>{side === 'player' ? '你' : '敌'}</span>
        </div>
      </div>
      {!reversed && <div className="heroInfo">
        <div className="heroCounts">牌库: {deckCount} | 手牌: {handCount}</div>
        <div className="hpBarOuter">
          <div className="hpBarFill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${hpColor}, #ff6b6b)` }} />
          <div className="hpText">{hero.health} / {hero.maxHealth}</div>
        </div>
      </div>}
    </div>
  );
};

const BoardRow: React.FC<{
  minions: MinionOnBoard[];
  location: 'board_player' | 'board_ai';
  animState: AnimState;
  canAttackOwnTurn?: boolean;
  selectedAttackerId?: string;
  targetable?: boolean;
  isAttacking?: boolean;
  onCardClick: (cardId: string, instanceId?: string) => void;
}> = ({ minions, location, animState, canAttackOwnTurn, selectedAttackerId, targetable, isAttacking, onCardClick }) => {
  const slots = new Array(5).fill(null).map((_, i) => minions[i] || null;
  const isEnemy = location === 'board_ai';
  return (
    <div className="boardRow">
      {slots.map((minion, i) => (
        <div key={i} className="minionSlot">
          {minion && (
            <CardComponent
              card={minion}
              location={location}
              index={i}
              total={minions.length}
              canAttack={!!canAttackOwnTurn && location === 'board_player' && minion.canAttack && !minion.hasAttacked}
              isTargetable={!!(targetable && isEnemy) || !!(targetable && !isEnemy) || !!(isAttacking && isEnemy)}
              isSelected={selectedAttackerId === minion.instanceId}
              animationState={animState[minion.instanceId] || 'idle'}
              onClick={(cid, iid) => onCardClick(cid, iid)}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default GameBoard;
