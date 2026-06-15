import { useEffect, useRef, useState, useCallback } from 'react';
import CloudCanvas, { COLOR_THEMES, ColorTheme, CloudCanvasHandle } from './components/CloudCanvas';
import ControlPanel from './components/ControlPanel';
import { VoiceHandler } from './utils/voiceHandler';

type TextHistoryItem = { text: string; time: number; final: boolean };

export default function App() {
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [colorTheme, setColorTheme] = useState<ColorTheme>(COLOR_THEMES[0]);
  const [speedLevel, setSpeedLevel] = useState<number>(5);
  const [maxFontSize, setMaxFontSize] = useState<number>(40);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  });
  const [isTablet, setIsTablet] = useState<boolean>(false);
  const [recentTexts, setRecentTexts] = useState<TextHistoryItem[]>([]);
  const [hasBackdropFilter, setHasBackdropFilter] = useState<boolean>(true);

  const cloudRef = useRef<CloudCanvasHandle | null>(null);
  const voiceRef = useRef<VoiceHandler | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewport({ w, h });
      setIsTablet(w <= 1024);
    };
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (vv) vv.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    try {
      const ok = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
      setHasBackdropFilter(!!ok);
    } catch {
      setHasBackdropFilter(false);
    }
  }, []);

  useEffect(() => {
    voiceRef.current = new VoiceHandler({ lang: 'zh-CN' });
    voiceRef.current.onKeyword((kw) => {
      cloudRef.current && cloudRef.current.addKeyword(kw);
    });
    voiceRef.current.onFullText((text, isFinal) => {
      setRecentTexts((prev) => {
        const now = Date.now();
        let next = prev.filter((p) => now - p.time < 5000 && (p.final || now - p.time < 1500));
        next = next.filter((p) => p.final);
        next.push({ text, time: now, final: isFinal });
        if (next.length > 30) next = next.slice(-30);
        return next;
      });
    });
    voiceRef.current.onError((e) => {
      if (e && e.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('语音识别错误:', e.error, e.message || '');
      }
    });
    return () => {
      if (voiceRef.current) {
        voiceRef.current.destroy();
        voiceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setRecentTexts((prev) => {
        const now = Date.now();
        return prev.filter((p) => now - p.time < 5000 && (p.final || now - p.time < 1500));
      });
    }, 500);
    return () => clearInterval(t);
  }, []);

  const toggleListening = useCallback(async () => {
    const vh = voiceRef.current;
    if (!vh) return;
    if (vh.isActive()) {
      vh.stop();
      setIsListening(false);
    } else {
      try {
        await vh.start('zh-CN');
        setIsListening(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '请使用 Chrome/Edge 并允许麦克风权限';
        alert('启动语音识别失败: ' + msg);
        setIsListening(false);
      }
    }
  }, []);

  const onVideoSelect = useCallback((file: File) => {
    if (prevVideoUrlRef.current) {
      URL.revokeObjectURL(prevVideoUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    prevVideoUrlRef.current = url;
    setVideoSource(url);
  }, []);

  const recentTextDisplay = recentTexts
    .map((t) => t.text)
    .join(' \u00B7 ')
    .trim();

  const canvasWidth = viewport.w;
  const canvasHeight = viewport.h;
  const scrollbarHeight = 54;
  const tabletVideoHeight = Math.round(viewport.h * 0.6);

  const globalStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: videoSource ? '#000' : 'radial-gradient(ellipse at 30% 20%, #1a1f35 0%, #0a0c16 60%, #06070d 100%)',
    color: '#fff',
    fontFamily: '"Noto Sans SC", system-ui, sans-serif',
  };

  const videoContainerStyle: React.CSSProperties = isTablet
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: tabletVideoHeight,
        overflow: 'hidden',
        background: '#000',
        zIndex: 0,
      }
    : {
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#000',
        zIndex: 0,
      };

  const canvasAreaStyle: React.CSSProperties = isTablet
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: tabletVideoHeight,
        zIndex: 1,
      }
    : {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
      };

  return (
    <div style={globalStyle}>
      {videoSource ? (
        <div style={videoContainerStyle}>
          <video
            ref={videoRef}
            src={videoSource}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background:
              'radial-gradient(circle at 20% 30%, rgba(90,110,200,0.22), transparent 50%),' +
              'radial-gradient(circle at 80% 70%, rgba(200,90,140,0.18), transparent 55%),' +
              'radial-gradient(ellipse at 50% 110%, rgba(40,70,130,0.5), transparent 60%),' +
              'linear-gradient(180deg, #0c1022 0%, #06080f 100%)',
          }}
        />
      )}

      <div style={canvasAreaStyle}>
        <CloudCanvas
          ref={cloudRef}
          colorTheme={colorTheme}
          speedLevel={speedLevel}
          maxFontSize={maxFontSize}
          width={isTablet ? viewport.w : canvasWidth}
          height={isTablet ? tabletVideoHeight : canvasHeight}
        />
      </div>

      {isTablet && (
        <div
          style={{
            position: 'absolute',
            top: tabletVideoHeight,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(180deg, rgba(8,10,18,0.6) 0%, rgba(6,8,15,0.85) 40%, #06080f 100%)',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div style={{
            fontSize: '14px',
            color: 'rgba(230,235,255,0.4)',
            textAlign: 'center',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}>
            {isListening
              ? '\uD83C\uDFA4 \u6B63\u5728\u76D1\u542C\u8BED\u97F3\uFF0C\u8BF4\u8BDD\u5373\u53EF\u751F\u6210\u6587\u5B57\u4E91...'
              : '\u70B9\u51FB\u5E95\u90E8 \uD83C\uDFA4 \u5F00\u542F\u8BED\u97F3\u8BC6\u522B'}
          </div>
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: isTablet ? 0 : (panelCollapsed ? '88px' : '340px'),
          height: scrollbarHeight,
          zIndex: 20,
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          background: hasBackdropFilter
            ? 'linear-gradient(180deg, rgba(8,10,18,0.72) 0%, rgba(8,10,18,0.35) 70%, rgba(8,10,18,0) 100%)'
            : 'rgba(8,10,18,0.88)',
          backdropFilter: hasBackdropFilter ? 'blur(10px)' : undefined,
          WebkitBackdropFilter: hasBackdropFilter ? 'blur(10px)' : undefined,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          transition: 'right .35s cubic-bezier(.22,1,.36,1)',
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isListening ? '#ff5d6a' : 'rgba(255,255,255,0.3)',
            boxShadow: isListening ? '0 0 0 4px rgba(255,93,106,0.3), 0 0 18px rgba(255,93,106,0.8)' : 'none',
            marginRight: '12px',
            flexShrink: 0,
            animation: isListening ? 'wc-pulse-dot 1.4s infinite' : undefined,
          }}
        />
        <div
          className="wc-scroll-text"
          style={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            fontSize: '15px',
            fontWeight: 500,
            color: 'rgba(240,245,255,0.95)',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            letterSpacing: '0.02em',
            maskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent)',
          }}
        >
          <span
            className="wc-marquee"
            style={{
              display: 'inline-block',
              paddingLeft: '100%',
              whiteSpace: 'nowrap',
            }}
          >
            {recentTextDisplay || (isListening ? '\u6B63\u5728\u76D1\u542C\uFF0C\u5F00\u59CB\u8BF4\u8BDD\u5373\u53EF\u5B9E\u65F6\u751F\u6210\u6587\u5B57\u4E91\u2026' : '\u70B9\u51FB\u53F3\u4FA7 \uD83C\uDFA4 \u5F00\u542F\u8BED\u97F3\u8BC6\u522B\uFF0C\u4F53\u9A8C\u5B9E\u65F6\u52A8\u6001\u6587\u5B57\u4E91')}
          </span>
        </div>
      </div>

      {!isTablet && (
        <ControlPanel
          colorTheme={colorTheme}
          speedLevel={speedLevel}
          maxFontSize={maxFontSize}
          collapsed={panelCollapsed}
          isListening={isListening}
          onColorChange={setColorTheme}
          onSpeedChange={setSpeedLevel}
          onFontSizeChange={setMaxFontSize}
          onToggleCollapse={() => setPanelCollapsed((v) => !v)}
          onToggleListening={toggleListening}
          onVideoSelect={onVideoSelect}
        />
      )}

      {isTablet && (
        <div
          className="wc-tablet-drawer"
          style={{
            position: 'fixed',
            left: '0',
            right: '0',
            bottom: '0',
            zIndex: 30,
            maxHeight: '55vh',
            overflowY: 'auto',
            background: hasBackdropFilter
              ? 'linear-gradient(150deg, rgba(20,22,32,0.92), rgba(12,14,22,0.96))'
              : 'rgba(16,18,28,0.96)',
            backdropFilter: hasBackdropFilter ? 'blur(16px)' : undefined,
            WebkitBackdropFilter: hasBackdropFilter ? 'blur(16px)' : undefined,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '22px 22px 0 0',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.6)',
            padding: '16px 16px 20px',
            color: '#f2f4fb',
          }}
        >
          <div style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.2)',
            margin: '0 auto 14px',
          }} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '600px',
            margin: '0 auto',
          }}>
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}>
              <button
                onClick={toggleListening}
                style={{
                  flex: 1,
                  height: '48px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '16px',
                  fontFamily: '"Noto Sans SC", sans-serif',
                  color: isListening ? '#fff' : '#1a1d2b',
                  background: isListening
                    ? 'linear-gradient(135deg,#ff5d6a,#ff3b5c)'
                    : 'linear-gradient(135deg, ' + colorTheme.gradient[0] + ', ' + colorTheme.gradient[1] + ')',
                  boxShadow: isListening
                    ? '0 8px 24px rgba(255,80,100,0.5)'
                    : '0 6px 18px ' + colorTheme.shadow,
                  transition: 'all .15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isListening ? '\u23F9 \u505C\u6B62\u8BC6\u522B' : '\uD83C\uDFA4 \u5F00\u59CB\u8BC6\u522B'}
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*';
                  input.onchange = (e) => {
                    const f = (e.target as HTMLInputElement).files && (e.target as HTMLInputElement).files![0];
                    if (f) onVideoSelect(f);
                  };
                  input.click();
                }}
                style={{
                  height: '48px',
                  padding: '0 20px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.06)',
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
              >
                {'\uD83C\uDFAC \u89C6\u9891'}
              </button>
            </div>

            <div style={{
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}>
              {COLOR_THEMES.map((t) => {
                const active = t.name === colorTheme.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setColorTheme(t)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      border: active ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      background: 'linear-gradient(135deg, ' + t.gradient[0] + ', ' + t.gradient[1] + ')',
                      cursor: 'pointer',
                      transition: 'transform .15s ease',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />
                );
              })}
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'rgba(230,235,255,0.6)', marginBottom: '6px' }}>
                  {'\u6D88\u5931\u901F\u5EA6'} Lv.{speedLevel}
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={speedLevel}
                  onChange={(e) => setSpeedLevel(parseInt(e.target.value, 10))}
                  className="wc-slider"
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '999px',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(90deg, ' + colorTheme.gradient[0] + ' 0%, ' + colorTheme.gradient[1] + ' ' + ((speedLevel-1)/9*100) + '%, rgba(255,255,255,0.1) ' + ((speedLevel-1)/9*100) + '%, rgba(255,255,255,0.1) 100%)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'rgba(230,235,255,0.6)', marginBottom: '6px' }}>
                  {'\u5B57\u53F7'} {maxFontSize}px
                </div>
                <input
                  type="range"
                  min={20}
                  max={60}
                  step={1}
                  value={maxFontSize}
                  onChange={(e) => setMaxFontSize(parseInt(e.target.value, 10))}
                  className="wc-slider"
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '999px',
                    outline: 'none',
                    WebkitAppearance: 'none',
                    appearance: 'none',
                    cursor: 'pointer',
                    background: 'linear-gradient(90deg, ' + colorTheme.gradient[0] + ' 0%, ' + colorTheme.gradient[1] + ' ' + ((maxFontSize-20)/40*100) + '%, rgba(255,255,255,0.1) ' + ((maxFontSize-20)/40*100) + '%, rgba(255,255,255,0.1) 100%)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes wc-pulse-dot {
          0%,100% { box-shadow: 0 0 0 4px rgba(255,93,106,0.3), 0 0 18px rgba(255,93,106,0.8); }
          50%     { box-shadow: 0 0 0 8px rgba(255,93,106,0.1), 0 0 26px rgba(255,93,106,0.9); }
        }
        @keyframes wc-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-100%); }
        }
        .wc-marquee {
          animation: wc-marquee 22s linear infinite;
        }
        .wc-scroll-text:hover .wc-marquee {
          animation-play-state: paused;
        }
        .wc-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 10px rgba(0,0,0,0.45);
          transition: transform .15s ease;
        }
        .wc-slider:active::-webkit-slider-thumb {
          transform: scale(1.2);
          box-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 0 0 6px rgba(255,255,255,0.35);
        }
        .wc-slider::-moz-range-thumb {
          width: 20px; height: 20px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.9);
          box-shadow: 0 2px 10px rgba(0,0,0,0.45);
        }
      `}</style>
    </div>
  );
}
