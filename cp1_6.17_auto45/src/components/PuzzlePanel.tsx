import { useState, useEffect, useMemo } from 'react';
import { useGameStore } from '../store';

interface Props {
  puzzleId: string;
}

export default function PuzzlePanel({ puzzleId }: Props) {
  const { rooms, currentRoomId, closePuzzle, solvePuzzle, checkPuzzle } = useGameStore();
  const [showUnlock, setShowUnlock] = useState(false);

  const room = rooms.find(r => r.id === currentRoomId);
  const puzzle = room?.puzzles.find(p => p.id === puzzleId);

  if (!puzzle) return null;

  const handleSolve = () => {
    setShowUnlock(true);
    setTimeout(() => {
      solvePuzzle(puzzleId);
    }, 500);
  };

  return (
    <>
      <div className="puzzle-overlay" onClick={closePuzzle}>
        <div
          className={`puzzle-panel ${showUnlock ? 'unlock-shake' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <button className="puzzle-close" onClick={closePuzzle}>✕</button>
          <h2 className="puzzle-title">{puzzle.name}</h2>
          {puzzle.hint && <p className="puzzle-hint">💡 {puzzle.hint}</p>}

          {puzzle.type === 'jigsaw' && (
            <JigsawPuzzle puzzleId={puzzleId} data={puzzle.data} onSolved={handleSolve} checkPuzzle={checkPuzzle} />
          )}
          {puzzle.type === 'password' && (
            <PasswordPuzzle puzzleId={puzzleId} data={puzzle.data} onSolved={handleSolve} checkPuzzle={checkPuzzle} />
          )}
          {puzzle.type === 'connect' && (
            <ConnectPuzzle puzzleId={puzzleId} data={puzzle.data} onSolved={handleSolve} checkPuzzle={checkPuzzle} />
          )}
          {puzzle.type === 'mechanism' && (
            <MechanismPuzzle puzzleId={puzzleId} data={puzzle.data} onSolved={handleSolve} checkPuzzle={checkPuzzle} />
          )}
        </div>
      </div>
      {showUnlock && <UnlockAnimation />}
    </>
  );
}

function UnlockAnimation() {
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      const distance = 80 + Math.random() * 100;
      return {
        id: i,
        tx: `${Math.cos(angle) * distance}px`,
        ty: `${Math.sin(angle) * distance}px`,
        delay: Math.random() * 0.1
      };
    }), []);

  return (
    <div className="unlock-animation">
      <div className="unlock-particles">
        {particles.map(p => (
          <div
            key={p.id}
            className="unlock-particle"
            style={{
              left: '50%',
              top: '50%',
              '--tx': p.tx,
              '--ty': p.ty,
              animationDelay: `${p.delay}s`
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function JigsawPuzzle({
  puzzleId,
  data,
  onSolved,
  checkPuzzle
}: {
  puzzleId: string;
  data: any;
  onSolved: () => void;
  checkPuzzle: (id: string, a: any) => boolean;
}) {
  const total = data.pieces || 8;
  const solution = data.solution || Array.from({ length: total }, (_, i) => i);
  const [pieces, setPieces] = useState<number[]>(() => {
    const arr = Array.from({ length: total }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });
  const [selected, setSelected] = useState<number | null>(null);

  const symbols = ['🏰', '🦇', '🕯️', '👻', '🔮', '⚰️', '🗝️', '💀'];

  const handleClick = (idx: number) => {
    if (selected === null) {
      setSelected(idx);
    } else {
      const newPieces = [...pieces];
      [newPieces[selected], newPieces[idx]] = [newPieces[idx], newPieces[selected]];
      setPieces(newPieces);
      setSelected(null);
      if (checkPuzzle(puzzleId, newPieces)) {
        setTimeout(onSolved, 300);
      }
    }
  };

  return (
    <>
      <div className="jigsaw-container">
        {pieces.map((p, idx) => (
          <div
            key={idx}
            className={`jigsaw-piece ${selected === idx ? 'selected' : ''} ${p === solution[idx] ? 'correct' : ''}`}
            onClick={() => handleClick(idx)}
          >
            {symbols[p % symbols.length]}
          </div>
        ))}
      </div>
      <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: '#8a8a9e' }}>
        点击两个方块交换位置，按正确顺序排列
      </p>
    </>
  );
}

function PasswordPuzzle({
  puzzleId,
  data,
  onSolved,
  checkPuzzle
}: {
  puzzleId: string;
  data: any;
  onSolved: () => void;
  checkPuzzle: (id: string, a: any) => boolean;
}) {
  const length = data.length || 4;
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const [activeIdx, setActiveIdx] = useState(0);
  const [shake, setShake] = useState(false);

  const handleDigit = (d: string) => {
    if (d === 'DEL') {
      const newDigits = [...digits];
      newDigits[activeIdx] = '';
      setDigits(newDigits);
      return;
    }
    if (d === 'CLR') {
      setDigits(Array(length).fill(''));
      setActiveIdx(0);
      return;
    }
    const newDigits = [...digits];
    newDigits[activeIdx] = d;
    setDigits(newDigits);
    if (activeIdx < length - 1) {
      setActiveIdx(activeIdx + 1);
    } else {
      const answer = newDigits.join('');
      if (checkPuzzle(puzzleId, answer)) {
        setTimeout(onSolved, 200);
      } else {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits(Array(length).fill(''));
          setActiveIdx(0);
          useGameStore.getState().setErrorFlash(true);
          setTimeout(() => useGameStore.getState().setErrorFlash(false), 300);
        }, 400);
      }
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDigit('DEL');
      } else if (e.key === 'Escape') {
        handleDigit('CLR');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [digits, activeIdx]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

  return (
    <div className="password-container">
      <div className={`password-display ${shake ? 'unlock-shake' : ''}`}>
        {digits.map((d, i) => (
          <div key={i} className={`password-digit ${i === activeIdx ? 'active' : ''}`}>
            {d || '_'}
          </div>
        ))}
      </div>
      <div className="password-keypad">
        {keys.map(k => (
          <button
            key={k}
            className={`keypad-btn ${k === 'CLR' || k === 'DEL' ? 'action' : ''}`}
            onClick={() => handleDigit(k)}
          >
            {k === 'DEL' ? '⌫' : k === 'CLR' ? 'C' : k}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConnectPuzzle({
  puzzleId,
  data,
  onSolved,
  checkPuzzle
}: {
  puzzleId: string;
  data: any;
  onSolved: () => void;
  checkPuzzle: (id: string, a: any) => boolean;
}) {
  const pairs = data.pairs as [string, string][];
  const leftNodes = useMemo(() => pairs.map(p => ({ id: p[0], label: getNodeLabel(p[0]) })), [pairs]);
  const rightNodes = useMemo(() => {
    const arr = pairs.map(p => ({ id: p[1], label: getNodeLabel(p[1]) }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [pairs]);

  const [connections, setConnections] = useState<[string, string][]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);

  function getNodeLabel(id: string): { icon: string; color: string } {
    const map: Record<string, { icon: string; color: string }> = {
      a: { icon: '🌙', color: '#4a6fa5' },
      b: { icon: '⭐', color: '#ffd700' },
      c: { icon: '🔥', color: '#e94560' },
      d: { icon: '💧', color: '#00bcd4' },
      e: { icon: '🍃', color: '#4caf50' },
      f: { icon: '⛰️', color: '#795548' },
      red: { icon: '🔴', color: '#f44336' },
      blue: { icon: '🔵', color: '#2196f3' },
      green: { icon: '🟢', color: '#4caf50' }
    };
    return map[id] || { icon: '?', color: '#888' };
  }

  const handleLeftClick = (id: string) => {
    if (connections.some(c => c[0] === id)) return;
    setSelectedLeft(id);
  };

  const handleRightClick = (id: string) => {
    if (!selectedLeft) return;
    if (connections.some(c => c[1] === id)) return;
    const newConnections: [string, string][] = [...connections, [selectedLeft, id]];
    setConnections(newConnections);
    setSelectedLeft(null);
    if (newConnections.length === pairs.length) {
      if (checkPuzzle(puzzleId, newConnections)) {
        setTimeout(onSolved, 300);
      } else {
        setTimeout(() => {
          setConnections([]);
          useGameStore.getState().setErrorFlash(true);
          setTimeout(() => useGameStore.getState().setErrorFlash(false), 300);
        }, 500);
      }
    }
  };

  const nodePositions = useMemo(() => {
    const result: Record<string, { x: number; y: number }> = {};
    leftNodes.forEach((n, i) => {
      result[n.id] = { x: 60, y: 50 + i * 70 };
    });
    rightNodes.forEach((n, i) => {
      result[n.id] = { x: 380, y: 50 + i * 70 };
    });
    return result;
  }, [leftNodes, rightNodes]);

  return (
    <div className="connect-container" style={{ height: `${50 + pairs.length * 70 + 20}px` }}>
      <svg className="connect-svg">
        {connections.map(([a, b], i) => {
          const pa = nodePositions[a];
          const pb = nodePositions[b];
          const isCorrect = pairs.some(p =>
            (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a)
          );
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={isCorrect ? '#00c853' : '#e94560'}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {leftNodes.map(n => {
        const connected = connections.some(c => c[0] === n.id);
        return (
          <div
            key={n.id}
            className={`connect-node ${selectedLeft === n.id ? 'selected' : ''} ${connected ? 'connected' : ''}`}
            style={{ left: nodePositions[n.id].x - 22, top: nodePositions[n.id].y - 22, borderColor: n.label.color }}
            onClick={() => handleLeftClick(n.id)}
          >
            {n.label.icon}
          </div>
        );
      })}
      {rightNodes.map(n => {
        const connected = connections.some(c => c[1] === n.id);
        return (
          <div
            key={n.id}
            className={`connect-node ${connected ? 'connected' : ''}`}
            style={{ left: nodePositions[n.id].x - 22, top: nodePositions[n.id].y - 22, borderColor: n.label.color }}
            onClick={() => handleRightClick(n.id)}
          >
            {n.label.icon}
          </div>
        );
      })}
      <p style={{ position: 'absolute', bottom: '-10px', left: 0, right: 0, textAlign: 'center', fontSize: '0.85rem', color: '#8a8a9e' }}>
        先点左侧节点，再点右侧对应节点
      </p>
    </div>
  );
}

function MechanismPuzzle({
  puzzleId,
  data,
  onSolved,
  checkPuzzle
}: {
  puzzleId: string;
  data: any;
  onSolved: () => void;
  checkPuzzle: (id: string, a: any) => boolean;
}) {
  const steps = data.steps || 3;
  const correctSequence = useMemo(() => {
    const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, steps);
  }, [steps, puzzleId]);

  const icons = ['🔮', '⚙️', '🔑', '💎', '📜', '🕯️', '🗝️', '⚰️', '💀'];
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [showingSequence, setShowingSequence] = useState(true);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [correctSteps, setCorrectSteps] = useState(0);

  useEffect(() => {
    if (!showingSequence) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < correctSequence.length) {
        setHighlightedIdx(correctSequence[i]);
        setTimeout(() => setHighlightedIdx(null), 500);
        i++;
      } else {
        clearInterval(interval);
        setShowingSequence(false);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [showingSequence, correctSequence]);

  const handleClick = (idx: number) => {
    if (showingSequence) return;
    const newSequence = [...playerSequence, idx];
    const step = newSequence.length - 1;
    if (newSequence[step] !== correctSequence[step]) {
      setPlayerSequence([]);
      setCorrectSteps(0);
      setShowingSequence(true);
      useGameStore.getState().setErrorFlash(true);
      setTimeout(() => useGameStore.getState().setErrorFlash(false), 300);
      return;
    }
    setPlayerSequence(newSequence);
    setCorrectSteps(newSequence.length);
    setHighlightedIdx(idx);
    setTimeout(() => setHighlightedIdx(null), 200);
    if (newSequence.length === correctSequence.length) {
      if (checkPuzzle(puzzleId, correctSequence.length)) {
        setTimeout(onSolved, 300);
      }
    }
  };

  return (
    <div className="mechanism-container">
      <p style={{ fontSize: '0.9rem', color: showingSequence ? '#ffd700' : '#8a8a9e' }}>
        {showingSequence ? '👀 记住顺序...' : '🎯 按刚才的顺序点击'}
      </p>
      <div className="mechanism-progress">
        {Array.from({ length: steps }).map((_, i) => (
          <div
            key={i}
            className={`mechanism-dot ${i < correctSteps ? 'correct' : (i === correctSteps && !showingSequence ? 'active' : '')}`}
          />
        ))}
      </div>
      <div className="mechanism-buttons">
        {icons.map((icon, idx) => (
          <button
            key={idx}
            className={`mechanism-btn ${highlightedIdx === idx ? 'active' : ''} ${correctSteps > 0 && playerSequence.includes(idx) ? 'correct' : ''}`}
            onClick={() => handleClick(idx)}
            disabled={showingSequence}
          >
            {icon}
          </button>
        ))}
      </div>
      {!showingSequence && (
        <button
          className="puzzle-submit"
          onClick={() => { setShowingSequence(true); setPlayerSequence([]); setCorrectSteps(0); }}
        >
          🔄 重新演示
        </button>
      )}
    </div>
  );
}
