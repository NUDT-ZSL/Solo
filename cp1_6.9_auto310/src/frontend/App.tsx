import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Card,
  Connection,
  addCard as engineAddCard,
  removeCard as engineRemoveCard,
  updateConnection,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CARD_WIDTH,
  CARD_HEIGHT,
  getReadingOrder,
  exportPoemAnimation,
  hslToHex
} from './PoemEngine';
import Canvas from './components/Canvas';
import WordLibrary from './components/WordLibrary';
import Toolbar from './components/Toolbar';
import EmotionWheel from './components/EmotionWheel';
import PoemAnimation from './components/PoemAnimation';
import LoadModal from './components/LoadModal';
import { io, Socket } from 'socket.io-client';

interface PoemContextType {
  cards: Card[];
  connections: Connection[];
  addCard: (word: string, x: number, y: number) => void;
  removeCard: (cardId: string) => void;
  moveCard: (cardId: string, x: number, y: number, broadcast?: boolean) => void;
  clearCanvas: () => void;
  savePoem: () => Promise<string | null>;
  loadPoem: (id: string) => Promise<boolean>;
  playingPoem: boolean;
  poemLines: string[];
  flashingConnections: Set<string>;
  startPoemAnimation: () => void;
  showLoadModal: boolean;
  setShowLoadModal: (v: boolean) => void;
}

const PoemContext = createContext<PoemContextType | null>(null);

export const usePoem = () => {
  const ctx = useContext(PoemContext);
  if (!ctx) throw new Error('usePoem must be used within PoemProvider');
  return ctx;
};

