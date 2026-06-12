import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { SceneEngine, fetchScenes } from '../scenes/SceneEngine';
import {
  ScoringSystem,
  TOTAL_ROUNDS,
  type Scene,
  type RoundFeedback,
  type RoundResult
} from '../scenes/ScoringSystem';

function AnimatedNumber({ value, duration = 500, color }: { value: number; duration?: number; color?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) {
      setDisplay(0);
      return;
    }
    const startTime = performance.now();
    const startVal = 0;
    const steps = Math.floor(duration / 30);
    let step = 0;
    let raf = 0;
    const animate = () => {
      step += 1;
      const t = Math.min(1, step / steps);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + (value - startVal) * eased));
      if (step < steps) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span style={{ color: color || '#fff', fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </span>
  );
}

interface ComboParticle {
  id: number;
  x: number;
  y: number;
  angle: number;
  delay: number;
}

function generateParticles(count: number): ComboParticle[] {
  const arr: ComboParticle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      id: i,
      x: 50 + (Math.random() - 0.5) * 4,
      y: 50 + (Math.random() - 0.5) * 4,
      angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
      delay: Math.random() * 0.08
    });
  }
  return arr;
}

function getUserId(): string {
  try {
    let uid = localStorage.getItem('improv_user_id');
    if (!uid) {
      uid = 'user_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem('improv_user_id', uid);
    }
    return uid;
  } catch {
    return 'user_' + Date.now();
  }
}

