import type { BattleStats, CharacterClass } from "../types";
import { CLASS_COLORS } from "../team-module";

interface StatsPanelProps {
  stats: BattleStats;
  onReset: () => void;
}

const CLASS_LABELS: Record<CharacterClass, string> = {
  tank: "坦克",
  healer: "治疗",
  dps: "输出",
};

export default function StatsPanel({ stats, onReset }: StatsPanelProps) {
  const maxDamage = Math.max(...stats.characterContributions.map((c) => c.damageDealt), 1);
  const maxHealing = Math.max(...stats.characterContributions.map((c) => c.healingDone), 1);
  const maxTaken = Math.max(...stats.characterContributions.map((c) => c.damageTaken), 1);

  return (
    <div className="stats-overlay">
      <div className="stats-card">
        <h2 className="stats-title">
          {stats.isVictory ? "🏆 战斗胜利！" : "💀 战斗失败..."}
        </h2>

        <div className="stats-overview">
          <div className="stat-item">
            <span className="stat-item-label">总回合数</span>
            <span className="stat-item-value">{stats.totalRounds}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item-label">我方总伤害</span>
            <span className="stat-item-value gold">{stats.totalDamageDealt}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item-label">敌方总伤害</span>
            <span className="stat-item-value red">{stats.totalDamageTaken}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item-label">总治疗量</span>
            <span className="stat-item-value cyan">{stats.totalHealing}</span>
          </div>
          <div className="stat-item">
            <span className="stat-item-label">总承伤量</span>
            <span className="stat-item-value">{stats.totalDamageTaken}</span>
          </div>
        </div>

        <h3 className="contrib-title">角色贡献</h3>
        <div className="contrib-sections">
          <div className="contrib-section">
            <h4 className="contrib-subtitle">伤害占比</h4>
            {stats.characterContributions.map((c) => (
              <div key={c.characterId} className="contrib-row">
                <span className="contrib-name">{c.characterName}</span>
                <div className="contrib-bar-bg">
                  <div
                    className="contrib-bar-fill"
                    style={{
                      width: `${(c.damageDealt / maxDamage) * 100}%`,
                      backgroundColor: CLASS_COLORS[c.class],
                    }}
                  />
                </div>
                <span className="contrib-value">{c.damageDealt}</span>
              </div>
            ))}
          </div>

          <div className="contrib-section">
            <h4 className="contrib-subtitle">治疗占比</h4>
            {stats.characterContributions.map((c) => (
              <div key={c.characterId} className="contrib-row">
                <span className="contrib-name">{c.characterName}</span>
                <div className="contrib-bar-bg">
                  <div
                    className="contrib-bar-fill"
                    style={{
                      width: maxHealing > 0 ? `${(c.healingDone / maxHealing) * 100}%` : "0%",
                      backgroundColor: CLASS_COLORS[c.class],
                    }}
                  />
                </div>
                <span className="contrib-value">{c.healingDone}</span>
              </div>
            ))}
          </div>

          <div className="contrib-section">
            <h4 className="contrib-subtitle">承伤占比</h4>
            {stats.characterContributions.map((c) => (
              <div key={c.characterId} className="contrib-row">
                <span className="contrib-name">{c.characterName}</span>
                <div className="contrib-bar-bg">
                  <div
                    className="contrib-bar-fill"
                    style={{
                      width: maxTaken > 0 ? `${(c.damageTaken / maxTaken) * 100}%` : "0%",
                      backgroundColor: CLASS_COLORS[c.class],
                    }}
                  />
                </div>
                <span className="contrib-value">{c.damageTaken}</span>
              </div>
            ))}
          </div>
        </div>

        <button className="reset-btn" onClick={onReset}>
          🔄 重新编队
        </button>
      </div>
    </div>
  );
}
