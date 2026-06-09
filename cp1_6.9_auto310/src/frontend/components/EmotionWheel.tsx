import React from 'react';
import { usePoem } from '../App';
import { EMOTION_WORDS } from '../PoemEngine';

const EmotionWheel: React.FC = () => {
  const { cards } = usePoem();
  const size = 240;
  const radius = size / 2;
  const innerRadius = radius - 28;

  const segments = 36;
  const segmentAngle = (2 * Math.PI) / segments;

  const activeCardHues = cards.map((c) => c.hue);

  const getUsedHueCount = (hue: number): number => {
    const tolerance = 10;
    return activeCardHues.filter((h) => {
      const diff = Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue));
      return diff < tolerance;
    }).length;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    return {
      x: cx + r * Math.cos(angle - Math.PI / 2),
      y: cy + r * Math.sin(angle - Math.PI / 2)
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const cx = radius;
  const cy = radius;

  const wrapperStyle: React.CSSProperties = {
    width: 280,
    flexShrink: 0,
    borderRadius: 20,
    background: 'linear-gradient(160deg, rgba(40,40,90,0.7) 0%, rgba(20,20,60,0.7) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: 8,
    textAlign: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
    letterSpacing: 1
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    marginTop: 2
  };

  const activeWords = cards.slice(0, 6);

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>情感色轮</div>
        <div style={subtitleStyle}>Emotion Color Wheel</div>
      </div>

      <svg width={size} height={size} style={{ marginTop: 6 }}>
        <defs>
          <filter id="wheelGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {Array.from({ length: segments }).map((_, i) => {
          const startAngle = i * segmentAngle;
          const endAngle = (i + 1) * segmentAngle;
          const midAngle = (startAngle + endAngle) / 2;
          const hueDeg = (midAngle * 360) / (2 * Math.PI);
          const usedCount = getUsedHueCount(hueDeg);
          const intensity = Math.min(0.25 + usedCount * 0.25, 1);
          const outerR = radius - 4;
          const innerR = innerRadius;

          const p1 = polarToCartesian(cx, cy, outerR, startAngle);
          const p2 = polarToCartesian(cx, cy, outerR, endAngle);
          const p3 = polarToCartesian(cx, cy, innerR, endAngle);
          const p4 = polarToCartesian(cx, cy, innerR, startAngle);
          const largeArcFlag = segmentAngle > Math.PI ? '1' : '0';

          const d = `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${p4.x} ${p4.y} Z`;

          return (
            <path
              key={i}
              d={d}
              fill={`hsla(${hueDeg}, 80%, 55%, ${intensity})`}
              stroke={`hsla(${hueDeg}, 80%, 70%, 0.3)`}
              strokeWidth={0.5}
              style={{ transition: 'fill 1s ease' }}
              filter={usedCount > 0 ? 'url(#wheelGlow)' : undefined}
            />
          );
        })}

        {EMOTION_WORDS.slice(0, 12).map((word, idx) => {
          const angle = ((word.hue % 360) * 2 * Math.PI) / 360 - Math.PI / 2;
          const r = innerRadius - 10;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          const used = cards.some((c) => c.word === word.word);
          return (
            <text
              key={idx}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fill={used ? `hsl(${word.hue}, 90%, 75%)` : 'rgba(255,255,255,0.5)'}
              fontWeight={used ? 700 : 400}
              style={{ transition: 'all 0.5s ease' }}
            >
              {word.word}
            </text>
          );
        })}

        <circle
          cx={cx}
          cy={cy}
          r={innerRadius - 22}
          fill="rgba(15,15,50,0.9)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />

        <text x={cx} y={cy - 10} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={11} fontWeight={600} letterSpacing={1}>
          已选
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#ffd700" fontSize={20} fontWeight={700}>
          {cards.length}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize={9} letterSpacing={2}>
          CARDS
        </text>
      </svg>

      <div style={{ marginTop: 14, width: '100%' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>
          画布词汇
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {activeWords.length === 0 ? (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>暂无</div>
          ) : (
            activeWords.map((card) => (
              <span
                key={card.id}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  fontSize: 11,
                  background: `hsla(${card.hue}, 80%, 50%, 0.2)`,
                  border: `1px solid hsla(${card.hue}, 80%, 60%, 0.3)`,
                  color: '#fff',
                  letterSpacing: 1
                }}
              >
                {card.word}
              </span>
            ))
          )}
          {cards.length > 6 && (
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 11,
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: 1
              }}
            >
              +{cards.length - 6}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmotionWheel;
