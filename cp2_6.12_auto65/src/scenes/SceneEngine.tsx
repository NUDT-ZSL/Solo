import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import type { Scene, RoundFeedback } from './ScoringSystem';
import { COUNTDOWN_DURATION_MS } from './ScoringSystem';

interface SceneEngineProps {
  scenes: Scene[];
  roundIndex: number;
  sceneKey: number;
  isCooldown: boolean;
  selectedId: string | null;
  feedback: RoundFeedback | null;
  disabled: boolean;
  onStart: () => void;
  onSelect: (scene: Scene, optionId: string, remainingRatio: number) => void;
  onTimeout: (scene: Scene) => void;
  onCooldownEnd: () => void;
  onRetryCooldown: () => void;
}

export function SceneEngine(props: SceneEngineProps) {
  const {
    scenes,
    roundIndex,
    sceneKey,
    isCooldown,
    selectedId,
    feedback,
    disabled,
    onStart,
    onSelect,
    onTimeout,
    onCooldownEnd,
    onRetryCooldown
  } = props;

  const currentScene = scenes[roundIndex] || scenes[0];
  const [remainingRatio, setRemainingRatio] = useState(1);
  const [cooldownRemaining, setCooldownRemaining] = useState(3);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const tickStartedRef = useRef<boolean>(false);
  const cooldownTimerRef = useRef<number | null>(null);

  const startTick = useCallback(() => {
    if (tickStartedRef.current) return;
    tickStartedRef.current = true;
    startTimeRef.current = performance.now();

    const updateProgress = () => {
      const elapsed = performance.now() - startTimeRef.current;
      const ratio = Math.max(0, 1 - elapsed / COUNTDOWN_DURATION_MS);
      setRemainingRatio(ratio);

      if (ratio <= 0) {
        animFrameRef.current = null;
        onTimeout(currentScene);
        return;
      }
      animFrameRef.current = requestAnimationFrame(updateProgress);
    };

    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, [currentScene, onTimeout]);

  useEffect(() => {
    tickStartedRef.current = false;
    setRemainingRatio(1);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (!disabled && !isCooldown) {
      const t = window.setTimeout(() => {
        onStart();
        startTick();
      }, 400);
      return () => window.clearTimeout(t);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sceneKey, disabled, isCooldown, onStart, startTick]);

  useEffect(() => {
    if (selectedId !== null && animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, [selectedId]);

  useEffect(() => {
    if (isCooldown) {
      setCooldownRemaining(3);
      const start = Date.now();
      cooldownTimerRef.current = window.setInterval(() => {
        const left = Math.max(0, 3 - Math.floor((Date.now() - start) / 1000));
        setCooldownRemaining(left);
        if (left <= 0) {
          if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          onCooldownEnd();
        }
      }, 100);
    }
    return () => {
      if (cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [isCooldown, onCooldownEnd]);

  const handleOptionClick = useCallback(
    (optionId: string) => {
      if (disabled || selectedId !== null || isCooldown) return;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      onSelect(currentScene, optionId, remainingRatio);
    },
    [disabled, selectedId, isCooldown, remainingRatio, currentScene, onSelect]
  );

  const { ringColor, showPulse } = useMemo(() => {
    if (remainingRatio > 0.6) return { ringColor: '#22c55e', showPulse: false };
    if (remainingRatio > 0.3) return { ringColor: '#eab308', showPulse: false };
    return { ringColor: '#ef4444', showPulse: true };
  }, [remainingRatio]);

  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - remainingRatio);

  return (
    <div className="scene-engine-root" style={{ width: '100%', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, position: 'relative' }}>
        <div style={{ position: 'relative', width: 88, height: 88 }}>
          {showPulse && !disabled && selectedId === null && !isCooldown && (
            <motion.div
              key={sceneKey}
              initial={{ opacity: 0, scale: 1 }}
              animate={{
                opacity: [0, 0.5, 0],
                scale: [1, 1.25, 1.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeOut'
              }}
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '2px solid rgba(239, 68, 68, 0.6)',
                pointerEvents: 'none'
              }}
            />
          )}
          <svg width={88} height={88} viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            <circle
              cx={44}
              cy={44}
              r={radius}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={6}
              fill="none"
            />
            <circle
              cx={44}
              cy={44}
              r={radius}
              stroke="url(#ringGradient)"
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: disabled || selectedId !== null ? 'none' : 'stroke-dashoffset 85ms linear' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 22,
              fontWeight: 700,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)'
            }}
          >
            {Math.max(0, Math.ceil(remainingRatio * (COUNTDOWN_DURATION_MS / 1000)))}s
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isCooldown ? (
          <motion.div
            key="cooldown-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              borderRadius: 16,
              padding: '40px 32px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(100, 100, 100, 0.35)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>💤</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>休息一下</div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 24 }}>
              连续失误，冷静 {cooldownRemaining} 秒再继续吧
            </div>
            <button
              onClick={onRetryCooldown}
              style={{
                padding: '12px 32px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
              }}
            >
              立即恢复训练
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`card-${sceneKey}`}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              borderRadius: 16,
              padding: '32px 28px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: '0 24px 72px rgba(0,0,0,0.35)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(139, 92, 246, 0.3)',
                  color: '#ddd6fe',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                {currentScene?.category || '场景'}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                第 {roundIndex + 1} / {scenes.length || 10} 轮
              </span>
            </div>

            <div
              style={{
                fontSize: 17,
                lineHeight: 1.7,
                color: '#f9fafb',
                marginBottom: 28,
                fontWeight: 500,
                minHeight: 96
              }}
            >
              {currentScene?.description}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentScene?.options.map((opt, i) => {
                const isSelected = selectedId === opt.id;
                const isCorrect = feedback?.correctOptionId === opt.id && feedback !== null;
                const isWrongSelected = isSelected && feedback !== null && !feedback.isCorrect;

                let bg: string | undefined;
                let borderColor = 'rgba(255,255,255,0.12)';

                if (feedback !== null) {
                  if (isCorrect) {
                    bg = 'rgba(34, 197, 94, 0.25)';
                    borderColor = 'rgba(34, 197, 94, 0.6)';
                  } else if (isWrongSelected) {
                    bg = 'rgba(239, 68, 68, 0.2)';
                    borderColor = 'rgba(239, 68, 68, 0.5)';
                  } else {
                    bg = 'rgba(255,255,255,0.04)';
                  }
                } else if (isSelected) {
                  bg = 'linear-gradient(135deg, #6366f1, #3b82f6)';
                } else {
                  bg = 'rgba(139, 92, 246, 0.12)';
                }

                return (
                  <motion.button
                    key={opt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06, duration: 0.25 }}
                    whileTap={!disabled && selectedId === null ? { scale: 0.95 } : { scale: 1 }}
                    onClick={() => handleOptionClick(opt.id)}
                    disabled={disabled || selectedId !== null}
                    style={{
                      position: 'relative',
                      width: '100%',
                      minHeight: 48,
                      padding: '12px 20px 12px 44px',
                      borderRadius: 8,
                      border: `1px solid ${borderColor}`,
                      background: bg,
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 500,
                      textAlign: 'left',
                      lineHeight: 1.55,
                      cursor: disabled || selectedId !== null ? 'default' : 'pointer',
                      boxShadow: isSelected && feedback === null ? '0 8px 24px rgba(99,102,241,0.4)' : 'none',
                      transition: 'background 0.1s ease, border-color 0.1s ease, transform 0.1s ease',
                      transform: `translateX(${isSelected ? 0 : 0}px)`
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.8)'
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt.text}
                    {feedback !== null && isCorrect && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20, duration: 0.3 }}
                        style={{
                          position: 'absolute',
                          right: 14,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'rgba(34, 197, 94, 0.9)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 900
                        }}
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export async function fetchScenes(): Promise<Scene[]> {
  try {
    const res = await axios.get('/api/scenes', { timeout: 5000 });
    if (res.data && res.data.success && Array.isArray(res.data.data)) {
      return res.data.data as Scene[];
    }
    throw new Error('Invalid response');
  } catch (err) {
    console.warn('[SceneEngine] fetch scenes from API failed, using fallback', err);
    return [];
  }
}
