import React, { useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Room, RoomType, Item, Monster } from './types';
import {
  createInitialState,
  movePlayer,
  canMoveTo,
  triggerRoomEvent,
  closeEventModal,
  toggleInventory,
  useItem,
  restartGame,
  playerAttack,
  applyBattleResult,
  finishTransition,
} from './gameState';

type Action =
  | { type: 'MOVE'; x: number; y: number }
  | { type: 'FINISH_TRANSITION' }
  | { type: 'TRIGGER_EVENT' }
  | { type: 'CLOSE_EVENT' }
  | { type: 'TOGGLE_INVENTORY' }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'PLAYER_ATTACK' }
  | { type: 'APPLY_BATTLE_RESULT'; result: ReturnType<typeof playerAttack> }
  | { type: 'RESTART' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'MOVE':
      return movePlayer(state, action.x, action.y);
    case 'FINISH_TRANSITION':
      return finishTransition(state);
    case 'TRIGGER_EVENT':
      return triggerRoomEvent(state);
    case 'CLOSE_EVENT':
      return closeEventModal(state);
    case 'TOGGLE_INVENTORY':
      return toggleInventory(state);
    case 'USE_ITEM':
      return useItem(state, action.itemId);
    case 'APPLY_BATTLE_RESULT':
      return applyBattleResult(state, action.result);
    case 'RESTART':
      return restartGame();
    default:
      return state;
  }
}

const ROOM_SIZE = 80;
const ROOM_BORDER = 2;

function getRoomColor(type: RoomType): string {
  switch (type) {
    case RoomType.NormalMonster:
      return '#c53030';
    case RoomType.EliteMonster:
      return '#805ad5';
    case RoomType.Treasure:
      return '#d69e2e';
  }
}

function getRoomTypeName(type: RoomType): string {
  switch (type) {
    case RoomType.NormalMonster:
      return '普通怪物房';
    case RoomType.EliteMonster:
      return '精英怪物房';
    case RoomType.Treasure:
      return '宝物房';
  }
}

interface RoomCellProps {
  room: Room;
  isCurrentRoom: boolean;
  isTransitioning: boolean;
  canMove: boolean;
  onClick: () => void;
}

const RoomCell: React.FC<RoomCellProps> = React.memo(({ room, isCurrentRoom, isTransitioning, canMove, onClick }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isCurrentRoom && isTransitioning) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isCurrentRoom, isTransitioning]);

  const dimmed = !isCurrentRoom && isTransitioning;
  const scale = isAnimating ? 1 : 1;
  const opacity = dimmed ? 0.5 : 1;

  return (
    <div
      onClick={onClick}
      className={isCurrentRoom ? 'current-room' : ''}
      style={{
        width: ROOM_SIZE,
        height: ROOM_SIZE,
        border: `${ROOM_BORDER}px solid ${isCurrentRoom ? '#d69e2e' : '#4a5568'}`,
        background: isCurrentRoom
          ? `linear-gradient(135deg, #3d4a5c, #2a3444)`
          : `linear-gradient(135deg, #2d3748, #1a202c)`,
        position: 'relative',
        cursor: canMove ? 'pointer' : 'default',
        transform: `scale(${scale})`,
        opacity,
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
      }}
      onMouseEnter={(e) => {
        if (canMove) {
          (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 12px rgba(255,255,255,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          backgroundColor: getRoomColor(room.type),
          borderRadius: 6,
          opacity: room.visited ? 1 : 0.6,
          position: 'relative',
          transform: isCurrentRoom && isTransitioning ? 'scale(0.5)' : 'scale(1)',
          transition: 'transform 0.3s ease',
        }}
      />
      {isCurrentRoom && (
        <div
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            backgroundColor: '#3182ce',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 8px #3182ce',
          }}
        />
      )}
      {room.cleared && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 12,
            color: '#48bb78',
          }}
        >
          ✓
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: 0,
          right: 0,
          fontSize: 10,
          color: '#a0aec0',
          textAlign: 'center',
        }}
      >
        {room.x},{room.y}
      </div>
    </div>
  );
});

