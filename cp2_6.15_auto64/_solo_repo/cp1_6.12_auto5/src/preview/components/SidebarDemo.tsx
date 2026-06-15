import React, { useMemo } from 'react';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
}

const NAV_ITEMS = [
  { label: '仪表盘', active: true, dot: 'primary' as const },
  { label: '项目管理', active: false, dot: 'secondary' as const },
  { label: '成员协作', active: false, dot: 'accent' as const },
  { label: '数据统计', active: false, dot: 'primary' as const },
  { label: '系统设置', active: false, dot: 'secondary' as const },
];

export const SidebarDemo: React.FC<Props> = React.memo(function SidebarDemo({
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

  const dotColor = (k: 'primary' | 'secondary' | 'accent') => {
    if (k === 'primary') return 'var(--c-primary)';
    if (k === 'secondary') return 'var(--c-secondary)';
    return 'var(--c-accent)';
  };

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">侧边栏 Sidebar</h3>
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
        <aside
          className="demo-sidebar"
          style={{
            backgroundColor: 'var(--c-background)',
            border: '1px solid color-mix(in srgb, var(--c-secondary) 14%, transparent)',
          }}
        >
          <div
            className="demo-sidebar__head"
            style={{
              borderColor:
                'color-mix(in srgb, var(--c-secondary) 20%, transparent)',
            }}
          >
            <div
              className="demo-sidebar__avatar"
              style={{
                background:
                  'linear-gradient(135deg, var(--c-primary), var(--c-accent))',
              }}
            />
            <div className="demo-sidebar__user">
              <span
                className="demo-sidebar__name"
                style={{ color: 'var(--c-text)' }}
              >
                设计师 Aria
              </span>
              <span
                className="demo-sidebar__email"
                style={{ color: 'var(--c-text)' }}
              >
                aria@colorlab.io
              </span>
            </div>
          </div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="demo-sidebar__item"
              style={{
                color: 'var(--c-text)',
                backgroundColor: item.active
                  ? 'color-mix(in srgb, var(--c-primary) 9%, transparent)'
                  : 'transparent',
                fontWeight: item.active ? 600 : 500,
              }}
            >
              <span
                className="demo-sidebar__dot"
                style={{ backgroundColor: dotColor(item.dot) }}
              />
              {item.label}
            </div>
          ))}
        </aside>
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

export default SidebarDemo;
