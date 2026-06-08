import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { RoomState, Riddle } from './types';
import { useSocket } from './useSocket';
import { playCorrectSound, playWrongSound, playLikeSound } from './audio';
import RiddleCard from './components/RiddleCard';
import AnswerSlot from './components/AnswerSlot';
import ParticleCanvas from './components/ParticleCanvas';

interface GameBoardProps {
  initialRoom: RoomState;
  playerName: string;
  onLeave: () => void;
}

export default function GameBoard({ initialRoom, playerName, onLeave }: GameBoardProps) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [selectedRiddle, setSelectedRiddle] = useState<Riddle | null>(null);
  const [particleActive, setParticleActive] = useState(false);
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0 });
  const [wrongIds, setWrongIds] = useState<Set<number>>(new Set());
  const [bgHue, setBgHue] = useState(240);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRoomUpdate = useCallback((data: RoomState) => {
    setRoom(data);
  }, []);

  const handleGameStarted = useCallback((data: RoomState) => {
    setRoom(data);
  }, []);

  const handleAnswerResult = useCallback((result: any) => {
    if (result.correct) {
      playCorrectSound();
      setParticleActive(true);
      setBgHue((prev) => Math.min(prev + 5, 60));
    } else {
      playWrongSound();
      if (result.riddleId) {
        setWrongIds((prev) => new Set(prev).add(result.riddleId));
        setTimeout(() => {
          setWrongIds((prev) => {
            const next = new Set(prev);
            next.delete(result.riddleId);
            return next;
          });
        }, 500);
      }
    }
    setSelectedRiddle(null);
  }, []);

  const handleLikeUpdate = useCallback((update: any) => {
    setRoom((prev) => ({
      ...prev,
      likes: { ...prev.likes, [update.riddleId]: update.likes },
    }));
  }, []);

  const handleTimerUpdate = useCallback((timeLeft: number) => {
    setRoom((prev) => ({ ...prev, timeLeft }));
  }, []);

  const handleGameOver = useCallback((data: RoomState) => {
    setRoom(data);
  }, []);

  const handleError = useCallback((message: string) => {
    console.error('Socket error:', message);
  }, []);

  const { startGame, submitAnswer, likeRiddle, sendTick } = useSocket({
    roomCode: initialRoom.code,
    playerName,
    onRoomUpdate: handleRoomUpdate,
    onGameStarted: handleGameStarted,
    onAnswerResult: handleAnswerResult,
    onLikeUpdate: handleLikeUpdate,
    onTimerUpdate: handleTimerUpdate,
    onGameOver: handleGameOver,
    onError: handleError,
  });

  useEffect(() => {
    if (room.status === 'playing') {
      timerRef.current = setInterval(() => {
        sendTick();
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [room.status, sendTick]);

  const handleDragStart = useCallback((riddle: Riddle, _el: HTMLDivElement) => {
    setSelectedRiddle(riddle);
  }, []);

  const handleDragEnd = useCallback(() => {}, []);

  const handleAnswerSubmit = useCallback(
    (riddleId: number, answer: string) => {
      submitAnswer(riddleId, answer);
    },
    [submitAnswer]
  );

  const handleAnswerCancel = useCallback(() => {
    setSelectedRiddle(null);
  }, []);

  const handleLike = useCallback(
    (riddleId: number) => {
      playLikeSound();
      likeRiddle(riddleId);
    },
    [likeRiddle]
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const solvedCount = room.solved.length;
  const totalCount = room.riddles.length;

  return (
    <div
      className="game-board"
      style={{
        background: `linear-gradient(135deg, hsl(${bgHue}, 60%, 8%) 0%, #0a0a2e 50%, hsl(${bgHue - 20}, 70%, 12%) 100%)`,
      }}
    >
      <ParticleCanvas
        active={particleActive}
        x={particlePos.x}
        y={particlePos.y}
        onDone={() => setParticleActive(false)}
      />

      <header className="game-header">
        <div className="game-header-left">
          <button className="leave-btn" onClick={onLeave}>
            ← 返回大厅
          </button>
          <h1 className="game-title">🏮 {room.name}</h1>
          <span className="room-code">房间: {room.code}</span>
        </div>
        <div className="game-header-right">
          <div className="timer">
            {room.status === 'playing' && (
              <span className={`timer-value ${room.timeLeft <= 30 ? 'timer-warning' : ''}`}>
                ⏱ {formatTime(room.timeLeft)}
              </span>
            )}
          </div>
          <div className="score">
            已解: {solvedCount}/{totalCount}
          </div>
          <div className="players-list">
            {room.players.map((p) => (
              <span key={p} className={`player-tag ${p === playerName ? 'me' : ''}`}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </header>

      {room.status === 'waiting' && (
        <div className="waiting-overlay">
          <div className="waiting-card">
            <h2>等待玩家加入...</h2>
            <p>房间号: <strong>{room.code}</strong></p>
            <p>当前玩家: {room.players.join(', ')}</p>
            <p>人数: {room.players.length}/{room.maxPlayers}</p>
            <button
              className="start-btn"
              onClick={startGame}
              disabled={room.players.length < 1}
            >
              🚀 开始游戏
            </button>
          </div>
        </div>
      )}

      {room.status === 'playing' && (
        <div className="game-content">
          <div className="riddle-wall">
            {room.riddles.map((r) => (
              <RiddleCard
                key={r.id}
                riddle={r}
                solved={room.solved.includes(r.id)}
                liked={(room.likes[r.id] || []).includes(playerName)}
                likeCount={(room.likes[r.id] || []).length}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onLike={handleLike}
                wrong={wrongIds.has(r.id)}
              />
            ))}
          </div>
          <AnswerSlot
            active={selectedRiddle !== null}
            riddleId={selectedRiddle?.id ?? null}
            onSubmit={handleAnswerSubmit}
            onCancel={handleAnswerCancel}
          />
        </div>
      )}

      {room.status === 'finished' && (
        <div className="game-over-overlay">
          <div className="game-over-card">
            <h2>🎉 游戏结束！</h2>
            <p className="final-score">
              解答完成: {solvedCount}/{totalCount}
            </p>
            <div className="rank-list">
              <h3>🏆 答题统计</h3>
              {room.riddles
                .filter((r) => room.solved.includes(r.id))
                .map((r) => (
                  <div key={r.id} className="rank-item">
                    <span className="rank-riddle">{r.riddle}</span>
                    <span className="rank-answer">{r.answer || '—'}</span>
                    <span className="rank-likes">
                      👍 {(room.likes[r.id] || []).length}
                    </span>
                  </div>
                ))}
            </div>
            <button className="start-btn" onClick={onLeave}>
              返回大厅
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
