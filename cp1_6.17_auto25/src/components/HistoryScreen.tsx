import { useMemo } from 'react';
import { PageType } from '../App';
import { loadBattleLogs } from '../utils/storage';
import { BattleLog } from '../utils/monsterData';
import { playClickSound } from '../utils/audio';

interface HistoryScreenProps {
  onNavigate: (page: PageType) => void;
}

export default function HistoryScreen({ onNavigate }: HistoryScreenProps) {
  const playSoundAndNav = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  const logs = useMemo(() => loadBattleLogs(), []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E1E2E',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <button className="btn-pixel" onClick={() => playSoundAndNav('menu')}>
            ← 返回菜单
          </button>
          <h2 className="pixel-font" style={{ color: '#FFD54F', fontSize: 18 }}>
            📜 战斗历史
          </h2>
          <div style={{ width: 100 }} />
        </div>

        {logs.length === 0 ? (
          <div style={{
            backgroundColor: '#2D2D44',
            borderRadius: 12,
            padding: '60px 20px',
            textAlign: 'center',
            color: '#757575',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 12,
            lineHeight: 2,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div>暂无战斗记录</div>
            <div style={{ marginTop: 12, fontSize: 10 }}>
              完成一场战斗后将在此显示
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {logs.map((log, idx) => (
              <BattleLogCard key={log.id} log={log} rank={idx + 1} formatDate={formatDate} />
            ))}
          </div>
        )}

        <div style={{
          marginTop: 24,
          textAlign: 'center',
          color: '#616161',
          fontSize: 10,
          fontFamily: "'Press Start 2P', cursive",
        }}>
          * 仅保留最近 10 场战斗记录
        </div>
      </div>
    </div>
  );
}

function BattleLogCard({ log, rank, formatDate }: { log: BattleLog; rank: number; formatDate: (n: number) => string }) {
  return (
    <div style={{
      backgroundColor: '#2D2D44',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      borderLeft: `4px solid ${log.result === 'win' ? '#4CAF50' : '#E53935'}`,
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: log.result === 'win' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(229, 57, 53, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Press Start 2P', cursive",
        fontSize: 10,
        color: log.result === 'win' ? '#4CAF50' : '#E53935',
      }}>
        #{rank}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}>
          <span style={{
            fontFamily: "'Press Start 2P', cursive",
            fontSize: 12,
            color: log.result === 'win' ? '#4CAF50' : '#E53935',
          }}>
            {log.result === 'win' ? '🏆 胜利' : '💀 失败'}
          </span>
          <span style={{ color: '#757575', fontSize: 10 }}>
            · 用时 {log.turns} 回合
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 12,
          alignItems: 'center',
          fontSize: 11,
        }}>
          <div style={{ color: '#81D4FA' }}>
            我方: {log.playerTeam.length} 只怪兽
          </div>
          <div style={{ color: '#757575' }}>VS</div>
          <div style={{ color: '#EF5350', textAlign: 'right' }}>
            敌方: {log.enemyTeam.length} 只怪兽
          </div>
        </div>
      </div>

      <div style={{
        color: '#90A4AE',
        fontSize: 10,
        fontFamily: "'Press Start 2P', cursive",
        whiteSpace: 'nowrap',
      }}>
        {formatDate(log.timestamp)}
      </div>
    </div>
  );
}
