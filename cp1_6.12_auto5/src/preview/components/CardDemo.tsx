import React from 'react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

export const CardDemo: React.FC<Props> = React.memo(function CardDemo({ colors }) {
  const contrast = calculateContrast(colors.text, colors.background);
  const badgeOk = contrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">卡片 Card</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ 文字 ${contrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <div
          className="demo-card"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.secondary}33`,
            color: colors.text,
          }}
        >
          <div
            className="demo-card__thumb"
            style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
            }}
          />
          <h4 className="demo-card__title" style={{ color: colors.text }}>
            产品设计规格卡片
          </h4>
          <p className="demo-card__desc" style={{ color: colors.text }}>
            基于当前主题配色方案生成的卡片组件示例，用于展示主视觉层级与信息密度。
          </p>
          <div className="demo-card__foot">
            <span
              className="demo-card__tag"
              style={{ backgroundColor: `${colors.secondary}22`, color: colors.secondary }}
            >
              配色示例
            </span>
            <span
              style={{
                color: colors.primary,
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
});

export default CardDemo;
