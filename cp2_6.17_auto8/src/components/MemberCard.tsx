import React, { useState, useEffect, useRef } from 'react';
import type { TeamMember } from '../utils/types';
import { getMemberTrend, type TrendData } from '../api/tasks';
import Avatar from './Avatar';

interface MemberCardProps {
  member: TeamMember;
  onLike: (id: string) => void;
}

interface Bubble {
  id: number;
}

const MiniTrendChart: React.FC<{ data: number[]; labels: string[] }> = ({
  data,
  labels,
}) => {
  const width = 232;
  const height = 60;
  const padding = { top: 6, right: 4, bottom: 14, left: 4 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data, 1);

  const barWidth = chartWidth / data.length - 6;
  const barGap = 6;

  const points = data.map((value, index) => {
    const x =
      padding.left + index * (barWidth + barGap) + barWidth / 2 + barGap / 2;
    const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {data.map((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const barX =
          padding.left + index * (barWidth + barGap) + barGap / 2;
        const barY = padding.top + chartHeight - barHeight;
        return (
          <rect
            key={`bar-${index}`}
            x={barX}
            y={barY}
            width={barWidth}
            height={barHeight}
            rx="2"
            ry="2"
            fill="#38bdf8"
            fillOpacity="0.25"
          />
        );
      })}

      <path d={areaPath} fill="url(#areaGradient)" />

      <path
        d={linePath}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {points.map((point, index) => (
        <circle
          key={`dot-${index}`}
          cx={point.x}
          cy={point.y}
          r={index === points.length - 1 ? 4 : 2.5}
          fill="#ffffff"
          stroke="#38bdf8"
          strokeWidth="2"
        />
      ))}

      {labels.map((label, index) => (
        <text
          key={`label-${index}`}
          x={padding.left + index * (barWidth + barGap) + barGap / 2 + barWidth / 2}
          y={height - 2}
          fontSize="9"
          fill="#94a3b8"
          textAnchor="middle"
        >
          {label.split('/')[1]}
        </text>
      ))}
    </svg>
  );
};

const MemberCard: React.FC<MemberCardProps> = ({ member, onLike }) => {
  const [liked, setLiked] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [showTrend, setShowTrend] = useState(false);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const totalContribution = member.prCount + member.issueCount;

  const handleLikeClick = () => {
    setLiked(true);
    const newBubble: Bubble = { id: Date.now() };
    setBubbles((prev) => [...prev, newBubble]);
    onLike(member.id);

    setTimeout(() => {
      setBubbles((prev) => prev.filter((b) => b.id !== newBubble.id));
    }, 800);
  };

  const handleTrendToggle = async () => {
    const nextShow = !showTrend;
    setShowTrend(nextShow);

    if (nextShow && !trendData) {
      setTrendLoading(true);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await getMemberTrend(member.id, controller.signal);
        setTrendData(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Failed to load trend:', err);
        }
      } finally {
        setTrendLoading(false);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div
      style={{
        width: 280,
        borderRadius: 12,
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 24,
        paddingBottom: showTrend ? 24 + 70 : 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        transition:
          'transform 0.25s ease-out, box-shadow 0.25s ease-out, padding 0.3s ease-out',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar initial={member.avatarInitial} color={member.avatarColor} size={48} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 4,
            }}
          >
            {member.name}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>团队成员</div>
        </div>
        <button
          onClick={handleTrendToggle}
          title={showTrend ? '收起趋势' : '查看贡献趋势'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: showTrend ? '#e0f2fe' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-out',
            color: showTrend ? '#0ea5e9' : '#94a3b8',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0f2fe';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = showTrend
              ? '#e0f2fe'
              : '#f8fafc';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: showTrend ? 'rotate(0deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease-out',
            }}
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </button>
      </div>

      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#38bdf8',
              lineHeight: 1.2,
            }}
          >
            {totalContribution}
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            当月贡献
          </div>
        </div>
        <div style={{ width: 1, height: 40, backgroundColor: '#e2e8f0' }} />
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: 1.2,
            }}
          >
            {member.prCount}
            <span style={{ fontSize: 14, color: '#94a3b8', fontWeight: 400 }}>
              /{member.issueCount}
            </span>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
            PR/Issue
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 16,
        }}
      >
        <div style={{ fontSize: 14, color: '#64748b' }}>
          收到点赞：
          <span style={{ fontWeight: 600, color: '#1e293b', marginLeft: 4 }}>
            {member.likes}
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleLikeClick}
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: liked ? '#fef2f2' : '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = liked ? '#fee2e2' : '#f1f5f9';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = liked ? '#fef2f2' : '#f8fafc';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill={liked ? '#ef4444' : 'none'}
              stroke={liked ? '#ef4444' : '#94a3b8'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transition: 'all 0.2s ease-out' }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          {bubbles.map((bubble) => (
            <span
              key={bubble.id}
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 16,
                pointerEvents: 'none',
                animation: 'popUp 0.8s ease-out forwards',
                zIndex: 10,
              }}
            >
              +1
            </span>
          ))}
        </div>
      </div>

      {showTrend && (
        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 24,
            height: 60,
            borderTop: '1px solid #f1f5f9',
            paddingTop: 12,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#64748b',
                letterSpacing: '0.3px',
              }}
            >
              近7天贡献趋势
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#38bdf8',
              }}
            >
              {trendData
                ? `${trendData.dailyContributions.reduce((a, b) => a + b, 0)} 次`
                : '...'}
            </span>
          </div>
          {trendLoading ? (
            <div
              style={{
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: '#94a3b8',
              }}
            >
              加载中...
            </div>
          ) : trendData ? (
            <MiniTrendChart
              data={trendData.dailyContributions}
              labels={trendData.labels}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

export default MemberCard;
