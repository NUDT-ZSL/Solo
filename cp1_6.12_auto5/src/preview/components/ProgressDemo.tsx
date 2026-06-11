import React, { useMemo } from 'react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

const ITEMS = [
  { label: '主色填充', value: 72, color: 'primary' as const },
  { label: '辅色填充', value: 45, color: 'secondary' as const },
  { label: '强调色填充', value: 88, color: 'accent' as const },
];

export const ProgressDemo: React.FC<Props> = React.memo(function ProgressDemo({
  primary,
  secondary,
  background,
  text,
  accent,
}) {
  const textContrast = useMemo(
    () => calculateContrast(text, background),
    [text, background]
  );

  const containerStyle = useMemo(
    () => ({
      '--c-primary': primary,
      '--c-secondary': secondary,
      '--c-background': background,
      '--c-text': text,
      '--c-accent': accent,
    } as React.CSSProperties),
    [primary, secondary, background, text, accent]
  );

  const fillColor = (k: 'primary' | 'secondary' | 'accent') => {
    if (k === 'primary') return 'var(--c-primary)';
    if (k === 'secondary') return 'var(--c-secondary)';
    return 'var(--c-accent)';
  };

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">进度条 Progress</h3>
        <span
          className={`preview-card__badge ${
            textContrast.passAA
              ? 'preview-card__badge--ok'
              : 'preview-card__badge--warn'
          }`}
          title={`文字对比度 ${textContrast.ratio}:1`}
        >
          {textContrast.passAA
            ? '✓ 文字对比度达标'
            : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={containerStyle}>
        <div className="demo-progress" style={{ width: '100%' }}>
          {ITEMS.map((item) => (
            <React.Fragment key={item.label}>
              <div
                className="demo-progress__row"
                style={{ color: 'var(--c-text)' }}
              >
                <span>{item.label}</span>
                <span style={{ color: fillColor(item.color) }}>
                  {item.value}%
                </span>
              </div>
              <div
                className="demo-progress__bar"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--c-secondary) 14%, transparent)',
                }}
              >
                <div
                  className="demo-progress__fill"
                  style={{
                    width: `${item.value}%`,
                    backgroundColor: fillColor(item.color),
                  }}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </article>
  );
},
  (prev, next) =>
    prev.primary === next.primary &&
    prev.secondary === next.secondary &&
    prev.background === next.background &&
    prev.text === next.text &&
    prev.accent === next.accent
);

export default ProgressDemo;
