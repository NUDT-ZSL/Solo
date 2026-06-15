import React, { useState, useEffect, useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { ScoreResult } from '../types';

interface RadarScoreProps {
  score: ScoreResult | null;
  isAnimating?: boolean;
}

export const RadarScore: React.FC<RadarScoreProps> = ({ score, isAnimating = true }) => {
  const [animatedScore, setAnimatedScore] = useState<ScoreResult | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!score) {
      setAnimatedScore(null);
      setShowContent(false);
      return;
    }

    setAnimatedScore(null);
    setShowContent(false);

    const startTime = Date.now();
    const duration = 2000;
    const startScore = { pronunciation: 0, grammar: 0, fluency: 0, overallScore: 0, suggestions: score.suggestions };

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setAnimatedScore({
        pronunciation: Math.round(startScore.pronunciation + (score.pronunciation - startScore.pronunciation) * easeOut),
        grammar: Math.round(startScore.grammar + (score.grammar - startScore.grammar) * easeOut),
        fluency: Math.round(startScore.fluency + (score.fluency - startScore.fluency) * easeOut),
        overallScore: Math.round(startScore.overallScore + (score.overallScore - startScore.overallScore) * easeOut),
        suggestions: score.suggestions
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const contentTimer = setTimeout(() => setShowContent(true), 300);
    const animFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(contentTimer);
    };
  }, [score]);

  const chartData = useMemo(() => {
    if (!animatedScore) return [];
    return [
      { subject: '发音', value: animatedScore.pronunciation, fullMark: 100 },
      { subject: '语法', value: animatedScore.grammar, fullMark: 100 },
      { subject: '流利度', value: animatedScore.fluency, fullMark: 100 }
    ];
  }, [animatedScore]);

  const getScoreLabel = (s: number) => {
    if (s >= 90) return { text: '优秀', color: '#16A34A', bg: 'linear-gradient(135deg, #86EFAC, #4ADE80)' };
    if (s >= 75) return { text: '良好', color: '#2563EB', bg: 'linear-gradient(135deg, #93C5FD, #60A5FA)' };
    if (s >= 60) return { text: '及格', color: '#D97706', bg: 'linear-gradient(135deg, #FDE68A, #FCD34D)' };
    return { text: '需努力', color: '#DC2626', bg: 'linear-gradient(135deg, #FECACA, #FCA5A5)' };
  };

  if (!score || !animatedScore) {
    return (
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        color: '#94A3B8'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📊</div>
        <p style={{ fontSize: '0.9rem' }}>完成一次回答后即可查看评分结果</p>
      </div>
    );
  }

  const overallLabel = getScoreLabel(animatedScore.overallScore);

  return (
    <div className="animate-radar" style={{ opacity: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        marginBottom: '20px',
        padding: '16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #EFF6FF, #F0FDFA)',
        flexWrap: 'wrap'
      }}>
        <div style={{
          position: 'relative',
          width: '100px',
          height: '100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(animatedScore.overallScore / 100) * 264} 264`}
              style={{
                transition: 'stroke-dasharray 2s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: 'drop-shadow(0 2px 6px rgba(59, 130, 246, 0.4))'
              }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1
            }}>
              {animatedScore.overallScore}
            </span>
            <span style={{ fontSize: '0.6rem', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              综合分
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '140px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '10px',
            background: overallLabel.bg,
            color: overallLabel.color,
            fontSize: '0.75rem',
            fontWeight: 700,
            marginBottom: '8px'
          }}>
            {overallLabel.text}
          </div>
          <h4 style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#1E3A5F',
            marginBottom: '4px'
          }}>
            本次表现评分
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
            三维综合评估，继续加油提升！
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: '240px', marginBottom: '16px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="75%">
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.6} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="#CBD5E1" strokeWidth={1} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: '#1E3A5F', fontSize: 13, fontWeight: 600 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#94A3B8', fontSize: 10 }}
              tickCount={5}
              axisLine={false}
            />
            <Radar
              name="分数"
              dataKey="value"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#radarGradient)"
              fillOpacity={1}
              isAnimationActive={isAnimating}
              animationDuration={2000}
              animationEasing="ease-out"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 8px 24px rgba(30, 58, 95, 0.15)',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
              formatter={(value: number) => [`${value}分`, '得分']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {showContent && (
        <div className="animate-fade-in" style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '10px'
        }}>
          <ScoreItem
            label="发音准确度"
            score={animatedScore.pronunciation}
            icon="🎙️"
            suggestion={score.suggestions.pronunciation}
            gradient="linear-gradient(135deg, #34D399, #059669)"
          />
          <ScoreItem
            label="语法正确性"
            score={animatedScore.grammar}
            icon="📝"
            suggestion={score.suggestions.grammar}
            gradient="linear-gradient(135deg, #60A5FA, #2563EB)"
          />
          <ScoreItem
            label="表达流利度"
            score={animatedScore.fluency}
            icon="⚡"
            suggestion={score.suggestions.fluency}
            gradient="linear-gradient(135deg, #C084FC, #7C3AED)"
          />
        </div>
      )}
    </div>
  );
};

interface ScoreItemProps {
  label: string;
  score: number;
  icon: string;
  suggestion: string;
  gradient: string;
}

const ScoreItem: React.FC<ScoreItemProps> = ({ label, score, icon, suggestion, gradient }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: '14px',
      background: '#F8FAFC',
      border: '1px solid #E2E8F0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1rem' }}>{icon}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E3A5F' }}>{label}</span>
        </div>
        <span style={{
          fontSize: '1rem',
          fontWeight: 800,
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {score}
        </span>
      </div>
      <div style={{
        height: '6px',
        borderRadius: '3px',
        background: '#E2E8F0',
        overflow: 'hidden',
        marginBottom: '8px'
      }}>
        <div style={{
          height: '100%',
          width: `${width}%`,
          background: gradient,
          borderRadius: '3px',
          transition: 'width 2s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }} />
      </div>
      <p style={{
        fontSize: '0.75rem',
        color: '#64748B',
        lineHeight: 1.5,
        margin: 0
      }}>
        💡 {suggestion}
      </p>
    </div>
  );
};
