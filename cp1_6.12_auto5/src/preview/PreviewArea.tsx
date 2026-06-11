import React from 'react';
import { Menu, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ThemeColors } from '@/store/types';
import { useThemeStore } from '@/store/useThemeStore';
import { calculateContrast } from '@/utils/contrastCheck';
import { ButtonDemo } from './components/ButtonDemo';
import { CardDemo } from './components/CardDemo';
import { NavBarDemo } from './components/NavBarDemo';
import { InputDemo } from './components/InputDemo';
import { SidebarDemo } from './components/SidebarDemo';
import { ProgressDemo } from './components/ProgressDemo';

interface Props {
  colors: ThemeColors;
  onOpenEditor: () => void;
}

export const PreviewArea: React.FC<Props> = React.memo(function PreviewArea({
  colors,
  onOpenEditor,
}) {
  const activeTheme = useThemeStore((s) => s.getActiveTheme());

  const primaryBgContrast = calculateContrast(colors.primary, colors.background);
  const textBgContrast = calculateContrast(colors.text, colors.background);
  const primaryOnWhite = calculateContrast('#ffffff', colors.primary);

  const overallPass =
    primaryBgContrast.passAA &&
    textBgContrast.passAA &&
    primaryOnWhite.passAA;

  return (
    <main className="preview-area">
      <header className="preview-area__header">
        <div>
          <h2 className="preview-area__title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Eye size={22} style={{ color: 'var(--app-accent)' }} />
            实时预览
            {activeTheme?.comments && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: 'rgba(124,92,255,0.12)',
                  color: 'var(--app-fg-dim)',
                  marginLeft: 8,
                }}
              >
                💬 含注释
              </span>
            )}
          </h2>
          <p className="preview-area__subtitle">
            {activeTheme ? (
              <>
                当前主题：
                <strong style={{ color: 'var(--app-fg)', fontWeight: 600 }}>
                  {activeTheme.name}
                </strong>
                {'  ·  '}
                {overallPass ? (
                  <span
                    style={{
                      color: 'var(--app-success)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={14} />
                    无障碍对比度全部达标
                  </span>
                ) : (
                  <span
                    style={{
                      color: 'var(--app-warning)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <AlertTriangle size={14} />
                    存在对比度问题（主色-背景 {primaryBgContrast.ratio}:1 ·
                    文字-背景 {textBgContrast.ratio}:1 · 白-主色{' '}
                    {primaryOnWhite.ratio}:1，需 ≥ 4.5:1）
                  </span>
                )}
              </>
            ) : (
              '正在加载配色数据…'
            )}
          </p>
          {activeTheme?.comments && (
            <p
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--app-border)',
                borderRadius: 12,
                fontSize: 13,
                color: 'var(--app-fg-dim)',
                lineHeight: 1.6,
                borderLeft: '3px solid var(--app-accent)',
              }}
            >
              📝 {activeTheme.comments}
            </p>
          )}
        </div>
        <button
          type="button"
          className="preview-area__menu-btn"
          onClick={onOpenEditor}
          aria-label="打开编辑面板"
        >
          <Menu size={20} />
        </button>
      </header>

      <section className="preview-grid">
        <ButtonDemo colors={colors} />
        <CardDemo colors={colors} />
        <NavBarDemo colors={colors} />
        <InputDemo colors={colors} />
        <SidebarDemo colors={colors} />
        <ProgressDemo colors={colors} />
      </section>

      <footer
        style={{
          marginTop: 'auto',
          paddingTop: 24,
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--app-fg-dim)',
          opacity: 0.6,
        }}
      >
        ColorCollab Studio · 多主题配色协作编辑器 · WCAG 2.1 AA 标准
      </footer>
    </main>
  );
});

export default PreviewArea;
