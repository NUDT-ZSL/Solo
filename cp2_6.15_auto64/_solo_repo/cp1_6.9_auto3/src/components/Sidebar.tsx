import React, { useMemo } from 'react';
import {
  ShapeType,
  ColorTheme,
  GeometricConfig,
  THEME_PALETTES
} from '../utils/geometry';

interface SidebarProps {
  config: GeometricConfig;
  onShapeTypesChange: (types: ShapeType[]) => void;
  onThemeChange: (theme: ColorTheme) => void;
  onDensityChange: (density: number) => void;
  onSave: () => void;
  pngDataUrl: string | null;
  shareDataUri: string | null;
  onClearLinks: () => void;
}

const SHAPES: Array<{ key: ShapeType; label: string; icon: JSX.Element }> = [
  {
    key: 'triangle',
    label: '三角形',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12,3 21,20 3,20" />
      </svg>
    )
  },
  {
    key: 'square',
    label: '方形',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" transform="rotate(0 12 12)" />
      </svg>
    )
  },
  {
    key: 'hexagon',
    label: '六边形',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <polygon points="12,3 21,7.5 21,16.5 12,21 3,16.5 3,7.5" />
      </svg>
    )
  }
];

const THEMES: ColorTheme[] = ['aurora', 'lava', 'deepsea', 'flower'];

