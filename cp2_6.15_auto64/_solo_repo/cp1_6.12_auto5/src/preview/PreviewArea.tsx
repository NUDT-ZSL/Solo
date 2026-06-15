import React, { useMemo } from 'react';
import { Menu, Eye, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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

  const primaryBg = useMemo(
    () => calculateContrast(colors.primary, colors.background),
    [colors.primary, colors.background]
  );
  const textBg = useMemo(
    () => calculateContrast(colors.text, colors.background),
    [colors.text, colors.background]
  );
  const primaryWhite = useMemo(
    () => calculateContrast('#ffffff', colors.primary),
    [colors.primary]
  );
  const accentWhite = useMemo(
    () => calculateContrast('#ffffff', colors.accent),
    [colors.accent]
  );

  const overallPass =
    primaryBg.passAA && textBg.passAA && primaryWhite.passAA && accentWhite.passAA;

  const issues: string[] = [];
  if (!primaryBg.passAA) issues.push(`主色/背景 ${primaryBg.ratio}:1`);
  if (!textBg.passAA) issues.push(`文字/背景 ${textBg.ratio}:1`);
  if (!primaryWhite.passAA) issues.push(`白字/主色 ${primaryWhite.ratio}:1`);
  if (!accentWhite.passAA) issues.push(`白字/强调色 ${accentWhite.ratio}:1`);

  return (
    <main className="preview-area">
      <header className="preview-area__header">
        <div>
          <h2
            className="preview-area__title"
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
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
                    全部对比度满足 WCAG AA
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
                    {issues.length} 项对比度不达标
                  </span>
                )}
              </>
            ) : (
              '正在加载配色数据…'
            )}
          </p>

          {!overallPass && issues.length > 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '12px 14px',
                background: 'rgba(255, 159, 67, 0.08)',
                border: '1px solid rgba(255, 159, 67, 0.25)',
                borderRadius: 12,
                fontSize: 12,
                color: 'var(--app-warning)',
                display: 'flex',
                gap: 10,
                animation: 'fadeIn 0.5s ease',
              }}
            >
              <AlertTriangle
                size={16}
                style={{ flexShrink: 0, marginTop: 1 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  无障碍对比度警告（WCAG AA 标准 ≥ 4.5:1）
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px 14px',
                    opacity: 0.9,
                  }}
                >
                  {issues.map((issue) => (
                    <span key={issue}>• {issue}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTheme?.comments && (
            <p
              style={{
                marginTop: 12,
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
              <Info
                size={14}
                style={{
                  display: 'inline',
                  verticalAlign: -2,
                  marginRight: 6,
                  color: 'var(--app-accent)',
                }}
              />
              {activeTheme.comments}
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
        <ButtonDemo
          primary={colors.primary}
          background={colors.background}
          text={colors.text}
          accent={colors.accent}
        />
        <CardDemo
          primary={colors.primary}
          secondary={colors.secondary}
          background={colors.background}
          text={colors.text}
          accent={colors.accent}
        />
        <NavBarDemo
          primary={colors.primary}
          secondary={colors.secondary}
          background={colors.background}
          text={colors.text}
        />
        <InputDemo
          primary={colors.primary}
          secondary={colors.secondary}
          background={colors.background}
          text={colors.text}
          accent={colors.accent}
        />
        <SidebarDemo
          primary={colors.primary}
          secondary={colors.secondary}
          background={colors.background}
          text={colors.text}
          accent={colors.accent}
        />
        <ProgressDemo
          primary={colors.primary}
          secondary={colors.secondary}
          background={colors.background}
          text={colors.text}
          accent={colors.accent}
        />
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
},
  (prev, next) =>
    prev.colors.primary === next.colors.primary &&
    prev.colors.secondary === next.colors.secondary &&
    prev.colors.background === next.colors.background &&
    prev.colors.text === next.colors.text &&
    prev.colors.accent === next.colors.accent &&
    prev.onOpenEditor === next.onOpenEditor
);

export default PreviewArea;
