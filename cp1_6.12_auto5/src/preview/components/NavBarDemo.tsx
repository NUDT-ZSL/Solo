import React from 'react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

export const NavBarDemo: React.FC<Props> = React.memo(function NavBarDemo({ colors }) {
  const textContrast = calculateContrast(colors.text, colors.background);
  const ctaContrast = calculateContrast('#ffffff', colors.primary);
  const badgeOk = textContrast.passAA && ctaContrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">导航栏 NavBar</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <nav
          className="demo-navbar"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.secondary}22`,
          }}
        >
          <span className="demo-navbar__brand" style={{ color: colors.primary }}>
            ColorLab
          </span>
          <div className="demo-navbar__links">
            {['首页', '作品', '文档', '团队'].map((label, i) => (
              <span
                key={label}
                className={`demo-navbar__link ${
                  i === 0 ? 'demo-navbar__link--active' : ''
                }`}
                style={{
                  color: colors.text,
                  backgroundColor:
                    i === 0 ? `${colors.primary}18` : 'transparent',
                }}
              >
                {label}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="demo-navbar__cta"
            style={{
              backgroundColor: colors.primary,
              color: '#ffffff',
            }}
          >
            立即开始
          </button>
        </nav>
      </div>
    </article>
  );
});

export default NavBarDemo;
