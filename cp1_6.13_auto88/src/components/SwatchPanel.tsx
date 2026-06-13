import { memo, useMemo } from 'react';
import '../styles/SwatchPanel.css';

interface SwatchPanelProps {
  colors: string[];
}

const SWATCH_LABELS = ['主色', '辅色', '强调色', '背景色', '文字色'];

function SwatchPanelComponent({ colors }: SwatchPanelProps) {
  const colorVars = useMemo(() => {
    return colors.map((color, index) => ({
      ['--swatch-color-' + index]: color,
    } as React.CSSProperties)).reduce((acc, cur) => ({ ...acc, ...cur }), {});
  }, [colors]);

  return (
    <div className="swatch-panel" style={colorVars}>
      <div className="swatch-grid">
        {colors.map((color, index) => (
          <div key={index} className="swatch-card">
            <div
              className={`swatch-color swatch-color-${index}`}
              data-color={color}
            />
            <div className="swatch-info">
              <span className="swatch-label">{SWATCH_LABELS[index]}</span>
              <span className="swatch-hex">{color.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export const SwatchPanel = memo(SwatchPanelComponent);
