import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { SeasonForest } from './components/SeasonForest';
import { UIOverlay } from './components/UIOverlay';
import type { SeasonName } from './utils/seasonConfig';
import { animateValue, easeInOutCubic } from './utils/interpolate';

function App() {
  const [currentSeason, setCurrentSeason] = useState<SeasonName>('summer');
  const [transitionProgress, setTransitionProgress] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);
  const animHandleRef = useRef<{ cancel: () => void } | null>(null);
  const pendingSeasonRef = useRef<SeasonName | null>(null);

  const startTransition = useCallback((target: SeasonName) => {
    if (animHandleRef.current) {
      animHandleRef.current.cancel();
    }
    setIsTransitioning(true);
    setCurrentSeason(target);
    setTransitionProgress(0);
    setTransitionKey((k) => k + 1);

    animHandleRef.current = animateValue(
      1500,
      (_, eased) => {
        setTransitionProgress(eased);
      },
      () => {
        setIsTransitioning(false);
        setTransitionProgress(1);
        if (pendingSeasonRef.current && pendingSeasonRef.current !== target) {
          const next = pendingSeasonRef.current;
          pendingSeasonRef.current = null;
          startTransition(next);
        }
      },
      easeInOutCubic,
    );
  }, []);

  const handleSeasonChange = useCallback(
    (season: SeasonName) => {
      if (season === currentSeason && !isTransitioning) return;
      if (isTransitioning) {
        pendingSeasonRef.current = season;
        return;
      }
      startTransition(season);
    },
    [currentSeason, isTransitioning, startTransition],
  );

  useEffect(() => {
    return () => {
      if (animHandleRef.current) {
        animHandleRef.current.cancel();
      }
    };
  }, []);

  const appContainerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    minWidth: 1000,
    minHeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    overflow: 'hidden',
    position: 'relative',
  };

  const canvasWrapStyle: React.CSSProperties = {
    width: 'calc(100% - 48px)',
    height: 'calc(100% - 48px)',
    minWidth: 1000,
    minHeight: 700,
    border: '1.5px solid #f3e8d6',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
    position: 'relative',
    background: '#0f172a',
  };

  const titleStyle: React.CSSProperties = {
    position: 'absolute',
    top: 24,
    left: 24,
    color: '#f3e8d6',
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: 1.5,
    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: 5,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    pointerEvents: 'none',
  };

  const subtitleStyle: React.CSSProperties = {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 400,
    letterSpacing: 2,
    color: 'rgba(243, 232, 214, 0.55)',
  };

  return (
    <div style={appContainerStyle}>
      <div style={canvasWrapStyle}>
        <div style={titleStyle}>
          森林季节模拟器
          <div style={subtitleStyle}>FOREST SEASON SIMULATOR</div>
        </div>
        <Canvas
          shadows
          camera={{ position: [4.5, 3.5, 4.5], fov: 50 }}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <SeasonForest
            currentSeason={currentSeason}
            transitionProgress={transitionProgress}
          />
        </Canvas>
        <UIOverlay
          currentSeason={currentSeason}
          onSeasonChange={handleSeasonChange}
          isTransitioning={isTransitioning}
          transitionKey={transitionKey}
        />
      </div>
    </div>
  );
}

export default App;
