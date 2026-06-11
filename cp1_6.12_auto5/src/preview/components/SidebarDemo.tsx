import React from 'react';
import type { ThemeColors } from '@/store/types';
import { calculateContrast } from '@/utils/contrastCheck';

interface Props {
  colors: ThemeColors;
}

const NAV_ITEMS = [
  { label: '仪表盘', active: true, dot: 'primary' },
  { label: '项目管理', active: false, dot: 'secondary' },
  { label: '成员协作', active: false, dot: 'accent' },
  { label: '数据统计', active: false, dot: 'primary' },
  { label: '系统设置', active: false, dot: 'secondary' },
] as const;

export const SidebarDemo: React.FC<Props> = React.memo(function SidebarDemo({ colors }) {
  const textContrast = calculateContrast(colors.text, colors.background);
  const badgeOk = textContrast.passAA;

  return (
    <article className="preview-card">
      <header className="preview-card__head">
        <h3 className="preview-card__title">侧边栏 Sidebar</h3>
        <span
          className={`preview-card__badge ${
            badgeOk ? 'preview-card__badge--ok' : 'preview-card__badge--warn'
          }`}
        >
          {badgeOk ? '✓ 对比度达标' : `⚠ 文字 ${textContrast.ratio}:1`}
        </span>
      </header>
      <div className="demo-stage" style={{ backgroundColor: colors.background }}>
        <aside
          className="demo-sidebar"
          style={{
            backgroundColor: colors.background,
            border: `1px solid ${colors.secondary}22`,
          }}
        >
          <div className="demo-sidebar__head" style={{ borderColor: `${colors.secondary}33` }}>
            <div
              className="demo-sidebar__avatar"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
              }}
            />
            <div className="demo-sidebar__user">
              <span className="demo-sidebar__name" style={{ color: colors.text }}>
                设计师 Aria
              </span>
              <span className="demo-sidebar__email" style={{ color: colors.text }}>
                aria@colorlab.io
              </span>
            </div>
          </div>
          {NAV_ITEMS.map((item) => (
            <div
              key={item.label}
              className="demo-sidebar__item"
              style={{
                color: colors.text,
                backgroundColor: item.active ? `${colors.primary}16` : 'transparent',
                fontWeight: item.active ? 600 : 500,
              }}
            >
              <span
                className="demo-sidebar__dot"
                style={{
                  backgroundColor: colors[item.dot as keyof ThemeColors],
                }}
              />
              {item.label}
            </div>
          ))}
        </aside>
      </div>
    </article>
  );
});

export default SidebarDemo;
