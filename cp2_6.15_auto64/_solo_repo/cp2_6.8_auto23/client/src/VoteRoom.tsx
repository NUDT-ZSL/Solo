import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface VoteOption {
  id: string;
  text: string;
  votes: number;
}

interface VoteData {
  id: string;
  code: string;
  title: string;
  description: string;
  options: VoteOption[];
  creatorId: string;
  isEnded: boolean;
  onlineCount: number;
  votedUsers: string[];
}

interface VoteRoomProps {
  vote: VoteData;
  userId: string;
  isCreator: boolean;
  onVote: (optionId: string) => void;
  onEndVote: () => void;
  onBack: () => void;
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#a29bfe', '#fd79a8'];

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  backBtn: {
    padding: '10px 20px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  },
  onlineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(78, 205, 196, 0.15)',
    border: '1px solid rgba(78, 205, 196, 0.4)',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#4ecdc4',
  },
  onlineDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4ecdc4',
    boxShadow: '0 0 8px #4ecdc4',
    animation: 'pulse 2s infinite',
  },
  card: {
    background: 'rgba(26, 26, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  codeBadge: {
    fontSize: '14px',
    padding: '4px 12px',
    background: 'rgba(255, 107, 107, 0.2)',
    border: '1px solid rgba(255, 107, 107, 0.4)',
    borderRadius: '6px',
    color: '#ff6b6b',
    letterSpacing: '2px',
    fontWeight: '600',
  },
  endedBadge: {
    fontSize: '12px',
    padding: '4px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: '#888',
  },
  description: {
    fontSize: '15px',
    color: '#aaa',
    lineHeight: '1.7',
    marginBottom: '32px',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#fff',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '28px',
  },
  optionBtn: {
    padding: '18px 24px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#e0e0e0',
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  optionBtnHover: {
    transform: 'scale(1.05)',
    borderColor: 'rgba(255, 107, 107, 0.5)',
    background: 'rgba(255, 107, 107, 0.08)',
  },
  optionBtnSelected: {
    borderColor: '#ff6b6b',
    background: 'rgba(255, 107, 107, 0.15)',
    color: '#fff',
  },
  optionBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    filter: 'grayscale(50%)',
  },
  optionBtnEnded: {
    cursor: 'default',
  },
  optionContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  optionText: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },
  optionVotes: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  voteCount: {
    fontWeight: 'bold',
    fontSize: '16px',
    color: '#ff6b6b',
  },
  percentage: {
    fontSize: '14px',
    color: '#888',
    minWidth: '45px',
    textAlign: 'right',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.05) 100%)',
    transition: 'width 0.6s ease',
    zIndex: 1,
  },
  endVoteBtn: {
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
  },
  votedMessage: {
    padding: '12px 20px',
    background: 'rgba(78, 205, 196, 0.1)',
    border: '1px solid rgba(78, 205, 196, 0.3)',
    borderRadius: '8px',
    color: '#4ecdc4',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  chartsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },
  chartCard: {
    background: 'rgba(26, 26, 46, 0.7)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    animation: 'fadeIn 0.3s ease',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    marginBottom: '20px',
  },
  checkIcon: {
    color: '#4ecdc4',
    fontSize: '18px',
  },
  '@media (max-width: 768px)': {},
};

interface OptionButtonProps {
  option: VoteOption;
  isSelected: boolean;
  isVoted: boolean;
  isEnded: boolean;
  totalVotes: number;
  color: string;
  onClick: () => void;
}

const OptionButton = React.memo<OptionButtonProps>(
  ({ option, isSelected, isVoted, isEnded, totalVotes, color, onClick }) => {
    const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
    const disabled = (isVoted && !isSelected) || isEnded;

    const getBtnStyle = (): React.CSSProperties => {
      let style = { ...styles.optionBtn };
      if (isSelected) {
        style = { ...style, ...styles.optionBtnSelected };
      }
      if (disabled) {
        style = { ...style, ...styles.optionBtnDisabled };
      }
      if (isEnded) {
        style = { ...style, ...styles.optionBtnEnded };
      }
      return style;
    };

    return (
      <button
        style={getBtnStyle()}
        onClick={onClick}
        disabled={disabled}
        className="vote-option-btn"
      >
        <div style={{ ...styles.progressBar, width: `${percentage}%`, background: `linear-gradient(90deg, ${color}33 0%, ${color}08 100%)` }} />
        <div style={styles.optionContent}>
          <div style={styles.optionText}>
            {isSelected && <span style={styles.checkIcon}>✓</span>}
            <span>{option.text}</span>
          </div>
          <div style={styles.optionVotes}>
            <span style={{ ...styles.voteCount, color }}>{option.votes}票</span>
            <span style={styles.percentage}>{percentage}%</span>
          </div>
        </div>
      </button>
    );
  }
);

