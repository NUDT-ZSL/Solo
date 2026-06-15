import React from 'react';

interface DanmakuCommand {
  id: string;
  text: string;
  action: string | null;
  timestamp: number;
  viewerId: string;
}

interface VoteResult {
  move: Record<string, number>;
  skill: Record<string, number>;
  story: Record<string, number>;
  totalCommands: number;
}

interface AudiencePanelProps {
  viewerCount: number;
  totalCommands: number;
  recentCommands: DanmakuCommand[];
  voteResult: VoteResult;
}

const MOVE_COLORS: Record<string, string> = {
  left: '#ff4444',
  right: '#44ff44',
  forward: '#4488ff',
  backward: '#ffaa44',
};

const MOVE_LABELS: Record<string, string> = {
  left: '← 左',
  right: '→ 右',
  forward: '↑ 前',
  backward: '↓ 后',
};

const SKILL_COLORS: Record<string, string> = {
  fireball: '#ff6600',
  ice: '#4488ff',
  shield: '#ffd700',
};

const SKILL_LABELS: Record<string, string> = {
  fireball: '🔥 火球',
  ice: '❄ 冰冻',
  shield: '🛡 护盾',
};

const STORY_COLORS: Record<string, string> = {
  A: '#00d4ff',
  B: '#e85d3a',
  C: '#aa44ff',
};

const BarChart: React.FC<{ data: Record<string, number>; colors: Record<string, string>; labels: Record<string, string> }> = ({ data, colors, labels }) => {
  const maxVal = Math.max(...Object.values(data), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {Object.entries(data).map(([key, value]) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '48px', fontSize: '11px', color: '#aaa', flexShrink: 0 }}>{labels[key] || key}</span>
          <div style={{ flex: 1, height: '14px', background: '#1a1a2e', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(value / maxVal) * 100}%`,
                background: colors[key] || '#00d4ff',
                borderRadius: '3px',
                transition: 'width 0.3s ease',
                minWidth: value > 0 ? '2px' : '0',
              }}
            />
          </div>
          <span style={{ width: '24px', fontSize: '10px', color: '#888', textAlign: 'right' }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

export const AudiencePanel: React.FC<AudiencePanelProps> = ({ viewerCount, totalCommands, recentCommands, voteResult }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>👁</span>
        <span style={styles.headerText}>观众面板</span>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{viewerCount}</div>
          <div style={styles.statLabel}>在线观众</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statValue}>{totalCommands}</div>
          <div style={styles.statLabel}>累计弹幕</div>
        </div>
      </div>

      <div style={styles.sectionTitle}>移动方向投票</div>
      <BarChart data={voteResult.move} colors={MOVE_COLORS} labels={MOVE_LABELS} />

      <div style={{ ...styles.sectionTitle, marginTop: '12px' }}>技能投票</div>
      <BarChart data={voteResult.skill} colors={SKILL_COLORS} labels={SKILL_LABELS} />

      <div style={{ ...styles.sectionTitle, marginTop: '12px' }}>剧情投票</div>
      <BarChart data={voteResult.story} colors={STORY_COLORS} labels={{ A: '选项A', B: '选项B', C: '选项C' }} />

      <div style={{ ...styles.sectionTitle, marginTop: '12px' }}>最近弹幕</div>
      <div style={styles.danmakuList}>
        {recentCommands.map((cmd, idx) => (
          <div
            key={cmd.id}
            style={{
              ...styles.danmakuItem,
              animation: idx < 3 ? 'slideIn 0.15s ease-out' : 'none',
            }}
          >
            <span style={styles.danmakuViewer}>{cmd.viewerId.replace('viewer_', '')}</span>
            <span style={styles.danmakuText}>{cmd.text}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '240px',
    height: '100%',
    background: '#0b0b1a',
    borderRight: '1px solid #1a1a3e',
    padding: '12px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: '1px solid #1a1a3e',
  },
  headerIcon: { fontSize: '18px' },
  headerText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#00d4ff',
  },
  statsRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  statBox: {
    flex: 1,
    background: '#1a1a2e',
    borderRadius: '8px',
    padding: '8px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#00d4ff',
  },
  statLabel: {
    fontSize: '10px',
    color: '#666',
    marginTop: '2px',
  },
  sectionTitle: {
    fontSize: '11px',
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  danmakuList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  danmakuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 6px',
    background: '#1a1a2e',
    borderRadius: '4px',
    fontSize: '11px',
  },
  danmakuViewer: {
    color: '#00d4ff',
    fontSize: '10px',
    minWidth: '28px',
  },
  danmakuText: {
    color: '#ccc',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
};

export default AudiencePanel;
