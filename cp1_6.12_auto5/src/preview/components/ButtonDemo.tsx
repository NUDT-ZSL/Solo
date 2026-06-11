import React from 'react';
import { Rocket } from 'lucide-react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

export const ButtonDemo: React.FC<Props> = React.memo(function ButtonDemo({ colors }) {
  const contrast = calculateContrast(colors.text, colors.background);
  const primaryContrast = calculateContrast('#ffffff', colors.primary);
  const badgeOk = contrast.passAA && primaryContrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">按钮 Button</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
          title={
            badgeOk
              ? '对比度满足 WCAG AA'
              : `文字对比度 ${contrast.ratio}:1 · 按钮对比度 ${primaryContrast.ratio}:1`
          }
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ ${contrast.ratio}:1 / ${primaryContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          <button
            type="button"
            className="demo-btn"
            style={{
              backgroundColor: colors.primary,
              color: '#ffffff',
              boxShadow: `0 4px 14px ${colors.primary}55`,
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
              color: colors.text,
              border: `1.5px solid ${colors.primary}`,
            }}
          >
            次要按钮
          </button>
          <button
            type="button"
            className="demo-btn"
            style={{
              backgroundColor: colors.accent,
              color: '#ffffff',
              boxShadow: `0 4px 14px ${colors.accent}55`,
            }}
          >
            强调操作
          </button>
        </div>
      </div>
    </article>
  );
});

export default ButtonDemo;
