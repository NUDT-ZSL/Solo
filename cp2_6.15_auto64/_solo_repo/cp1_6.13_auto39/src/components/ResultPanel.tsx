import { useEffect, useRef } from 'react';
import type { BattleLogEntry, BattleStats, RaceType, HistoryRecord } from '@/utils/battleLogic';
import { RACE_STATS } from '@/utils/battleLogic';

interface ResultPanelProps {
  visible: boolean;
  logs: BattleLogEntry[];
  stats: BattleStats[];
  winner: RaceType | 'draw' | null;
  isSimulating: boolean;
  onResimulate: () => void;
  history: HistoryRecord[];
}

const LOG_COLORS: Record<string, string> = {
  move: '#38bdf8',
  attack: '#f97316',
  damage: '#ef4444',
  kill: '#dc2626',
  info: '#94a3b8',
};

function StatCard({ stat }: { stat: BattleStats }) {
  const info = RACE_STATS[stat.race];
  return (
    <div
      className="flex flex-col gap-1 p-3 rounded-lg"
      style={{
        background: '#f1f5f9',
        borderLeft: `4px solid ${info.color}`,
      }}
    >
      <span className="text-sm font-semibold" style={{ color: '#1e293b' }}>
        {info.name}
      </span>
      <div className="flex gap-4 text-xs" style={{ color: '#475569' }}>
        <span>剩余: <strong>{stat.remainingUnits}</strong></span>
        <span>总伤害: <strong>{stat.totalDamageDealt}</strong></span>
      </div>
    </div>
  );
}

export default function ResultPanel({
  visible,
  logs,
  stats,
  winner,
  isSimulating,
  onResimulate,
  history,
}: ResultPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length]);

  if (!visible) return null;

  return (
    <div
      className="flex flex-col gap-3 shrink-0 overflow-hidden"
      style={{
        width: 300,
        background: '#f8fafc',
        borderRadius: 8,
        padding: 16,
        border: '1px solid #e2e8f0',
      }}
    >
      <h3 className="text-sm font-bold" style={{ color: '#0f172a' }}>
        ⚔️ 对战结果
      </h3>

      {winner && (
        <div
          className="text-center py-2 px-3 rounded-lg text-sm font-bold"
          style={{
            background: winner === 'draw' ? '#f1f5f9' : RACE_STATS[winner as RaceType]?.color + '22',
            color: winner === 'draw' ? '#475569' : RACE_STATS[winner as RaceType]?.color || '#475569',
            border: `1px solid ${winner === 'draw' ? '#cbd5e1' : RACE_STATS[winner as RaceType]?.color + '44'}`,
          }}
        >
          {winner === 'draw' ? '🤝 平局' : `🏆 ${RACE_STATS[winner as RaceType].name}获胜！`}
        </div>
      )}

      {stats.length > 0 && (
        <div className="flex flex-col gap-2">
          {stats.map((s) => (
            <StatCard key={s.race} stat={s} />
          ))}
        </div>
      )}

      <div
        className="flex-1 overflow-y-auto rounded-lg p-2"
        style={{
          background: '#0f172a',
          maxHeight: 280,
          minHeight: 120,
        }}
      >
        {logs.length === 0 && !isSimulating && (
          <p className="text-xs text-center py-4" style={{ color: '#475569' }}>
            切换到对战模式以开始模拟
          </p>
        )}
        {isSimulating && logs.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: '#94a3b8' }}>
            ⏳ 正在模拟中...
          </p>
        )}
        {logs.map((log, i) => (
          <div
            key={`${log.turn}-${i}`}
            className="text-[11px] leading-relaxed py-0.5 log-fade-in"
            style={{ color: LOG_COLORS[log.type] || '#94a3b8' }}
          >
            {log.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      <button
        onClick={onResimulate}
        disabled={isSimulating}
        className="w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-300"
        style={{
          background: isSimulating ? '#94a3b8' : '#22c55e',
          color: '#fff',
          opacity: isSimulating ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isSimulating) {
            (e.currentTarget as HTMLButtonElement).style.background = '#16a34a';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSimulating) {
            (e.currentTarget as HTMLButtonElement).style.background = '#22c55e';
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
          }
        }}
      >
        🔄 重新模拟
      </button>

      {history.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <h4 className="text-xs font-semibold" style={{ color: '#475569' }}>
            📋 历史记录
          </h4>
          <div
            className="overflow-y-auto flex flex-col gap-1"
            style={{ maxHeight: 120 }}
          >
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-[10px]"
                style={{ background: '#f1f5f9', color: '#475569' }}
              >
                <span style={{ color: '#94a3b8' }}>
                  {new Date(h.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className="font-medium" style={{ color: '#1e293b' }}>
                  {h.summary}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
