import React from 'react';
import { Inspiration } from '../types';

interface VotePanelProps {
  inspirations: Inspiration[];
  onSynthesize: () => void;
}

const VotePanel: React.FC<VotePanelProps> = ({ inspirations, onSynthesize }) => {
  const totalVotes = inspirations.reduce(
    (sum, i) => sum + i.upVotes + i.downVotes,
    0
  );
  const totalComments = inspirations.reduce((sum, i) => sum + i.comments.length, 0);
  const canSynthesize = inspirations.length >= 10;

  const topInspirations = [...inspirations]
    .sort((a, b) => b.upVotes - b.downVotes - (a.upVotes - a.downVotes))
    .slice(0, 5);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#16213e'
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #0f3460'
        }}
      >
        <h2 style={{ fontSize: '18px', color: '#e0e0e0', marginBottom: '4px' }}>投票统计</h2>
        <div style={{ fontSize: '12px', color: '#888' }}>实时数据面板</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              padding: '14px',
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              border: '1px solid #0f3460'
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>灵感总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#45B7D1' }}>
              {inspirations.length}
            </div>
          </div>
          <div
            style={{
              padding: '14px',
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              border: '1px solid #0f3460'
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>总投票数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ECDC4' }}>
              {totalVotes}
            </div>
          </div>
          <div
            style={{
              padding: '14px',
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              border: '1px solid #0f3460'
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>评论总数</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFEAA7' }}>
              {totalComments}
            </div>
          </div>
          <div
            style={{
              padding: '14px',
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              border: '1px solid #0f3460'
            }}
          >
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>合成进度</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#DDA0DD' }}>
              {Math.min(100, Math.round((inspirations.length / 10) * 100))}%
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '14px', color: '#e0e0e0', fontWeight: 'bold', marginBottom: '12px' }}>
            🏆 排行榜 Top 5
          </div>
          {topInspirations.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '20px' }}>
              暂无数据
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topInspirations.map((inspiration, index) => {
                const netVotes = inspiration.upVotes - inspiration.downVotes;
                const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32', '#888', '#888'];
                return (
                  <div
                    key={inspiration.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 12px',
                      backgroundColor: '#1a1a2e',
                      borderRadius: '8px',
                      border: '1px solid #0f3460'
                    }}
                  >
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: medalColors[index] || '#555',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        color: '#1a1a2e'
                      }}
                    >
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          backgroundColor: inspiration.shape.color,
                          borderRadius: '4px',
                          opacity: inspiration.shape.opacity,
                          border: '1px solid #fff'
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: netVotes >= 0 ? '#4ECDC4' : '#e94560'
                      }}
                    >
                      {netVotes >= 0 ? '+' : ''}
                      {netVotes}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #0f3460'
        }}
      >
        <button
          onClick={onSynthesize}
          disabled={!canSynthesize}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: canSynthesize ? '#0f3460' : '#2a2a4a',
            color: canSynthesize ? '#ffffff' : '#666',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 'bold',
            cursor: canSynthesize ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease'
          }}
        >
          🎨 合成最终作品
          {!canSynthesize && (
            <div style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '4px', opacity: 0.8 }}>
              还需 {10 - inspirations.length} 个灵感
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default VotePanel;
