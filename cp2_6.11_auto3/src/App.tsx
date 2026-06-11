import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Save, Image, FileJson, Sparkles } from 'lucide-react';
import {
  createFlower,
  updateFlower,
  renderFlower,
  destroyFlower,
  FlowerData,
  FlowerSettings,
  Particle,
} from './ParticleFlower';

interface WordLabel {
  id: string;
  x: number;
  y: number;
  word: string;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  const flowersRef = useRef<Map<string, FlowerData>>(new Map());
  const wordLabelsRef = useRef<Map<string, WordLabel>>(new Map());

  const [particleDensity, setParticleDensity] = useState<number>(125);
  const [fadeDuration, setFadeDuration] = useState<number>(30);
  const [backgroundColor, setBackgroundColor] = useState<string>('#f3ecdd');
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: '', show: false });
  const [currentInput, setCurrentInput] = useState('');

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: '', show: false }), 2200);
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (now: number) => {
      const dt = Math.min(50, now - lastTimeRef.current);
      lastTimeRef.current = now;

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const allFlowers = Array.from(flowersRef.current.values());

      for (const flower of allFlowers) {
        updateFlower(flower, now, dt, allFlowers);
        renderFlower(ctx, flower, flowersRef.current);
      }

      const toRemove: string[] = [];
      for (const flower of allFlowers) {
        if (flower.isDead) {
          toRemove.push(flower.id);
        }
      }
      for (const id of toRemove) {
        const flower = flowersRef.current.get(id);
        if (flower) {
          destroyFlower(flower);
          flowersRef.current.delete(id);
          wordLabelsRef.current.delete(id);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  const spawnFlower = useCallback(
    (clientX: number, clientY: number, word: string) => {
      const canvas = canvasRef.current;
      const wrapper = canvasWrapperRef.current;
      if (!canvas || !wrapper) return;

      const rect = wrapper.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

      const settings: FlowerSettings = {
        particleDensity,
        fadeDuration,
      };

      const id = uuidv4();
      const flower = createFlower(id, x, y, word, settings);
      flowersRef.current.set(id, flower);

      wordLabelsRef.current.set(id, { id, x, y, word });
      setCursorPos({ x, y });
    },
    [particleDensity, fadeDuration]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const wrapper = canvasWrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setCursorPos({ x, y });
      setIsTyping(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
    },
    []
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const val = (e.target as HTMLInputElement).value.trim();
        if (val && cursorPos) {
          const wrapper = canvasWrapperRef.current;
          if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            spawnFlower(cursorPos.x + rect.left, cursorPos.y + rect.top, val);
          }
        }
        (e.target as HTMLInputElement).value = '';
        setCurrentInput('');
        if (e.key === 'Enter') {
          setIsTyping(false);
        }
      } else if (e.key === 'Escape') {
        setIsTyping(false);
        (e.target as HTMLInputElement).value = '';
        setCurrentInput('');
      }
    },
    [cursorPos, spawnFlower]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentInput(e.target.value);
  }, []);

  const saveAsJSON = useCallback(async () => {
    const allFlowers = Array.from(flowersRef.current.values());
    const serializable = allFlowers.map((f) => ({
      id: f.id,
      x: f.x,
      y: f.y,
      word: f.word,
      baseHue: f.baseHue,
      maxRadius: f.maxRadius,
      birthTime: f.birthTime,
      particles: f.particles
        .filter((p: Particle) => p.active && p.life > 0.05)
        .map((p: Particle) => ({
          x: p.x,
          y: p.y,
          radius: p.radius,
          color: p.color,
          alpha: p.alpha * p.life,
          life: p.life,
        })),
    }));

    const payload = {
      flowers: serializable,
      settings: {
        particleDensity,
        fadeDuration,
        backgroundColor,
      },
    };

    try {
      const res = await fetch('/api/works', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ciguang-${data.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('作品已保存 JSON');
      } else {
        showToast('服务器保存失败，已下载本地');
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ciguang-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ciguang-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已保存 JSON 到本地');
    }
    setShowSaveMenu(false);
  }, [particleDensity, fadeDuration, backgroundColor, showToast]);

  const saveAsPNG = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = canvasWrapperRef.current;
    if (!canvas || !wrapper) return;

    const tempCanvas = document.createElement('canvas');
    const rect = wrapper.getBoundingClientRect();
    tempCanvas.width = rect.width;
    tempCanvas.height = rect.height;
    const tctx = tempCanvas.getContext('2d');
    if (!tctx) return;

    tctx.fillStyle = backgroundColor;
    tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tctx.drawImage(canvas, 0, 0, rect.width, rect.height);

    for (const label of wordLabelsRef.current.values()) {
      const flower = flowersRef.current.get(label.id);
      const alpha = flower ? Math.min(flower.bloomProgress, flower?.isFading ? 1 - (performance.now() - flower.fadeStartTime) / flower.fadeDuration : 1) : 1;
      if (alpha <= 0.1) continue;
      tctx.save();
      tctx.globalAlpha = Math.max(0.15, alpha) * 0.4;
      tctx.font = '600 14px "Noto Serif SC", serif';
      tctx.textAlign = 'center';
      tctx.textBaseline = 'middle';
      tctx.fillStyle = '#5a4630';
      tctx.fillText(label.word, label.x, label.y);
      tctx.restore();
    }

    const dataUrl = tempCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ciguang-${Date.now()}.png`;
    a.click();
    showToast('已保存 PNG 截图');
    setShowSaveMenu(false);
  }, [backgroundColor, showToast]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `linear-gradient(135deg, #E6DFD3 0%, ${backgroundColor} 100%)`,
        position: 'relative',
        transition: 'background 0.6s ease',
      }}
    >
      <div className="app-title">词光速写</div>
      <div className="app-subtitle">LIGHT · POEM · PARTICLE</div>

      <div
        className="canvas-wrapper"
        ref={canvasWrapperRef}
        style={{
          background: `linear-gradient(145deg, ${backgroundColor}ee 0%, ${backgroundColor}cc 100%)`,
        }}
      >
        <canvas ref={canvasRef} className="canvas-area" />

        <div className="input-layer" onClick={handleCanvasClick}>
          {Array.from(wordLabelsRef.current.values()).map((label) => {
            const flower = flowersRef.current.get(label.id);
            if (!flower) return null;
            let opacity = Math.min(0.45, flower.bloomProgress * 0.5);
            if (flower.isFading) {
              const p = (performance.now() - flower.fadeStartTime) / flower.fadeDuration;
              opacity *= Math.max(0, 1 - p);
            }
            return (
              <div
                key={label.id}
                className="word-label"
                style={{
                  left: label.x,
                  top: label.y,
                  opacity,
                  display: opacity < 0.03 ? 'none' : 'block',
                }}
              >
                {label.word}
              </div>
            );
          })}

          {isTyping && cursorPos && (
            <>
              <div
                className="typing-cursor"
                style={{
                  left: cursorPos.x + (currentInput.length * 7),
                  top: cursorPos.y,
                }}
              />
              <input
                ref={inputRef}
                className="hidden-input"
                onKeyDown={handleInputKeyDown}
                onChange={handleInputChange}
                autoFocus
                value={currentInput}
              />
            </>
          )}
        </div>
      </div>

      <div className="hint">点击画布定位 · 输入字词绽放光影 · 按空格连续创作 · Enter完成</div>

      <div className="sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-section">
          <span className="sidebar-label">粒子密度 {particleDensity}</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={50}
              max={200}
              value={particleDensity}
              onChange={(e) => setParticleDensity(parseInt(e.target.value))}
              className="slider-vertical"
            />
          </div>
        </div>

        <div className="divider" />

        <div className="sidebar-section">
          <span className="sidebar-label">凋零时长 {fadeDuration}s</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={15}
              max={60}
              value={fadeDuration}
              onChange={(e) => setFadeDuration(parseInt(e.target.value))}
              className="slider-vertical"
            />
          </div>
        </div>

        <div className="divider" />

        <div className="sidebar-section">
          <span className="sidebar-label">背景色</span>
          <div className="color-picker-btn" style={{ background: backgroundColor }}>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
            />
          </div>
        </div>

        <div className="divider" />

        <div className="sidebar-section" style={{ position: 'relative' }}>
          <span className="sidebar-label">保存</span>
          <button
            className="save-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowSaveMenu((v) => !v);
            }}
          >
            <Save strokeWidth={1.8} />
          </button>

          {showSaveMenu && (
            <div className="save-menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={saveAsPNG}>
                <Image size={14} strokeWidth={1.8} /> PNG 截图
              </button>
              <button onClick={saveAsJSON}>
                <FileJson size={14} strokeWidth={1.8} /> JSON 作品
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`toast ${toast.show ? 'show' : ''}`}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} />
          {toast.msg}
        </span>
      </div>
    </div>
  );
}