export function TrainingSession() {
  const navigate = useNavigate();
  const userId = useRef(getUserId());

  const [allScenes, setAllScenes] = useState<Scene[]>([]);
  const [trainingScenes, setTrainingScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const scoringRef = useRef(new ScoringSystem());
  const [roundIndex, setRoundIndex] = useState(0);
  const [sceneKey, setSceneKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RoundFeedback | null>(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [comboKey, setComboKey] = useState(0);
  const [showComboEffect, setShowComboEffect] = useState(false);
  const [finished, setFinished] = useState(false);

  const particles = useMemo(() => generateParticles(18), [comboKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const scenes = await fetchScenes();
        if (cancelled) return;
        if (!scenes || scenes.length === 0) {
          setLoadError('场景数据加载失败，请刷新重试');
          return;
        }
        setAllScenes(scenes);
        const shuffled = [...scenes].sort(() => Math.random() - 0.5).slice(0, Math.min(TOTAL_ROUNDS, scenes.length));
        while (shuffled.length < TOTAL_ROUNDS && scenes.length > 0) {
          shuffled.push(scenes[Math.floor(Math.random() * scenes.length)]);
        }
        setTrainingScenes(shuffled);
        scoringRef.current.reset();
      } catch (e: any) {
        if (cancelled) return;
        setLoadError(e?.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = useCallback(() => {
    scoringRef.current.startRound();
  }, []);

  const handleSelect = useCallback(
    (scene: Scene, optionId: string, remainingRatio: number) => {
      setSelectedId(optionId);
      const fb = scoringRef.current.evaluateChoice(scene, optionId, remainingRatio);
      setFeedback(fb);

      if (fb.triggerComboEffect) {
        setComboKey(k => k + 1);
        setShowComboEffect(true);
        window.setTimeout(() => setShowComboEffect(false), 700);
      }

      window.setTimeout(() => {
        if (fb.enterCooldown) {
          setIsCooldown(true);
          setSelectedId(null);
          setFeedback(null);
          return;
        }
        advanceRound();
      }, 1500);
    },
    []
  );

  const handleTimeout = useCallback((scene: Scene) => {
    const fb = scoringRef.current.handleTimeout(scene);
    setSelectedId('__timeout__');
    setFeedback(fb);
    window.setTimeout(() => {
      if (fb.enterCooldown) {
        setIsCooldown(true);
        setSelectedId(null);
        setFeedback(null);
        return;
      }
      advanceRound();
    }, 1500);
  }, []);

  const advanceRound = useCallback(async () => {
    const next = roundIndex + 1;
    if (next >= Math.min(TOTAL_ROUNDS, trainingScenes.length)) {
      setFinished(true);
      const allResults: RoundResult[] = scoringRef.current.getRoundResults();
      try {
        await Promise.all(
          allResults.map(r =>
            axios.post('/api/scores', {
              ...r,
              userId: userId.current,
              isCorrect: r.isCorrect ? 1 : 0
            })
          )
        );
      } catch (e) {
        console.warn('[TrainingSession] save scores failed:', e);
      }
      window.setTimeout(() => {
        navigate('/analysis', {
          state: {
            userId: userId.current,
            radar: scoringRef.current.buildRadarData(),
            stats: scoringRef.current.getOverallStats(),
            wrongResults: scoringRef.current.getWrongResults(new Map(allScenes.map(s => [s.id, s])))
          }
        });
      }, 600);
      return;
    }
    setRoundIndex(next);
    setSceneKey(k => k + 1);
    setSelectedId(null);
    setFeedback(null);
  }, [roundIndex, trainingScenes.length, allScenes, navigate]);

  const handleCooldownEnd = useCallback(() => {
    setIsCooldown(false);
    advanceRound();
  }, [advanceRound]);

  const handleRetryCooldown = useCallback(() => {
    setIsCooldown(false);
    advanceRound();
  }, [advanceRound]);

  const totalScore = useMemo(() => scoringRef.current.getOverallStats().totalScore, [sceneKey, feedback]);

  const bgStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background:
      'radial-gradient(ellipse at 20% 10%, rgba(139, 92, 246, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.35) 0%, transparent 55%), radial-gradient(ellipse at 50% 50%, rgba(236, 72, 153, 0.12) 0%, transparent 60%), linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    zIndex: -1
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={bgStyle} />
        <div style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            style={{ fontSize: 48, marginBottom: 16 }}
          >
            🎭
          </motion.div>
          <div style={{ fontSize: 18 }}>正在加载场景题库...</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={bgStyle} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😵</div>
          <div style={{ fontSize: 18, marginBottom: 16 }}>{loadError}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            刷新重试
          </button>
        </div>
      </div>
    );
  }

  const stats = scoringRef.current.getOverallStats();

  return (
    <div style={{ minHeight: '100vh', color: '#fff', padding: '24px 16px 40px' }}>
      <div style={bgStyle} />

      <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '12px 16px',
            borderRadius: 12,
            backdropFilter: 'blur(16px)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>即兴台词训练</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>🎭 Improv Trainer</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>累计得分</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>{totalScore}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>正确/总数</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                <span style={{ color: '#4ade80' }}>{stats.correctCount}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>/{stats.totalRounds}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>最高连击</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stats.bestCombo >= 3 ? '#f59e0b' : '#fff' }}>
                🔥 {stats.bestCombo}
              </div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <SceneEngine
            scenes={trainingScenes}
            roundIndex={roundIndex}
            sceneKey={sceneKey}
            isCooldown={isCooldown}
            selectedId={selectedId}
            feedback={feedback}
            disabled={finished}
            onStart={handleStart}
            onSelect={handleSelect}
            onTimeout={handleTimeout}
            onCooldownEnd={handleCooldownEnd}
            onRetryCooldown={handleRetryCooldown}
          />

          <AnimatePresence>
            {feedback && (
              <motion.div
                key={`fb-${sceneKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{
                  marginTop: 20,
                  padding: '16px 20px',
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  background: feedback.isCorrect
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${feedback.isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>语义匹配度</div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                    <AnimatedNumber value={feedback.semanticScore} color="#a5f3fc" />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>%</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>反应速度</div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                    <AnimatedNumber value={feedback.speedScore} color="#fde68a" />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>分</span>
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 }}>本回合</div>
                  <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>
                    <AnimatedNumber
                      value={feedback.totalScore}
                      color={feedback.isCorrect ? '#4ade80' : '#fca5a5'}
                    />
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>分</span>
                  </div>
                </div>
                {feedback.comboCount >= 2 && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      paddingTop: 4,
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      fontSize: 14,
                      color: '#fbbf24',
                      fontWeight: 700
                    }}
                  >
                    ⚡ 连击 x{feedback.comboCount}！保持节奏！
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {showComboEffect && (
            <div
              key={comboKey}
              style={{
                position: 'absolute',
                inset