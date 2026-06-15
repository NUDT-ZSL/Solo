import React, { useMemo } from 'react';
import { Rocket } from 'lucide-react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  background: string;
  text: string;
  accent: string;
}

export const ButtonDemo: React.FC<Props> = React.memo(function ButtonDemo({
  primary,
  background,
  text,
  accent,
}) {
  const textBgContrast = useMemo(
    () => calculateContrast(text, background),
    [text, background]
  );
  const primaryWhiteContrast = useMemo(
    () => calculateContrast('#ffffff', primary),
    [primary]
  );
  const accentWhiteContrast = useMemo(
    () => calculateContrast('#ffffff', accent),
    [accent]
  );

  const allPass =
    textBgContrast.passAA &&
    primaryWhiteContrast.passAA &&
    accentWhiteContrast.passAA;

  const containerStyle = useMemo(
    () => ({
      '--c-primary': primary,
      '--c-secondary': text,
      '--c-background': background,
      '--c-text': text,
      '--c-accent': accent,
    } as React.CSSProperties),
    [primary, background, text, accent]
  );

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">按钮 Button</h3>
        <span
          className={`preview-card__badge ${
            allPass ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
          title={
            allPass
              ? '全部对比度满足 WCAG AA (≥4.5:1)'
              : `文字-背景 ${textBgContrast.ratio}:1 · 主色-白 ${primaryWhiteContrast.ratio}:1 · 强调色-白 ${accentWhiteContrast.ratio}:1`
          }
        >
          {allPass ? '✓ 对比度达标' : `⚠ 最低 ${Math.min(
            textBgContrast.ratio,
            primaryWhiteContrast.ratio,
            accentWhiteContrast.ratio
          ).toFixed(2)}:1`}
        </span>
      </header>
      <div
        className="demo-stage"
        style={containerStyle}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            className="demo-btn"
            style={{
              backgroundColor: 'var(--c-primary)',
              color: '#fff',
              boxShadow: '0 4px 14px color-mix(in srgb, var(--c-primary) 40%, transparent)',
            }}
          >
            <Rocket size={16} />
            主要按钮
          </button>
          <button
            type="button"
            className="demo-btn"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--c-text)',
              border: '1.5px solid var(--c-primary)',
            }}
          >
            次要按钮
          </button>
          <button
            type="button"
            className="demo-btn"
            style={{
              backgroundColor: 'var(--c-accent)',
              color: '#fff',
              boxShadow: '0 4px 14px color-mix(in srgb, var(--c-accent) 40%, transparent)',
            }}
          >
            强调操作
          </button>
        </div>
      </div>
    </article>
  );
},
  (prev, next) =>
    prev.primary === next.primary &&
    prev.background === next.background &&
    prev.text === next.text &&
    prev.accent === next.accent
);

export default ButtonDemo;
