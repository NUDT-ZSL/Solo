import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  RoomState,
  ServerQuestionPayload,
  AnswerResultPayload,
  GameOverPayload,
  ChatMessage,
} from '../../../shared/types.js';
import {
  Clock,
  Users,
  Trophy,
  MessageCircle,
  Send,
  LogOut,
  Crown,
  CheckCircle,
  XCircle,
  Play,
} from 'lucide-react';

interface GameBoardProps {
  socket: Socket | null;
  roomState: RoomState | null;
  currentQuestion: ServerQuestionPayload | null;
  answerResult: AnswerResultPayload | null;
  gameOver: GameOverPayload | null;
  chatMessages: ChatMessage[];
  selectedAnswer: number | null;
  hasAnswered: boolean;
  nickname: string;
  onAnswer: (questionIndex: number, answerIndex: number, timeRemaining: number) => void;
  onLeave: () => void;
  onStartGame: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = display;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{display}</span>;
}

export default function GameBoard({
  socket,
  roomState,
  currentQuestion,
  answerResult,
  gameOver,
  chatMessages,
  selectedAnswer,
  hasAnswered,
  nickname,
  onAnswer,
  onLeave,
  onStartGame,
}: GameBoardProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatListRef = useRef<HTMLDivElement>(null);
  const timeLeftRef = useRef(timeLeft);
  timeLeftRef.current = timeLeft;

  useEffect(() => {
    if (!currentQuestion || hasAnswered) return;
    setTimeLeft(currentQuestion.timeLimit);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [currentQuestion?.questionIndex, hasAnswered, currentQuestion?.timeLimit]);

  useEffect(() => {
    if (timeLeft === 0 && currentQuestion && !hasAnswered) {
      onAnswer(currentQuestion.questionIndex, -1, 0);
    }
  }, [timeLeft, currentQuestion, hasAnswered, onAnswer]);

  useEffect(() => {
    if (chatListRef.current) {
      chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleAnswer = useCallback(
    (index: number) => {
      if (hasAnswered || !currentQuestion) return;
      onAnswer(currentQuestion.questionIndex, index, timeLeftRef.current);
    },
    [hasAnswered, currentQuestion, onAnswer],
  );

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed || !socket) return;
    socket.emit('CHAT_MESSAGE', { message: trimmed });
    setChatInput('');
  }, [chatInput, socket]);

  const isHost = roomState?.room.hostId === socket?.id;
  const players = roomState?.players ?? [];
  const questionCount = currentQuestion
    ? `${currentQuestion.questionIndex + 1}/${roomState?.room.totalQuestions ?? 10}`
    : '';

  const timerPercent = currentQuestion
    ? (timeLeft / currentQuestion.timeLimit) * 100
    : 100;
  const timerColor =
    timerPercent > 50
      ? '#4ade80'
      : timerPercent > 20
        ? '#facc15'
        : '#ef4444';
  const isPulsing = timeLeft <= 3 && timeLeft > 0 && currentQuestion && !hasAnswered;

  const getOptionStyle = (index: number) => {
    const base =
      'w-full rounded-xl py-3 px-4 text-left font-medium transition-all duration-300 ease-out border-2';
    if (!hasAnswered && !answerResult) {
      return `${base} border-gray-200 bg-white hover:scale-105 hover:shadow-lg cursor-pointer`;
    }
    if (answerResult) {
      if (index === answerResult.correctIndex) {
        return `${base} border-green-400 bg-green-100 text-green-800`;
      }
      if (index === selectedAnswer && !answerResult.correct) {
        return `${base} border-red-400 bg-red-100 text-red-800`;
      }
      return `${base} border-gray-200 bg-gray-50 text-gray-400`;
    }
    if (index === selectedAnswer) {
      return `${base} border-blue-400 bg-blue-50 text-blue-800 animate-pulse`;
    }
    return `${base} border-gray-200 bg-white text-gray-400 cursor-not-allowed`;
  };

  if (gameOver) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-8 w-full max-w-lg">
          <h1 className="text-4xl font-extrabold text-center mb-8 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            游戏结束
          </h1>
          <div className="space-y-3">
            {gameOver.rankings
              .slice()
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((r, i) => (
                <div
                  key={r.playerId}
                  className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ease-out ${
                    i === 0
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span className="text-2xl font-bold w-8 text-center">
                    {i === 0 ? (
                      <Crown className="inline-block text-yellow-500" size={24} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="flex-1 font-semibold text-gray-800 truncate">
                    {r.nickname}
                  </span>
                  <span className="text-sm text-gray-500">
                    <CheckCircle size={14} className="inline mr-1" />
                    {r.correctCount} 正确
                  </span>
                  <span className="font-bold text-[#667eea]">
                    <AnimatedNumber value={r.totalScore} />
                  </span>
                </div>
              ))}
          </div>
          <button
            onClick={onLeave}
            className="mt-8 w-full py-3 rounded-xl bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white font-semibold transition-all duration-300 ease-out hover:shadow-lg hover:scale-[1.02]"
          >
            返回大厅
          </button>
        </div>
      </div>
    );
  }

  if (roomState && roomState.room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex flex-col items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{roomState.room.name}</h2>
            <button
              onClick={onLeave}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors duration-300"
            >
              <LogOut size={16} /> 离开房间
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <Users size={18} />
              <span className="font-medium">
                玩家 ({players.length}/{roomState.room.maxPlayers})
              </span>
            </div>
            <div className="space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-300 ${
                    p.id === roomState.room.hostId
                      ? 'bg-purple-50 border border-purple-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-gray-800">{p.nickname}</span>
                  {p.id === roomState.room.hostId && (
                    <Crown size={14} className="text-yellow-500" />
                  )}
                  {p.nickname === nickname && (
                    <span className="text-xs text-gray-400">(你)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={players.length < 2}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ease-out flex items-center justify-center gap-2 ${
                players.length >= 2
                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:shadow-lg hover:scale-[1.02]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play size={18} /> 开始游戏
            </button>
          ) : (
            <p className="text-center text-gray-500 py-3">等待房主开始游戏...</p>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 w-full max-w-md mt-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setChatOpen(!chatOpen)}
          >
            <div className="flex items-center gap-2 text-gray-700">
              <MessageCircle size={18} />
              <span className="font-medium">聊天</span>
            </div>
            <span className="text-xs text-gray-400">{chatOpen ? '收起' : '展开'}</span>
          </div>
          {chatOpen && (
            <div className="mt-3">
              <div
                ref={chatListRef}
                className="h-40 overflow-y-auto space-y-1 mb-3 scrollbar-thin"
              >
                {chatMessages.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无消息</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-[#667eea]">{msg.nickname}: </span>
                    <span className="text-gray-700">{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="输入消息..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#667eea] transition-colors duration-300"
                />
                <button
                  onClick={handleSendChat}
                  className="rounded-lg bg-[#667eea] text-white px-3 py-2 transition-all duration-300 hover:bg-[#5a6fd6]"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-white/90 font-semibold">
              <Clock size={18} />
              <span>{questionCount}</span>
            </div>
            <div
              className={`text-3xl font-extrabold text-white tabular-nums transition-transform duration-300 ${
                isPulsing ? 'animate-pulse' : ''
              }`}
            >
              {timeLeft}
            </div>
            <button
              onClick={onLeave}
              className="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors duration-300"
            >
              <LogOut size={16} /> 离开
            </button>
          </div>

          <div className="w-full bg-white/20 rounded-full h-3 mb-6 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                isPulsing ? 'animate-pulse' : ''
              }`}
              style={{
                width: `${timerPercent}%`,
                background: `linear-gradient(90deg, ${timerColor}, ${timerColor}dd)`,
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4">
            <div className="hidden md:block space-y-2">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white/95 backdrop-blur rounded-xl p-3 transition-all duration-300 ${
                    p.nickname === nickname ? 'ring-2 ring-[#667eea]' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 text-sm truncate">
                      {p.nickname}
                    </span>
                    {p.hasAnswered ? (
                      <CheckCircle size={14} className="text-green-500 shrink-0" />
                    ) : (
                      <Clock size={14} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    <Trophy size={12} className="inline mr-1" />
                    <AnimatedNumber value={p.score} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center leading-relaxed">
                {currentQuestion.question.text}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.question.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={hasAnswered}
                    className={getOptionStyle(idx)}
                  >
                    <span className="text-sm font-bold text-gray-400 mr-2">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </button>
                ))}
              </div>

              {hasAnswered && answerResult && (
                <div
                  className={`mt-4 text-center font-bold text-lg transition-all duration-300 ${
                    answerResult.correct ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {answerResult.correct ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={20} /> 正确! +{answerResult.scores.find((s) => s.nickname === nickname)?.questionScore ?? 0}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <XCircle size={20} /> 错误
                    </span>
                  )}
                </div>
              )}

              <div className="md:hidden mt-4">
                <div className="flex flex-wrap gap-2 justify-center">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`bg-white/90 rounded-lg px-3 py-1.5 text-sm flex items-center gap-1.5 transition-all duration-300 ${
                        p.nickname === nickname
                          ? 'ring-1 ring-[#667eea]'
                          : ''
                      }`}
                    >
                      <span className="font-medium text-gray-800">{p.nickname}</span>
                      {p.hasAnswered ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <Clock size={12} className="text-gray-400" />
                      )}
                      <span className="text-xs text-gray-500">
                        <AnimatedNumber value={p.score} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="hidden md:flex flex-col gap-4">
              <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl p-4 flex-1 flex flex-col">
                <div
                  className="flex items-center justify-between cursor-pointer mb-3"
                  onClick={() => setChatOpen(!chatOpen)}
                >
                  <div className="flex items-center gap-2 text-gray-700">
                    <MessageCircle size={18} />
                    <span className="font-medium text-sm">聊天</span>
                  </div>
                  <span className="text-xs text-gray-400">{chatOpen ? '收起' : '展开'}</span>
                </div>
                {chatOpen && (
                  <>
                    <div
                      ref={chatListRef}
                      className="flex-1 overflow-y-auto space-y-1 mb-3 min-h-0"
                    >
                      {chatMessages.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-2">暂无消息</p>
                      )}
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium text-[#667eea]">{msg.nickname}: </span>
                          <span className="text-gray-700">{msg.message}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                        placeholder="输入消息..."
                        className="flex-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-[#667eea] transition-colors duration-300"
                      />
                      <button
                        onClick={handleSendChat}
                        className="rounded-lg bg-[#667eea] text-white px-2 py-1.5 transition-all duration-300 hover:bg-[#5a6fd6]"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden fixed bottom-4 right-4 z-50">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="w-12 h-12 rounded-full bg-[#667eea] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <MessageCircle size={20} />
            </button>
          </div>

          {chatOpen && (
            <div className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur rounded-t-2xl shadow-xl p-4 max-h-[50vh] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <MessageCircle size={18} />
                  <span className="font-medium">聊天</span>
                </div>
                <button
                  onClick={() => setChatOpen(false)}
                  className="text-gray-400 text-sm"
                >
                  收起
                </button>
              </div>
              <div
                ref={chatListRef}
                className="flex-1 overflow-y-auto space-y-1 mb-3 min-h-0"
              >
                {chatMessages.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">暂无消息</p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-[#667eea]">{msg.nickname}: </span>
                    <span className="text-gray-700">{msg.message}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="输入消息..."
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#667eea] transition-colors duration-300"
                />
                <button
                  onClick={handleSendChat}
                  className="rounded-lg bg-[#667eea] text-white px-3 py-2 transition-all duration-300 hover:bg-[#5a6fd6]"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center">
      <div className="text-white/80 text-lg">加载中...</div>
    </div>
  );
}
