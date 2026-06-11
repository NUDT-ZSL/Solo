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

  const cloudRef = useRef<CloudCanvasHandle | null>(null);
  const voiceRef = useRef<VoiceHandler | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const prevVideoUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const onResize = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setIsTablet(window.innerWidth <= 1024);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    voiceRef.current = new VoiceHandler({ lang: 'zh-CN' });
    voiceRef.current.onKeyword((kw) => {
      cloudRef.current?.addKeyword(kw);
    });
    voiceRef.current.onFullText((text, isFinal) => {
      setRecentTexts((prev) => {
        const now = Date.now();
        let next = prev.filter((p) => now - p.time < 5000 && (p.final || now - p.time < 1500));
        next = next.filter((p) => !(p.final === false));
        next.push({ text, time: now, final: isFinal });
        if (next.length > 30) next = next.slice(-30);
        return next;
      });
    });
    voiceRef.current.onError((e) => {
      if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('语音识别错误:', e.error, e.message || '');
      }
    });
    return () => {
      voiceRef.current?.destroy();
      voiceRef.current = null;
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
      } catch (err: any) {
        alert('启动语音识别失败: ' + (err?.message || '请使用 Chrome/Edge 并允许麦克风权限'));
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
    .join(' · ')
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

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
        }}
      >
        <CloudCanvas
          ref={cloudRef}
          colorTheme={colorTheme}
          speedLevel={speedLevel}
          maxFontSize={maxFontSize}
          width={canvasWidth}
          height={canvasHeight}
        />
      </div>

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
          background: 'linear-gradient(180deg, rgba(8,10,18,0.72) 0%, rgba(8,10,18,0.35) 70%, rgba(8,10,18,0) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
            {recentTextDisplay || (isListening ? '正在聆听，开始说话即可实时生成文字云…' : '点击右下角🎙 开启语音识别，体验实时动态文字云')}
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
          style={{
            position: 'fixed',
            left: '12px',
            right: '12px',
            bottom: '12px',
            zIndex: 30,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(150deg, rgba(20,22,32,0.85), rgba(12,14,22,0.92))',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '20px',
              padding: '14px 14px 16px',
              boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
            }}
          >
            <ControlPanel
              colorTheme={colorTheme}
              speedLevel={speedLevel}
              maxFontSize={maxFontSize}
              collapsed={false}
              isListening={isListening}
              onColorChange={setColorTheme}
              onSpeedChange={setSpeedLevel}
              onFontSizeChange={setMaxFontSize}
              onToggleCollapse={() => {}}
              onToggleListening={toggleListening}
              onVideoSelect={onVideoSelect}
            />
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
      `}</style>
    </div>
  );
}
