import React, { useMemo } from 'react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

export const CardDemo: React.FC<Props> = React.memo(function CardDemo({
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

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">卡片 Card</h3>
        <span
          className={`preview-card__badge ${
            textContrast.passAA
              ? 'preview-card__badge--ok'
              : 'preview-card__badge--warn'
          }`}
          title={`文字对比度 ${textContrast.ratio}:1，WCAG AA 要求 ≥4.5:1`}
        >
          {textContrast.passAA
            ? '✓ 文字对比度达标'
            : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={containerStyle}>
        <div
          className="demo-card"
          style={{
            backgroundColor: 'var(--c-background)',
            border: '1px solid color-mix(in srgb, var(--c-secondary) 20%, transparent)',
            color: 'var(--c-text)',
          }}
        >
          <div
            className="demo-card__thumb"
            style={{
              background:
                'linear-gradient(135deg, var(--c-primary), var(--c-accent))',
            }}
          />
          <h4 className="demo-card__title" style={{ color: 'var(--c-text)' }}>
            产品设计规格卡片
          </h4>
          <p className="demo-card__desc" style={{ color: 'var(--c-text)' }}>
            基于当前主题配色方案生成的卡片组件示例，用于展示主视觉层级与信息密度。
          </p>
          <div className="demo-card__foot">
            <span
              className="demo-card__tag"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--c-secondary) 14%, transparent)',
                color: 'var(--c-secondary)',
              }}
            >
              配色示例
            </span>
            <span
              style={{
                color: 'var(--c-primary)',
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              查看详情 →
            </span>
          </div>
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

export default CardDemo;
