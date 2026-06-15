import { useGameStore } from './store';
import { RotateCcw, Lightbulb } from 'lucide-react';
import type { GameEngine } from './GameEngine';
import { LEVELS } from './LevelConfig';

interface UILayerProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
}

export default function UILayer({ engineRef }: UILayerProps) {
  const currentLevel = useGameStore((s) => s.currentLevel);
  const steps = useGameStore((s) => s.steps);
  const phase = useGameStore((s) => s.phase);
  const totalLevels = useGameStore((s) => s.totalLevels);

  const levelName = LEVELS[currentLevel]?.name || '';
  const isPlaying = phase === 'playing' || phase === 'idle';
  const isPortal = phase === 'portal';
  const isComplete = phase === 'complete';

  const handleReset = () => {
    const store = useGameStore.getState();
    store.resetLevel();
    engineRef.current?.resetCurrentLevel();
  };

  const handleHint = () => {
    engineRef.current?.triggerHint();
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{ fontFamily: "'Orbitron', 'Rajdhani', monospace" }}>
      {isPlaying && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 pointer-events-auto">
          <div
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:px-6 sm:py-4"
          >
            <div className="text-right">
              <div
                className="text-lg sm:text-xl font-bold tracking-wider"
                style={{ color: '#00FFD1', textShadow: '0 0 10px rgba(0,255,209,0.5)' }}
              >
                LV.{currentLevel + 1}
              </div>
              <div className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {levelName}
              </div>
              <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                STEPS: <span style={{ color: '#FF00AA' }}>{steps}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPlaying && (
        <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex flex-col gap-3 pointer-events-auto">
          <button
            onClick={handleReset}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-all duration-200 group"
            title="重置关卡"
          >
            <RotateCcw
              size={20}
              className="text-white/60 group-hover:text-[#00FFD1] transition-colors"
            />
          </button>
          <button
            onClick={handleHint}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-white/10 transition-all duration-200 group"
            title="提示"
          >
            <Lightbulb
              size={20}
              className="text-white/60 group-hover:text-[#FFD700] transition-colors"
            />
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 pointer-events-none">
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            {currentLevel + 1} / {totalLevels}
          </div>
        </div>
      )}

      {isPortal && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-2xl sm:text-3xl font-bold tracking-widest animate-pulse"
            style={{
              color: '#00FFD1',
              textShadow: '0 0 20px rgba(0,255,209,0.8), 0 0 40px rgba(0,255,209,0.4)',
              fontFamily: "'Orbitron', monospace",
            }}
          >
            PORTAL OPENING
          </div>
        </div>
      )}

      {isComplete && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => {
              const store = useGameStore.getState();
              store.setCurrentLevel(0);
              engineRef.current?.loadLevel(0);
            }}
            className="backdrop-blur-md bg-[#00FFD1]/10 border border-[#00FFD1]/30 rounded-xl px-8 py-3 hover:bg-[#00FFD1]/20 transition-all duration-300"
            style={{ color: '#00FFD1', fontFamily: "'Orbitron', monospace" }}
          >
            RESTART
          </button>
        </div>
      )}
    </div>
  );
}