const App: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [playingPoem, setPlayingPoem] = useState(false);
  const [poemLines, setPoemLines] = useState<string[]>([]);
  const [flashingConnections, setFlashingConnections] = useState<Set<string>>(new Set());
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [savedId, setSavedId] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const broadcastRef = useRef(true);
  const isRemoteUpdateRef = useRef(false);
  const poemAnimTimersRef = useRef<number[]>([]);

  const roomId = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || 'default-room';
  }, []);

  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.emit('join-room', roomId);

    socket.on('room-state', (state: { cards: Card[]; connections: Connection[] }) => {
      if (state.cards.length > 0 && cards.length === 0) {
        isRemoteUpdateRef.current = true;
        setCards(state.cards);
        setConnections(updateConnection(state.cards));
        setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
      }
    });

    socket.on('card-added', (card: Card) => {
      isRemoteUpdateRef.current = true;
      setCards((prev) => {
        if (prev.find((c) => c.id === card.id)) return prev;
        const newCards = [...prev, card];
        setConnections(updateConnection(newCards));
        return newCards;
      });
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    socket.on('card-removed', (cardId: string) => {
      isRemoteUpdateRef.current = true;
      setCards((prev) => {
        const newCards = engineRemoveCard(prev, cardId);
        setConnections(updateConnection(newCards));
        return newCards;
      });
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    socket.on('card-moved', ({ cardId, x, y }: { cardId: string; x: number; y: number }) => {
      isRemoteUpdateRef.current = true;
      setCards((prev) => {
        const newCards = prev.map((c) => (c.id === cardId ? { ...c, x, y } : c));
        setConnections(updateConnection(newCards));
        return newCards;
      });
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    socket.on('connections-updated', (newConnections: Connection[]) => {
      isRemoteUpdateRef.current = true;
      setConnections(newConnections);
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    socket.on('canvas-cleared', () => {
      isRemoteUpdateRef.current = true;
      setCards([]);
      setConnections([]);
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
    });

    return () => {
      socket.emit('leave-room', roomId);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    const newConnections = updateConnection(cards);
    setConnections(newConnections);
  }, [cards]);

  const addCard = useCallback(
    (word: string, x: number, y: number) => {
      const result = engineAddCard(cards, word, x, y);
      setCards(result.cards);
      if (socketRef.current && !isRemoteUpdateRef.current) {
        socketRef.current.emit('add-card', roomId, result.card);
      }
    },
    [cards, roomId]
  );

  const removeCard = useCallback(
    (cardId: string) => {
      const newCards = engineRemoveCard(cards, cardId);
      setCards(newCards);
      if (socketRef.current && !isRemoteUpdateRef.current) {
        socketRef.current.emit('remove-card', roomId, cardId);
      }
    },
    [cards, roomId]
  );

  const moveCard = useCallback(
    (cardId: string, x: number, y: number, broadcast: boolean = true) => {
      setCards((prev) => {
        const newCards = prev.map((c) => {
          if (c.id !== cardId) return c;
          return {
            ...c,
            x: Math.max(0, Math.min(x, CANVAS_WIDTH - CARD_WIDTH)),
            y: Math.max(0, Math.min(y, CANVAS_HEIGHT - CARD_HEIGHT))
          };
        });
        return newCards;
      });
      if (socketRef.current && !isRemoteUpdateRef.current && broadcast) {
        const clampedX = Math.max(0, Math.min(x, CANVAS_WIDTH - CARD_WIDTH));
        const clampedY = Math.max(0, Math.min(y, CANVAS_HEIGHT - CARD_HEIGHT));
        socketRef.current.emit('move-card', roomId, cardId, clampedX, clampedY);
      }
    },
    [roomId]
  );

  const clearCanvas = useCallback(() => {
    setCards([]);
    setConnections([]);
    if (socketRef.current && !isRemoteUpdateRef.current) {
      socketRef.current.emit('clear-canvas', roomId);
    }
  }, [roomId]);

  const savePoem = useCallback(async (): Promise<string | null> => {
    try {
      const emotionMap: Record<string, number> = {};
      cards.forEach((c) => {
        emotionMap[c.word] = c.hue;
      });
      const res = await fetch('/api/poems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards,
          connections,
          emotionMap,
          title: '织言诗笺 - 未命名'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSavedId(data.id);
        return data.id;
      }
    } catch (e) {
      console.error('保存失败', e);
    }
    return null;
  }, [cards, connections]);

  const loadPoem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/poems/${id}`);
      if (res.ok) {
        const data = await res.json();
        isRemoteUpdateRef.current = true;
        setCards([]);
        setTimeout(() => {
          setCards(data.cards || []);
          setConnections(data.connections || []);
          setTimeout(() => { isRemoteUpdateRef.current = false; }, 100);
        }, 50);
        return true;
      }
    } catch (e) {
      console.error('加载失败', e);
    }
    return false;
  }, []);

  const startPoemAnimation = useCallback(() => {
    poemAnimTimersRef.current.forEach((t) => clearTimeout(t));
    poemAnimTimersRef.current = [];
    const ordered = getReadingOrder(cards);
    if (ordered.length === 0) return;

    const { lines, lineConnections } = exportPoemAnimation(cards, connections);
    setPoemLines(lines);
    setPlayingPoem(true);
    setFlashingConnections(new Set());

    let totalDelay = 0;
    lines.forEach((line, lineIdx) => {
      const lineCardIds = lineConnections[lineIdx] || [];
      const lineDelay = line.length * 300 + 500;
      const flashTimer = window.setTimeout(() => {
        const connKeys = new Set<string>();
        connections.forEach((conn) => {
          if (lineCardIds.includes(conn.from) || lineCardIds.includes(conn.to)) {
            connKeys.add(`${conn.from}-${conn.to}`);
          }
        });
        setFlashingConnections(new Set(connKeys));
        window.setTimeout(() => {
          setFlashingConnections(new Set());
        }, 500);
      }, totalDelay);
      poemAnimTimersRef.current.push(flashTimer);
      totalDelay += lineDelay;
    });

    const endTimer = window.setTimeout(() => {
      setPlayingPoem(false);
      setFlashingConnections(new Set());
    }, totalDelay + 1000);
    poemAnimTimersRef.current.push(endTimer);
  }, [cards, connections]);

  const value: PoemContextType = {
    cards,
    connections,
    addCard,
    removeCard,
    moveCard,
    clearCanvas,
    savePoem,
    loadPoem,
    playingPoem,
    poemLines,
    flashingConnections,
    startPoemAnimation,
    showLoadModal,
    setShowLoadModal
  };

  const appStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden'
  };

  const headerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    left: 32,
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 12
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #ffd700, #ff85c0, #8ab4ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: 2
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1
  };

  const poemButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 20,
    right: 32,
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    background: 'radial-gradient(circle, rgba(255,215,0,0.3), rgba(138,180,255,0.3))',
    boxShadow: '0 0 30px rgba(255,215,0,0.4), inset 0 0 20px rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 16,
    fontWeight: 600,
    zIndex: 10,
    letterSpacing: 2,
    animation: 'breath 3s ease-in-out infinite'
  };

  const saveIdStyle: React.CSSProperties = {
    position: 'absolute',
    top: 108,
    right: 32,
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    zIndex: 10
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    padding: '110px 32px 100px 32px',
    gap: 20,
    overflow: 'hidden',
    position: 'relative'
  };

  return (
    <PoemContext.Provider value={value}>
      <div style={appStyle}>
        <style>{`
          @keyframes breath {
            0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(255,215,0,0.4), inset 0 0 20px rgba(255,255,255,0.1); }
            50% { transform: scale(1.06); box-shadow: 0 0 50px rgba(255,215,0,0.6), inset 0 0 30px rgba(255,255,255,0.15); }
          }
          @keyframes ripple {
            0% { transform: scale(0); opacity: 0.6; }
            100% { transform: scale(2.5); opacity: 0; }
          }
          @keyframes flyIn {
            0% { transform: translate(var(--fx, 300px), var(--fy, -300px)) scale(0.3); opacity: 0; }
            60% { transform: translate(0, 0) scale(1.1); opacity: 1; }
            100% { transform: translate(0, 0) scale(1); opacity: 1; }
          }
        `}</style>

        <div style={headerStyle}>
          <div style={titleStyle}>织言诗笺</div>
          <div style={subtitleStyle}>Visual Poetry Studio</div>
        </div>

        {savedId && <div style={saveIdStyle}>最近保存 ID: {savedId.slice(0, 8)}</div>}

        <button style={poemButtonStyle} onClick={startPoemAnimation}>
          诗行
        </button>

        <div style={mainStyle}>
          <EmotionWheel />
          <Canvas />
          <WordLibrary />
        </div>

        <Toolbar />
        <PoemAnimation />
        {showLoadModal && <LoadModal />}
      </div>
    </PoemContext.Provider>
  );
};

export default App;
