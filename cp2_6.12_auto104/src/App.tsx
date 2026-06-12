import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  roomService,
  Thought,
  VoteSession,
  RoomState,
} from './services/roomService';
import { ThoughtCard } from './components/ThoughtCard';
import { VotePanel } from './components/VotePanel';
import { usePerformanceMonitor } from './hooks/usePerformanceMonitor';
import { animationConfig } from './utils/animationConfig';

const RoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [voteSession, setVoteSession] = useState<VoteSession | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; isHost: boolean }[]>([]);
  const [newThought, setNewThought] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [userName, setUserName] = useState('用户' + Math.floor(Math.random() * 1000));
  const [connectionState, setConnectionState] = useState(roomService.getConnectionState());
  const [newThoughtIds, setNewThoughtIds] = useState<Set<string>>(new Set());
  const [showStartVote, setShowStartVote] = useState(false);
  const [selectedVoteOptions, setSelectedVoteOptions] = useState<string[]>([]);
  const [voteDuration, setVoteDuration] = useState(60);

  const currentUserId = roomService.getUserId();
  const isHost = users.find((u) => u.id === currentUserId)?.isHost || false;

  const { measureOperationStart, measureOperationEnd, getCurrentFPS, getAvgResponseTime } =
    usePerformanceMonitor(
      (metrics) => {
        if (metrics.fps < 50) {
          console.warn(`性能警告: FPS=${metrics.fps}, 平均响应=${metrics.avgResponseTime.toFixed(2)}ms`);
        }
      },
      true,
    );

  useEffect(() => {
    if (!roomId) return;

    roomService.setHandlers({
      onThoughtAdded: (thought) => {
        setThoughts((prev) => {
          if (prev.some((t) => t.id === thought.id)) return prev;
          setNewThoughtIds((ids) => new Set(ids).add(thought.id));
          setTimeout(() => {
            setNewThoughtIds((ids) => {
              const newIds = new Set(ids);
              newIds.delete(thought.id);
              return newIds;
            });
          }, 1000);
          return [thought, ...prev];
        });
      },
      onThoughtUpdated: (thought) => {
        setThoughts((prev) =>
          prev.map((t) => (t.id === thought.id ? thought : t)),
        );
      },
      onVoteStarted: (session) => {
        setVoteSession(session);
        setShowStartVote(false);
      },
      onVoteUpdated: (session) => {
        setVoteSession(session);
      },
      onVoteEnded: (session) => {
        setVoteSession(session);
        setThoughts((prev) => {
          const maxVotes = Math.max(...session.options.map((o) => o.votes), 0);
          const winnerIds = session.options
            .filter((o) => o.votes === maxVotes && maxVotes > 0)
            .map((o) => o.thoughtId);
          return prev.map((t) => ({
            ...t,
            hasCrown: winnerIds.includes(t.id) ? true : t.hasCrown,
          }));
        });
      },
      onUserJoined: (newUsers) => {
        setUsers(newUsers);
      },
      onUserLeft: (newUsers) => {
        setUsers(newUsers);
      },
      onConnectionStateChange: (state) => {
        setConnectionState(state);
      },
      onRoomStateSync: (state: RoomState) => {
        setThoughts(state.thoughts);
        setVoteSession(state.voteSession);
        setUsers(state.users);
      },
    });

    roomService.connect(roomId);
    roomService.setUserName(userName);

    return () => {
      roomService.disconnect();
    };
  }, [roomId, userName]);

  const handleSubmitThought = useCallback(() => {
    if (!newThought.trim()) return;

    measureOperationStart('submit_thought');
    roomService.addThought(newThought.trim(), userName, isAnonymous);
    setNewThought('');
    setTimeout(() => measureOperationEnd('submit_thought'), 100);
  }, [newThought, userName, isAnonymous, measureOperationStart, measureOperationEnd]);

  const handleLike = useCallback(
    (id: string) => {
      measureOperationStart('like_thought');
      roomService.likeThought(id);
      setTimeout(() => measureOperationEnd('like_thought'), 100);
    },
    [measureOperationStart, measureOperationEnd],
  );

  const handleDislike = useCallback(
    (id: string) => {
      measureOperationStart('dislike_thought');
      roomService.dislikeThought(id);
      setTimeout(() => measureOperationEnd('dislike_thought'), 100);
    },
    [measureOperationStart, measureOperationEnd],
  );

  const handleVote = useCallback(
    (thoughtId: string) => {
      measureOperationStart('submit_vote');
      roomService.submitVote(thoughtId);
      setTimeout(() => measureOperationEnd('submit_vote'), 100);
    },
    [measureOperationStart, measureOperationEnd],
  );

  const handleStartVote = useCallback(() => {
    if (selectedVoteOptions.length < 2 || selectedVoteOptions.length > 5) return;
    roomService.startVote(selectedVoteOptions, voteDuration);
    setSelectedVoteOptions([]);
  }, [selectedVoteOptions, voteDuration]);

  const toggleVoteOption = (thoughtId: string) => {
    setSelectedVoteOptions((prev) => {
      if (prev.includes(thoughtId)) {
        return prev.filter((id) => id !== thoughtId);
      }
      if (prev.length >= 5) return prev;
      return [...prev, thoughtId];
    });
  };

  const sortedThoughts = useMemo(() => {
    return [...thoughts].sort((a, b) => b.createdAt - a.createdAt);
  }, [thoughts]);

  const hotThoughts = useMemo(() => {
    return sortedThoughts.filter((t) => t.score >= 10);
  }, [sortedThoughts]);

  const normalThoughts = useMemo(() => {
    return sortedThoughts.filter((t) => t.score > -5 && t.score < 10);
  }, [sortedThoughts]);

  const coldThoughts = useMemo(() => {
    return sortedThoughts.filter((t) => t.score <= -5);
  }, [sortedThoughts]);

  const hasVoted = voteSession?.votedUsers.includes(currentUserId) || false;

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return '#4caf50';
      case 'connecting':
      case 'reconnecting':
        return '#ff9800';
      default:
        return '#f44336';
    }
  };

  const masonryColumns = `
    @media (min-width: 1400px) { column-count: 4; }
    @media (min-width: 1024px) and (max-width: 1399px) { column-count: 3; }
    @media (min-width: 768px) and (max-width: 1023px) { column-count: 2; }
    @media (max-width: 767px) { column-count: 1; }
  `;

  return (
    <div style={{ minHeight: '100vh', padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{masonryColumns}</style>

      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 24px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '24px', color: 'var(--color-primary)', margin: 0 }}>
            🧠 团队脑暴
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: getConnectionStatusColor(),
                animation: connectionState === 'connected' ? 'none' : 'pulse 1.5s infinite',
              }}
            />
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              {connectionState === 'connected'
                ? `已连接 · ${users.length}人在线`
                : connectionState === 'reconnecting'
                  ? '重连中...'
                  : connectionState === 'connecting'
                    ? '连接中...'
                    : '已断开'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
            <span>FPS: {getCurrentFPS()}</span>
            <span>|</span>
            <span>响应: {getAvgResponseTime().toFixed(0)}ms</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              value={userName}
              onChange={(e) => {
                setUserName(e.target.value);
                roomService.setUserName(e.target.value);
              }}
              style={{ width: '100px', padding: '8px 12px', fontSize: '14px' }}
            />
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: 'auto', padding: 0 }}
              />
              匿名
            </label>
          </div>
        </div>
      </header>

      {voteSession && (
        <VotePanel
          session={voteSession}
          thoughts={thoughts}
          onVote={handleVote}
          hasVoted={hasVoted}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: animationConfig.durations.normal, ease: animationConfig.easings.easeOut }}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: 'var(--shadow-soft)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '16px' }}>
          <textarea
            value={newThought}
            onChange={(e) => setNewThought(e.target.value)}
            placeholder="输入你的想法..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmitThought();
              }
            }}
            style={{
              flex: 1,
              minHeight: '80px',
              resize: 'vertical',
              fontSize: '15px',
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmitThought}
            disabled={!newThought.trim()}
            style={{
              padding: '0 32px',
              borderRadius: '12px',
              backgroundColor: newThought.trim() ? 'var(--color-secondary)' : '#ccc',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: newThought.trim() ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-end',
              height: '80px',
            }}
          >
            提交
          </motion.button>
        </div>
      </motion.div>

      {isHost && !voteSession?.isActive && thoughts.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ marginBottom: '24px' }}
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowStartVote(!showStartVote)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            {showStartVote ? '取消发起投票' : '发起投票'}
          </motion.button>

          <AnimatePresence>
            {showStartVote && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  marginTop: '16px',
                  padding: '24px',
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <h3 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
                  选择投票选项 (2-5个)
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '12px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    marginBottom: '16px',
                  }}
                >
                  {thoughts.map((thought) => (
                    <motion.button
                      key={thought.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleVoteOption(thought.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        border:
                          selectedVoteOptions.includes(thought.id)
                            ? '2px solid var(--color-secondary)'
                            : '2px solid var(--color-border)',
                        backgroundColor: selectedVoteOptions.includes(thought.id)
                          ? 'rgba(245, 166, 35, 0.1)'
                          : 'var(--color-bg-gradient-start)',
                        textAlign: 'left',
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {thought.content}
                    </motion.button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>投票时长:</span>
                  {[30, 60, 90].map((duration) => (
                    <motion.button
                      key={duration}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVoteDuration(duration)}
                      style={{
                        padding: '8px 24px',
                        borderRadius: '8px',
                        backgroundColor: voteDuration === duration ? 'var(--color-secondary)' : '#e0e0e0',
                        color: voteDuration === duration ? 'white' : 'var(--color-text-primary)',
                        fontSize: '14px',
                      }}
                    >
                      {duration}秒
                    </motion.button>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartVote}
                    disabled={selectedVoteOptions.length < 2 || selectedVoteOptions.length > 5}
                    style={{
                      marginLeft: 'auto',
                      padding: '10px 32px',
                      borderRadius: '8px',
                      backgroundColor:
                        selectedVoteOptions.length >= 2 && selectedVoteOptions.length <= 5
                          ? 'var(--color-primary)'
                          : '#ccc',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor:
                        selectedVoteOptions.length >= 2 && selectedVoteOptions.length <= 5
                          ? 'pointer'
                          : 'not-allowed',
                    }}
                  >
                    开始投票 ({selectedVoteOptions.length}个选项)
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      <main>
        {hotThoughts.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontSize: '20px',
                color: 'var(--color-primary)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              🔥 热门
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>
                ({hotThoughts.length}个想法)
              </span>
            </h2>
            <div style={{ columnCount: 3, columnGap: 'var(--card-spacing)' }}>
              {hotThoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  currentUserId={currentUserId}
                  isNew={newThoughtIds.has(thought.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: '20px',
              color: 'var(--color-primary)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            💡 全部想法
            <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>
              ({normalThoughts.length}个想法)
            </span>
          </h2>
          <div style={{ columnCount: 3, columnGap: 'var(--card-spacing)' }}>
            {normalThoughts.map((thought) => (
              <ThoughtCard
                key={thought.id}
                thought={thought}
                onLike={handleLike}
                onDislike={handleDislike}
                currentUserId={currentUserId}
                isNew={newThoughtIds.has(thought.id)}
              />
            ))}
          </div>
          {normalThoughts.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <p style={{ fontSize: '18px' }}>还没有想法，快来提交第一个吧！</p>
            </div>
          )}
        </section>

        {coldThoughts.length > 0 && (
          <section style={{ marginBottom: '32px' }}>
            <h2
              style={{
                fontSize: '20px',
                color: 'var(--color-text-secondary)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ❄️ 冷门
              <span style={{ fontSize: '14px', fontWeight: 'normal' }}>
                ({coldThoughts.length}个想法)
              </span>
            </h2>
            <div
              style={{
                columnCount: 3,
                columnGap: 'var(--card-spacing)',
                position: 'relative',
              }}
            >
              {coldThoughts.map((thought) => (
                <ThoughtCard
                  key={thought.id}
                  thought={thought}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  currentUserId={currentUserId}
                  isNew={newThoughtIds.has(thought.id)}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    const newRoomId = 'room-' + Math.random().toString(36).substring(2, 8);
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = () => {
    if (roomId.trim()) {
      navigate(`/room/${roomId.trim()}`);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          backgroundColor: 'white',
          borderRadius: '24px',
          padding: '48px',
          boxShadow: 'var(--shadow-medium)',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '36px',
            color: 'var(--color-primary)',
            marginBottom: '12px',
          }}
        >
          🧠 团队脑暴
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: '40px',
            fontSize: '16px',
          }}
        >
          快速收集想法、实时投票、高效决策
        </p>

        <div style={{ marginBottom: '24px' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateRoom}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-secondary)',
              color: 'white',
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            创建新房间
          </motion.button>
        </div>

        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              padding: '0 16px',
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
            }}
          >
            或加入房间
          </div>
          <div
            style={{
              borderTop: '1px solid var(--color-border)',
              marginBottom: '24px',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="输入房间号"
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleJoinRoom();
              }
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJoinRoom}
            disabled={!roomId.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: roomId.trim() ? 'var(--color-primary)' : '#ccc',
              color: 'white',
              fontSize: '16px',
              fontWeight: 600,
              cursor: roomId.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            加入
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
};

export default App;
