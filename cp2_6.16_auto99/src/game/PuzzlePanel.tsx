import { useState, useEffect, useMemo } from 'react';
import { usePuzzle, useSubmitSolution } from '@/data/hooks';
import type { ArtifactReward } from '@/data/types';
import './PuzzlePanel.css';

const RUNE_SYMBOLS = [
  'ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ',
  'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ',
];

interface RuneState {
  status: 'idle' | 'selected' | 'correct' | 'wrong';
}

interface PuzzlePanelProps {
  artifactId: string | null;
  onClose: () => void;
  onSuccess: (reward: ArtifactReward) => void;
}

export default function PuzzlePanel({ artifactId, onClose, onSuccess }: PuzzlePanelProps) {
  const { puzzle, loading: puzzleLoading } = usePuzzle(artifactId);
  const { submitting, submit } = useSubmitSolution();
  const [selectedSequence, setSelectedSequence] = useState<number[]>([]);
  const [runeStates, setRuneStates] = useState<RuneState[]>(
    Array(12).fill(null).map(() => ({ status: 'idle' as const }))
  );
  const [shakeRune, setShakeRune] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setSelectedSequence([]);
    setRuneStates(Array(12).fill(null).map(() => ({ status: 'idle' as const })));
    setShowSuccess(false);
  }, [artifactId]);

  const maxSequenceLength = puzzle?.correctSequence.length || 4;

  const handleRuneClick = (index: number) => {
    if (submitting || showSuccess) return;
    if (selectedSequence.length >= maxSequenceLength) return;
    if (runeStates[index].status === 'selected') return;

    const newSequence = [...selectedSequence, index + 1];
    setSelectedSequence(newSequence);

    const newStates = [...runeStates];
    newStates[index] = { status: 'selected' };
    setRuneStates(newStates);
  };

  const handleReset = () => {
    if (submitting || showSuccess) return;
    setSelectedSequence([]);
    setRuneStates(Array(12).fill(null).map(() => ({ status: 'idle' as const })));
  };

  const handleSubmit = async () => {
    if (!artifactId || !puzzle || submitting || showSuccess) return;
    if (selectedSequence.length !== maxSequenceLength) return;

    const result = await submit(artifactId, selectedSequence);

    if (result.success && result.reward) {
      const newStates = runeStates.map((state, idx) => {
        if (selectedSequence.includes(idx + 1)) {
          return { status: 'correct' as const };
        }
        return state;
      });
      setRuneStates(newStates);
      setShowSuccess(true);
      setTimeout(() => {
        onSuccess(result.reward!);
      }, 1500);
    } else {
      const wrongRuneIndex = selectedSequence[selectedSequence.length - 1] - 1;
      setShakeRune(wrongRuneIndex);
      const newStates = [...runeStates];
      newStates[wrongRuneIndex] = { status: 'wrong' };
      setRuneStates(newStates);
      setTimeout(() => {
        setShakeRune(null);
        setSelectedSequence([]);
        setRuneStates(Array(12).fill(null).map(() => ({ status: 'idle' as const })));
      }, 600);
    }
  };

  const runePositions = useMemo(() => {
    const positions = [];
    const radius = 180;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return positions;
  }, []);

  if (!artifactId) return null;

  return (
    <div className="puzzle-overlay" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="puzzle-container">
        <button className="puzzle-close-btn" onClick={onClose}>
          ✕
        </button>

        {puzzleLoading ? (
          <div className="puzzle-loading">加载中...</div>
        ) : puzzle ? (
          <>
            <h2 className="puzzle-title">{puzzle.artifactName}</h2>
            <p className="puzzle-type">{puzzle.artifactType}</p>

            <div className="rune-circle">
              {runePositions.map((pos, i) => {
                const state = runeStates[i];
                let runeColor = '#ffd700';
                if (state.status === 'selected') runeColor = '#ffe066';
                if (state.status === 'correct') runeColor = '#2ed573';
                if (state.status === 'wrong') runeColor = '#ff4757';

                return (
                  <button
                    key={i}
                    className={`rune-btn ${shakeRune === i ? 'shake' : ''} ${
                      state.status === 'correct' ? 'correct' : ''
                    } ${state.status === 'wrong' ? 'wrong' : ''} ${
                      state.status === 'selected' ? 'selected' : ''
                    }`}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                      color: runeColor,
                    }}
                    onClick={() => handleRuneClick(i)}
                    disabled={state.status !== 'idle' || submitting || showSuccess}
                  >
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <text
                        x="15"
                        y="22"
                        textAnchor="middle"
                        fontSize="24"
                        fill={runeColor}
                        style={{ filter: state.status !== 'idle' ? `drop-shadow(0 0 8px ${runeColor})` : 'none' }}
                      >
                        {RUNE_SYMBOLS[i]}
                      </text>
                    </svg>
                  </button>
                );
              })}
              <div className="rune-center">
                <div className="sequence-dots">
                  {Array.from({ length: maxSequenceLength }).map((_, i) => (
                    <div
                      key={i}
                      className={`sequence-dot ${i < selectedSequence.length ? 'filled' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="puzzle-actions">
              <button
                className="puzzle-btn reset-btn"
                onClick={handleReset}
                disabled={selectedSequence.length === 0 || submitting || showSuccess}
              >
                重置
              </button>
              <button
                className="puzzle-btn submit-btn"
                onClick={handleSubmit}
                disabled={selectedSequence.length !== maxSequenceLength || submitting || showSuccess}
              >
                {submitting ? '验证中...' : showSuccess ? '成功!' : '确认'}
              </button>
            </div>
          </>
        ) : (
          <div className="puzzle-error">加载谜题失败</div>
        )}
      </div>

      {showSuccess && (
        <div className="success-particles">
          {Array.from({ length: 50 }).map((_, i) => {
            const angle = (i / 50) * Math.PI * 2;
            const dist = 50 + Math.random() * 50;
            return (
              <div
                key={i}
                className="particle"
                style={{
                  left: `calc(50% + ${Math.cos(angle) * dist}px)`,
                  top: `calc(50% + ${Math.sin(angle) * dist}px)`,
                  animationDelay: `${Math.random() * 0.3}s`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
