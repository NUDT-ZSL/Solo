import React from 'react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

const ITEMS = [
  { label: '主色填充', value: 72, color: 'primary' as const },
  { label: '辅色填充', value: 45, color: 'secondary' as const },
  { label: '强调色填充', value: 88, color: 'accent' as const },
];

export const ProgressDemo: React.FC<Props> = React.memo(function ProgressDemo({ colors }) {
  const textContrast = calculateContrast(colors.text, colors.background);
  const badgeOk = textContrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">进度条 Progress</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <div className="demo-progress" style={{ width: '100%' }}>
          {ITEMS.map((item) => (
            <React.Fragment key={item.label}>
              <div className="demo-progress__row" style={{ color: colors.text }}>
                <span>{item.label}</span>
                <span style={{ color: colors[item.color] }}>{item.value}%</span>
              </div>
              <div
                className="demo-progress__bar"
                style={{ backgroundColor: `${colors.secondary}22` }}
              >
                <div
                  className="demo-progress__fill"
                  style={{
                    width: `${item.value}%`,
                    backgroundColor: colors[item.color],
                  }}
                />
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </article>
  );
});

export default ProgressDemo;
