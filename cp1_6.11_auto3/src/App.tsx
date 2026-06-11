import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FlowerData,
  createFlower,
  updateFlower,
  renderFlowers,
  checkOverlapAndFade,
  cleanupFlowers,
  reduceParticleCount,
} from './ParticleFlower';

interface CanvasConfig {
  particleDensity: number;
  fadeDuration: number;
  backgroundColor: string;
  backgroundColorEnd: string;
}

interface FPSMonitor {
  frames: number;
  lastTime: number;
  currentFPS: number;
  lowFPSTriggered: boolean;
  degraded: boolean;
  linesDisabled: boolean;
  particleReductionLevel: number;
}

const DEFAULT_CONFIG: CanvasConfig = {
  particleDensity: 100,
  fadeDuration: 30,
  backgroundColor: '#E6DFD3',
  backgroundColorEnd: '#FFF8EC',
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flowersRef = useRef<FlowerData[]>([]);
  const configRef = useRef<CanvasConfig>({ ...DEFAULT_CONFIG });
  const fpsMonitorRef = useRef<FPSMonitor>({
    frames: 0,
    lastTime: performance.now(),
    currentFPS: 60,
    lowFPSTriggered: false,
    degraded: false,
    linesDisabled: false,
    particleReductionLevel: 0,
  });
  const inputBufferRef = useRef<string>('');
  const animationFrameRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(performance.now());
  const textPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [config, setConfig] = useState<CanvasConfig>({ ...DEFAULT_CONFIG });
  const [currentFPS, setCurrentFPS] = useState<number>(60);
  const [inputText, setInputText] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || window.matchMedia('(orientation: portrait)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const { backgroundColor, backgroundColorEnd } = configRef.current;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, backgroundColor);
    gradient.addColorStop(1, backgroundColorEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, []);

  const handleDegradation = useCallback((fps: number) => {
    const monitor = fpsMonitorRef.current;

    if (fps < 45 && !monitor.lowFPSTriggered) {
      monitor.lowFPSTriggered = true;
      monitor.degraded = true;
      console.warn(`[Performance] FPS dropped to ${fps.toFixed(1)}, applying degradation strategies`);

      if (!monitor.linesDisabled) {
        monitor.linesDisabled = true;
        console.log('[Performance] Disabled connection lines to reduce GPU load');
      }

      if (monitor.particleReductionLevel < 3) {
        monitor.particleReductionLevel++;
        const reductionRatio = 0.25 * monitor.particleReductionLevel;
        reduceParticleCount(flowersRef.current, reductionRatio);
        console.log(`[Performance] Reduced particle count by ${(reductionRatio * 100).toFixed(0)}%`);
      }
    } else if (fps >= 55 && monitor.lowFPSTriggered && monitor.degraded) {
      monitor.lowFPSTriggered = false;
    }
  }, []);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();
    const deltaTime = Math.min((now - lastUpdateRef.current) / 1000, 0.1);
    lastUpdateRef.current = now;

    const monitor = fpsMonitorRef.current;
    monitor.frames++;
    if (now - monitor.lastTime >= 1000) {
      monitor.currentFPS = monitor.frames * 1000 / (now - monitor.lastTime);
      setCurrentFPS(Math.round(monitor.currentFPS));
      handleDegradation(monitor.currentFPS);
      monitor.frames = 0;
      monitor.lastTime = now;
    }

    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    drawBackground(ctx, width, height);

    for (const flower of flowersRef.current) {
      updateFlower(flower, deltaTime, now);
    }

    checkOverlapAndFade(flowersRef.current, deltaTime);

    const showLines = !monitor.linesDisabled;
    renderFlowers(ctx, flowersRef.current, showLines);

    flowersRef.current = cleanupFlowers(flowersRef.current);

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [drawBackground, handleDegradation]);

  const spawnFlowerAt = useCallback((x: number, y: number, text: string) => {
    if (!text.trim()) return;
    const flower = createFlower(
      x,
      y,
      text,
      configRef.current.particleDensity,
      configRef.current.fadeDuration,
    );
    flowersRef.current.push(flower);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (inputBufferRef.current.trim()) {
      spawnFlowerAt(x, y, inputBufferRef.current.trim());
      inputBufferRef.current = '';
      setInputText('');
    } else {
      textPositionRef.current = { x, y };
    }
  }, [spawnFlowerAt]);

  const handleCanvasTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (inputBufferRef.current.trim()) {
      spawnFlowerAt(x, y, inputBufferRef.current.trim());
      inputBufferRef.current = '';
      setInputText('');
    } else {
      textPositionRef.current = { x, y };
    }
  }, [spawnFlowerAt]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (inputBufferRef.current.trim()) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          const x = textPositionRef.current.x || rect.width / 2;
          const y = textPositionRef.current.y || rect.height / 2;
          spawnFlowerAt(x, y, inputBufferRef.current.trim());
        }
        inputBufferRef.current = '';
        setInputText('');
      }
    } else if (e.key === 'Backspace') {
      inputBufferRef.current = inputBufferRef.current.slice(0, -1);
      setInputText(inputBufferRef.current);
    } else if (e.key.length === 1) {
      inputBufferRef.current += e.key;
      setInputText(inputBufferRef.current);
    }
  }, [spawnFlowerAt]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', setupCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [setupCanvas, renderLoop]);

  const saveAsJSON = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const workData = {
        flowers: flowersRef.current.map(f => ({
          id: f.id,
          x: f.x,
          y: f.y,
          text: f.text,
          hue: f.hue,
          emotion: f.emotion,
          createdAt: f.createdAt,
          particleCount: f.particles.filter(p => p.active).length,
        })),
        settings: configRef.current,
      };

      const response = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workData),
      });

      if (response.ok) {
        const result = await response.json();
        const blob = new Blob([JSON.stringify(workData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `word-light-${result.data.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
      console.error('Save failed:', err);
    }
    setTimeout(() => setSaveStatus(''), 2000);
  }, []);

  const saveAsPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `word-light-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleConfigChange = useCallback((key: keyof CanvasConfig, value: number | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const totalParticles = flowersRef.current.reduce(
    (sum, f) => sum + f.particles.filter(p => p.active).length,
    0,
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        background: `linear-gradient(135deg, ${config.backgroundColor} 0%, ${config.backgroundColorEnd} 100%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: isMobile ? '20px 10px 70px 10px' : '20px 80px 20px 20px',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: isMobile ? '95%' : '75%',
            height: isMobile ? 'calc(100% - 80px)' : '85%',
            boxShadow: '0 0 1px rgba(0,0,0,0.1), 0 4px 30px rgba(0,0,0,0.05)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              cursor: 'crosshair',
            }}
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouch}
          />

          {inputText && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: isMobile ? '30px' : '20px',
                transform: 'translateX(-50%)',
                fontFamily: "'Noto Serif SC', 'Songti SC', Georgia, serif",
                fontSize: '18px',
                color: 'rgba(80, 60, 40, 0.7)',
                background: 'rgba(255, 255, 255, 0.5)',
                padding: '8px 16px',
                borderRadius: '20px',
                backdropFilter: 'blur(5px)',
                WebkitBackdropFilter: 'blur(5px)',
                pointerEvents: 'none',
              }}
            >
              {inputText}
              <span style={{ opacity: 0.5, marginLeft: '4px' }}>_</span>
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              left: '12px',
              bottom: '12px',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '11px',
              color: 'rgba(0, 0, 0, 0.35)',
              pointerEvents: 'none',
            }}
          >
            {currentFPS} FPS · {flowersRef.current.length} 花 · {totalParticles} 粒子
            {fpsMonitorRef.current.degraded && (
              <span style={{ color: 'rgba(200, 100, 50, 0.7)', marginLeft: '8px' }}>
                · 性能模式
              </span>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              fontFamily: "'Noto Serif SC', serif",
              fontSize: '11px',
              color: 'rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
            }}
          >
            点击画布定位 · 打字输入 · Enter绽放
          </div>
        </div>
      </div>

      <div
        className="glass-panel"
        style={{
          position: isMobile ? 'fixed' : 'relative',
          [isMobile ? 'bottom' : 'right']: 0,
          [isMobile ? 'left' : 'top']: 0,
          width: isMobile ? '100%' : '60px',
          height: isMobile ? '50px' : '100vh',
          background: isMobile ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderLeft: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.5)',
          borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.5)' : 'none',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isMobile ? 'space-around' : 'flex-start',
          padding: isMobile ? '0 10px' : '16px 0',
          zIndex: 100,
          gap: isMobile ? '0' : '16px',
        }}
      >
        <SliderControl
          label="粒子"
          value={config.particleDensity}
          min={50}
          max={200}
          step={10}
          vertical={!isMobile}
          onChange={(v) => handleConfigChange('particleDensity', v)}
          formatValue={(v) => `${v}`}
        />

        <SliderControl
          label="凋零"
          value={config.fadeDuration}
          min={15}
          max={60}
          step={5}
          vertical={!isMobile}
          onChange={(v) => handleConfigChange('fadeDuration', v)}
          formatValue={(v) => `${v}s`}
        />

        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          alignItems: 'center',
          gap: isMobile ? '6px' : '4px',
        }}>
          <span style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '10px',
            color: 'rgba(80, 60, 40, 0.6)',
            writingMode: isMobile ? 'horizontal-tb' : 'vertical-rl',
          }}>
            背景
          </span>
          <input
            type="color"
            value={config.backgroundColor}
            onChange={(e) => handleConfigChange('backgroundColor', e.target.value)}
            style={{
              width: isMobile ? '28px' : '24px',
              height: isMobile ? '28px' : '24px',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              background: 'transparent',
              padding: 0,
            }}
          />
        </div>

        <button
          onClick={saveAsJSON}
          title="保存 JSON"
          style={{
            width: isMobile ? '34px' : '36px',
            height: isMobile ? '34px' : '36px',
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-out',
            boxShadow: saveStatus === 'saving' ? '0 0 12px rgba(255, 255, 255, 0.8)' : 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 255, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          💾
        </button>

        <button
          onClick={saveAsPNG}
          title="保存 PNG"
          style={{
            width: isMobile ? '34px' : '36px',
            height: isMobile ? '34px' : '36px',
            border: 'none',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease-out',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(255, 255, 255, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          🖼️
        </button>

        {saveStatus && (
          <div style={{
            position: 'absolute',
            [isMobile ? 'top' : 'right']: isMobile ? '-30px' : '70px',
            [isMobile ? 'left' : 'top']: isMobile ? '50%' : '50%',
            transform: isMobile ? 'translateX(-50%)' : 'translateY(-50%)',
            fontFamily: "'Noto Serif SC', serif",
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            background: saveStatus === 'success' ? 'rgba(100, 200, 100, 0.9)' :
                        saveStatus === 'error' ? 'rgba(200, 100, 100, 0.9)' : 'rgba(200, 200, 200, 0.9)',
            color: '#fff',
            whiteSpace: 'nowrap',
          }}>
            {saveStatus === 'success' ? '已保存 ✓' : saveStatus === 'error' ? '保存失败 ✗' : '保存中...'}
          </div>
        )}
      </div>
    </div>
  );
};

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  vertical?: boolean;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

const SliderControl: React.FC<SliderControlProps> = ({
  label,
  value,
  min,
  max,
  step,
  vertical = false,
  onChange,
  formatValue = (v) => `${v}`,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: vertical ? '6px' : '8px',
    }}>
      <span style={{
        fontFamily: "'Noto Serif SC', serif",
        fontSize: '10px',
        color: 'rgba(80, 60, 40, 0.6)',
        writingMode: vertical ? 'vertical-rl' : 'horizontal-tb',
      }}>
        {label}
      </span>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            writingMode: vertical ? 'vertical-lr' : 'horizontal-tb',
            direction: vertical ? 'rtl' : 'ltr',
            width: vertical ? '6px' : '80px',
            height: vertical ? '100px' : '6px',
            WebkitAppearance: 'slider-vertical',
            appearance: vertical ? 'slider-vertical' : 'auto',
            accentColor: 'rgba(180, 140, 90, 0.8)',
            cursor: 'pointer',
          }}
        />
      </div>
      <span style={{
        fontFamily: 'system-ui, sans-serif',
        fontSize: '9px',
        color: 'rgba(80, 60, 40, 0.5)',
        minWidth: vertical ? '24px' : 'auto',
        textAlign: 'center',
      }}>
        {formatValue(value)}
      </span>
    </div>
  );
};

export default App;
