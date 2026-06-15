import React, { useMemo } from 'react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

const NAV_ITEMS = ['首页', '作品', '文档', '团队'];

export const NavBarDemo: React.FC<Props> = React.memo(function NavBarDemo({
  primary,
  secondary,
  background,
  text,
}) {
  const textContrast = useMemo(
    () => calculateContrast(text, background),
    [text, background]
  );
  const ctaContrast = useMemo(
    () => calculateContrast('#ffffff', primary),
    [primary]
  );
  const badgeOk = textContrast.passAA && ctaContrast.passAA;

  const containerStyle = useMemo(
    () => ({
      '--c-primary': primary,
      '--c-secondary': secondary,
      '--c-background': background,
      '--c-text': text,
    } as React.CSSProperties),
    [primary, secondary, background, text]
  );

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">导航栏 NavBar</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
          title={
            badgeOk
              ? '对比度满足 WCAG AA'
              : `文字-背景 ${textContrast.ratio}:1 · 按钮-白 ${ctaContrast.ratio}:1`
          }
        >
          {badgeOk
            ? '✓ 对比度达标'
            : `⚠ 文字 ${textContrast.ratio}:1 / 按钮 ${ctaContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={containerStyle}>
        <nav
          className="demo-navbar"
          style={{
            backgroundColor: 'var(--c-background)',
            border: '1px solid color-mix(in srgb, var(--c-secondary) 14%, transparent)',
          }}
        >
          <span
            className="demo-navbar__brand"
            style={{ color: 'var(--c-primary)' }}
          >
            ColorLab
          </span>
          <div className="demo-navbar__links">
            {NAV_ITEMS.map((label, i) => (
              <span
                key={label}
                className={`demo-navbar__link ${
                  i === 0 ? 'demo-navbar__link--active' : ''
                }`}
                style={{
                  color: 'var(--c-text)',
                  backgroundColor:
                    i === 0
                      ? 'color-mix(in srgb, var(--c-primary) 10%, transparent)'
                      : 'transparent',
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
              backgroundColor: 'var(--c-primary)',
              color: '#fff',
            }}
          >
            立即开始
          </button>
        </nav>
      </div>
    </article>
  );
},
  (prev, next) =>
    prev.primary === next.primary &&
    prev.secondary === next.secondary &&
    prev.background === next.background &&
    prev.text === next.text
);

export default NavBarDemo;
