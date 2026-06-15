import { memo, useState, useEffect, useMemo } from 'react';
import '../styles/SwatchPanel.css';

interface SwatchPanelProps {
  colors: string[];
}

interface SingleSwatchProps {
  color: string;
  label: string;
  index: number;
}

const SWATCH_LABELS = ['主色', '辅色', '强调色', '背景色', '文字色'];

function SingleSwatch({ color, label, index }: SingleSwatchProps) {
  const [displayColor, setDisplayColor] = useState(color);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setDisplayColor(color);
    });
    return () => cancelAnimationFrame(rafId);
  }, [color]);

  return (
    <div className="swatch-card" key={`card-${index}`}>
      <div
        className="swatch-color"
        style={{ backgroundColor: displayColor }}
      />
      <div className="swatch-info">
        <span className="swatch-label">{label}</span>
        <span className="swatch-hex">{displayColor.toUpperCase()}</span>
      </div>
    </div>
  );
}

const MemoizedSwatch = memo(SingleSwatch);

function SwatchPanelComponent({ colors }: SwatchPanelProps) {
  const memoizedColors = useMemo(() => colors, [colors]);

  return (
    <div className="swatch-panel">
      <div className="swatch-grid">
        {memoizedColors.map((color, index) => (
          <MemoizedSwatch
            key={index}
            index={index}
            color={color}
            label={SWATCH_LABELS[index]}
          />
        ))}
      </div>
    </div>
  );
}

export const SwatchPanel = memo(SwatchPanelComponent);
