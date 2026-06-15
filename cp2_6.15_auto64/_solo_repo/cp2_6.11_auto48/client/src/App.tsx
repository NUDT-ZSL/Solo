import React, { useState, useEffect, useRef, useCallback } from 'react';
import AdaptiveCard, { CardContent, CardStyle } from './components/AdaptiveCard';

interface CardBehaviorState {
  id: number;
  clicks: number;
  hoverSeconds: number;
  isHovering: boolean;
  hoverStartTime: number | null;
}

interface LayoutResponse {
  cards: CardStyle[];
  timestamp: number;
}

const MOCK_CONTENTS: CardContent[] = [
  {
    id: 0,
    title: '创意发现',
    description: '探索灵感空间，发现前所未有的创意可能性与设计趋势。',
    icon: '✨',
  },
  {
    id: 1,
    title: '数据分析',
    description: '实时追踪用户行为模式，洞察数据背后的深层价值。',
    icon: '📊',
  },
  {
    id: 2,
    title: '智能推荐',
    description: '基于机器学习算法，为每个用户提供个性化内容。',
    icon: '🎯',
  },
  {
    id: 3,
    title: '协作空间',
    description: '多人实时协同工作，打破团队沟通的时空壁垒。',
    icon: '🤝',
  },
];

const DEFAULT_STYLE: CardStyle = {
  backgroundColor: '#add8e6',
  textColor: '#1a1a1a',
  glowColor: '#add8e6',
  gridRow: 'span 1',
  gridColumn: 'span 1',
  score: 0,
};

const App: React.FC = () => {
  const [cardStyles, setCardStyles] = useState<CardStyle[]>(
    MOCK_CONTENTS.map(() => ({ ...DEFAULT_STYLE }))
  );
  const [previousScores, setPreviousScores] = useState<number[]>([-1, -1, -1, -1]);
  const [scrollDepth, setScrollDepth] = useState(0);

  const behaviorsRef = useRef<CardBehaviorState[]>(
    MOCK_CONTENTS.map(c => ({
      id: c.id,
      clicks: 0,
      hoverSeconds: 0,
      isHovering: false,
      hoverStartTime: null,
    }))
  );

  const scrollDepthRef = useRef(0);
  const lastSendTimeRef = useRef(Date.now());

  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const depth = scrollHeight > 0 ? Math.min(100, (scrollTop / scrollHeight) * 100) : 0;
    scrollDepthRef.current = depth;
    setScrollDepth(depth);
  }, []);

  const handleCardClick = useCallback((id: number) => {
    behaviorsRef.current = behaviorsRef.current.map(b =>
      b.id === id ? { ...b, clicks: b.clicks + 1 } : b
    );
  }, []);

  const handleMouseEnter = useCallback((id: number) => {
    behaviorsRef.current = behaviorsRef.current.map(b =>
      b.id === id && !b.isHovering
        ? { ...b, isHovering: true, hoverStartTime: Date.now() }
        : b
    );
  }, []);

  const handleMouseLeave = useCallback((id: number) => {
    behaviorsRef.current = behaviorsRef.current.map(b => {
      if (b.id === id && b.isHovering && b.hoverStartTime) {
        const elapsed = (Date.now() - b.hoverStartTime) / 1000;
        return {
          ...b,
          isHovering: false,
          hoverStartTime: null,
          hoverSeconds: b.hoverSeconds + elapsed,
        };
      }
      return b;
    });
  }, []);

  const finalizeHoverTimes = useCallback(() => {
    behaviorsRef.current = behaviorsRef.current.map(b => {
      if (b.isHovering && b.hoverStartTime) {
        const elapsed = (Date.now() - b.hoverStartTime) / 1000;
        return {
          ...b,
          hoverStartTime: Date.now(),
          hoverSeconds: b.hoverSeconds + elapsed,
        };
      }
      return b;
    });
  }, []);

  const sendBehaviorData = useCallback(async () => {
    finalizeHoverTimes();

    const payload = {
      cards: behaviorsRef.current.map(b => ({
        id: b.id,
        clicks: b.clicks,
        hoverSeconds: b.hoverSeconds,
      })),
      scrollDepth: scrollDepthRef.current,
    };

    try {
      const response = await fetch('/api/behavior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data: LayoutResponse = await response.json();
        setPreviousScores(cardStyles.map(s => s.score));
        setCardStyles(data.cards);
      }
    } catch (error) {
      console.error('发送行为数据失败:', error);
    }

    behaviorsRef.current = behaviorsRef.current.map(b => ({
      ...b,
      clicks: 0,
      hoverSeconds: 0,
    }));
  }, [finalizeHoverTimes, cardStyles]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      sendBehaviorData();
      lastSendTimeRef.current = Date.now();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [sendBehaviorData]);

  const getScoreColor = (score: number, allScores: number[]): string => {
    const min = Math.min(...allScores);
    const max = Math.max(...allScores);
    if (max === min) return '#FFD600';
    const normalized = (score - min) / (max - min);
    if (normalized >= 0.66) return '#00C853';
    if (normalized >= 0.33) return '#FFD600';
    return '#FF5252';
  };

  const scores = cardStyles.map(s => s.score);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '40px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#ffffff',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#111',
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}
        >
          流动界面
        </h1>
        <p style={{ fontSize: '15px', color: '#666' }}>
          基于用户行为的自适应体验原型 · 滚动深度: {scrollDepth.toFixed(0)}%
        </p>
      </header>

      <div
        className="card-grid"
        style={{
          display: 'grid',
          gap: '20px',
          width: '100%',
          maxWidth: '1200px',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gridAutoRows: 'minmax(180px, auto)',
        }}
      >
        {MOCK_CONTENTS.map((content, index) => (
          <div
            key={content.id}
            style={{
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <AdaptiveCard
              content={content}
              style={cardStyles[index]}
              previousScore={previousScores[index]}
              onClick={handleCardClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        ))}
      </div>

      <footer
        style={{
          marginTop: '48px',
          padding: '16px 32px',
          background: '#fafafa',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: '#888', fontWeight: 500 }}>
          参与度矩阵
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {scores.map((score, i) => (
            <div
              key={i}
              title={`卡片 ${i + 1}: ${score.toFixed(1)} 分`}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: getScoreColor(score, scores),
                transition: 'background-color 0.5s ease',
                boxShadow: `0 0 8px ${getScoreColor(score, scores)}66`,
              }}
            />
          ))}
        </div>
      </footer>

      <style>{`
        .adaptive-card {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 180px;
          border-radius: 12px;
          padding: 24px;
          cursor: pointer;
          user-select: none;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
          overflow: hidden;
        }
        .card-inner {
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        @media (max-width: 1440px) and (min-width: 768px) {
          .card-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            grid-template-rows: auto auto !important;
          }
          .card-grid > div:nth-child(1),
          .card-grid > div:nth-child(2) {
            grid-row: span 1;
          }
          .card-grid > div:nth-child(3),
          .card-grid > div:nth-child(4) {
            grid-column: span 2;
          }
        }
        @media (max-width: 768px) {
          .card-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .card-description {
            font-size: 14px !important;
          }
          .card-title {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
