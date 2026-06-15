import React, { useState, useCallback } from 'react';

export interface CardContent {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface CardStyle {
  backgroundColor: string;
  textColor: string;
  glowColor: string;
  gridRow: string;
  gridColumn: string;
  score: number;
}

interface AdaptiveCardProps {
  content: CardContent;
  style: CardStyle;
  previousScore: number;
  onClick: (id: number) => void;
  onMouseEnter: (id: number) => void;
  onMouseLeave: (id: number) => void;
}

const AdaptiveCard: React.FC<AdaptiveCardProps> = ({
  content,
  style,
  previousScore,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [floatNumbers, setFloatNumbers] = useState<number[]>([]);
  const [shouldGlow, setShouldGlow] = useState(false);

  React.useEffect(() => {
    if (previousScore !== style.score && previousScore >= 0) {
      setShouldGlow(true);
      const timer = setTimeout(() => setShouldGlow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [style.score, previousScore]);

  const handleClick = useCallback(() => {
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 300);

    const floatId = Date.now();
    setFloatNumbers(prev => [...prev, floatId]);
    setTimeout(() => {
      setFloatNumbers(prev => prev.filter(id => id !== floatId));
    }, 1500);

    onClick(content.id);
  }, [content.id, onClick]);

  const cssVars: React.CSSProperties & Record<string, string> = {
    '--glow-color': style.glowColor + '99',
    '--bg-color': style.backgroundColor,
    '--text-color': style.textColor,
  } as React.CSSProperties & Record<string, string>;

  return (
    <div
      className="adaptive-card"
      style={{
        ...cssVars,
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        gridRow: style.gridRow,
        gridColumn: style.gridColumn,
        transition: 'all 0.8s ease-in-out',
        boxShadow: shouldGlow
          ? `0 4px 24px ${style.glowColor}80`
          : '0 4px 12px rgba(0,0,0,0.1)',
        animation: shouldGlow ? 'pulse-glow 0.5s ease-in-out' : undefined,
      }}
      onClick={handleClick}
      onMouseEnter={() => onMouseEnter(content.id)}
      onMouseLeave={() => onMouseLeave(content.id)}
    >
      <div
        className="card-inner"
        style={{
          transform: isPressed ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.3s ease-in-out',
        }}
      >
        <div className="card-icon" style={{ fontSize: '32px', marginBottom: '12px' }}>
          {content.icon}
        </div>
        <h3
          className="card-title"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            marginBottom: '8px',
            letterSpacing: '-0.01em',
          }}
        >
          {content.title}
        </h3>
        <p
          className="card-description"
          style={{
            fontSize: '15px',
            lineHeight: 1.5,
            opacity: 0.85,
          }}
        >
          {content.description}
        </p>
      </div>

      {floatNumbers.map(id => (
        <span
          key={id}
          className="float-number"
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            fontSize: '14px',
            fontWeight: 700,
            color: style.glowColor,
            animation: 'float-up 1.5s ease-out forwards',
            pointerEvents: 'none',
          }}
        >
          +1
        </span>
      ))}
    </div>
  );
};

export default AdaptiveCard;
