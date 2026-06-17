import { useEffect, useRef, useCallback } from "react";
import type { ICharacter, IBoss, ActionResult } from "../team-module";
import { CLASS_COLORS, CLASS_ICONS } from "../team-module";

interface BattleArenaProps {
  characters: ICharacter[];
  boss: IBoss;
  actions: ActionResult[];
  currentRound: number;
  isBattleRunning: boolean;
  onProcessNextRound: () => void;
}

export default function BattleArena({
  characters,
  boss,
  actions,
  currentRound,
  isBattleRunning,
  onProcessNextRound,
}: BattleArenaProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isBattleRunning) {
      timerRef.current = setTimeout(() => {
        onProcessNextRound();
      }, 600);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isBattleRunning, currentRound, onProcessNextRound]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [actions]);

  const visibleActions = actions.slice(-50);

  return (
    <div className="battle-arena">
      <div className="battle-header">
        <div className="round-info">回合 {currentRound} / 15</div>
      </div>

      <div className="battle-field">
        <div className="ally-side">
          <h3 className="side-label">我方队伍</h3>
          {characters.map((c) => (
            <div key={c.id} className={`battle-unit ${!c.isAlive ? "dead" : ""}`}>
              <div className="unit-avatar" style={{ borderColor: CLASS_COLORS[c.class] }}>
                <span className="avatar-initial">{c.name[0]}</span>
              </div>
              <div className="unit-info">
                <div className="unit-name">
                  {CLASS_ICONS[c.class]} {c.name}
                </div>
                <HealthBar current={c.hp} max={c.maxHp} color={CLASS_COLORS[c.class]} />
              </div>
            </div>
          ))}
        </div>

        <div className="vs-divider">
          <span className="vs-text">VS</span>
        </div>

        <div className="enemy-side">
          <h3 className="side-label">暗影领主</h3>
          <div className={`battle-unit boss-unit ${!boss.isAlive ? "dead" : ""}`}>
            <div className="unit-avatar boss-avatar">
              <span className="avatar-initial">暗</span>
            </div>
            <div className="unit-info">
              <div className="unit-name">👹 {boss.name}</div>
              <HealthBar current={boss.hp} max={boss.maxHp} color="#e94560" />
            </div>
          </div>
        </div>
      </div>

      <div className="battle-log" ref={logRef}>
        {visibleActions.map((action, idx) => {
          const isLatest = idx === visibleActions.length - 1;
          return (
            <div key={`${action.round}-${idx}`} className={`log-entry ${isLatest ? "latest" : ""}`}>
              <span className="log-round">[回合{action.round}]</span>{" "}
              <span className="log-actor">{action.actorName}</span>{" "}
              <span className="log-action">
                {action.isHeal ? "施放了" : "执行了"}
              </span>{" "}
              <span className={`log-skill ${action.isCrit ? "crit" : ""} ${action.isHeal ? "heal" : ""}`}>
                {action.action}
              </span>{" "}
              <span className="log-target">→ {action.targetName}</span>{" "}
              <span className={`log-value ${action.isCrit ? "crit-value" : ""} ${action.isHeal ? "heal-value" : ""}`}>
                {action.isHeal ? "+" : "-"}{action.value}
              </span>
              {action.isCrit && <span className="crit-badge">暴击!</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HealthBarProps {
  current: number;
  max: number;
  color: string;
}

function HealthBar({ current, max, color }: HealthBarProps) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div className="health-bar-container">
      <div
        className="health-bar-fill"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
      <span className="health-bar-text">
        {Math.max(0, current)} / {max}
      </span>
    </div>
  );
}
