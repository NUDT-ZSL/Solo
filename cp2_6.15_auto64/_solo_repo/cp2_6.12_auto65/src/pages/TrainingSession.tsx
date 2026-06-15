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
  );

  const particles = useMemo(() => generateParticles(18), [comboKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        let scenes = await fetchScenes();
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

  const advanceRoundRef = useRef<() => void>();

  const advanceRoundInner = useCallback(async () => {
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

  useEffect(() => {
    advanceRoundRef.current = advanceRoundInner;
  }, [advanceRoundInner]);

  const advanceRound = useCallback(() => {
    advanceRoundRef.current?.();
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
        if (fb.enterCo