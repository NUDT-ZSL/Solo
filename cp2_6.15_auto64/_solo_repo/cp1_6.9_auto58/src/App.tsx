import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import type { GamePhase } from './types';

interface UIState {
  level: number;
  elapsed: number;
  crystalsTotal: number;
  crystalsActivated: number;
  phase: GamePhase;
  finalLevel: number;
  totalTime: number;
}

const DEFAULT_UI: UIState = {
  level: 1,
  elapsed: 0,
  crystalsTotal: 0,
  crystalsActivated: 0,
  phase: 'levelBanner',
  finalLevel: 1,
  totalTime: 0,
};

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [ui, setUI] = useState<UIState>(DEFAULT_UI);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayType, setOverlayType] = useState<'gameover' | 'victory' | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const engine = new GameEngine(canvas, container, {
      onUIUpdate: (u) => {
        setUI(u);
        if (u.phase === 'gameover' && !showOverlay) {
          setTimeout(() => {
            setOverlayType('gameover');
            setShowOverlay(true);
          }, 600);
        } else if (u.phase === 'victory' && !showOverlay) {
          setTimeout(() => {
            setOverlayType('victory');
            setShowOverlay(true);
          }, 1500);
        }
      },
    });

    engineRef.current = engine;
    engine.start();

    const onFirstInteraction = () => {
      engine.resumeAudio();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction, true);
    };
    window.addEventListener('pointerdown', onFirstInteraction);
    window.addEventListener('keydown', onFirstInteraction, true);

    return () => {
      engine.destroy();
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction, true);
    };
  }, []);

  const handleRestart = () => {
    setShowOverlay(false);
    setOverlayType(null);
    engineRef.current?.restart();
  };

  const crystalDots = [];
  for (let i = 0; i < ui.crystalsTotal; i++) {
    crystalDots.push(
      <span
        key={i}
        className="crystal-dot"
        data-active={i < ui.crystalsActivated}
      />,
    );
  }

  return (
    <div className="vm-root">
      <div className="vm-app">
        <header className="vm-hud">
          <div className="vm-hud__group">
            <div className="vm-hud__badge vm-hud__badge--level">
              <span className="vm-hud__label">关卡</span>
              <span className="vm-hud__value">{ui.level} / 5</span>
            </div>
            <div className="vm-hud__badge vm-hud__badge--time">
              <span className="vm-hud__label">用时</span>
              <span className="vm-hud__value">{formatTime(ui.elapsed)}</span>
            </div>
          </div>
          <div className="vm-hud__group">
            <div className="vm-hud__badge vm-hud__badge--crystals">
              <span className="vm-hud__label">水晶</span>
              <div className="vm-hud__crystals">{crystalDots}</div>
            </div>
          </div>
        </header>

        <div className="vm-container" ref={containerRef}>
          <div className="vm-frame" />
          <canvas ref={canvasRef} className="vm-canvas" />
        </div>

        <footer className="vm-tips">
          <span className="vm-tip">
            <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
            <span>或 WASD 移动</span>
          </span>
          <span className="vm-tip">
            <kbd>R</kbd>
            <span>失败后重新开始</span>
          </span>
        </footer>

        {showOverlay && (
          <div className="vm-overlay" data-type={overlayType}>
            <div className="vm-overlay__panel">
              {overlayType === 'victory' ? (
                <>
                  <div className="vm-overlay__title vm-overlay__title--win">
                    恭喜通关！
                  </div>
                  <div className="vm-overlay__stats">
                    <div className="vm-overlay__stat">
                      <span className="vm-overlay__stat-label">通关层数</span>
                      <span className="vm-overlay__stat-value">
                        {ui.finalLevel} / 5
                      </span>
                    </div>
                    <div className="vm-overlay__stat">
                      <span className="vm-overlay__stat-label">总用时</span>
                      <span className="vm-overlay__stat-value">
                        {formatTime(ui.totalTime)}
                      </span>
                    </div>
                  </div>
                  <p className="vm-overlay__desc">
                    你已解开所有藤蔓迷宫，神奇种子在森林深处闪耀永恒的光芒。
                  </p>
                </>
              ) : (
                <>
                  <div className="vm-overlay__title vm-overlay__title--lose">
                    游戏结束
                  </div>
                  <div className="vm-overlay__stats">
                    <div className="vm-overlay__stat">
                      <span className="vm-overlay__stat-label">到达关卡</span>
                      <span className="vm-overlay__stat-value">
                        第 {ui.finalLevel} 关
                      </span>
                    </div>
                    <div className="vm-overlay__stat">
                      <span className="vm-overlay__stat-label">坚持时间</span>
                      <span className="vm-overlay__stat-value">
                        {formatTime(ui.totalTime)}
                      </span>
                    </div>
                  </div>
                  <p className="vm-overlay__desc">
                    魔法种子掉落在了未知的黑暗之中，藤蔓无法在那里生长。
                  </p>
                </>
              )}
              <button className="vm-btn" onClick={handleRestart}>
                {overlayType === 'victory' ? '再来一次' : '重新挑战'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
