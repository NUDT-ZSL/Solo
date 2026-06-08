import { useGameStore } from '@/store/gameStore';
import { COLORS } from '@/engine/types';
import HealthBar from './HealthBar';
import ShieldBar from './ShieldBar';
import SkillCooldown from './SkillCooldown';

export default function UILayer() {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState || gameState.phase === 'menu') return null;

  const p1 = gameState.players[0];
  const p2 = gameState.players[1];
  const timeRemaining = Math.max(0, gameState.timeRemaining);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);

  return (
    <div className="absolute inset-0 pointer-events-none select-none" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
      <div className="flex items-start justify-between px-3 sm:px-6 pt-3 sm:pt-4 gap-2 sm:gap-4">
        <div className="flex flex-col gap-1.5 min-w-[120px] sm:min-w-[180px]">
          <HealthBar hp={p1.hp} maxHp={p1.maxHp} side="left" />
          <ShieldBar shield={p1.shield} maxShield={p1.maxShield} />
          <div className="flex items-center gap-1.5">
            <SkillCooldown charging={p1.charging} chargeProgress={p1.chargeProgress} color={COLORS.p1Main} />
            {p1.speedBoostTimer > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                background: `${COLORS.bubbleSpeed}20`,
                color: COLORS.bubbleSpeed,
                border: `1px solid ${COLORS.bubbleSpeed}40`,
              }}>
                ⚡ {p1.speedBoostTimer.toFixed(1)}s
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <div className="text-2xl sm:text-3xl font-bold tracking-widest"
            style={{
              color: COLORS.neonPurple,
              fontFamily: 'Orbitron, sans-serif',
              textShadow: `0 0 15px ${COLORS.neonPurple}80`,
            }}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-[10px] tracking-wider" style={{ color: `${COLORS.neonPurple}80` }}>
            BEAT {gameState.beatTrack.beatCount}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 min-w-[120px] sm:min-w-[180px] items-end">
          <HealthBar hp={p2.hp} maxHp={p2.maxHp} side="right" />
          <ShieldBar shield={p2.shield} maxShield={p2.maxShield} />
          <div className="flex items-center gap-1.5">
            {p2.speedBoostTimer > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                background: `${COLORS.bubbleSpeed}20`,
                color: COLORS.bubbleSpeed,
                border: `1px solid ${COLORS.bubbleSpeed}40`,
              }}>
                ⚡ {p2.speedBoostTimer.toFixed(1)}s
              </span>
            )}
            <SkillCooldown charging={p2.charging} chargeProgress={p2.chargeProgress} color={COLORS.p2Main} />
          </div>
        </div>
      </div>

      {gameState.phase === 'playing' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-8 text-[10px] sm:text-xs"
          style={{ color: 'rgba(255,255,255,0.3)' }}>
          <span>P1: WASD + Space</span>
          <span>P2: ↑↓←→ + Enter</span>
        </div>
      )}
    </div>
  );
}
