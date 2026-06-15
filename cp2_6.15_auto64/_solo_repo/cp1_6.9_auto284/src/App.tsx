import { useState, useEffect, useRef, useCallback, createContext, useContext, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import Corridor from './Corridor';
import PuzzleBoard from './PuzzleBoard';

export type Fragment = {
  id: string;
  text: string;
  hue: number;
  posX: number;
  posY: number;
  corridorX: number;
  collectedBy: string[];
};

export type PoemFragment = {
  id: string;
  text: string;
  row: number;
  col: number;
  hue: number;
};

export type OnlineUser = {
  id: string;
  name: string;
  socketId: string;
  position: { x: number; y: number };
  collectedCount: number;
  completedLines: number;
  lastActive: number;
};

export type Poem = {
  id: string;
  title: string;
  lines: string[];
  fragments: PoemFragment[];
  authorId: string;
  authorName: string;
  likes: number;
  comments: any[];
  createdAt: number;
  likedBy: string[];
};

type AppContextType = {
  userId: string;
  currentUser: OnlineUser | null;
  fragments: Fragment[];
  collectedFragments: PoemFragment[];
  onlineUsers: OnlineUser[];
  poems: Poem[];
  addCollectedFragment: (fragment: Fragment, startPos: { x: number; y: number }) => void;
  publishPoem: (title: string, lines: string[], frags: PoemFragment[]) => Promise<Poem | null>;
  likePoem: (poemId: string) => Promise<void>;
  socket: Socket | null;
};

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default function App() {
  const [userId, setUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<OnlineUser | null>(null);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [collectedFragments, setCollectedFragments] = useState<PoemFragment[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [showScroll, setShowScroll] = useState(false);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [completedFragments, setCompletedFragments] = useState<PoemFragment[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [petals, setPetals] = useState<{ id: string; left: number; delay: number; duration: number }[]>([]);
  const [likedPoems, setLikedPoems] = useState<Set<string>>(new Set());
  const [publishedPoemId, setPublishedPoemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const socket = io({
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket 已连接');
    });

    socket.on('user:init', (data: { userId: string; user: OnlineUser }) => {
      setUserId(data.userId);
      setCurrentUser(data.user);
      setLoading(false);
    });

    socket.on('users:update', (users: OnlineUser[]) => {
      setOnlineUsers(users.filter(u => u.id !== (socketRef.current?.id ? '' : '')));
    });

    socket.on('fragments:regenerated', (newFragments: Fragment[]) => {
      setFragments(newFragments);
    });

    socket.on('fragment:split', (data: { fragmentId: string; collectedBy: string[] }) => {
      setFragments(prev => prev.map(f => 
        f.id === data.fragmentId ? { ...f, collectedBy: data.collectedBy } : f
      ));
    });

    socket.on('poem:published', (poem: Poem) => {
      setPoems(prev => [poem, ...prev]);
    });

    socket.on('poem:liked', (data: { id: string; likes: number; userId: string }) => {
      setPoems(prev => prev.map(p => 
        p.id === data.id ? { ...p, likes: data.likes } : p
      ));
    });

    socket.on('effect:petals', (data: { poemId: string; count: number; duration: number }) => {
      triggerPetals(data.count, data.duration);
    });

    fetch('/api/fragments')
      .then(res => res.json())
      .then(data => setFragments(data))
      .catch(err => console.error('加载碎片失败:', err));

    fetch('/api/poems')
      .then(res => res.json())
      .then(data => setPoems(data))
      .catch(err => console.error('加载诗歌失败:', err));

    return () => {
      socket.disconnect();
    };
  }, []);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playDing = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }, [getAudioCtx]);

  const playScale = useCallback(() => {
    try {
      const ctx = getAudioCtx();
      const notes = [261.63, 329.63, 392, 523.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.25);
      });
    } catch (e) {}
  }, [getAudioCtx]);

  const addCollectedFragment = useCallback((fragment: Fragment, startPos: { x: number; y: number }) => {
    const poemFrag: PoemFragment = {
      id: uuidv4(),
      text: fragment.text,
      hue: fragment.hue,
      row: -1,
      col: -1
    };

    playDing();
    setCollectedFragments(prev => [...prev, poemFrag]);

    if (socketRef.current) {
      socketRef.current.emit('fragment:collect', fragment.id);
    }
  }, [playDing]);

  const onPoemComplete = useCallback((lines: string[], frags: PoemFragment[]) => {
    setCompletedLines(lines);
    setCompletedFragments(frags);
    setShowScroll(true);
    playScale();
  }, [playScale]);

  const onLineComplete = useCallback((line: string) => {
    if (socketRef.current) {
      socketRef.current.emit('puzzle:completeLine', { line, score: 80 });
    }
    playScale();
  }, [playScale]);

  const publishPoem = useCallback(async (title: string, lines: string[], frags: PoemFragment[]): Promise<Poem | null> => {
    try {
      const res = await fetch('/api/poems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          lines,
          fragments: frags,
          authorId: userId,
          authorName: currentUser?.name || '无名诗人'
        })
      });
      if (res.ok) {
        const poem = await res.json();
        setPublishedPoemId(poem.id);
        setCollectedFragments(prev => prev.filter(f => !frags.some(cf => cf.id === f.id)));
        return poem;
      }
    } catch (e) {
      console.error('发布失败:', e);
    }
    return null;
  }, [userId, currentUser]);

  const likePoem = useCallback(async (poemId: string) => {
    if (likedPoems.has(poemId)) return;
    try {
      await fetch(`/api/poems/${poemId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setLikedPoems(prev => new Set([...prev, poemId]));
    } catch (e) {
      console.error('点赞失败:', e);
    }
  }, [likedPoems, userId]);

  const triggerPetals = useCallback((count: number, duration: number) => {
    const newPetals = Array.from({ length: count }, (_, i) => ({
      id: uuidv4(),
      left: Math.random() * 100,
      delay: Math.random() * (duration / 2),
      duration: 2 + Math.random() * 2
    }));
    setPetals(prev => [...prev, ...newPetals]);
    setTimeout(() => {
      setPetals(prev => prev.filter(p => !newPetals.some(np => np.id === p.id)));
    }, duration + 2000);
  }, []);

  const handlePublish = async (title: string) => {
    const result = await publishPoem(title, completedLines, completedFragments);
    if (result) {
      setTimeout(() => {
        setShowScroll(false);
        setCompletedLines([]);
        setCompletedFragments([]);
      }, 2000);
    }
  };

  const contextValue: AppContextType = {
    userId,
    currentUser,
    fragments,
    collectedFragments,
    onlineUsers,
    poems,
    addCollectedFragment,
    publishPoem,
    likePoem,
    socket: socketRef.current
  };

  if (loading) {
    return <div className="loading">正 入 回 廊...</div>;
  }

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-container">
        <header className="header">
          <div className="header-title">回 声 诗 廊</div>
        <div className="header-info">
          <div className="online-count">
            <span className="online-dot" />
            <span>在线 {onlineUsers.length + 1} 人</span>
          </div>
          <div>已收集: {collectedFragments.length} 碎片</div>
          <button 
            className="view-poems-btn"
            onClick={() => setShowGallery(!showGallery)}
          >
            {showGallery ? '返回回廊' : '诗廊作品'}
          </button>
        </div>
        </header>

        {!showGallery && (
          <>
            <div className="corridor-wrapper">
              <Corridor />
            </div>
            <div className="puzzle-wrapper">
              <PuzzleBoard 
                onPoemComplete={onPoemComplete}
                onLineComplete={onLineComplete}
              />
            </div>
          </>
        )}

        {showGallery && (
          <div className="poems-gallery">
          <button className="close-gallery" onClick={() => setShowGallery(false)}>
            关闭
          </button>
          <div className="poems-grid">
            {poems.map(poem => (
              <div key={poem.id} className="poem-card">
                <div className="poem-card-title">{poem.title}</div>
                <div className="poem-card-content">
                  {poem.lines.map((line, i) => (
                    <div key={i} className="poem-card-line">{line}</div>
                  ))}
                </div>
                <div className="poem-card-meta">
                  <span>作者: {poem.authorName}</span>
                  <button 
                    className={`like-btn ${likedPoems.has(poem.id) ? 'liked' : ''}`}
                    onClick={() => likePoem(poem.id)}
                  >
                    ❤ {poem.likes}
                  </button>
                </div>
              </div>
              ))}
          </div>
        </div>
        )}

        {showScroll && (
          <div className="scroll-modal" onClick={(e) => {
            if (e.target === e.currentTarget && !publishedPoemId) {
              setShowScroll(false);
              setCompletedLines([]);
              setCompletedFragments([]);
              setPublishedPoemId(null);
            }
          }}>
            <div className="scroll-container">
              <div className="poem-display">
                {publishedPoemId ? (
              <>
                <h2 style={{ marginBottom: 20, color: 'hsl(35, 50%, 35%) }}>
                  <input
                    className="poem-title-input"
                    value={poems.find(p => p.id === publishedPoemId)?.title || '无题'}
                    readOnly
                    style={{ pointerEvents: 'none' }}
                  />
                </h2>
                <div className="poem-lines">
                  {completedLines.map((line, i) => (
                    <div key={i} className="poem-line">{line}</div>
                  ))}
                </div>
                <div className="share-link-box">
                  <div style={{ marginBottom: 8, fontSize: 13 }}>诗歌链接 (点击复制):</div>
                  <div 
                    className="share-link"
                    onClick={() => {
                      navigator.clipboard.writeText(
                      `${window.location.origin}${window.location.pathname}?poem=${publishedPoemId}`
                    );
                    }}
                  >
                    {`${window.location.origin}${window.location.pathname}?poem=${publishedPoemId}`}
                  </div>
                </div>
                <div className="poem-actions" style={{ marginTop: 24 }}>
                  <button className="cancel-btn" onClick={() => {
                    setShowScroll(false);
                    setCompletedLines([]);
                    setCompletedFragments([]);
                    setPublishedPoemId(null);
                  }}>
                    继续创作
                    </button>
                </div>
              </>
            ) : (
              <>
                <input
                  className="poem-title-input"
                  placeholder="输入诗题 (最多10字)"
                  maxLength={10}
                  defaultValue="无题"
                  id="poem-title-input"
                />
                <div className="poem-lines">
                  {completedLines.map((line, i) => (
                    <div key={i} className="poem-line">{line}</div>
                  ))}
                </div>
                <div className="poem-actions">
                  <button className="cancel-btn" onClick={() => {
                    setShowScroll(false);
                    setCompletedLines([]);
                    setCompletedFragments([]);
                  }}>
                    再润色
                  </button>
                  <button className="publish-btn" onClick={() => {
                    const input = document.getElementById('poem-title-input') as HTMLInputElement;
                    handlePublish(input?.value || '无题');
                  }}>
                    发布分享
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
          </div>
        )}

        {petals.map(petal => (
          <div
            key={petal.id}
            className="petal"
            style={{
              left: `${petal.left}%`,
              top: 0,
              animationDelay: `${petal.delay}ms, ${petal.duration}s`,
              animationDuration: `${petal.duration}s`,
            }}
          >
            🌸
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}
