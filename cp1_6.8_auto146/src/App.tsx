import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CharState, TextAnimator } from './TextAnimator';
import ControlPanel from './ControlPanel';

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  phase: number;
}

const PARTICLE_COUNT = 50;

function createParticles(width: number, height: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 2,
    speed: 0.15 + Math.random() * 0.35,
    opacity: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
  }));
}

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [startColor, setStartColor] = useState('#ff6b6b');
  const [endColor, setEndColor] = useState('#4ecdc4');
  const [speed, setSpeed] = useState(600);
  const [charSpacing, setCharSpacing] = useState(4);

  const animatorRef = useRef<TextAnimator | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleRafRef = useRef<number | null>(null);

  const handleAnimatorUpdate = useCallback((states: CharState[]) => {
    setCharStates(states);
  }, []);

  useEffect(() => {
    const animator = new TextAnimator(handleAnimatorUpdate);
    animatorRef.current = animator;
    return () => {
      animator.stop();
    };
  }, [handleAnimatorUpdate]);

  useEffect(() => {
    if (!animatorRef.current) return;
    animatorRef.current.updateOptions({
      startColor,
      endColor,
      duration: speed,
      charSpacing,
    });
  }, [startColor, endColor, speed, charSpacing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (text.trim() && animatorRef.current) {
      animatorRef.current.start(text);
    } else {
      setCharStates([]);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
      particlesRef.current = createParticles(window.innerWidth, window.innerHeight);
    };

    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    const drawParticles = (timestamp: number) => {
      const dt = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
      lastTime = timestamp;

      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y -= p.speed * dt * 30;
        p.x += Math.sin(timestamp / 2000 + p.phase) * 0.15;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }

        const twinkle = 0.5 + 0.5 * Math.sin(timestamp / 500 + p.phase);
        const alpha = p.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fill();
      }

      particleRafRef.current = requestAnimationFrame(drawParticles);
    };

    particleRafRef.current = requestAnimationFrame(drawParticles);

    return () => {
      window.removeEventListener('resize', resize);
      if (particleRafRef.current !== null) {
        cancelAnimationFrame(particleRafRef.current);
      }
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 40%, #0f0f2d 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      <div style={{
        width: '60%',
        maxWidth: '800px',
        minWidth: '320px',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(100,100,255,0.05)',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        zIndex: 1,
        '@media (maxWidth: 768px)': {
          width: '90%',
          padding: '24px',
        },
      }} className="glass-card">
        <h1 style={{
          textAlign: 'center',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '24px',
          fontWeight: 300,
          margin: 0,
          letterSpacing: '6px',
        }}>
          渐变诗笺
        </h1>

        <div style={{
          minHeight: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          padding: '16px',
        }}>
          {charStates.length > 0 ? (
            charStates.map((cs, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  color: cs.color,
                  fontSize: '42px',
                  fontWeight: 600,
                  transform: `scale(${cs.scale}) rotate(${cs.rotation}deg)`,
                  opacity: cs.opacity,
                  marginLeft: i > 0 ? `${charSpacing}px` : '0',
                  textShadow: cs.glowIntensity > 0
                    ? `0 0 ${8 + cs.glowIntensity * 12}px ${cs.color}, 0 0 ${4 + cs.glowIntensity * 6}px ${cs.color}`
                    : 'none',
                  transition: 'none',
                  willChange: 'transform, opacity, color',
                }}
              >
                {cs.char === ' ' ? '\u00A0' : cs.char}
              </span>
            ))
          ) : (
            <span style={{
              color: 'rgba(255,255,255,0.2)',
              fontSize: '18px',
              fontWeight: 300,
            }}>
              输入文字，开始动画
            </span>
          )}
        </div>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="在此输入文字..."
          maxLength={50}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '16px',
            outline: 'none',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        <ControlPanel
          startColor={startColor}
          endColor={endColor}
          speed={speed}
          charSpacing={charSpacing}
          onStartColorChange={setStartColor}
          onEndColorChange={setEndColor}
          onSpeedChange={setSpeed}
          onCharSpacingChange={setCharSpacing}
        />
      </div>

      <style>{`
        .glass-card {
          width: 60% !important;
        }
        @media (max-width: 768px) {
          .glass-card {
            width: 90% !important;
            padding: 24px !important;
          }
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.8);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(255,255,255,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.8);
          cursor: pointer;
          border: none;
          box-shadow: 0 0 6px rgba(255,255,255,0.3);
        }
        input[type="color"]::-webkit-color-swatch-wrapper {
          padding: 2px;
        }
        input[type="color"]::-webkit-color-swatch {
          border: none;
          border-radius: 4px;
        }
        input:focus {
          border-color: rgba(255,255,255,0.25) !important;
          box-shadow: 0 0 12px rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};

export default App;