const Sidebar: React.FC<SidebarProps> = ({
  config,
  onShapeTypesChange,
  onThemeChange,
  onDensityChange,
  onSave,
  pngDataUrl,
  shareDataUri,
  onClearLinks
}) => {
  const sidebarBg = useMemo(() => {
    const p = THEME_PALETTES[config.colorTheme];
    return `linear-gradient(160deg, hsla(${p.sidebarTint}, 35%, 14%, 0.88), hsla(${(p.sidebarTint + 25) % 360}, 25%, 10%, 0.9))`;
  }, [config.colorTheme]);

  const accentColor = useMemo(() => {
    const p = THEME_PALETTES[config.colorTheme];
    return `hsl(${p.baseHues[0]}, 75%, 62%)`;
  }, [config.colorTheme]);

  const toggleShape = (t: ShapeType) => {
    const exists = config.shapeTypes.includes(t);
    if (exists) {
      const next = config.shapeTypes.filter(s => s !== t);
      if (next.length === 0) return;
      onShapeTypesChange(next);
    } else {
      onShapeTypesChange([...config.shapeTypes, t]);
    }
  };

  const copyShareLink = async () => {
    if (!shareDataUri) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}#s=${encodeURIComponent(shareDataUri)}`;
      await navigator.clipboard.writeText(url);
      alert('分享链接已复制到剪贴板！');
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 10,
    display: 'block',
    letterSpacing: 0.5
  };
  const chipBase: React.CSSProperties = {
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#CCCCCC',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
  };
  const activeChip: React.CSSProperties = {
    borderColor: accentColor,
    background: `${accentColor}22`,
    color: accentColor,
    boxShadow: `0 0 14px ${accentColor}33`
  };

  return (
    <aside
      style={{
        width: 280,
        minWidth: 280,
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 10,
        background: sidebarBg,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '28px 22px',
        overflowY: 'auto',
        boxShadow: '8px 0 24px rgba(0,0,0,0.3)'
      }}
    >
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: 'monospace',
            fontSize: 22,
            fontWeight: 700,
            background: `linear-gradient(120deg, ${accentColor}, hsl(${(THEME_PALETTES[config.colorTheme].baseHues[THEME_PALETTES[config.colorTheme].baseHues.length - 1])}, 80%, 70%))`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 1,
            marginBottom: 4
          }}
        >
          碎彩几何
        </h1>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#888888', letterSpacing: 0.5 }}>
          FRACTAL · GEOMETRY
        </p>
      </header>

      <section style={sectionStyle}>
        <label style={labelStyle}>◆ 形状选择</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SHAPES.map(s => {
            const active = config.shapeTypes.includes(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggleShape(s.key)}
                style={{
                  ...chipBase,
                  ...(active ? activeChip : {}),
                  padding: '9px 12px',
                  transform: 'translateY(0)',
                  boxShadow: active ? activeChip.boxShadow : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  if (!active) (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                {s.icon}
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <label style={labelStyle}>◆ 颜色主题</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {THEMES.map(t => {
            const p = THEME_PALETTES[t];
            const active = config.colorTheme === t;
            const grad = `linear-gradient(135deg, hsl(${p.baseHues[0]}, 75%, 58%), hsl(${p.baseHues[p.baseHues.length - 1]}, 75%, 62%))`;
            return (
              <button
                key={t}
                onClick={() => onThemeChange(t)}
                style={{
                  ...chipBase,
                  padding: 0,
                  overflow: 'hidden',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 0,
                  transform: 'translateY(0)',
                  borderColor: active ? accentColor : 'rgba(255,255,255,0.1)'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.45)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = active ? `0 0 14px ${accentColor}44` : 'none';
                }}
              >
                <div style={{ height: 28, background: grad }} />
                <div
                  style={{
                    padding: '7px 10px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: active ? accentColor : '#CCCCCC',
                    textAlign: 'center',
                    background: active ? `${accentColor}14` : 'transparent'
                  }}
                >
                  {p.displayName}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>◆ 形状密度</label>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: accentColor, fontWeight: 600 }}>
            {config.density}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={config.density}
          onChange={e => onDensityChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 6,
            borderRadius: 8,
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
            background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${(config.density - 1) * 11.11}%, rgba(255,255,255,0.08) ${(config.density - 1) * 11.11}%, rgba(255,255,255,0.08) 100%)`,
            cursor: 'pointer'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>稀疏</span>
          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>密集</span>
        </div>
      </section>

      <section style={{ ...sectionStyle, borderBottom: 'none', marginBottom: 0, paddingBottom: 0 }}>
        <label style={labelStyle}>◆ 导出保存</label>
        <button
          onClick={onSave}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            fontFamily: 'monospace',
            fontSize: 14,
            fontWeight: 600,
            color: '#0D0D0D',
            cursor: 'pointer',
            letterSpacing: 1,
            background: `linear-gradient(120deg, ${accentColor}, hsl(${(THEME_PALETTES[config.colorTheme].baseHues[THEME_PALETTES[config.colorTheme].baseHues.length - 1] + 30) % 360}, 80%, 65%))`,
            transition: 'all 0.2s ease-in-out',
            transform: 'translateY(0)',
            boxShadow: `0 4px 18px ${accentColor}55`
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 28px ${accentColor}77`;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 18px ${accentColor}55`;
          }}
        >
          ⬇ 保存当前图案
        </button>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#666666', marginTop: 10, lineHeight: 1.6 }}>
          提示：悬停形状高亮 · 单击爆裂粒子<br />
          双击空白区可全部重组归位
        </p>
      </section>

      {(pngDataUrl || shareDataUri) && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            width: 300,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(20, 20, 24, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            zIndex: 100,
            fontFamily: 'monospace',
            color: '#CCCCCC'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: accentColor }}>✦ 图案已导出</span>
            <button
              onClick={onClearLinks}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#888',
                width: 22,
                height: 22,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14
              }}
            >×</button>
          </div>
          {pngDataUrl && (
            <a
              href={pngDataUrl}
              download={`fractal-geometry-${Date.now()}.png`}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: 8,
                background: `${accentColor}22`,
                border: `1px solid ${accentColor}66`,
                color: accentColor,
                fontSize: 13,
                textDecoration: 'none',
                textAlign: 'center',
                marginBottom: 8,
                transition: 'all 0.2s'
              }}
            >
              ⬇ 下载 PNG (1920×1080)
            </a>
          )}
          {shareDataUri && (
            <button
              onClick={copyShareLink}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#CCCCCC',
                fontFamily: 'monospace',
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              🔗 复制分享链接
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
