import type { ScoreRecord } from '../types';

interface LeaderboardProps {
  scores: ScoreRecord[];
}

const medalIcons: Record<number, string> = {
  0: '🥇',
  1: '🥈',
  2: '🥉'
};

const ratingColors: Record<string, string> = {
  S: '#FFD700',
  A: '#C0C0C0',
  B: '#CD7F32',
  C: '#8B4513'
};

export default function Leaderboard({ scores }: LeaderboardProps) {
  const sortedScores = [...scores].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);

  return (
    <div className="sidebar">
      <h2 style={{ 
        fontSize: '18px', 
        marginBottom: '15px', 
        color: '#E0E0E0',
        textAlign: 'center'
      }}>
        🏆 排行榜
      </h2>
      
      {sortedScores.length === 0 ? (
        <div style={{
          textAlign: 'center',
          color: '#95A5A6',
          fontSize: '14px',
          padding: '40px 0'
        }}>
          暂无成绩记录
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sortedScores.map((score, index) => (
            <div
              key={score.id || index}
              style={{
                backgroundColor: index < 3 ? `${ratingColors[score.rating]}20` : '#2D2D4A',
                borderRadius: '8px',
                padding: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: index < 3 ? `1px solid ${ratingColors[score.rating]}50` : 'none',
                transition: 'all 0.3s ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateX(5px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                width: '24px',
                textAlign: 'center',
                fontSize: index < 3 ? '18px' : '14px',
                fontWeight: 'bold',
                color: index < 3 ? 'inherit' : '#95A5A6'
              }}>
                {medalIcons[index] || (index + 1)}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#E0E0E0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {score.playerName}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#95A5A6',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {score.songName}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: '#4CAF50'
                }}>
                  {score.totalScore}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: ratingColors[score.rating],
                  fontWeight: 'bold'
                }}>
                  {score.rating} · {score.accuracy.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{
        marginTop: '20px',
        paddingTop: '15px',
        borderTop: '1px solid #2D2D4A'
      }}>
        <h3 style={{
          fontSize: '14px',
          color: '#95A5A6',
          marginBottom: '10px',
          textAlign: 'center'
        }}>
          🎖️ 评级说明
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#FFD700', fontWeight: 'bold' }}>S</span>
            <span style={{ color: '#95A5A6' }}>≥95%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#C0C0C0', fontWeight: 'bold' }}>A</span>
            <span style={{ color: '#95A5A6' }}>≥85%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#CD7F32', fontWeight: 'bold' }}>B</span>
            <span style={{ color: '#95A5A6' }}>≥70%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#8B4513', fontWeight: 'bold' }}>C</span>
            <span style={{ color: '#95A5A6' }}>≥55%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
