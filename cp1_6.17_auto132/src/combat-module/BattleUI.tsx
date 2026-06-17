import { useState, useEffect } from 'react';
import { BattleLogEntry, BattleResult } from './CardCombat';
import { Card, PRESET_CARDS } from '../card-module/CardData';

interface BattleUIProps {
  battleResult: BattleResult | null;
  currentCard: Partial<Card>;
  selectedEnemyId: string;
  onEnemyChange: (enemyId: string) => void;
}

export default function BattleUI({
  battleResult,
  currentCard,
  selectedEnemyId,
  onEnemyChange
}: BattleUIProps) {
  const [visibleLogs, setVisibleLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (battleResult) {
      setVisibleLogs(new Set());
      battleResult.logs.forEach((log, index) => {
        setTimeout(() => {
          setVisibleLogs((prev) => {
            const next = new Set(prev);
            next.add(log.id);
            return next;
          });
        }, index * 100);
      });
    }
  }, [battleResult]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderCardPreview = (card: Card | Partial<Card>, label: string) => {
    const hasData = card.name !== undefined;
    return (
      <div style={styles.miniCard}>
        <span style={styles.miniCardLabel}>{label}</span>
        {hasData ? (
          <>
            <div style={styles.miniCardHeader}>
              <span style={styles.miniCost}>{card.cost ?? 0}</span>
              <span style={styles.miniName}>{card.name}</span>
            </div>
            <div style={styles.miniCardStats}>
              <span style={styles.miniAttack}>⚔ {card.attack ?? 0}</span>
              <span style={styles.miniHealth}>❤ {card.health ?? 0}</span>
            </div>
          </>
        ) : (
          <span style={styles.miniCardEmpty}>等待数据</span>
        )}
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>战斗预览</h2>

      <div style={styles.enemySelectGroup}>
        <label style={styles.label}>选择对手卡牌：</label>
        <div style={styles.enemyButtons}>
          {PRESET_CARDS.map((enemy) => (
            <button
              key={enemy.id}
              onClick={() => onEnemyChange(enemy.id)}
              style={{
                ...styles.enemyButton,
                backgroundColor:
                  selectedEnemyId === enemy.id ? '#0F3460' : '#1A1A2E',
                borderColor:
                  selectedEnemyId === enemy.id ? '#3B82F6' : '#334155'
              }}
            >
              <span style={styles.enemyCost}>{enemy.cost}</span>
              <span style={styles.enemyName}>{enemy.name}</span>
              <span style={styles.enemyStats}>
                ⚔{enemy.attack} ❤{enemy.health}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.vsSection}>
        {renderCardPreview(currentCard, '你的卡牌')}
        <span style={styles.vsText}>VS</span>
        {renderCardPreview(
          PRESET_CARDS.find((e) => e.id === selectedEnemyId) || PRESET_CARDS[0],
          '对手'
        )}
      </div>

      {battleResult?.winner && (
        <div
          style={{
            ...styles.winnerBanner,
            backgroundColor:
              battleResult.winner === currentCard.name ? '#10B981' : '#F44336'
          }}
        >
          {battleResult.winner === currentCard.name
            ? '🎉 胜利！'
            : '💀 失败！'}
          {' '}获胜者：{battleResult.winner}
        </div>
      )}

      <div style={styles.logSection}>
        <h3 style={styles.logTitle}>战斗日志</h3>
        <div style={styles.logContainer}>
          {!battleResult || battleResult.logs.length === 0 ? (
            <p style={styles.emptyLog}>点击"战斗测试"开始模拟战斗</p>
          ) : (
            battleResult.logs.map((log: BattleLogEntry) => (
              <div
                key={log.id}
                style={{
                  ...styles.logEntry,
                  opacity: visibleLogs.has(log.id) ? 1 : 0,
                  transform: visibleLogs.has(log.id)
                    ? 'translateY(0)'
                    : 'translateY(-20px)'
                }}
              >
                <div style={styles.logTime}>{formatTime(log.timestamp)}</div>
                <div style={styles.logMessage}>
                  <strong style={{ color: '#FFD700' }}>
                    回合 {log.turn}
                  </strong>
                  {' - '}
                  <span
                    dangerouslySetInnerHTML={{
                      __html: formatLogMessage(log)
                    }}
                  />
                </div>
                {log.defenderDestroyed && (
                  <div style={styles.destroyedBadge}>💥 卡牌被消灭</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function formatLogMessage(log: BattleLogEntry): string {
  const msg = log.message;
  return msg
    .replace(
      log.attackerName,
      `<strong style="color:#3B82F6;">${log.attackerName}</strong>`
    )
    .replace(
      log.defenderName,
      `<strong style="color:#F59E0B;">${log.defenderName}</strong>`
    )
    .replace(
      /(\d+)\s*点伤害/,
      `<span style="color:#FF4444;font-weight:600;">$1 点伤害</span>`
    )
    .replace(
      /生命值\s*(\d+)/,
      `生命值 <span style="color:#44FF44;font-weight:600;">$1</span>`
    );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minHeight: '100%'
  },
  title: {
    color: '#E2E8F0',
    fontSize: '20px',
    fontWeight: 600,
    margin: 0
  },
  enemySelectGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    color: '#CBD5E1',
    fontSize: '13px',
    fontWeight: 500
  },
  enemyButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  enemyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '2px solid #334155',
    backgroundColor: '#1A1A2E',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  enemyCost: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#1A1A2E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '13px'
  },
  enemyName: {
    flex: 1,
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    textAlign: 'left'
  },
  enemyStats: {
    color: '#94A3B8',
    fontSize: '12px'
  },
  vsSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#0F3460',
    borderRadius: '12px'
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#16213E',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    minHeight: '100px'
  },
  miniCardLabel: {
    fontSize: '11px',
    color: '#94A3B8',
    textTransform: 'uppercase',
    fontWeight: 600,
    letterSpacing: '0.5px'
  },
  miniCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  miniCost: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    backgroundColor: '#FFD700',
    color: '#1A1A2E',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '12px',
    flexShrink: 0
  },
  miniName: {
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  miniCardStats: {
    display: 'flex',
    justifyContent: 'space-between'
  },
  miniAttack: {
    color: '#FF4444',
    fontWeight: 700,
    fontSize: '14px'
  },
  miniHealth: {
    color: '#44FF44',
    fontWeight: 700,
    fontSize: '14px'
  },
  miniCardEmpty: {
    color: '#64748B',
    fontSize: '12px',
    alignSelf: 'center',
    marginTop: '16px'
  },
  vsText: {
    color: '#FFD700',
    fontSize: '24px',
    fontWeight: 800,
    textShadow: '0 0 10px rgba(255,215,0,0.5)'
  },
  winnerBanner: {
    padding: '12px 16px',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: '16px',
    textAlign: 'center'
  },
  logSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0
  },
  logTitle: {
    color: '#CBD5E1',
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 10px 0'
  },
  logContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px'
  },
  emptyLog: {
    color: '#64748B',
    fontSize: '13px',
    textAlign: 'center',
    padding: '32px 16px'
  },
  logEntry: {
    backgroundColor: '#0F3460',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid #334155',
    transition: 'all 0.3s ease-out'
  },
  logTime: {
    color: '#64748B',
    fontSize: '11px',
    marginBottom: '4px'
  },
  logMessage: {
    color: '#E2E8F0',
    fontSize: '13px',
    lineHeight: 1.5
  },
  destroyedBadge: {
    marginTop: '6px',
    padding: '4px 8px',
    backgroundColor: 'rgba(244, 67, 54, 0.2)',
    color: '#F44336',
    fontSize: '11px',
    fontWeight: 600,
    borderRadius: '4px',
    display: 'inline-block'
  }
};
