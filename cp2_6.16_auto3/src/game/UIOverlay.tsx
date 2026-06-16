import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useArchSimulation, TestRecord, ComparisonRecord } from '../hooks/useArchSimulation';
import { ArchType, SimulationSnapshot } from './SimulationEngine';

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
  disabled?: boolean;
}

const Slider: React.FC<SliderProps> = ({ label, value, min, max, step, unit, onChange, disabled }) => {
  return (
    <div style={{ marginBottom: 16, opacity: disabled ? 0.5 : 1 }}>
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
        onChange={(e) => !disabled && onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: 6,
          appearance: 'none',
          background: '#21262d',
          borderRadius: 3,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            (e.target as HTMLInputElement).style.background = '#30363d';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            (e.target as HTMLInputElement).style.background = '#21262d';
          }
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
        input[type=range]:disabled::-webkit-slider-thumb {
          background: #30363d;
          cursor: not-allowed;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
};

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
  disabled?: boolean;
  style?: React.CSSProperties;
}

const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'primary', disabled, style }) => {
  const bgColors: Record<string, string> = {
    primary: '#238636',
    secondary: '#21262d',
    danger: '#da3633',
    accent: '#8957e5'
  };
  const hoverColors: Record<string, string> = {
    primary: '#2ea043',
    secondary: '#30363d',
    danger: '#f85149',
    accent: '#a371f7'
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

interface MetricsPanelProps {
  snapshot: SimulationSnapshot | null;
  label: string;
  color: string;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ snapshot, label, color }) => {
  const getSafetyFactorColor = (sf: number) => {
    if (sf >= 2) return '#3fb950';
    if (sf >= 1) return '#d29922';
    return '#f85149';
  };

  return (
    <div style={{
      padding: 12,
      background: 'rgba(22, 27, 34, 0.95)',
      borderRadius: 8,
      border: `1px solid ${color}33`,
      fontSize: 12,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        color: color,
        fontWeight: 700,
        marginBottom: 8,
        fontSize: 13
      }}>
        {label}
      </div>
      {snapshot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>拱顶下沉:</span>
            <span style={{ color: '#58a6ff', fontWeight: 600 }}>
              {snapshot.displacement.toFixed(1)} mm
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>最大转角:</span>
            <span style={{ color: '#a371f7', fontWeight: 600 }}>
              {snapshot.maxRotation.toFixed(2)}°
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>安全系数:</span>
            <span style={{ color: getSafetyFactorColor(snapshot.safetyFactor), fontWeight: 600 }}>
              {snapshot.safetyFactor.toFixed(2)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>裂缝砌块:</span>
            <span style={{
              color: snapshot.crackedBlockCount > 0 ? '#f85149' : '#3fb950',
              fontWeight: 600
            }}>
              {snapshot.crackedBlockCount} 块
            </span>
          </div>
          {snapshot.crackedBlockCount > 0 && (
            <div style={{
              marginTop: 4,
              padding: '6px 8px',
              background: snapshot.collapsed ? 'rgba(248, 81, 73, 0.15)' : 'rgba(210, 153, 34, 0.15)',
              borderRadius: 4,
              color: snapshot.collapsed ? '#f85149' : '#d29922',
              fontSize: 11,
              lineHeight: 1.4
            }}>
              {snapshot.failureMode}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface CollapseOverlayProps {
  visible: boolean;
  label: string;
}

const CollapseOverlay: React.FC<CollapseOverlayProps> = ({ visible, label }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none'
    }}>
      <div style={{
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: 48,
          fontWeight: 800,
          color: '#ff4444',
          textShadow: '0 0 20px #ff4444, 0 0 40px #ff4444',
          marginBottom: 8,
          letterSpacing: 4
        }}>
          倒塌！
        </div>
        <div style={{
          color: '#e6edf3',
          fontSize: 14
        }}>
          {label}
        </div>
      </div>
    </div>
  );
};

export const UIOverlay: React.FC = () => {
  const sim = useArchSimulation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
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

  const baseCanvasWidth = isResponsive ? Math.min(windowWidth - 32, 800) : 800;
  const baseCanvasHeight = isResponsive ? Math.round(baseCanvasWidth * 0.75) : 600;

  const canvasWidth = sim.comparisonMode
    ? Math.floor((baseCanvasWidth - 16) / 2)
    : baseCanvasWidth;
  const canvasHeight = baseCanvasHeight;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    sim.engine?.setCanvasSize(canvasWidth, canvasHeight);
    if (sim.comparisonMode) {
      sim.engine2?.setCanvasSize(canvasWidth, canvasHeight);
    }
  }, [canvasWidth, canvasHeight, sim.engine, sim.engine2, sim.comparisonMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sim.engine?.setCanvasSize(canvasWidth, canvasHeight);

    const canvas2 = canvas2Ref.current;
    let ctx2: CanvasRenderingContext2D | null = null;
    if (canvas2 && sim.comparisonMode) {
      ctx2 = canvas2.getContext('2d');
      sim.engine2?.setCanvasSize(canvasWidth, canvasHeight);
    }

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

      if (sim.comparisonMode && ctx2 && sim.engine2) {
        sim.engine2.update(delta);
        sim.engine2.render(ctx2);
      }

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

  const getBlockColorPreview = () => {
    const strengthNorm = (sim.compressiveStrength - 10) / 90;
    const modulusNorm = (sim.elasticModulus - 10) / 40;
    const t = (strengthNorm * 0.6 + modulusNorm * 0.4);
    const r = Math.floor(200 - t * 150);
    const g = Math.floor(200 - t * 100);
    const b = Math.floor(210 + t * 45);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getArchTypeOptions = (excludeType?: ArchType) => {
    return (Object.keys(ARCH_TYPE_LABELS) as ArchType[])
      .filter(t => t !== excludeType);
  };

  const handleToggleComparison = () => {
    sim.setComparisonMode(!sim.comparisonMode);
  };

  const canvasAreaStyle: React.CSSProperties = sim.comparisonMode
    ? { display: 'flex', gap: 16, flexShrink: 0 }
    : { position: 'relative', flexShrink: 0 };

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
        right: isResponsive ? 24 : (sim.comparisonMode ? 24 : 320),
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
            fontSize: 12,
            zIndex: 100
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

      {/* New Achievement Notification */}
      {newAchievement && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #f0b429, #d29922)',
          padding: '16px 24px',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(240, 180, 41, 0.5)',
          zIndex: 1000,
          animation: 'slideDown 0.5s ease'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <span style={{ fontSize: 32 }}>🏆</span>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>
                成就解锁！
              </div>
              <div style={{ color: '#fff3b0', fontSize: 13 }}>
                {newAchievement.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div style={canvasAreaStyle}>
        {/* Left Canvas / Single Mode Canvas */}
        <div style={{ position: 'relative' }}>
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
              background: sim.comparisonMode ? 'rgba(88, 166, 255, 0.2)' : '#21262d',
              borderRadius: 12,
              color: sim.comparisonMode ? '#58a6ff' : '#8b949e',
              fontWeight: 500,
              border: sim.comparisonMode ? '1px solid rgba(88, 166, 255, 0.3)' : 'none'
            }}>
              {ARCH_TYPE_LABELS[sim.archType]}
              {sim.comparisonMode && ' #1'}
            </span>
            {sim.comparisonMode && (
              <select
                value={sim.archType2}
                onChange={(e) => sim.setArchType2(e.target.value as ArchType)}
                style={{
                  background: '#21262d',
                  color: '#a371f7',
                  border: '1px solid #30363d',
                  borderRadius: 12,
                  padding: '3px 10px',
                  fontSize: 12,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {getArchTypeOptions(sim.archType).map(t => (
                  <option key={t} value={t}>
                    {ARCH_TYPE_LABELS[t]} #2
                  </option>
                ))}
              </select>
            )}
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

          {/* Metrics Overlay - Left */}
          <div style={{
            position: 'absolute',
            top: 52,
            left: 12,
            width: 200
          }}>
            {sim.snapshot && sim.load > 0 && (
              <MetricsPanel
                snapshot={sim.snapshot}
                label={ARCH_TYPE_LABELS[sim.archType]}
                color="#58a6ff"
              />
            )}
          </div>

          <CollapseOverlay
            visible={sim.isCollapsed && sim.collapseProgress > 0.1 && sim.collapseProgress < 0.95}
            label={ARCH_TYPE_LABELS[sim.archType]}
          />
        </div>

        {/* Right Canvas - Comparison Mode Only */}
        {sim.comparisonMode && (
          <div style={{ position: 'relative' }}>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 12,
              color: '#e6edf3',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              opacity: 0
            }}>
              <span>🏛️</span>
            </div>

            <canvas
              ref={canvas2Ref}
              width={canvasWidth}
              height={canvasHeight}
              style={{
                display: 'block',
                borderRadius: 8,
                border: '1px solid #a371f744'
              }}
            />

            {/* Metrics Overlay - Right */}
            <div style={{
              position: 'absolute',
              top: 52,
              left: 12,
              width: 200
            }}>
              {sim.snapshot2 && sim.load > 0 && (
                <MetricsPanel
                  snapshot={sim.snapshot2}
                  label={ARCH_TYPE_LABELS[sim.archType2]}
                  color="#a371f7"
                />
              )}
            </div>

            <CollapseOverlay
              visible={sim.isCollapsed2 && sim.collapseProgress2 > 0.1 && sim.collapseProgress2 < 0.95}
              label={ARCH_TYPE_LABELS[sim.archType2]}
            />
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div style={{
        width: isResponsive ? '100%' : 280,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxHeight: isResponsive ? 250 : '100%',
        overflowY: isResponsive ? 'auto' : 'hidden'
      }}>
        {/* Parameters Card */}
        <div style={{
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 8,
          padding: 16,
          flexShrink: 0
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#e6edf3',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>⚙️ 参数设置</span>
            <div
              onClick={handleToggleComparison}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: sim.comparisonMode ? 'rgba(137, 87, 229, 0.2)' : '#21262d',
                color: sim.comparisonMode ? '#a371f7' : '#8b949e',
                borderRadius: 12,
                cursor: 'pointer',
                fontWeight: 600,
                border: sim.comparisonMode ? '1px solid rgba(137, 87, 229, 0.4)' : 'none',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = sim.comparisonMode
                  ? 'rgba(137, 87, 229, 0.3)'
                  : '#30363d';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = sim.comparisonMode
                  ? 'rgba(137, 87, 229, 0.2)'
                  : '#21262d';
              }}
            >
              {sim.comparisonMode ? '🔄 对比中' : '⚔️ 对比模式'}
            </div>
          </div>

          {!sim.comparisonMode ? (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 6 }}>拱门类型</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(ARCH_TYPE_LABELS) as ArchType[]).map(type => (
                  <div
                    key={type}
                    onClick={() => sim.setArchType(type)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      textAlign: 'center',
                      background: sim.archType === type ? 'rgba(88, 166, 255, 0.2)' : '#21262d',
                      color: sim.archType === type ? '#58a6ff' : '#8b949e',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      border: sim.archType === type ? '1px solid rgba(88, 166, 255, 0.4)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (sim.archType !== type) {
                        (e.currentTarget as HTMLDivElement).style.background = '#30363d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sim.archType !== type) {
                        (e.currentTarget as HTMLDivElement).style.background = '#21262d';
                      }
                    }}
                  >
                    {ARCH_TYPE_LABELS[type]}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 6 }}>对比拱门 #1</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(Object.keys(ARCH_TYPE_LABELS) as ArchType[]).map(type => (
                  <div
                    key={type}
                    onClick={() => sim.setArchType(type)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      textAlign: 'center',
                      background: sim.archType === type ? 'rgba(88, 166, 255, 0.2)' : '#21262d',
                      color: sim.archType === type ? '#58a6ff' : '#8b949e',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      border: sim.archType === type ? '1px solid rgba(88, 166, 255, 0.4)' : '1px solid transparent',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (sim.archType !== type) {
                        (e.currentTarget as HTMLDivElement).style.background = '#30363d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sim.archType !== type) {
                        (e.currentTarget as HTMLDivElement).style.background = '#21262d';
                      }
                    }}
                  >
                    {ARCH_TYPE_LABELS[type]}
                  </div>
                ))}
              </div>
              <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 6 }}>对比拱门 #2</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(Object.keys(ARCH_TYPE_LABELS) as ArchType[]).map(type => (
                  <div
                    key={type}
                    onClick={() => type !== sim.archType && sim.setArchType2(type)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      textAlign: 'center',
                      background: sim.archType2 === type ? 'rgba(163, 113, 247, 0.2)' : '#21262d',
                      color: sim.archType2 === type ? '#a371f7' : (type === sim.archType ? '#484f58' : '#8b949e'),
                      borderRadius: 6,
                      cursor: type === sim.archType ? 'not-allowed' : 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      border: sim.archType2 === type ? '1px solid rgba(163, 113, 247, 0.4)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      opacity: type === sim.archType ? 0.4 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (sim.archType2 !== type && type !== sim.archType) {
                        (e.currentTarget as HTMLDivElement).style.background = '#30363d';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (sim.archType2 !== type && type !== sim.archType) {
                        (e.currentTarget as HTMLDivElement).style.background = '#21262d';
                      }
                    }}
                  >
                    {ARCH_TYPE_LABELS[type]}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Slider
            label="跨度"
            value={sim.span}
            min={200}
            max={600}
            step={10}
            unit="px"
            onChange={sim.setSpan}
          />

          <Slider
            label="抗压强度"
            value={sim.compressiveStrength}
            min={10}
            max={100}
            step={1}
            unit=" MPa"
            onChange={sim.setCompressiveStrength}
          />

          <Slider
            label="弹性模量"
            value={sim.elasticModulus}
            min={10}
            max={50}
            step={1}
            unit=" GPa"
            onChange={sim.setElasticModulus}
          />

          <div style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: '#161b22',
            borderRadius: 6,
            border: '1px solid #21262d'
          }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: 4,
              background: getBlockColorPreview(),
              border: '1px solid #30363d'
            }} />
            <div>
              <div style={{ color: '#8b949