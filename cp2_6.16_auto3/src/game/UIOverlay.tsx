import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useArchSimulation } from '../hooks/useArchSimulation';
import { ArchType } from './SimulationEngine';

const ARCH_TYPE_LABELS: Record<ArchType, string> = {
  semicircular: '半圆拱',
  pointed: '尖拱',
  horseshoe: '马蹄拱'
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange }) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 6,
        fontSize: 13
      }}>
        <span style={{ color: '#8b949e' }}>{label}</span>
        <span style={{ color: '#58a6ff', fontWeight: 600 }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          appearance: 'none',
          background: '#21262d',
          borderRadius: 3,
          outline: 'none',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLInputElement).style.background = '#30363d';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLInputElement).style.background = '#21262d';
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #58a6ff;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(88, 166, 255, 0.3);
        }
        input[type=range]::-webkit-slider-thumb:hover {
          background: #79c0ff;
          transform: scale(1.1);
          box-shadow: 0 2px 10px rgba(121, 192, 255, 0.5);
        }
        input[type=range]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #58a6ff;
          cursor: pointer;
          border: none;
          transition: all 0.15s ease;
        }
      `}</style>
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', disabled, style }) => {
  const bgColors: Record<string, string> = {
    primary: '#238636',
    secondary: '#21262d',
    danger: '#da3633'
  };
  const hoverColors: Record<string, string> = {
    primary: '#2ea043',
    secondary: '#30363d',
    danger: '#f85149'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 16px',
        background: disabled ? '#30363d' : bgColors[variant],
        color: disabled ? '#6e7681' : '#ffffff',
        border: 'none',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.15s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.target as HTMLButtonElement).style.background = hoverColors[variant];
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          (e.target as HTMLButtonElement).style.background = bgColors[variant];
        }
      }}
    >
      {children}
    </button>
  );
};

export const UIOverlay: React.FC = () => {
  const sim = useArchSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastTimeRef = useRef<number>(0);
  const spaceHeldRef = useRef(false);
  const lastLoadTimeRef = useRef(0);

  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, boolean | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizCorrectCount, setQuizCorrectCount] = useState(0);
  const [newAchievement, setNewAchievement] = useState<{ name: string; timestamp: number; description: string } | null>(null);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isResponsive = windowWidth < 900;

  const canvasWidth = isResponsive ? Math.min(windowWidth - 32, 800) : 800;
  const canvasHeight = isResponsive ? Math.round(canvasWidth * 0.75) : 600;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sim.engine?.setCanvasSize(canvasWidth, canvasHeight);
  }, [canvasWidth, canvasHeight, sim.engine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sim.engine?.setCanvasSize(canvasWidth, canvasHeight);

    let animationId: number;
    let stopped = false;

    const animate = (time: number) => {
      if (stopped) return;
      const delta = lastTimeRef.current ? Math.min((time - lastTimeRef.current) / 1000, 0.05) : 0.016;
      lastTimeRef.current = time;

      if (spaceHeldRef.current) {
        const now = time;
        if (now - lastLoadTimeRef.current >= 50) {
          sim.addLoad(2000 * 0.05);
          lastLoadTimeRef.current = now;
        }
      }

      sim.engine?.update(delta);
      sim.engine?.render(ctx);

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      stopped = true;
      cancelAnimationFrame(animationId);
    };
  }, [sim, canvasWidth, canvasHeight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceHeldRef.current = true;
        lastLoadTimeRef.current = performance.now();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        spaceHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleAddLoad = useCallback(() => {
    sim.addLoad(500);
  }, [sim]);

  const handleQuizAnswer = (questionId: number, answer: boolean) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = async () => {
    let correct = 0;
    for (const q of sim.quizQuestions) {
      const result = sim.checkQuizAnswer(q.id, quizAnswers[q.id] ?? false);
      if (result?.correct) correct++;
    }
    setQuizCorrectCount(correct);
    setQuizSubmitted(true);

    if (correct >= 2) {
      const achievement = await sim.completeQuiz(correct, sim.quizQuestions.length);
      if (achievement) {
        setNewAchievement(achievement);
        setTimeout(() => setNewAchievement(null), 4000);
      }
    }
  };

  const resetQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizCorrectCount(0);
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getSafetyFactorColor = (sf: number) => {
    if (sf >= 2) return '#3fb950';
    if (sf >= 1) return '#d29922';
    return '#f85149';
  };

  const getBlockColorPreview = () => {
    const strengthNorm = (sim.compressiveStrength - 10) / 90;
    const modulusNorm = (sim.elasticModulus - 10) / 40;
    const t = (strengthNorm * 0.6 + modulusNorm * 0.4);
    const r = Math.floor(200 - t * 150);
    const g = Math.floor(200 - t * 100);
    const b = Math.floor(210 + t * 45);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isResponsive ? 'column' : 'row',
      width: '100%',
      height: '100%',
      background: '#0d1117',
      padding: isResponsive ? 16 : 20,
      gap: 20,
      overflow: isResponsive ? 'auto' : 'hidden',
      position: 'relative'
    }}>
      {/* Achievements Bar */}
      <div style={{
        position: 'absolute',
        top: isResponsive ? 8 : 12,
        right: isResponsive ? 24 : 320,
        display: 'flex',
        gap: 8,
        zIndex: 10
      }}>
        {sim.achievements.map((a) => (
          <div
            key={a.id}
            onClick={() => setShowAchievement(showAchievement === a.id ? null : a.id)}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f0b429, #d29922)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(240, 180, 41, 0.4)',
              transition: 'transform 0.15s ease',
              border: '2px solid #fff3b0'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
            }}
            title={a.name}
          >
            <span style={{ fontSize: 20 }}>🏆</span>
          </div>
        ))}

        {showAchievement && (
          <div style={{
            position: 'absolute',
            top: 52,
            right: 0,
            width: 240,
            padding: 12,
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            fontSize: 12
          }}>
            {(() => {
              const a = sim.achievements.find(x => x.id === showAchievement);
              if (!a) return null;
              return (
                <>
                  <div style={{ color: '#f0b429', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{a.name}</div>
                  <div style={{ color: '#8b949e', marginBottom: 4 }}>{formatTimestamp(a.timestamp)}</div>
                  <div style={{ color: '#e6edf3', lineHeight: 1.5 }}>{a.description}</div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Canvas Area */}
      <div style={{
        position: 'relative',
        flexShrink: 0,
        ...(isResponsive ? {} : {})
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 12,
          color: '#e6edf3',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span>🏛️ 拱门力学模拟器</span>
          <span style={{
            fontSize: 12,
            padding: '3px 10px',
            background: '#21262d',
            borderRadius: 12,
            color: '#8b949e',
            fontWeight: 500
          }}>
            {ARCH_TYPE_LABELS[sim.archType]}
          </span>
        </div>

        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            display: 'block',
            borderRadius: 8,
            border: '1px solid #30363d'
          }}
        />

        {/* Metrics Overlay */}
        <div style={{
          position: 'absolute',
          top: 52,
          left: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          {sim.snapshot && sim.load > 0 && (
            <>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(22, 27, 34, 0.9)',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid #30363d'
              }}>
                <span style={{ color: '#8b949e' }}>拱顶下沉: </span>
                <span style={{ color: '#58a6ff', fontWeight: 600 }}>
                  {sim.snapshot.displacement.toFixed(1)} mm
                </span>
              </div>
              <div style={{
                padding: '6px 12px',
                background: 'rgba(22, 27, 34, 0.9)',
                borderRadius: 6,
                fontSize: 12,
                border: '1px solid #30363d'
              }}>
                <span style={{ color: '#8b949e' }}>最大转角: </span>
                <span style={{ color: '#a371f7', fontWeight: 600 }}>