import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Player, Question, RankingEntry, GamePhase, CATEGORY_LABELS } from '../types';
import { getSocket, disconnectSocket } from '../socket';
import { copyToClipboard } from '../utils';
import Timer from '../components/Timer';

const AnimateNumber = ({ value, duration = 600 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const fromRef = useRef(value);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromRef.current + (value - fromRef.current) * eased);
      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

const ProgressBar = ({ value, max, delay = 0 }: { value: number; max: number; delay?: number }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={pbarStyles.track}>
      <div
        style={{
          ...pbarStyles.fill,
          width: `${pct}%`,
          transition: `width 1.5s cubic-bezier(0.25,0.46,0.45,0.94) ${delay}ms`,
        }}
      />
    </div>
  );
};

const pbarStyles: Record<string, React.CSSProperties> = {
  track: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '4px',
    background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #22d3ee)',
    width: '0%',
  },
};

const GameRoom = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(-1);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealedAnswer, setRevealedAnswer] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [intermissionCount, setIntermissionCount] = useState<number>(0);
  const [showCountdown, setShowCountdown] = useState(false);
  const [finalRanking, setFinalRanking] = useState<RankingEntry[]>([]);
  const [roomName, setRoomName] = useState('');
  const [category, setCategory] = useState<string>('tech');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');
  const questionStartTimeRef = useRef<number>(0);
  const [animTrigger, setAnimTrigger] = useState(0);

  const myPlayerId = useMemo(() => socket.id, [socket.id]);
  const currentQuestion = questions[currentQIndex] ?? null;
  const isHost = players.find((p) => p.id === myPlayerId)?.isHost ?? false;
  const totalQuestions = questions.length || 0;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  useEffect(() => {
    if (!code) return;

    const handleRoomState = (data: {
      players: Player[];
      roomName: string;
      category: string;
      timeLimit: number;
      questionCount: number;
      phase: GamePhase;
    }) => {
      setPlayers(data.players);
      setRoomName(data.roomName);
      setCategory(data.category);
      setTimeLimit(data.timeLimit);
      setPhase(data.phase);
    };

    const handlePlayerJoined = (data: { players: Player[] }) => {
      setPlayers(data.players);
    };

    const handlePlayerLeft = (data: { players: Player[] }) => {
      setPlayers(data.players);
    };

    const handleGameStarted = (data: { questions: Question[] }) => {
      setQuestions(data.questions);
      setPhase('playing');
      setCurrentQIndex(0);
      setSelectedAnswer(null);
      setRevealedAnswer(null);
      questionStartTimeRef.current = Date.now();
      setAnimTrigger((t) => t + 1);
    };

    const handleNextQuestion = (data: { questionIndex: number }) => {
      setCurrentQIndex(data.questionIndex);
      setSelectedAnswer(null);
      setRevealedAnswer(null);
      setPhase('playing');
      questionStartTimeRef.current = Date.now();
      setShowCountdown(false);
      setAnimTrigger((t) => t + 1);
    };

    const handleIntermission = (data: { nextIndex: number; count: number }) => {
      setIntermissionCount(data.count);
      setPhase('intermission');
      setShowCountdown(true);
    };

    const handleAnswerRevealed = (data: { correctAnswer: number; questionIndex: number }) => {
      if (questionIndex === data.questionIndex) {
        setRevealedAnswer(data.correctAnswer);
      }
    };

    const handleScoreUpdate = (data: { scores: { [id: string]: number }; ranking: RankingEntry[] }) => {
      setPlayers((prev) =>
        prev.map((p) => ({ ...p, score: data.scores[p.id] ?? p.score }))
      );
    };

    const handleGameEnded = (data: { finalRanking: RankingEntry[] }) => {
      setFinalRanking(data.finalRanking);
      setPhase('ended');
      setShowCountdown(false);
    };

    const handleErrorMessage = (data: { message: string }) => {
      showToast('⚠️ ' + data.message);
    };

    socket.emit('get-room-state', { code });
    socket.on('room-state', handleRoomState);
    socket.on('player-joined', handlePlayerJoined);
    socket.on('player-left', handlePlayerLeft);
    socket.on('game-started', handleGameStarted);
    socket.on('next-question', handleNextQuestion);
    socket.on('intermission', handleIntermission);
    socket.on('answer-revealed', handleAnswerRevealed);
    socket.on('score-update', handleScoreUpdate);
    socket.on('game-ended', handleGameEnded);
    socket.on('error-message', handleErrorMessage);

    return () => {
      socket.off('room-state', handleRoomState);
      socket.off('player-joined', handlePlayerJoined);
      socket.off('player-left', handlePlayerLeft);
      socket.off('game-started', handleGameStarted);
      socket.off('next-question', handleNextQuestion);
      socket.off('intermission', handleIntermission);
      socket.off('answer-revealed', handleAnswerRevealed);
      socket.off('score-update', handleScoreUpdate);
      socket.off('game-ended', handleGameEnded);
      socket.off('error-message', handleErrorMessage);
    };
  }, [code, socket, myPlayerId]);

  const handleStartGame = () => {
    if (!code || players.length < 1) {
      showToast('至少需要1名玩家');
      return;
    }
    socket.emit('start-game', { code });
  };

  const handleSelectAnswer = (idx: number) => {
    if (selectedAnswer !== null || phase !== 'playing' || !currentQuestion) return;
    const timeSpent = (Date.now() - questionStartTimeRef.current) / 1000;
    setSelectedAnswer(idx);
    socket.emit('submit-answer', {
      code,
      questionIndex: currentQIndex,
      answer: idx,
      timeSpent,
    });
  };

  const handlePlayAgain = () => {
    if (!code) return;
    socket.emit('play-again', { code });
  };

  const handleLeaveRoom = () => {
    if (!code) return;
    socket.emit('leave-room', { code });
    disconnectSocket();
    navigate('/');
  };

  const handleCopyCode = async () => {
    if (!code) return;
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      showToast('✅ 邀请码已复制');
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const maxScore = Math.max(1, ...finalRanking.map((r) => r.score));

  return (
    <div style={styles.pageWrap}>
      <div style={styles.bgDecor1} />
      <div style={styles.bgDecor2} />

      {toast && (
        <div style={styles.toast}>
          {toast}
        </div>
      )}

      <div style={styles.container}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button onClick={handleLeaveRoom} style={styles.backBtn}>
              ← 大厅
            </button>
            <div>
              <h1 style={styles.roomTitle}>
                {roomName || '房间'} <span style={styles.roomCodeTag}>#{code}</span>
              </h1>
              <div style={styles.metaRow}>
                <span style={styles.metaChip}>📚 {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}</span>
                {totalQuestions > 0 && <span style={styles.metaChip}>📝 {totalQuestions}题</span>}
                <span style={styles.metaChip}>⏱️ {timeLimit}秒/题</span>
                <button onClick={handleCopyCode} style={styles.copyCodeBtn}>
                  {copied ? '✓ 已复制' : '📋 复制邀请码'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {phase === 'waiting' && (
          <div style={styles.phaseWrap}>
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionIcon}>👥</span>
                <h2 style={styles.sectionTitle}>等待玩家加入</h2>
                <span style={styles.playerCount}>{players.length} 位玩家</span>
              </div>
              <div style={styles.playersGrid}>
                {players.map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      ...styles.playerCard,
                      animation: `avatarFloatIn 0.5s ease-out ${i * 0.1}s both, avatarBounce 2.5s ease-in-out ${1 + i * 0.2}s infinite`,
                      ...(p.id === myPlayerId ? { ...styles.myPlayerCard, borderColor: 'rgba(124,58,237,0.6)' } : {}),
                    }}
                  >
                    <div style={styles.avatarWrapper}>
                      <span style={styles.playerAvatar}>{p.avatar}</span>
                      {p.isHost && <span style={styles.crownIcon}>👑</span>}
                    </div>
                    <div style={styles.playerNameWrap}>
                      <span style={styles.playerName}>{p.name}</span>
                      {p.id === myPlayerId && <span style={styles.meTag}>我</span>}
                    </div>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ ...styles.playerCard, ...styles.emptySlot }}>
                    <div style={styles.emptyAvatar}>?</div>
                    <span style={styles.emptyText}>等待加入...</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.waitingActions}>
              {isHost ? (
                <button onClick={handleStartGame} style={styles.startBtn}>
                  <span className="pulse-btn-inner">▶ 开始游戏</span>
                </button>
              ) : (
                <div style={styles.waitingForHost}>
                  <span style={{ marginRight: 8, animation: 'blink 1s ease-in-out infinite' }}>⏳</span>
                  等待房主开始游戏...
                </div>
              )}
            </div>
          </div>
        )}

        {(phase === 'playing' || phase === 'intermission') && currentQuestion && (
          <div style={styles.phaseWrap}>
            <div style={styles.scoreboard}>
              {sortedPlayers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    ...styles.scoreCard,
                    ...(p.id === myPlayerId ? styles.myScoreCard : {}),
                    ...(p.isAnswered && phase === 'playing' ? { opacity: 0.6 } : {}),
                  }}
                >
                  <div style={styles.scoreAvatarWrap}>
                    <span style={styles.scoreAvatar}>{p.avatar}</span>
                    {p.isAnswered && phase === 'playing' && <div style={styles.answeredDot} />}
                  </div>
                  <div style={styles.scoreInfo}>
                    <span style={styles.scoreName}>{p.name}{p.id === myPlayerId ? ' (我)' : ''}</span>
                    <div style={styles.scoreNum}>
                      <AnimateNumber value={p.score} />
                      <span style={styles.scoreUnit}>分</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.quizCard} key={animTrigger}>
              <div style={styles.quizTop}>
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${((currentQIndex + 1) / Math.max(1, totalQuestions)) * 100}%`,
                    }}
                  />
                </div>
                <div style={styles.qIndexLabel}>
                  第 {currentQIndex + 1} / {totalQuestions} 题
                </div>
                <Timer
                  duration={timeLimit}
                  keyTrigger={animTrigger}
                  onComplete={() => {
                    if (phase === 'playing' && selectedAnswer === null) {
                      setSelectedAnswer(-1);
                      socket.emit('submit-answer', {
                        code,
                        questionIndex: currentQIndex,
                        answer: -1,
                        timeSpent: timeLimit,
                      });
                    }
                  }}
                />
              </div>

              <div style={styles.questionArea}>
                <div style={styles.questionGlow} />
                <h2 style={styles.questionText}>{currentQuestion.text}</h2>
              </div>

              <div style={styles.optionsGrid}>
                {currentQuestion.options.map((opt, i) => {
                  let optionStyle = { ...styles.optionBtn };
                  let state = 'default';

                  if (selectedAnswer !== null) {
                    if (revealedAnswer === i) {
                      optionStyle = { ...optionStyle, ...styles.optionCorrect };
                      state = 'correct';
                    } else if (selectedAnswer === i && revealedAnswer !== i) {
                      optionStyle = { ...optionStyle, ...styles.optionWrong };
                      state = 'wrong';
                    } else {
                      optionStyle = { ...optionStyle, ...styles.optionDisabled };
                    }
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectAnswer(i)}
                      disabled={selectedAnswer !== null}
                      style={optionStyle}
                      className={state !== 'default' ? `option-${state}` : ''}
                    >
                      <span style={styles.optionLetter}>{['A', 'B', 'C', 'D'][i]}</span>
                      <span style={styles.optionText}>{opt}</span>
                      {state === 'correct' && <span style={styles.feedbackIcon}>✓</span>}
                      {state === 'wrong' && <span style={styles.feedbackWrong}>✗</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === 'ended' && (
          <div style={styles.phaseWrap}>
            <div style={styles.resultCard}>
              <h1 style={styles.resultTitle}>
                <span style={{ animation: 'float 2s ease-in-out infinite' }}>🏆</span>
                最终排行榜
              </h1>
              <p style={styles.resultSub}>游戏结束，感谢参与！</p>

              <div style={styles.rankList}>
                {finalRanking.map((entry, i) => {
                  const delay = i * 120;
                  const isMe = entry.playerId === myPlayerId;
                  return (
                    <div
                      key={entry.playerId}
                      style={{
                        ...styles.rankRow,
                        ...(entry.rank <= 3 ? styles.rankRowTop3 : {}),
                        ...(isMe ? styles.rankRowMe : {}),
                        animation: `flipIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms both`,
                      }}
                    >
                      <div style={styles.rankFlipInner}>
                        <div style={styles.rankFront}>
                          <div
                            style={{
                              ...styles.rankBadge,
                              ...(entry.rank === 1 ? styles.badgeGold : {}),
                              ...(entry.rank === 2 ? styles.badgeSilver : {}),
                              ...(entry.rank === 3 ? styles.badgeBronze : {}),
                              ...(entry.rank > 3 ? styles.badgeNormal : {}),
                            }}
                          >
                            {entry.rank <= 3 ? (
                              <span style={styles.medalIcon}>
                                {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            ) : (
                              <span style={styles.rankNum}>{entry.rank}</span>
                            )}
                          </div>
                        </div>
                        <div style={styles.rankBack}>
                          <div style={styles.rankAvatar}>{entry.avatar}</div>
                          <div style={styles.rankInfo}>
                            <div style={styles.rankPlayerName}>
                              {entry.playerName}
                              {isMe && <span style={styles.meTag}>我</span>}
                            </div>
                            <ProgressBar value={entry.score} max={maxScore} delay={delay + 300} />
                            <div style={styles.rankScore}>
                              <AnimateNumber value={entry.score} /> 分
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.resultActions}>
                <button onClick={handlePlayAgain} style={styles.resultPrimaryBtn}>
                  🔄 再来一局
                </button>
                <button onClick={handleLeaveRoom} style={styles.resultSecondaryBtn}>
                  🏠 返回大厅
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCountdown && phase === 'intermission' && (
        <Timer duration={2} keyTrigger={intermissionCount} variant="countdown" />
      )}

      <style>{pageStyles}</style>
    </div>
  );
};

const pageStyles = `
  @keyframes avatarFloatIn {
    0% { opacity: 0; transform: translateY(30px) scale(0.8); }
    60% { opacity: 1; transform: translateY(-8px) scale(1.05); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes avatarBounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes pulse-green {
    0%, 100% {
      background: linear-gradient(135deg, #16a34a, #15803d);
      box-shadow: 0 0 20px rgba(22, 163, 74, 0.4), 0 0 40px rgba(22, 163, 74, 0.2);
    }
    50% {
      background: linear-gradient(135deg, #4ade80, #22c55e);
      box-shadow: 0 0 35px rgba(74, 222, 128, 0.6), 0 0 70px rgba(74, 222, 128, 0.3);
    }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  @keyframes shake-option {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  @keyframes pulse-correct {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.6); }
    50% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
  }
  @keyframes flipIn {
    0% {
      opacity: 0;
      transform: perspective(1000px) rotateY(90deg) scale(0.8);
    }
    50% {
      opacity: 0.6;
    }
    100% {
      opacity: 1;
      transform: perspective(1000px) rotateY(0deg) scale(1);
    }
  }
  .pulse-btn-inner {
    animation: pulse-green 2s ease-in-out infinite;
    display: block;
    padding: 16px 48px;
    border-radius: 14px;
    font-size: 18px;
    font-weight: 700;
    color: white;
    letter-spacing: 1px;
    transition: transform 0.15s ease;
  }
  .option-correct {
    animation: pulse-correct 1s ease-out 1;
  }
  .option-wrong {
    animation: shake-option 0.4s ease-out;
  }
`;

const styles: Record<string, React.CSSProperties> = {
  pageWrap: {
    minHeight: '100vh',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    padding: '24px 20px 40px',
    animation: 'fadeInUp 0.4s ease-out',
  },
  bgDecor1: {
    position: 'absolute',
    top: '-100px',
    right: '-100px',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: '-80px',
    left: '-80px',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
  },
  toast: {
    position: 'fixed',
    top: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(124,58,237,0.9)',
    backdropFilter: 'blur(12px)',
    padding: '12px 24px',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    zIndex: 9999,
    boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
    animation: 'fadeInUp 0.3s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    flex: 1,
    flexWrap: 'wrap',
  },
  backBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    backdropFilter: 'blur(8px)',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  roomTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '26px',
    fontWeight: 700,
    color: '#fff',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  roomCodeTag: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    color: 'rgba(167,139,250,0.8)',
    fontWeight: 500,
    letterSpacing: '2px',
  },
  metaRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaChip: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: 500,
  },
  copyCodeBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(124,58,237,0.2)',
    border: '1px solid rgba(124,58,237,0.4)',
    color: '#a78bfa',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
  },
  phaseWrap: {
    animation: 'fadeInUp 0.5s ease-out both',
  },
  sectionCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  sectionIcon: {
    fontSize: '28px',
  },
  sectionTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.5px',
    flex: 1,
  },
  playerCount: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(124,58,237,0.2)',
    color: '#a78bfa',
    fontSize: '13px',
    fontWeight: 600,
    border: '1px solid rgba(124,58,237,0.3)',
  },
  playersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  },
  playerCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.25s ease',
  },
  myPlayerCard: {
    background: 'rgba(124,58,237,0.12)',
    border: '1px solid rgba(124,58,237,0.3)',
    boxShadow: '0 4px 20px rgba(124,58,237,0.15)',
  },
  emptySlot: {
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  avatarWrapper: {
    position: 'relative',
    width: '72px',
    height: '72px',
  },
  playerAvatar: {
    fontSize: '48px',
    display: 'block',
    textAlign: 'center',
    lineHeight: '72px',
  },
  crownIcon: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    fontSize: '24px',
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))',
  },
  playerNameWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  playerName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
  },
  meTag: {
    padding: '2px 8px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 600,
  },
  emptyAvatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    border: '2px dashed rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    color: 'rgba(255,255,255,0.3)',
  },
  emptyText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
  },
  waitingActions: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
  },
  startBtn: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 0,
    borderRadius: '14px',
    fontFamily: 'inherit',
  },
  waitingForHost: {
    padding: '16px 40px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
  },
  scoreboard: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  scoreCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '14px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    minWidth: '160px',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    flexShrink: 0,
  },
  myScoreCard: {
    borderColor: 'rgba(124,58,237,0.5)',
    background: 'rgba(124,58,237,0.12)',
    boxShadow: '0 0 20px rgba(124,58,237,0.2)',
  },
  scoreAvatarWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  scoreAvatar: {
    fontSize: '32px',
    display: 'block',
  },
  answeredDot: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    background: '#22c55e',
    border: '2px solid #0a1628',
  },
  scoreInfo: {
    flex: 1,
    minWidth: 0,
  },
  scoreName: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.8)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block',
  },
  scoreNum: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    marginTop: '2px',
  },
  scoreUnit: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500,
    marginLeft: '3px',
  },
  quizCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '20px',
    padding: '32px',
    animation: 'fadeInUp 0.4s ease-out both',
  },
  quizTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap',
  },
  progressTrack: {
    flex: 1,
    minWidth: '150px',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #22d3ee)',
    borderRadius: '3px',
    transition: 'width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  qIndexLabel: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    color: 'rgba(167,139,250,0.9)',
    letterSpacing: '1px',
    whiteSpace: 'nowrap',
  },
  questionArea: {
    position: 'relative',
    marginBottom: '32px',
    padding: '40px 20px',
    textAlign: 'center',
  },
  questionGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '600px',
    maxWidth: '90%',
    height: '200px',
    background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  questionText: {
    position: 'relative',
    fontSize: '26px',
    fontWeight: 700,
    color: '#fff',
    lineHeight: 1.5,
    maxWidth: '800px',
    margin: '0 auto',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px',
  },
  optionBtn: {
    position: 'relative',
    background: 'rgba(255,255,255,0.04)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '18px 20px 18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    color: '#fff',
    fontFamily: 'inherit',
    textAlign: 'left',
  },
  optionCorrect: {
    borderColor: '#22c55e',
    background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(34,197,94,0.1))',
    cursor: 'default',
  },
  optionWrong: {
    borderColor: '#ef4444',
    background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.1))',
    cursor: 'default',
  },
  optionDisabled: {
    opacity: 0.4,
    cursor: 'default',
  },
  optionLetter: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'rgba(124,58,237,0.2)',
    border: '1px solid rgba(124,58,237,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: '#a78bfa',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: 1.5,
    color: '#fff',
  },
  feedbackIcon: {
    position: 'absolute',
    right: '18px',
    color: '#22c55e',
    fontSize: '28px',
    fontWeight: 900,
  },
  feedbackWrong: {
    position: 'absolute',
    right: '18px',
    color: '#ef4444',
    fontSize: '28px',
    fontWeight: 900,
  },
  resultCard: {
    background: 'var(--glass-bg)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--glass-border)',
    borderRadius: '24px',
    padding: '40px 32px',
    textAlign: 'center',
    maxWidth: '800px',
    margin: '0 auto',
  },
  resultTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '32px',
    fontWeight: 900,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '8px',
    letterSpacing: '1px',
  },
  resultSub: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: '36px',
  },
  rankList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '32px',
  },
  rankRow: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px 20px',
    transformStyle: 'preserve-3d',
    perspective: '1000px',
  },
  rankRowTop3: {
    background: 'rgba(255,255,255,0.07)',
  },
  rankRowMe: {
    borderColor: 'rgba(124,58,237,0.5)',
    background: 'rgba(124,58,237,0.12)',
    boxShadow: '0 0 20px rgba(124,58,237,0.15)',
  },
  rankFlipInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  },
  rankFront: {
    flexShrink: 0,
  },
  rankBack: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    minWidth: 0,
  },
  rankBadge: {
    width: '54px',
    height: '54px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeGold: {
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
    boxShadow: '0 0 24px rgba(251,191,36,0.5)',
    border: '2px solid #fcd34d',
  },
  badgeSilver: {
    background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1, #94a3b8)',
    boxShadow: '0 0 24px rgba(148,163,184,0.4)',
    border: '2px solid #e2e8f0',
  },
  badgeBronze: {
    background: 'linear-gradient(135deg, #d97706, #b45309, #92400e)',
    boxShadow: '0 0 24px rgba(217,119,6,0.4)',
    border: '2px solid #f59e0b',
  },
  badgeNormal: {
    background: 'rgba(255,255,255,0.08)',
    border: '2px solid rgba(255,255,255,0.12)',
  },
  medalIcon: {
    fontSize: '30px',
  },
  rankNum: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.7)',
  },
  rankAvatar: {
    fontSize: '42px',
    flexShrink: 0,
  },
  rankInfo: {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
  },
  rankPlayerName: {
    fontSize: '17px',
    fontWeight: 600,
    color: '#fff',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rankScore: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    color: '#a78bfa',
    marginTop: '8px',
  },
  resultActions: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  resultPrimaryBtn: {
    padding: '14px 36px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
    letterSpacing: '0.5px',
  },
  resultSecondaryBtn: {
    padding: '14px 36px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)',
  },
};

export default GameRoom;
