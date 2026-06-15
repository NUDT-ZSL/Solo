import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameBoard from './GameBoard';
import {
  generateBoard,
  rotateCell,
  updateAnimations,
  checkPath,
  markUnlocked,
  expandBoard,
  resetBoard,
  getHintCell,
  highlightCell,
  clearHighlights,
  spawnUnlockParticles,
  spawnVictoryParticles,
  updateParticles,
  Board,
  Particle,
} from './gameLogic';
import { audioEngine } from './audioEngine';

const TOTAL_LEVELS = 3;
const HINT_DURATION = 1.5;
const FADE_HALF = 0.25;
const HINT_COOLDOWN = 3;

const App: React.FC = () => {
  const [board, setBoard] = useState<Board>(() => generateBoard(1));
  const [moves, setMoves] = useState(0);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hintTimer, setHintTimer] = useState(0);
  const [hintCooldown, setHintCooldown] = useState(0);
  const [victory, setVictory] = useState(false);
  const [victoryProgress, setVictoryProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const [fadeAlpha, setFadeAlpha] = useState(1);
  const [fadePhase, setFadePhase] = useState<'out' | 'in' | null>(null);
  const boardRef = useRef(board);
  boardRef.current = board;
  const particlesRef = useRef(particles);
  particlesRef.current = particles;

  useEffect(() => {
    audioEngine.ensureContext();
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      stepFrame(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepFrame = (dt: number) => {
    const b = boardRef.current;
    const anim = updateAnimations(b, dt);
    let nextBoard = anim.board;
    let boardChanged = anim.rotationCompleted.length > 0 || b !== nextBoard;

    if (hintCooldown > 0) {
      setHintCooldown(v => Math.max(0, v - dt));
    }
    if (hintTimer > 0) {
      const nv = Math.max(0, hintTimer - dt);
      setHintTimer(nv);
      if (nv === 0) {
        nextBoard = clearHighlights(nextBoard);
        boardChanged = true;
      }
    }

    if (fading && fadePhase) {
      if (fadePhase === 'out') {
        const a = Math.max(0, fadeAlpha - dt / FADE_HALF);
        setFadeAlpha(a);
        if (a === 0) {
          const reset = resetBoard(boardRef.current);
          setBoard(reset);
          boardRef.current = reset;
          setFadePhase('in');
          audioEngine.playReset();
        }
      } else if (fadePhase === 'in') {
        const a = Math.min(1, fadeAlpha + dt / FADE_HALF);
        setFadeAlpha(a);
        if (a === 1) {
          setFading(false);
          setFadePhase(null);
        }
      }
    }

    if (victory) {
      const vp = Math.min(1, victoryProgress + dt / 3);
      setVictoryProgress(vp);
    }

    if (particlesRef.current.length > 0) {
      const np = updateParticles(particlesRef.current, dt, 30, 100);
      setParticles(np);
    }

    if (boardChanged) {
      setBoard(nextBoard);
      boardRef.current = nextBoard;
      if (anim.rotationCompleted.length > 0 && !nextBoard.presolved) {
        setTimeout(() => {
          const cur = boardRef.current;
          if (checkPath(cur)) {
            handleLevelComplete(cur);
          }
        }, 30);
      }
    }
  };

  const handleLevelComplete = useCallback((curBoard: Board) => {
    const unlocked = markUnlocked(curBoard);
    setBoard(unlocked);
    boardRef.current = unlocked;
    audioEngine.playUnlock(curBoard.level);

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const burst = spawnUnlockParticles(cx, cy, 30 + curBoard.level * 10);
    setParticles(prev => [...prev, ...burst].slice(-120));

    if (curBoard.level >= TOTAL_LEVELS) {
      setTimeout(() => {
        setVictory(true);
        audioEngine.playFinalVictory();
        const vps = spawnVictoryParticles(cx, cy, 100);
        setParticles(prev => [...prev, ...vps].slice(-200));
      }, 600);
    } else {
      setTimeout(() => {
        const expanded = expandBoard(unlocked);
        setBoard(expanded);
        boardRef.current = expanded;
      }, 900);
    }
  }, []);

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      audioEngine.resume();
      const cur = boardRef.current;
      if (cur.presolved || victory) return;
      const cell = cur.cells[y]?.[x];
      if (!cell || cell.isCenter || cell.rotating) return;
      audioEngine.playRotate();
      const nb = rotateCell(cur, x, y);
      setBoard(nb);
      boardRef.current = nb;
      setMoves(m => m + 1);
    },
    [victory]
  );

  const handleReset = useCallback(() => {
    audioEngine.resume();
    if (fading || victory) return;
    audioEngine.playClick();
    setFading(true);
    setFadePhase('out');
    setFadeAlpha(1);
  }, [fading, victory]);

  const handleHint = useCallback(() => {
    audioEngine.resume();
    if (hintsRemaining <= 0 || hintCooldown > 0 || victory) return;
    const cur = boardRef.current;
    if (cur.presolved) return;
    const hint = getHintCell(cur);
    if (!hint) return;
    audioEngine.playHint();
    const nb = highlightCell(cur, hint);
    setBoard(nb);
    boardRef.current = nb;
    setHintTimer(HINT_DURATION);
    setHintCooldown(HINT_COOLDOWN);
    setHintsRemaining(h => h - 1);
  }, [hintsRemaining, hintCooldown, victory]);

  const handleRestart = useCallback(() => {
    audioEngine.playClick();
    const nb = generateBoard(1);
    setBoard(nb);
    boardRef.current = nb;
    setMoves(0);
    setHintsRemaining(3);
    setParticles([]);
    setHintTimer(0);
    setHintCooldown(0);
    setVictory(false);
    setVictoryProgress(0);
    setFading(false);
    setFadePhase(null);
    setFadeAlpha(1);
  }, []);

  return (
    <div className="app-root">
      <div className="app-bg" />
      <div className="app-content">
        <header className="top-bar">
          <div className="top-group left">
            <div className="stat">
              <span className="stat-label">层数</span>
              <span className="stat-value">
                {board.level}/{TOTAL_LEVELS}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">步数</span>
              <span className="stat-value">{moves}</span>
            </div>
          </div>

          <div className="logo">
            <span className="logo-symbol">✦</span>
            <span className="logo-text">秘语魔方</span>
            <span className="logo-sub">符文阵解谜</span>
          </div>

          <div className="top-group right">
            <div className="stat">
              <span className="stat-label">提示</span>
              <span className="stat-value highlight">{hintsRemaining}</span>
            </div>
          </div>
        </header>

        <main className="board-wrap">
          <GameBoard
            board={board}
            particles={particles}
            hintTimer={hintTimer}
            victory={victory}
            victoryProgress={victoryProgress}
            fading={fading}
            fadeAlpha={fadeAlpha}
            onCellClick={handleCellClick}
          />
        </main>

        <footer className="bottom-bar">
          <div className="btn-wrap">
            <button
              className="rune-btn"
              onClick={handleReset}
              disabled={fading || victory}
            >
              <span className="btn-icon">⟳</span>
              <span>重置</span>
            </button>

            <button
              className="rune-btn"
              onClick={handleHint}
              disabled={hintsRemaining <= 0 || hintCooldown > 0 || victory}
              style={{ position: 'relative', overflow: 'hidden' }}
            >
              <span className="btn-icon">✧</span>
              <span>提示 {hintsRemaining > 0 ? `(${hintsRemaining})` : ''}</span>
              {hintCooldown > 0 && (
                <svg
                  className="cooldown-svg"
                  viewBox="0 0 36 36"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    transform: 'rotate(-90deg)',
                  }}
                >
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="2.5"
                    strokeDasharray={2 * Math.PI * 16}
                    strokeDashoffset={
                      2 * Math.PI * 16 * (1 - hintCooldown / HINT_COOLDOWN)
                    }
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>

            {victory && victoryProgress > 0.85 && (
              <button className="rune-btn victory-btn" onClick={handleRestart}>
                <span className="btn-icon">✺</span>
                <span>再来一局</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;
