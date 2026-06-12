import { useRef, useState, useEffect } from 'react';
import { ColorTheme, COLOR_THEMES } from './CloudCanvas';
import { easeInOutQuad } from '../utils/easing';

interface ControlPanelProps {
  colorTheme: ColorTheme;
  speedLevel: number;
  maxFontSize: number;
  collapsed: boolean;
  isListening: boolean;
  onColorChange: (theme: ColorTheme) => void;
  onSpeedChange: (level: number) => void;
  onFontSizeChange: (size: number) => void;
  onToggleCollapse: () => void;
  onToggleListening: () => void;
  onVideoSelect: (file: File) => void;
}

export default function ControlPanel({
  colorTheme,
  speedLevel,
  maxFontSize,
  collapsed,
  isListening,
  onColorChange,
  onSpeedChange,
  onFontSizeChange,
  onToggleCollapse,
  onToggleListening,
  onVideoSelect,
}: ControlPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [displayPrimary, setDisplayPrimary] = useState(colorTheme.primary);
  const [_displayAccent, setDisplayAccent] = useState(colorTheme.accent);
  const [displayShadow, setDisplayShadow] = useState(colorTheme.shadow);
  const [displayG0, setDisplayG0] = useState(colorTheme.gradient[0]);
  const [displayG1, setDisplayG1] = useState(colorTheme.gradient[1]);

  const prevThemeRef = useRef<ColorTheme>(colorTheme);
  const transStartRef = useRef<number>(0);
  const transRafRef = useRef<number | null>(null);
  const lastDisplayRef = useRef({
    primary: colorTheme.primary,
    accent: colorTheme.accent,
    shadow: colorTheme.shadow,
    g0: colorTheme.gradient[0],
    g1: colorTheme.gradient[1],
  });

  useEffect(() => {
    if (prevThemeRef.current.name === colorTheme.name) return;

    const from = { ...prevThemeRef.current };
    const to = colorTheme;
    prevThemeRef.current = colorTheme;
    transStartRef.current = performance.now();

    const hexToRgb = (hex: string): [number, number, number] => {
      const h = hex.replace('#', '');
      return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
    };
    const lerpC = (c1: string, c2: string, t: number): string => {
      const [r1, g1, b1] = hexToRgb(c1);
      const [r2, g2, b2] = hexToRgb(c2);
      return 'rgb(' + Math.round(r1 + (r2 - r1) * t) + ',' + Math.round(g1 + (g2 - g1) * t) + ',' + Math.round(b1 + (b2 - b1) * t) + ')';
    };
    const lerpS = (s1: string, s2: string, t: number): string => {
      const p = /rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/;
      const m1 = s1.match(p);
      const m2 = s2.match(p);
      if (!m1 || !m2) return s1;
      const r = Math.round(+m1[1] + (+m2[1] - +m1[1]) * t);
      const g = Math.round(+m1[2] + (+m2[2] - +m1[2]) * t);
      const b = Math.round(+m1[3] + (+m2[3] - +m1[3]) * t);
      const a = (+ (m1[4] ?? '1') + (+(m2[4] ?? '1') - +(m1[4] ?? '1')) * t).toFixed(2);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    };

    const duration = 500;
    const ld = lastDisplayRef.current;
    const animate = (now: number) => {
      const elapsed = now - transStartRef.current;
      const prog = Math.min(1, elapsed / duration);
      const eased = easeInOutQuad(prog);

      const newPrimary = lerpC(from.primary, to.primary, eased);
      const newAccent = lerpC(from.accent, to.accent, eased);
      const newShadow = lerpS(from.shadow, to.shadow, eased);
      const newG0 = lerpC(from.gradient[0], to.gradient[0], eased);
      const newG1 = lerpC(from.gradient[1], to.gradient[1], eased);

      if (newPrimary !== ld.primary) { ld.primary = newPrimary; setDisplayPrimary(newPrimary); }
      if (newAccent !== ld.accent) { ld.accent = newAccent; setDisplayAccent(newAccent); }
      if (newShadow !== ld.shadow) { ld.shadow = newShadow; setDisplayShadow(newShadow); }
      if (newG0 !== ld.g0) { ld.g0 = newG0; setDisplayG0(newG0); }
      if (newG1 !== ld.g1) { ld.g1 = newG1; setDisplayG1(newG1); }

      if (prog < 1) {
        transRafRef.current = requestAnimationFrame(animate);
      }
    };
    if (transRafRef.current) cancelAnimationFrame(transRafRef.current);
    transRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (transRafRef.current) cancelAnimationFrame(transRafRef.current);
    };
  }, [colorTheme]);

  const panelBase: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    right: collapsed ? '16px' : '20px',
    transform: 'translateY(-50%)',
    width: collapsed ? '56px' : '300px',
    transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
    background: 'linear-gradient(150deg, rgba(20,22,32,0.72), rgba(12,14,22,0.82))',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: collapsed ? '20px' : '22px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
    padding: collapsed ? '14px 10px' : '18px 18px 16px',
    zIndex: 30,
    display: 'flex',
    flexDirection: 'column',
    gap: collapsed ? '14px' : '16px',
    color: '#f2f4fb',
    fontFamily: '"Noto Sans SC", system-ui, sans-serif',
    overflow: 'hidden',
  };

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: collapsed ? '10px 8px' : '12px 14px',
  };

  const label: React.CSSProperties = {
    fontSize: '12px',
    color: 'rgba(230,235,255,0.8)',
    letterSpacing: '0.04em',
    marginBottom: '10px',
    display: 'block',
    fontWeight: 600,
  };

  const sliderTrackStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '999px',
    position: 'relative',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  };

  const speedPct = ((speedLevel - 1) / 9) * 100;
  const fontSizePct = ((maxFontSize - 20) / 40) * 100;

  const speedBg = 'linear-gradient(90deg, ' + displayG0 + ' 0%, ' + displayG1 + ' ' + speedPct + '%, rgba(255,255,255,0.1) ' + speedPct + '%, rgba(255,255,255,0.1) 100%)';
  const fontBg = 'linear-gradient(90deg, ' + displayG0 + ' 0%, ' + displayG1 + ' ' + fontSizePct + '%, rgba(255,255,255,0.1) ' + fontSizePct + '%, rgba(255,255,255,0.1) 100%)';

  return (
    <div style={panelBase}>
      <button
        onClick={onToggleCollapse}
        title={collapsed ? '展开控制面板' : '折叠控制面板'}
        style={{
          position: collapsed ? 'relative' : 'absolute',
          top: collapsed ? undefined : '14px',
          right: collapsed ? undefined : '14px',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.15)',
          background: 'rgba(255,255,255,0.06)',
          color: '#eaf0ff',
          cursor: 'pointer',
          transition: 'all .2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: collapsed ? 'center' : undefined,
          fontSize: '16px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      >
        {collapsed ? '\u00BB' : '\u00AB'}
      </button>

      {!collapsed && (
        <div style={{ paddingTop: '28px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(230,235,255,0.55)', marginBottom: '4px' }}>
            {isListening ? '\u25CF 正在识别语音...' : '语音已停止'}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 900,
            fontFamily: '"ZCOOL KuaiLe","Noto Sans SC", sans-serif',
            letterSpacing: '0.05em',
            background: 'linear-gradient(90deg, ' + displayG0 + ', ' + displayG1 + ')',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            transition: 'background 0.5s ease',
          }}>
            Voice Cloud
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={card}>
          <span style={label}>{'\u8C03\u8272\u677F \u00B7 \u989C\u8272\u4E3B\u9898'} ({COLOR_THEMES.length}\u79CD)</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {COLOR_THEMES.map((t) => {
              const active = t.name === colorTheme.name;
              const g0 = t.gradient[0];
              const g1 = t.gradient[1];
              return (
                <button
                  key={t.name}
                  onClick={() => onColorChange(t)}
                  title={t.name}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: '12px',
                    border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    background: 'linear-gradient(135deg, ' + g0 + ' 0%, ' + g1 + ' 100%)',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'transform .18s ease, box-shadow .18s ease, border-color .2s ease',
                    transform: active ? 'scale(1.06)' : 'scale(1)',
                    boxShadow: active
                      ? '0 0 0 3px rgba(255,255,255,0.22), 0 8px 22px ' + t.shadow
                      : 'inset 0 1px 0 rgba(255,255,255,0.3)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = active ? 'scale(1.06)' : 'scale(1)'; }}
                />
              );
            })}
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={label}>{'\u6587\u5B57\u6D88\u5931\u901F\u5EA6'}</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: displayPrimary, fontFamily: '"ZCOOL KuaiLe", sans-serif', transition: 'color 0.5s ease' }}>
              Lv.{speedLevel}
            </span>
          </div>
          <div style={{ padding: '6px 0 0' }}>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={speedLevel}
              onChange={(e) => onSpeedChange(parseInt(e.target.value, 10))}
              style={{ ...sliderTrackStyle, background: speedBg }}
              className="wc-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(230,235,255,0.45)', marginTop: '6px' }}>
              <span>{'\u6162'}</span><span>{'\u5FEB'}</span>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={label}>{'\u6700\u5927\u5B57\u53F7'}</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: displayPrimary, fontFamily: '"ZCOOL KuaiLe", sans-serif', transition: 'color 0.5s ease' }}>
              {maxFontSize}px
            </span>
          </div>
          <div style={{ padding: '6px 0 0' }}>
            <input
              type="range"
              min={20}
              max={60}
              step={1}
              value={maxFontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
              style={{ ...sliderTrackStyle, background: fontBg }}
              className="wc-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(230,235,255,0.45)', marginTop: '6px' }}>
              <span>20</span><span>60</span>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        gap: collapsed ? '10px' : '12px',
        marginTop: collapsed ? 'auto' : '0',
        paddingTop: collapsed ? '0' : '4px',
      }}>
        <button
          onClick={onToggleListening}
          title={isListening ? '\u505C\u6B62\u8BC6\u522B' : '\u5F00\u59CB\u8BC6\u522B'}
          style={{
            flex: collapsed ? undefined : 1,
            height: collapsed ? '48px' : '44px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: collapsed ? '18px' : '15px',
            fontFamily: '"Noto Sans SC", sans-serif',
            color: isListening ? '#fff' : '#1a1d2b',
            background: isListening
              ? 'linear-gradient(135deg,#ff5d6a,#ff3b5c)'
              : 'linear-gradient(135deg, ' + displayG0 + ', ' + displayG1 + ')',
            boxShadow: isListening
              ? '0 10px 28px rgba(255,80,100,0.55)'
              : '0 8px 22px ' + displayShadow,
            transition: 'transform .15s ease, box-shadow .15s ease, background 0.5s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isListening ? 'wc-pulse-red 1.6s infinite' : undefined,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {collapsed ? (isListening ? '\u23F9' : '\uD83C\uDFA4') : (isListening ? '\u23F9 \u505C\u6B62\u8BC6\u522B' : '\uD83C\uDFA4 \u5F00\u59CB\u8BC6\u522B')}
        </button>
        {!collapsed && (
          <button
            onClick={() => fileRef.current?.click()}
            title={'\u9009\u62E9\u80CC\u666F\u89C6\u9891'}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '15px',
              fontFamily: '"Noto Sans SC", sans-serif',
              color: '#f2f4fb',
              transition: 'all .15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
          >
            <span>{'\uD83C\uDFAC'}</span>{'\u89C6\u9891'}
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => fileRef.current?.click()}
            title={'\u9009\u62E9\u80CC\u666F\u89C6\u9891'}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              color: '#f2f4fb',
              alignSelf: 'center',
              fontSize: '16px',
            }}
          >
            {'\uD83C\uDFAC'}
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f) onVideoSelect(f);
          e.target.value = '';
        }}
      />

      <style>{`
        .wc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 10px rgba(0,0,0,0.45), 0 0 0 0 rgba(255,255,255,0.7);
          transition: transform .15s ease, box-shadow .15s ease;
        }
        .wc-slider:active::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 6px rgba(255,255,255,0.35);
          animation: wc-pulse-thumb .55s ease-out 1;
        }
        .wc-slider::-moz-range-thumb {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 10px rgba(0,0,0,0.45);
        }
        @keyframes wc-pulse-thumb {
          0%   { box-shadow: 0 2px 10px rgba(0,0,0,0.55), 0 0 0 0 rgba(255,255,255,0.7); }
          100% { box-shadow: 0 2px 10px rgba(0,0,0,0.55), 0 0 0 10px rgba(255,255,255,0); }
        }
        @keyframes wc-pulse-red {
          0%,100% { box-shadow: 0 10px 28px rgba(255,80,100,0.55), 0 0 0 0 rgba(255,80,100,0.7); }
          50%     { box-shadow: 0 10px 28px rgba(255,80,100,0.65), 0 0 0 8px rgba(255,80,100,0); }
        }
      `}</style>
    </div>
  );
}