interface HealthBarProps {
  hp: number;
  maxHp: number;
  height?: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ hp, maxHp, height = 16 }) => {
  const percentage = (hp / maxHp) * 100;
  const green = Math.min(255, Math.floor(percentage * 2.55 * 2));
  const red = Math.min(255, Math.floor(255 - percentage * 2.55));

  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: '#2d3748',
        borderRadius: 4,
        overflow: 'hidden',
        border: '1px solid #4a5568',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${percentage}%`,
          background: `linear-gradient(90deg, rgb(${red}, ${green}, 0), rgb(${Math.min(255, red + 30)}, ${Math.min(255, green + 30)}, 0))`,
          transition: 'width 0.5s ease, background 0.5s ease',
        }}
      />
    </div>
  );
};

interface ItemIconProps {
  item: Item;
  size?: number;
  onClick?: () => void;
}

const ItemIcon: React.FC<ItemIconProps> = ({ item, size = 30, onClick }) => (
  <div
    onClick={onClick}
    title={`${item.name}: ${item.description}`}
    style={{
      width: size,
      height: size,
      backgroundColor: '#2d3748',
      border: `2px solid ${item.color}`,
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.5,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => {
      if (onClick) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
    }}
  >
    {item.icon}
  </div>
);

interface BattleCanvasProps {
  monster: Monster;
  playerHp: number;
  playerMaxHp: number;
  onAnimationComplete: () => void;
  battleTrigger: number;
  battleResult?: 'victory' | 'defeat' | null;
  playerDamage?: number;
  monsterDamage?: number;
}

function drawPlayerCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.fillStyle = '#3182ce';
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = '#ffffff';
  const px = size / 8;
  ctx.fillRect(x + px * 2, y + px * 1, px, px);
  ctx.fillRect(x + px * 5, y + px * 1, px, px);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + px * 6, y + px * 2, px, px);
  ctx.fillRect(x + px * 5, y + px * 3, px, px);
  ctx.fillRect(x + px * 4, y + px * 4, px, px);
  ctx.fillRect(x + px * 3, y + px * 5, px, px * 2);
  ctx.fillRect(x + px * 4, y + px * 7, px * 2, px);

  ctx.fillStyle = '#d69e2e';
  ctx.fillRect(x + px * 2, y + px * 5, px, px * 2);
  ctx.fillRect(x + px * 3, y + px * 7, px, px);
}

function drawMonsterCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = '#1a202c';
  const px = size / 8;

  ctx.fillRect(x + px * 0, y + px * 0, px * 2, px * 2);
  ctx.fillRect(x + px * 2, y + px * 1, px, px);
  ctx.fillRect(x + px * 6, y + px * 0, px * 2, px * 2);
  ctx.fillRect(x + px * 5, y + px * 1, px, px);

  ctx.fillStyle = '#ff0000';
  ctx.fillRect(x + px * 2, y + px * 2, px * 2, px * 2);
  ctx.fillRect(x + px * 4, y + px * 2, px * 2, px * 2);

  ctx.fillStyle = '#1a202c';
  ctx.fillRect(x + px * 2, y + px * 5, px * 4, px);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + px * 2, y + px * 6, px, px);
  ctx.fillRect(x + px * 5, y + px * 6, px, px);
}

function drawDamageNumber(ctx: CanvasRenderingContext2D, x: number, y: number, damage: number, progress: number) {
  const alpha = 1 - progress;
  const offsetY = -30 * progress;
  const scale = 1 + progress * 0.5;

  ctx.save();
  ctx.translate(x, y + offsetY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#1a202c';
  ctx.lineWidth = 3;
  ctx.strokeText(`-${damage}`, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`-${damage}`, 0, 0);

  ctx.restore();
}

const BattleCanvas: React.FC<BattleCanvasProps> = ({ monster, playerHp, playerMaxHp, onAnimationComplete, battleTrigger, battleResult, playerDamage, monsterDamage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const flashRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const resultStartTimeRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  const damageStartTimeRef = useRef<number>(0);
  const shakeActiveRef = useRef<boolean>(false);
  const damageActiveRef = useRef<boolean>(false);

  useEffect(() => {
    if (battleResult) {
      resultStartTimeRef.current = performance.now();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resultDuration = 300;

      const drawResult = () => {
        const elapsed = performance.now() - resultStartTimeRef.current;
        const progress = Math.min(1, elapsed / resultDuration);

        ctx.fillStyle = '#1a202c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (battleResult === 'victory') {
          const maxRadius = Math.max(canvas.width, canvas.height);
          const radius = maxRadius * progress;
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
          gradient.addColorStop(0, `rgba(214, 158, 46, ${1 - progress})`);
          gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.5 * (1 - progress)})`);
          gradient.addColorStop(1, 'rgba(214, 158, 46, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = `rgba(214, 158, 46, ${progress})`;
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('胜 利 !', centerX, centerY + 10);
          ctx.textAlign = 'left';
        } else {
          const shards = 8;
          ctx.save();
          ctx.translate(centerX, centerY);
          for (let i = 0; i < shards; i++) {
            const angle = (Math.PI * 2 * i) / shards;
            const dist = 80 * progress;
            const alpha = 1 - progress;
            ctx.save();
            ctx.rotate(angle + progress * 0.5);
            ctx.translate(dist, 0);
            ctx.fillStyle = `rgba(229, 62, 62, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(-15, -10);
            ctx.lineTo(15, -10);
            ctx.lineTo(0, 20);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();

          ctx.fillStyle = `rgba(229, 62, 62, ${progress})`;
          ctx.font = 'bold 32px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('失 败...', centerX, centerY + 10);
          ctx.textAlign = 'left';
        }

        if (progress < 1) {
          animRef.current = requestAnimationFrame(drawResult);
        }
      };

      animRef.current = requestAnimationFrame(drawResult);

      return () => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }
  }, [battleResult]);

  useEffect(() => {
    if (battleResult) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    startTimeRef.current = performance.now();
    let phase = 'entering';
    flashRef.current = 0;
    shakeActiveRef.current = false;
    damageActiveRef.current = false;
    shakeRef.current = 0;
    damageStartTimeRef.current = 0;

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const enterDuration = 500;
      const flashDuration = 100;
      const shakeDuration = 200;
      const damageDuration = 500;

      let shakeOffsetX = 0;
      if (shakeActiveRef.current) {
        const shakeElapsed = time - shakeRef.current;
        if (shakeElapsed < shakeDuration) {
          const shakeProgress = shakeElapsed / shakeDuration;
          const shakeIntensity = 5 * (1 - shakeProgress);
          shakeOffsetX = Math.sin(shakeElapsed * 0.05) * shakeIntensity;
        } else {
          shakeActiveRef.current = false;
        }
      }

      let damageProgress = 0;
      if (damageActiveRef.current) {
        const damageElapsed = time - damageStartTimeRef.current;
        if (damageElapsed < damageDuration) {
          damageProgress = damageElapsed / damageDuration;
        } else {
          damageActiveRef.current = false;
        }
      }

      ctx.save();
      ctx.translate(shakeOffsetX, 0);

      ctx.fillStyle = '#1a202c';
      ctx.fillRect(-shakeOffsetX, 0, canvas.width, canvas.height);

      const progress = Math.min(1, elapsed / enterDuration);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const playerX = 40 + easeProgress * 120;
      const monsterX = canvas.width - 80 - easeProgress * 120;

      if (phase === 'entering' && elapsed >= enterDuration) {
        phase = 'flash';
        flashRef.current = performance.now();
      }

      if (phase === 'flash') {
        const flashElapsed = performance.now() - flashRef.current;
        if (flashElapsed >= flashDuration) {
          phase = 'shake';
          shakeRef.current = performance.now();
          shakeActiveRef.current = true;
          damageStartTimeRef.current = performance.now();
          damageActiveRef.current = true;
        } else {
          const flashIntensity = 1 - flashElapsed / flashDuration;
          ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
          ctx.fillRect(-shakeOffsetX, 0, canvas.width, canvas.height);
        }
      }

      if (phase === 'shake' && !shakeActiveRef.current && !damageActiveRef.current) {
        phase = 'idle';
        setTimeout(() => onAnimationComplete(), 100);
      }

      drawPlayerCharacter(ctx, playerX, 80, 40);
      drawMonsterCharacter(ctx, monsterX, 80, 40, monster.color);

      if (damageActiveRef.current && playerDamage !== undefined && monsterDamage !== undefined) {
        drawDamageNumber(ctx, playerX + 20, 70, monsterDamage, damageProgress);
        drawDamageNumber(ctx, monsterX + 20, 70, playerDamage, damageProgress);
      }

      ctx.fillStyle = '#48bb78';
      ctx.font = '12px sans-serif';
      ctx.fillText('玩家', playerX + 5, 75);

      ctx.fillStyle = '#e53e3e';
      ctx.fillText(monster.name, monsterX, 75);

      const playerHpPct = playerHp / playerMaxHp;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(playerX, 130, 40, 6);
      ctx.fillStyle = `rgb(${Math.floor(255 * (1 - playerHpPct))}, ${Math.floor(255 * playerHpPct)}, 0)`;
      ctx.fillRect(playerX, 130, 40 * playerHpPct, 6);

      const monsterHpPct = monster.hp / monster.maxHp;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(monsterX, 130, 40, 6);
      ctx.fillStyle = `rgb(${Math.floor(255 * (1 - monsterHpPct))}, ${Math.floor(255 * monsterHpPct)}, 0)`;
      ctx.fillRect(monsterX, 130, 40 * monsterHpPct, 6);

      ctx.restore();

      if (phase !== 'idle') {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [monster, battleTrigger, battleResult, playerDamage, monsterDamage]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={160}
      style={{
        display: 'block',
        margin: '0 auto',
        borderRadius: 8,
        border: '2px solid #4a5568',
      }}
    />
  );
};

interface ModalProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const Modal: React.FC<ModalProps> = ({ children, onClose }) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}
  >
    <div
      style={{
        backgroundColor: '#1a202c',
        color: '#f7fafc',
        padding: 24,
        borderRadius: 12,
        maxWidth: 500,
        width: '90%',
        position: 'relative',
        border: '1px solid #4a5568',
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: '#4a5568',
            color: '#f7fafc',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      )}
      {children}
    </div>
  </div>
);

interface InventoryDrawerProps {
  open: boolean;
  player: GameState['player'];
  onClose: () => void;
  onUseItem: (itemId: string) => void;
}

const InventoryDrawer: React.FC<InventoryDrawerProps> = ({ open, player, onClose, onUseItem }) => (
  <>
    {open && (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 90,
        }}
      />
    )}
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 300,
        height: '100%',
        backgroundColor: '#1a202c',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease',
        zIndex: 95,
        padding: 20,
        boxSizing: 'border-box',
        borderLeft: '1px solid #4a5568',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: '#f7fafc', margin: 0, fontSize: 20 }}>背包</h2>
        <button
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: '#4a5568',
            color: '#f7fafc',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 8 }}>生命值</div>
        <HealthBar hp={player.hp} maxHp={player.maxHp} />
        <div style={{ color: '#f7fafc', fontSize: 12, marginTop: 4 }}>{player.hp} / {player.maxHp}</div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 8 }}>金币</div>
        <div style={{ color: '#d69e2e', fontSize: 24, fontWeight: 'bold' }}>💰 {player.gold}</div>
      </div>

      <div>
        <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 12 }}>宝物列表（点击药水使用）</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {player.inventory.map((item, index) => (
            <div key={`${item.id}-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ItemIcon
                item={item}
                size={40}
                onClick={item.type === 'potion' ? () => onUseItem(item.id) : undefined}
              />
              <div style={{ color: '#a0aec0', fontSize: 10, marginTop: 4, textAlign: 'center' }}>{item.name}</div>
            </div>
          ))}
          {player.inventory.length === 0 && (
            <div style={{ color: '#718096', fontSize: 14, gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>
              背包是空的
            </div>
          )}
        </div>
      </div>
    </div>
  </>
);

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const [battleTrigger, setBattleTrigger] = useState(0);
  const [battleAnimating, setBattleAnimating] = useState(false);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  const [playerDamage, setPlayerDamage] = useState<number>(0);
  const [monsterDamage, setMonsterDamage] = useState<number>(0);
  const [roomDetail, setRoomDetail] = useState<Room | null>(null);
  const [showRestart, setShowRestart] = useState(false);

  useEffect(() => {
    if (state.gameOver) {
      const timer = setTimeout(() => setShowRestart(true), 1500);
      return () => clearTimeout(timer);
    } else {
      setShowRestart(false);
    }
  }, [state.gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'b' || e.key === 'B') {
        dispatch({ type: 'TOGGLE_INVENTORY' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (state.transitioning) {
      const timer = setTimeout(() => {
        dispatch({ type: 'FINISH_TRANSITION' });
        if (state.currentRoom && !state.currentRoom.cleared) {
          setTimeout(() => dispatch({ type: 'TRIGGER_EVENT' }), 100);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.transitioning, state.currentRoom]);

  useEffect(() => {
    if (state.inBattle) {
      setBattleResult(null);
    }
  }, [state.inBattle]);

  const handleRoomClick = useCallback((room: Room) => {
    if (canMoveTo(state.player, room.x, room.y)) {
      dispatch({ type: 'MOVE', x: room.x, y: room.y });
    } else {
      setRoomDetail(room);
    }
  }, [state.player]);

  const handleAttack = useCallback(() => {
    if (!state.currentRoom?.monster || battleAnimating) return;
    const result = playerAttack(state.currentRoom.monster);
    setBattleAnimating(true);
    setBattleResult(null);
    setPlayerDamage(result.playerDamage);
    setMonsterDamage(result.monsterDamage);
    setBattleTrigger(prev => prev + 1);
    setTimeout(() => {
      dispatch({ type: 'APPLY_BATTLE_RESULT', result });
      setBattleAnimating(false);
      if (result.monsterDead) {
        setBattleResult('victory');
      } else if (state.player.hp - result.monsterDamage <= 0) {
        setBattleResult('defeat');
      }
    }, 1000);
  }, [state.currentRoom, state.player.hp, battleAnimating]);

  const currentRoom = state.rooms[state.player.position.y][state.player.position.x];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#1a202c',
        color: '#f7fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minWidth: 1024,
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #1a202c; }
        #root { min-height: 100vh; }
        @keyframes pulse-gold {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(214, 158, 46, 0.4), inset 0 0 6px rgba(214, 158, 46, 0.2); }
          50% { box-shadow: 0 0 16px 4px rgba(214, 158, 46, 0.7), inset 0 0 12px rgba(214, 158, 46, 0.4); }
        }
        @keyframes glow-soft {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }
        .current-room {
          animation: pulse-gold 1.5s ease-in-out infinite, glow-soft 2s ease-in-out infinite;
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <div
          style={{
            width: '70%',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <h1 style={{ color: '#d69e2e', marginBottom: 24, fontSize: 28 }}>⚔️ 地下城探索辅助工具</h1>

          <div
            style={{
              display: 'inline-grid',
              gridTemplateColumns: `repeat(3, ${ROOM_SIZE + ROOM_BORDER * 2}px)`,
              gap: 16,
              padding: 24,
              backgroundColor: '#2d3748',
              borderRadius: 12,
              border: '2px solid #4a5568',
            }}
          >
            {state.rooms.map((row, y) =>
              row.map((room, x) => (
                <RoomCell
                  key={`${x}-${y}`}
                  room={room}
                  isCurrentRoom={state.player.position.x === x && state.player.position.y === y}
                  isTransitioning={state.transitioning}
                  canMove={canMoveTo(state.player, x, y) && !state.gameOver}
                  onClick={() => handleRoomClick(room)}
                />
              ))
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#a0aec0' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#c53030', borderRadius: 3 }} />
              普通怪物
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#a0aec0' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#805ad5', borderRadius: 3 }} />
              精英怪物
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#a0aec0' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#d69e2e', borderRadius: 3 }} />
              宝物房
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#a0aec0' }}>
              <div style={{ width: 16, height: 16, backgroundColor: '#3182ce', borderRadius: '50%' }} />
              玩家位置
            </div>
          </div>

          <div style={{ marginTop: 16, color: '#718096', fontSize: 13 }}>
            点击相邻房间移动 · 按 B 键打开背包 · 点击已探索房间查看详情
          </div>

          {state.inBattle && state.currentRoom?.monster && (
            <div style={{ marginTop: 32, width: '100%', maxWidth: 500 }}>
              <h3 style={{ color: '#e53e3e', marginBottom: 16, textAlign: 'center', fontSize: 22 }}>⚔️ 战斗中！</h3>
              <BattleCanvas
                monster={state.currentRoom.monster}
                playerHp={state.player.hp}
                playerMaxHp={state.player.maxHp}
                onAnimationComplete={() => {}}
                battleTrigger={battleTrigger}
                battleResult={battleResult}
                playerDamage={playerDamage}
                monsterDamage={monsterDamage}
              />
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: 12 }}>玩家</div>
                  <div style={{ color: '#f7fafc' }}>HP: {state.player.hp}/{state.player.maxHp}</div>
                </div>
                <div>
                  <div style={{ color: '#a0aec0', fontSize: 12 }}>{state.currentRoom.monster.name}</div>
                  <div style={{ color: '#f7fafc' }}>HP: {state.currentRoom.monster.hp}/{state.currentRoom.monster.maxHp}</div>
                </div>
              </div>
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button
                  onClick={handleAttack}
                  disabled={battleAnimating}
                  style={{
                    padding: '12px 32px',
                    fontSize: 16,
                    backgroundColor: battleAnimating ? '#4a5568' : '#c53030',
                    color: '#f7fafc',
                    border: 'none',
                    borderRadius: 8,
                    cursor: battleAnimating ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                >
                  {battleAnimating ? '战斗中...' : '🗡️ 攻击！'}
                </button>
              </div>
              {state.battleLog.length > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: 12,
                    backgroundColor: '#2d3748',
                    borderRadius: 8,
                    maxHeight: 120,
                    overflowY: 'auto',
                    fontSize: 13,
                  }}
                >
                  {state.battleLog.slice(-5).map((log, i) => (
                    <div key={i} style={{ color: '#a0aec0', marginBottom: 4 }}>{log}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            width: '30%',
            backgroundColor: '#2d3748',
            padding: 24,
            borderLeft: '1px solid #4a5568',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: '#3182ce',
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                border: '3px solid #d69e2e',
              }}
            >
              🧙
            </div>
            <div style={{ fontSize: 18, color: '#f7fafc' }}>冒险者</div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: '#a0aec0', fontSize: 14 }}>生命值</span>
              <span style={{ color: '#f7fafc', fontSize: 14 }}>{state.player.hp} / {state.player.maxHp}</span>
            </div>
            <HealthBar hp={state.player.hp} maxHp={state.player.maxHp} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 6 }}>金币</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>💰</span>
              <span style={{ fontSize: 24, color: '#d69e2e', fontWeight: 'bold' }}>{state.player.gold}</span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 12 }}>持有宝物（{state.player.inventory.length}）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {state.player.inventory.slice(0, 8).map((item, index) => (
                <ItemIcon key={`${item.id}-${index}`} item={item} size={36} />
              ))}
              {state.player.inventory.length === 0 && (
                <div style={{ color: '#718096', fontSize: 12 }}>暂无宝物</div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#a0aec0', fontSize: 14, marginBottom: 8 }}>当前位置</div>
            <div style={{ padding: 12, backgroundColor: '#1a202c', borderRadius: 8 }}>
              <div style={{ color: '#f7fafc', fontSize: 14, marginBottom: 4 }}>
                房间 ({currentRoom.x}, {currentRoom.y})
              </div>
              <div style={{ color: getRoomColor(currentRoom.type), fontSize: 13 }}>
                {getRoomTypeName(currentRoom.type)}
              </div>
              <div style={{ color: '#718096', fontSize: 12, marginTop: 4 }}>
                {currentRoom.cleared ? '✅ 已探索' : '⏳ 未探索'}
              </div>
            </div>
          </div>

          <button
            onClick={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
            style={{
              width: '100%',
              padding: 12,
              backgroundColor: '#4a5568',
              color: '#f7fafc',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#718096';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4a5568';
            }}
          >
            🎒 打开背包 (B)
          </button>
        </div>
      </div>

      {state.currentEvent && !state.inBattle && (
        <Modal onClose={() => dispatch({ type: 'CLOSE_EVENT' })}>
          <h3 style={{ color: '#d69e2e', marginBottom: 16, fontSize: 20 }}>📜 事件</h3>
          <p style={{ color: '#f7fafc', fontSize: 16, lineHeight: 1.6, marginBottom: 16 }}>
            {state.currentEvent}
          </p>
          {state.currentRoom?.treasures && state.currentRoom.treasures.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#a0aec0', fontSize: 13, marginBottom: 8 }}>获得宝物：</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {state.currentRoom.treasures.map((item, index) => (
                  <div key={`treasure-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ItemIcon item={item} size={40} />
                    <span style={{ color: '#a0aec0', fontSize: 11, marginTop: 4 }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'right' }}>
            <button
              onClick={() => dispatch({ type: 'CLOSE_EVENT' })}
              style={{
                padding: '8px 24px',
                backgroundColor: '#3182ce',
                color: '#f7fafc',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              确定
            </button>
          </div>
        </Modal>
      )}

      {roomDetail && (
        <Modal onClose={() => setRoomDetail(null)}>
          <h3 style={{ color: '#d69e2e', marginBottom: 16, fontSize: 20 }}>
            🏠 房间详情 ({roomDetail.x}, {roomDetail.y})
          </h3>
          <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#2d3748', borderRadius: 8, borderLeft: '4px solid #d69e2e' }}>
            <div style={{ color: '#a0aec0', fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>📖 房间描述</div>
            <p style={{ color: '#f7fafc', fontSize: 15, lineHeight: 1.7, fontStyle: 'italic' }}>
              "{roomDetail.description}"
            </p>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: '#a0aec0' }}>类型：</span>
            <span style={{ color: getRoomColor(roomDetail.type) }}>{getRoomTypeName(roomDetail.type)}</span>
          </div>
          <div style={{ marginBottom: 12 }}>
            <span style={{ color: '#a0aec0' }}>状态：</span>
            <span style={{ color: roomDetail.cleared ? '#48bb78' : '#e53e3e' }}>
              {roomDetail.cleared ? '已探索' : '未探索'}
            </span>
          </div>
          {roomDetail.monster && (
            <div style={{ marginBottom: 12, padding: 12, backgroundColor: '#2d3748', borderRadius: 8 }}>
              <div style={{ color: '#e53e3e', marginBottom: 8 }}>👹 {roomDetail.monster.name}</div>
              <div style={{ color: '#a0aec0', fontSize: 13 }}>
                生命值：{roomDetail.monster.hp} / {roomDetail.monster.maxHp}
              </div>
              <div style={{ color: '#a0aec0', fontSize: 13 }}>
                攻击力：{roomDetail.monster.minAttack} - {roomDetail.monster.maxAttack}
              </div>
              <div style={{ color: '#a0aec0', fontSize: 13, marginTop: 4 }}>
                掉落：{roomDetail.monster.loot.join(', ')}
              </div>
            </div>
          )}
          {roomDetail.treasures && roomDetail.treasures.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: '#a0aec0', fontSize: 13, marginBottom: 8 }}>💎 宝物：</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {roomDetail.treasures.map((item, index) => (
                  <div key={`detail-${index}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ItemIcon item={item} size={36} />
                    <span style={{ color: '#a0aec0', fontSize: 11, marginTop: 4 }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <button
              onClick={() => setRoomDetail(null)}
              style={{
                padding: '8px 24px',
                backgroundColor: '#4a5568',
                color: '#f7fafc',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              关闭
            </button>
          </div>
        </Modal>
      )}

      <InventoryDrawer
        open={state.inventoryOpen}
        player={state.player}
        onClose={() => dispatch({ type: 'TOGGLE_INVENTORY' })}
        onUseItem={(itemId) => dispatch({ type: 'USE_ITEM', itemId })}
      />

      {state.gameOver && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 24 }}>💀</div>
          <h1 style={{ color: '#e53e3e', fontSize: 48, marginBottom: 16 }}>游戏结束</h1>
          <p style={{ color: '#a0aec0', fontSize: 18, marginBottom: 32 }}>
            你获得了 {state.player.gold} 金币和 {state.player.inventory.length} 件宝物
          </p>
          {showRestart && (
            <button
              onClick={() => dispatch({ type: 'RESTART' })}
              style={{
                padding: '16px 48px',
                fontSize: 18,
                backgroundColor: '#3182ce',
                color: '#f7fafc',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#4299e1';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#3182ce';
              }}
            >
              🔄 重新开始
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
