import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  recommend,
  type MoodTag,
  type RecommendResult,
  type Tea,
  type Tasting as TastingRecord,
} from '@/client/utils/teaRecommender';

interface RecommendPanelProps {
  teas: Tea[];
  tastings: TastingRecord[];
  onSelectTea: (teaId: string) => void;
}

const MOOD_TAGS: MoodTag[] = ['清甜', '醇厚', '花香', '烟熏', '鲜爽'];

export default function RecommendPanel({
  teas,
  tastings,
  onSelectTea,
}: RecommendPanelProps) {
  const [selectedMoods, setSelectedMoods] = useState<MoodTag[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendResult[]>([]);

  const toggleMood = (mood: MoodTag) => {
    setSelectedMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  };

  const handleRecommend = () => {
    const results = recommend(teas, tastings, selectedMoods);
    setRecommendations(results);
  };

  const isDisabled = selectedMoods.length === 0 || teas.length === 0;

  const containerStyle: React.CSSProperties = {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  };

  const titleWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#4a148c',
    margin: 0,
  };

  const moodSectionStyle: React.CSSProperties = {
    marginBottom: '32px',
  };

  const moodSubtitleStyle: React.CSSProperties = {
    fontSize: '15px',
    color: '#757575',
    marginBottom: '12px',
  };

  const tagContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap' as React.CSSProperties['flexWrap'],
    gap: '12px',
  };

  const getTagStyle = (mood: MoodTag): React.CSSProperties => {
    const isSelected = selectedMoods.includes(mood);
    return {
      padding: '8px 20px',
      borderRadius: '20px',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      userSelect: 'none' as React.CSSProperties['userSelect'],
      backgroundColor: isSelected ? '#7b1fa2' : '#e1bee7',
      color: isSelected ? '#ffffff' : '#4a148c',
      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
    };
  };

  const getTagHoverStyle = (mood: MoodTag): React.CSSProperties => {
    const isSelected = selectedMoods.includes(mood);
    if (isSelected) return {};
    return {
      ':hover': {
        transform: 'scale(1.08)',
      },
    } as unknown as React.CSSProperties;
  };

  const buttonStyle: React.CSSProperties = {
    padding: '12px 32px',
    backgroundColor: '#7b1fa2',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.1s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    opacity: isDisabled ? 0.5 : 1,
  };

  const resultSubtitleStyle: React.CSSProperties = {
    fontSize: '16px',
    color: '#4a148c',
    margin: '32px 0 16px',
  };

  const scrollContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    overflowX: 'auto' as React.CSSProperties['overflowX'],
    padding: '8px 4px 16px',
  };

  const cardStyle: React.CSSProperties = {
    flexShrink: 0,
    width: '160px',
    height: '200px',
    borderRadius: '10px',
    backgroundColor: '#f5f5f5',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as React.CSSProperties['flexDirection'],
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const matchScoreStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#7b1fa2',
    marginBottom: '8px',
  };

  const teaNameStyle: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '6px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as React.CSSProperties['whiteSpace'],
  };

  const teaOriginStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#757575',
    marginBottom: '8px',
  };

  const reasonStyle: React.CSSProperties = {
    flex: 1,
    fontSize: '12px',
    color: '#666',
    lineHeight: 1.4,
    overflow: 'hidden',
  };

  const emptyStateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '48px',
    color: '#999',
    fontSize: '14px',
  };

  const showEmptyState = recommendations.length === 0;
  const emptyMessage =
    teas.length === 0
      ? '暂无茶品数据，快去添加您的第一款好茶吧~'
      : selectedMoods.length === 0
      ? '请先选择今日心情，为您智能推荐好茶'
      : '暂无推荐结果';

  return (
    <div style={containerStyle}>
      <div style={titleWrapperStyle}>
        <Sparkles size={28} color="#7b1fa2" />
        <h2 style={titleStyle}>智能推荐</h2>
      </div>

      <div style={moodSectionStyle}>
        <div style={moodSubtitleStyle}>选择今日心情：</div>
        <div style={tagContainerStyle}>
          {MOOD_TAGS.map(mood => (
            <div
              key={mood}
              style={{
                ...getTagStyle(mood),
                ...getTagHoverStyle(mood),
              }}
              onClick={() => toggleMood(mood)}
              onMouseEnter={e => {
                if (!selectedMoods.includes(mood)) {
                  e.currentTarget.style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={e => {
                if (!selectedMoods.includes(mood)) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {mood}
            </div>
          ))}
        </div>
      </div>

      <button
        style={buttonStyle}
        onClick={handleRecommend}
        disabled={isDisabled}
        onMouseEnter={e => {
          if (!isDisabled) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow =
              '0 4px 16px rgba(123,31,162,0.4)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Sparkles size={18} />
        <span>开始推荐</span>
      </button>

      {recommendations.length > 0 && (
        <div style={resultSubtitleStyle}>为您推荐：</div>
      )}

      {recommendations.length > 0 && (
        <div style={scrollContainerStyle}>
          {recommendations.map(result => (
            <div
              key={result.tea.id}
              style={cardStyle}
              onClick={() => onSelectTea(result.tea.id)}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow =
                  '0 6px 16px rgba(123,31,162,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow =
                  '0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              <div style={matchScoreStyle}>{result.matchScore}%</div>
              <div style={teaNameStyle}>{result.tea.name}</div>
              <div style={teaOriginStyle}>
                {result.tea.origin} · {result.tea.year}年
              </div>
              <div style={reasonStyle}>{result.reason}</div>
            </div>
          ))}
        </div>
      )}

      {showEmptyState && <div style={emptyStateStyle}>{emptyMessage}</div>}
    </div>
  );
}
