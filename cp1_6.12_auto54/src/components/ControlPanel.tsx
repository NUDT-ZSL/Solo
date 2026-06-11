import { useRef } from 'react';
import { ColorTheme, COLOR_THEMES } from './CloudCanvas';

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

  const gradient0 = colorTheme.gradient[0];
  const gradient1 = colorTheme.gradient[1];

  const speedPct = ((speedLevel - 1) / 9) * 100;
  const fontSizePct = ((maxFontSize - 20) / 40) * 100;

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
        {collapsed ? '»' : '«'}
      </button>

      {!collapsed && (
        <div style={{ paddingTop: '28px' }}>
          <div style={{ fontSize: '13px', color: 'rgba(230,235,255,0.55)', marginBottom: '4px'}}>
            {isListening ? '● 正在识别语音...' : '语音已停止'}
          </div>
          <div style={{
            fontSize: '20px',
            fontWeight: 900,
            fontFamily: '"ZCOOL KuaiLe","Noto Sans SC", sans-serif',
            letterSpacing: '0.05em',
            background: 'linear-gradient(90deg, ' + gradient0 + ', ' + gradient1 + ')',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Voice Cloud
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={card}>
          <span style={label}>调色板 · 颜色主题</span>
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
                      ? '0 0 0 3px rgba(255,255,255,0.22), 0 8px 22px ' + t.shadow + ')'
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={label}>文字消失速度</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: colorTheme.primary, fontFamily: '"ZCOOL KuaiLe", sans-serif'}}>
              Lv.{speedLevel}
            </span>
          </div>
          <div style={{ padding: '6px 0 0'}}>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={speedLevel}
              onChange={(e) => onSpeedChange(parseInt(e.target.value, 10))}
              style={{
                ...sliderTrackStyle,
                background: 'linear-gradient(90deg, ' + gradient0 + ' 0%, ' + gradient1 + ' ' + speedPct + '%, rgba(255,255,255,0.1) ' + speedPct + '%, rgba(255,255,255,0.1) 100%)',
              }}
              className={'wc-slider'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(230,235,255,0.45)', marginTop: '6px'}}>
              <span>慢</span><span>快</span>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
            <span style={label}>最大字号</span>
            <span style={{ fontSize: '20px', fontWeight: 800, color: colorTheme.primary, fontFamily: '"ZCOOL KuaiLe", sans-serif'}}>
              {maxFontSize}px
            </span>
          </div>
          <div style={{ padding: '6px 0 0'}}>
            <input
              type="range"
              min={20}
              max={60}
              step={1}
              value={maxFontSize}
              onChange={(e) => onFontSizeChange(parseInt(e.target.value, 10))}
              style={{
                ...sliderTrackStyle,
                background: 'linear-gradient(90deg, ' + gradient0 + ' 0%, ' + gradient1 + ' ' + fontSizePct + '%, rgba(255,255,255,0.1) ' + fontSizePct + '%, rgba(255,255,255,0.1) 100%)',
              }}
              className={'wc-slider'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(230,235,255,0.45)', marginTop: '6px'}}>
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
          title="启动/停止语音识别"
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
              : 'linear-gradient(135deg, ' + gradient0 + ', ' + gradient1 + ')',
            boxShadow: isListening
              ? '0 10px 28px rgba(255,80,100,0.55), 0 0 0 0 rgba(255,80,100,0.7)'
              : '0 8px 22px ' + colorTheme.shadow + ', 0 0 0 0 ' + colorTheme.primary + '55)',
            transition: 'transform .15s ease, box-shadow .15s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isListening ? 'wc-pulse-red 1.6s infinite' : undefined,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {collapsed ? (isListening ? '⏹' : '🎙') : (isListening ? '⏹ 停止识别' : '🎙 开始识别')}
        </button>
        {!collapsed && (
          <button
            onClick={() => fileRef.current?.click()}
            title="选择背景视频"
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
            <span>🎬</span>视频
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => fileRef.current?.click()}
            title="选择背景视频"
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
            🎬
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
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
