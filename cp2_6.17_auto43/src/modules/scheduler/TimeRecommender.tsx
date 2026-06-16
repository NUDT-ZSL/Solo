import React, { useEffect, useState } from 'react';
import type { Recommendation, SelectedTime } from '@/types';
import { DAYS } from '@/utils/timezone';

interface TimeRecommenderProps {
  onSelect: (time: SelectedTime) => void;
}

const RANK_COLORS = ['#f59e0b', '#a3e635', '#38bdf8'];

const TimeRecommender: React.FC<TimeRecommenderProps> = ({ onSelect }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommend');
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (e) {
      console.error('获取推荐失败', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleSelect = (rec: Recommendation) => {
    const [h, m] = rec.startTime.split(':').map(Number);
    onSelect({ day: rec.day, startMinute: h * 60 + m });
  };

  if (loading) {
    return (
      <div className="recommender-loading" style={{ padding: '20px', color: '#6b7280' }}>
        正在计算最优时间...
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="recommender-empty" style={{ padding: '20px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
        暂无推荐时间，请先添加团队成员的可用时间段。
      </div>
    );
  }

  return (
    <div className="time-recommender">
      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0', color: '#1f2937' }}>
        智能推荐会议时间
      </h3>
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
        {recommendations.map((rec, index) => (
          <div
            key={index}
            style={{
              width: '320px',
              height: '160px',
              borderRadius: '12px',
              background: '#ffffff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              display: 'flex',
              flexShrink: 0,
              overflow: 'hidden',
              transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out'
            }}
            className="recommendation-card"
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.08)';
            }}
          >
            <div style={{ width: '6px', background: RANK_COLORS[index], flexShrink: 0 }} />
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '12px', color: RANK_COLORS[index], fontWeight: 600, marginBottom: '4px' }}>
                  推荐 #{index + 1}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
                  {DAYS[rec.day]} {rec.startTime} - {rec.endTime}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
                  可参会: <span style={{ fontWeight: 600, color: '#22c55e' }}>{rec.availableCount}</span> 人
                </div>
                {rec.conflictingUsers.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#ef4444' }}>
                    冲突: {rec.conflictingUsers.join(', ')}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleSelect(rec)}
                style={{
                  width: '100%',
                  height: '36px',
                  borderRadius: '8px',
                  background: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease-out'
                }}
                onMouseEnter={e => ((e.target as HTMLElement).style.background = '#2563eb')}
                onMouseLeave={e => ((e.target as HTMLElement).style.background = '#3b82f6')}
              >
                选定此时间
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeRecommender;
