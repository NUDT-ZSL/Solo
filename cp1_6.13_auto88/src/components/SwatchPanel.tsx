import '../styles/SwatchPanel.css';

interface SwatchPanelProps {
  colors: string[];
}

const SWATCH_LABELS = ['主色', '辅色', '强调色', '背景色', '文字色'];

export function SwatchPanel({ colors }: SwatchPanelProps) {
  return (
    <div className="swatch-panel">
      <div className="swatch-grid">
        {colors.map((color, index) => (
          <div key={index} className="swatch-card">
            <div
              className="swatch-color"
              style={{ backgroundColor: color }}
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
