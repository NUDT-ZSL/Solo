import React, { useState, useCallback, useEffect, useRef } from 'react';
import PuzzleBoard from './PuzzleBoard';
import ControlPanel from './ControlPanel';
import {
  LevelConfig,
  FragmentData,
  getLevelConfig,
  rotateFragment,
  lockFragment,
  findHintFragment,
  isFragmentCorrect,
  TOTAL_LEVELS,
} from './utils/puzzleLogic';

const App: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelConfig, setLevelConfig] = useState<LevelConfig>(() => getLevelConfig(1));
  const [fragments, setFragments] = useState<FragmentData[]>(() => getLevelConfig(1).fragments);
  const [energy, setEnergy] = useState(() => getLevelConfig(1).maxEnergy);
  const [hintIndex, setHintIndex] = useState<number | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [scrollAnim, setScrollAnim] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const energyTimerRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy(prev => {
        const max = levelConfig.maxEnergy;
        if (prev >= max) return max;
        return Math.min(max, prev + levelConfig.energyRegenRate * 0.1);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [levelConfig.maxEnergy, levelConfig.energyRegenRate]);

  const switchLevel = useCallback((levelId: number) => {
    if (levelId === currentLevel || transitioning) return;
    if (levelId < 1 || levelId > TOTAL_LEVELS) return;

    setTransitioning(true);
    setScrollAnim(0);

    let frame = 0;
    const anim = () => {
      frame++;
      const progress = Math.min(1, frame / 30);
      setScrollAnim(progress);
      if (progress < 1) {
        requestAnimationFrame(anim);
      } else {
        const newConfig = getLevelConfig(levelId);
        setLevelConfig(newConfig);
        setFragments(newConfig.fragments);
        setEnergy(newConfig.maxEnergy);
        setCurrentLevel(levelId);
        setHintIndex(null);
        setIsComplete(false);

        let closeFrame = 0;
        const closeAnim = () => {
          closeFrame++;
          const closeProgress = Math.min(1, closeFrame / 20);
          setScrollAnim(1 - closeProgress);
          if (closeProgress < 1) {
            requestAnimationFrame(closeAnim);
          } else {
            setScrollAnim(0);
            setTransitioning(false);
          }
        };
        requestAnimationFrame(closeAnim);
      }
    };
    requestAnimationFrame(anim);
  }, [currentLevel, transitioning]);

  const handleFragmentRotate = useCallback((id: number) => {
    if (energy < levelConfig.energyCost) return;
    setEnergy(prev => prev - levelConfig.energyCost);
    setFragments(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const rotated = rotateFragment(prev[idx], 90);
      const next = [...prev];
      next[idx] = rotated;
      return next;
    });
    setHintIndex(null);
  }, [energy, levelConfig.energyCost]);

  const handleFragmentLock = useCallback((id: number) => {
    setFragments(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const locked = lockFragment(prev[idx]);
      const next = [...prev];
      next[idx] = locked;
      return next;
    });
  }, []);

  const handleHint = useCallback(() => {
    const hint = findHintFragment(fragments);
    setHintIndex(hint);
  }, [fragments]);

  const handleComplete = useCallback(() => {
    setIsComplete(true);
  }, []);

  const lockedCount = fragments.filter(f => f.isLocked).length;
  const hintAvailable = energy >= levelConfig.energyCost * 2;

  const scrollScale = scrollAnim;
  const scrollAlpha = 1 - scrollAnim;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      background: '#1a1008',
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        transform: `scaleX(${1 - scrollScale * 0.01})`,
        opacity: 1 - scrollScale * 0.3,
        transition: 'opacity 0.3s ease',
      }}>
        <PuzzleBoard
          level={levelConfig}
          fragments={fragments}
          onFragmentRotate={handleFragmentRotate}
          onFragmentLock={handleFragmentLock}
          energy={energy}
          hintIndex={hintIndex}
          onComplete={handleComplete}
        />
      </div>

      <ControlPanel
        energy={energy}
        maxEnergy={levelConfig.maxEnergy}
        currentLevel={currentLevel}
        onHint={handleHint}
        onLevelSelect={switchLevel}
        hintAvailable={hintAvailable}
        levelName={levelConfig.name}
        levelDesc={levelConfig.description}
        fragmentsTotal={fragments.length}
        fragmentsLocked={lockedCount}
      />

      {transitioning && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 100,
        }}>
          <div style={{
            width: `${80 * (1 + scrollAnim * 2)}%`,
            height: 4,
            background: `linear-gradient(90deg, transparent, rgba(200, 164, 78, ${scrollAnim * 0.8}), transparent)`,
            borderRadius: 2,
            opacity: scrollAnim,
          }} />
          <div style={{
            position: 'absolute',
            color: `rgba(230, 195, 106, ${scrollAlpha})`,
            fontSize: 32,
            fontFamily: 'serif',
            fontWeight: 'bold',
            letterSpacing: 8,
            textShadow: '0 0 20px rgba(200, 164, 78, 0.5)',
          }}>
            {levelConfig.name}
          </div>
        </div>
      )}

      {isComplete && currentLevel < TOTAL_LEVELS && !transitioning && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <button
            onClick={() => switchLevel(currentLevel + 1)}
            style={{
              padding: '12px 32px',
              borderRadius: 24,
              border: '2px solid rgba(200, 164, 78, 0.6)',
              background: 'radial-gradient(circle at 40% 40%, #5a4520, #3a2a10)',
              color: '#e6c36a',
              fontSize: 16,
              fontFamily: 'serif',
              fontWeight: 'bold',
              cursor: 'pointer',
              letterSpacing: 4,
              boxShadow: '0 0 20px rgba(200, 164, 78, 0.3), inset 0 0 10px rgba(200, 164, 78, 0.1)',
              animation: 'pulse 2s infinite',
            }}
          >
            下一卷 →
          </button>
        </div>
      )}

      {isComplete && currentLevel >= TOTAL_LEVELS && !transitioning && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'auto',
            zIndex: 50,
          }}
        >
          <div style={{
            color: '#e6c36a',
            fontSize: 36,
            fontFamily: 'serif',
            fontWeight: 'bold',
            letterSpacing: 8,
            textShadow: '0 0 30px rgba(200, 164, 78, 0.6)',
            marginBottom: 20,
          }}>
            卷轴已归元
          </div>
          <div style={{
            color: 'rgba(230, 195, 106, 0.7)',
            fontSize: 16,
            fontFamily: 'serif',
            letterSpacing: 2,
          }}>
            五卷封印，皆已复原
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(200, 164, 78, 0.3), inset 0 0 10px rgba(200, 164, 78, 0.1); }
          50% { box-shadow: 0 0 30px rgba(200, 164, 78, 0.5), inset 0 0 15px rgba(200, 164, 78, 0.2); }
        }
      `}</style>
    </div>
  );
};

export default App;