OptionButton.displayName = 'OptionButton';

const VoteRoom: React.FC<VoteRoomProps> = ({
  vote,
  userId,
  isCreator,
  onVote,
  onEndVote,
  onBack,
}) => {
  const totalVotes = useMemo(
    () => vote.options.reduce((sum, opt) => sum + opt.votes, 0),
    [vote.options]
  );

  const hasVoted = useMemo(
    () => vote.votedUsers.includes(userId),
    [vote.votedUsers, userId]
  );

  const userVotedOptionId = useMemo(() => {
    if (!hasVoted) return null;
    return vote.options.find((opt) => opt.votes > 0)?.id || null;
  }, [hasVoted, vote.options, userId]);

  const chartData = useMemo(
    () =>
      vote.options.map((opt, idx) => ({
        name: opt.text.length > 10 ? opt.text.substring(0, 10) + '...' : opt.text,
        fullName: opt.text,
        votes: opt.votes,
        fill: COLORS[idx % COLORS.length],
      })),
    [vote.options]
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = totalVotes > 0 ? Math.round((data.votes / totalVotes) * 100) : 0;
      return (
        <div
          style={{
            background: 'rgba(26, 26, 46, 0.95)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#e0e0e0',
          }}
        >
          <p style={{ margin: 0, marginBottom: '4px', color: '#fff', fontWeight: '600' }}>
            {data.fullName}
          </p>
          <p style={{ margin: 0, color: '#ff6b6b' }}>
            {data.votes} 票 ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const chartsContainerStyle: React.CSSProperties =
    typeof window !== 'undefined' && window.innerWidth <= 768
      ? { ...styles.chartsContainer, gridTemplateColumns: '1fr' }
      : styles.chartsContainer;

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vote-option-btn:hover:not(:disabled) {
          transform: scale(1.05);
          border-color: rgba(255, 107, 107, 0.5);
          background: rgba(255, 107, 107, 0.08);
        }
        @media (max-width: 768px) {
          .vote-option-btn:hover:not(:disabled) {
            transform: none;
          }
        }
        .recharts-cartesian-grid-horizontal line,
        .recharts-cartesian-grid-vertical line {
          stroke: rgba(255, 255, 255, 0.05);
        }
        .recharts-tooltip-cursor {
          stroke: rgba(255, 107, 107, 0.3);
        }
      `}</style>

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onBack}>
          ← 返回
        </button>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {isCreator && !vote.isEnded && (
            <button style={styles.endVoteBtn} onClick={onEndVote}>
              结束投票
            </button>
          )}
          <div style={styles.onlineBadge}>
            <div style={styles.onlineDot} />
            <span>在线 {vote.onlineCount} 人</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.title}>
          {vote.title}
          <span style={styles.codeBadge}>投票码: {vote.code}</span>
          {vote.isEnded && <span style={styles.endedBadge}>已结束</span>}
        </div>

        {vote.description && <p style={styles.description}>{vote.description}</p>}

        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>总票数</span>
            <span style={styles.statValue}>{totalVotes}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>选项数</span>
            <span style={styles.statValue}>{vote.options.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>参与人数</span>
            <span style={styles.statValue}>{vote.votedUsers.length}</span>
          </div>
        </div>

        {hasVoted && !vote.isEnded && (
          <div style={styles.votedMessage}>
            ✓ 你已成功投票，感谢参与！实时查看投票结果中...
          </div>
        )}

        {vote.isEnded && (
          <div style={{ ...styles.votedMessage, background: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.3)', color: '#ff6b6b' }}>
            🏁 投票已结束，以下是最终结果
          </div>
        )}

        <div style={styles.optionsList}>
          {vote.options.map((option, idx) => (
            <OptionButton
              key={option.id}
              option={option}
              isSelected={hasVoted && userVotedOptionId === option.id}
              isVoted={hasVoted}
              isEnded={vote.isEnded}
              totalVotes={totalVotes}
              color={COLORS[idx % COLORS.length]}
              onClick={() => onVote(option.id)}
            />
          ))}
        </div>
      </div>

      {totalVotes > 0 && (
        <div style={chartsContainerStyle}>
          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>📊 票数分布（柱状图）</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    stroke="#666"
                    tick={{ fill: '#888', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#666"
                    tick={{ fill: '#e0e0e0', fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="votes" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.chartCard}>
            <h3 style={styles.chartTitle}>🥧 占比分析（饼图）</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="votes"
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span style={{ color: '#aaa', fontSize: 12 }}>{entry.payload.fullName}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteRoom;
