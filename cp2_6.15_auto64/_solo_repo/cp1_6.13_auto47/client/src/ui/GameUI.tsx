import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ScoreEntry } from '../game/types';

interface GameUIProps {
  gameState: 'menu' | 'playing' | 'gameover';
  score: number;
  lives: number;
  speedUpActive: boolean;
  onStart: () => void;
  onRestart: () => void;
  onSubmitScore: (name: string) => void;
}

const btnStyle: React.CSSProperties = {
  width: 160,
  height: 48,
  border: 'none',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: '#ffffff',
  fontSize: 18,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
  fontFamily: 'sans-serif',
};

export const GameUI: React.FC<GameUIProps> = ({
  gameState,
  score,
  lives,
  speedUpActive,
  onStart,
  onRestart,
  onSubmitScore,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await axios.get<ScoreEntry[]>('/api/scores');
      setLeaderboard(res.data);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    if (showLeaderboard) {
      fetchLeaderboard();
    }
  }, [showLeaderboard, fetchLeaderboard]);

  const handleSubmit = async () => {
    if (!playerName.trim() || submitting) return;
    setSubmitting(true);
    try {
      await axios.post('/api/scores', { name: playerName.trim(), score });
    } catch {}
    setSubmitting(false);
    onSubmitScore(playerName.trim());
    setPlayerName('');
  };

  const medalIcons = ['🥇', '🥈', '🥉'];

  if (gameState === 'playing') {
    return (
      <>
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          color: '#ffffff',
          fontSize: 24,
          fontFamily: 'sans-serif',
          textShadow: '0 0 8px rgba(0,0,0,0.7)',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          Score: {score}
        </div>
        <div style={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 6,
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              fontSize: 22,
              opacity: i < lives ? 1 : 0.25,
              transition: 'opacity 0.2s',
            }}>❤️</span>
          ))}
        </div>
        {speedUpActive && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#eab308',
            fontSize: 48,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            textShadow: '0 0 20px #eab308',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'speedUpAnim 1s ease-out forwards',
          }}>
            Speed Up!
          </div>
        )}
      </>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        background: '#00000080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
      }}>
        <div style={{
          background: '#1e293b',
          borderRadius: 16,
          padding: '32px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          minWidth: 300,
        }}>
          <div style={{
            color: '#ffffff',
            fontSize: 32,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
          }}>
            Game Over
          </div>
          <div style={{
            color: '#cbd5e1',
            fontSize: 20,
            fontFamily: 'sans-serif',
          }}>
            Final Score: {score}
          </div>
          <input
            type="text"
            maxLength={10}
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter name..."
            style={{
              background: '#374151',
              color: '#ffffff',
              border: '2px solid #4b5563',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 16,
              fontFamily: 'sans-serif',
              outline: 'none',
              width: '100%',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={e => e.currentTarget.style.borderColor = '#4b5563'}
          />
          <button
            onClick={handleSubmit}
            disabled={!playerName.trim() || submitting}
            style={{
              ...btnStyle,
              opacity: !playerName.trim() || submitting ? 0.5 : 1,
              width: '100%',
            }}
            onMouseEnter={e => {
              if (playerName.trim()) e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={e => e.currentTarget.style.filter = ''}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
          >
            Submit Score
          </button>
          <div style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'sans-serif' }}>
            Press R to restart
          </div>
          <button
            onClick={onRestart}
            style={{
              ...btnStyle,
              background: 'linear-gradient(135deg, #475569, #334155)',
              width: '100%',
            }}
            onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={e => e.currentTarget.style.filter = ''}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={e => e.currentTarget.style.transform = ''}
          >
            Restart
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 20,
    }}>
      <div style={{
        fontSize: 56,
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 30px rgba(56,189,248,0.3)',
        marginBottom: 40,
        letterSpacing: 2,
      }}>
        GravityDrift
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <button
          onClick={onStart}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = ''}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = ''}
        >
          Start Game
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          style={btnStyle}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
          onMouseLeave={e => e.currentTarget.style.filter = ''}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
          onMouseUp={e => e.currentTarget.style.transform = ''}
        >
          Leaderboard
        </button>
      </div>
      <div style={{
        color: '#94a3b8',
        fontSize: 14,
        fontFamily: 'sans-serif',
        marginTop: 32,
        textAlign: 'center',
        lineHeight: 1.6,
      }}>
        WASD to move &middot; Collect green orbs &middot; Avoid debris
      </div>

      {showLeaderboard && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 30,
        }}
          onClick={() => setShowLeaderboard(false)}
        >
          <div
            style={{
              background: '#0f172a80',
              borderRadius: 16,
              padding: '28px 36px',
              minWidth: 340,
              maxWidth: 400,
              backdropFilter: 'blur(10px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              color: '#ffffff',
              fontSize: 22,
              fontWeight: 'bold',
              fontFamily: 'sans-serif',
              marginBottom: 16,
              textAlign: 'center',
            }}>
              Leaderboard
            </div>
            {leaderboard.length === 0 ? (
              <div style={{ color: '#64748b', textAlign: 'center', fontFamily: 'sans-serif' }}>
                No scores yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.map((entry, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#cbd5e1',
                    fontFamily: 'sans-serif',
                    fontSize: 15,
                    padding: '4px 0',
                  }}>
                    <span>
                      {i < 3 ? medalIcons[i] : `${i + 1}.`} {entry.name}
                    </span>
                    <span style={{ fontWeight: 600 }}>{entry.score}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowLeaderboard(false)}
              style={{
                ...btnStyle,
                marginTop: 20,
                width: '100%',
                background: 'linear-gradient(135deg, #475569, #334155)',
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={e => e.currentTarget.style.filter = ''}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
