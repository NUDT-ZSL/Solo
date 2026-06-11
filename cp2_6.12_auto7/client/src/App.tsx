import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Card from './components/Card';
import { WSClient } from './utils/wsClient';
import type { Card as CardType, OnlineUser, SortMode, CardColor, CardVotes, ConnectionStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

const GRID_SIZE = 20;
const CARD_WIDTH = 260;
const CARD_HEIGHT_ESTIMATE = 240;
const CARD_GAP = 24;
const COLOR_ORDER: Record<CardColor, number> = {
  red: 0, orange: 1, yellow: 2, green: 3, blue: 4, purple: 5,
};

const ROOM_ID = 'default';

function snapToGrid(x: number, y: number) {
  return {
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE,
  };
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export default function App() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [selfUserId, setSelfUserId] = useState<string>('');
  const [selfUserName, setSelfUserName] = useState<string>('');
  const [selfAvatarColor, setSelfAvatarColor] = useState<string>('#667eea');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [showSortIndicator, setShowSortIndicator] = useState(false);
  const wsClientRef = useRef<WSClient | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const cursorThrottleRef = useRef<number>(0);

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    const ws = new WSClient(ROOM_ID, {
      onStatus: (status) => setConnectionStatus(status),
      onInit: (data) => {
        setCards(data.cards);
        setUsers(data.users.filter((u) => u.id !== data.selfUserId));
        setSelfUserId(data.selfUserId);
        setSelfUserName(data.selfUserName);
        setSelfAvatarColor(data.selfAvatarColor);
      },
      onUserJoin: (user) => {
        if (user.id !== selfUserId) {
          setUsers((prev) => {
            const exists = prev.find((u) => u.id === user.id);
            if (exists) return prev.map((u) => (u.id === user.id ? user : u));
            return [...prev, user];
          });
        }
      },
      onUserLeave: (userId) => {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      },
      onCardCreated: (card) => {
        setCards((prev) => {
          if (prev.find((c) => c.id === card.id)) return prev;
          return [...prev, card];
        });
      },
      onCardUpdated: (cardId, changes) => {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...changes } : c)));
      },
      onCardDeleted: (cardId) => {
        setCards((prev) => prev.filter((c) => c.id !== cardId));
      },
      onCardVoted: (cardId, votes) => {
        setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, votes } : c)));
      },
      onCursorMoved: (userId, x, y) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, cursor: { x, y } } : u))
        );
      },
      onCardEditing: (userId, cardId) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, editingCardId: cardId } : u))
        );
      },
    });
    wsClientRef.current = ws;
    ws.connect();
    return () => ws.disconnect();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!wsClientRef.current) return;
      const now = Date.now();
      if (now - cursorThrottleRef.current < 50) return;
      cursorThrottleRef.current = now;
      wsClientRef.current.send({
        type: 'cursor:move',
        x: e.clientX,
        y: e.clientY,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const sendUpdate = useCallback((cardId: string, changes: Partial<CardType>) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, ...changes, updatedAt: Date.now() } : c)));
    wsClientRef.current?.send({ type: 'card:update', cardId, changes });
  }, []);

  const sendDelete = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    wsClientRef.current?.send({ type: 'card:delete', cardId });
  }, []);

  const sendVote = useCallback((cardId: string, vote: 'up' | 'down' | null) => {
    wsClientRef.current?.send({ type: 'card:vote', cardId, vote });
  }, []);

  const handleDragStart = useCallback((_cardId: string) => {}, []);

  const handleDragEnd = useCallback((cardId: string, x: number, y: number) => {
    sendUpdate(cardId, { x, y });
  }, [sendUpdate]);

  const handleEditing = useCallback((cardId: string | null) => {
    wsClientRef.current?.send({ type: 'card:editing', cardId });
  }, []);

  const createCard = useCallback(() => {
    const columns = Math.max(1, Math.floor((canvasSize.width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    const count = cards.length;
    const col = count % columns;
    const row = Math.floor(count / columns);
    const x = col * (CARD_WIDTH + CARD_GAP) + CARD_GAP;
    const y = row * (CARD_HEIGHT_ESTIMATE + CARD_GAP) + CARD_GAP;
    const snapped = snapToGrid(x, y);
    const colors: CardColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];
    const newCard: CardType = {
      id: uuidv4(),
      title: '新创意',
      description: '',
      color: colors[Math.floor(Math.random() * colors.length)],
      x: snapped.x,
      y: snapped.y,
      votes: { up: [], down: [] },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: selfUserId,
    };
    setCards((prev) => [...prev, newCard]);
    wsClientRef.current?.send({ type: 'card:create', card: newCard });
  }, [cards.length, canvasSize.width, selfUserId]);

  const exportCards = useCallback(() => {
    const data = JSON.stringify(cards, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm-cards-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [cards]);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as SortMode;
    setSortMode(mode);
    setShowSortIndicator(true);
    setTimeout(() => setShowSortIndicator(false), 1000);
  };

  const sortedCards = useMemo(() => {
    const sorted = [...cards];
    switch (sortMode) {
      case 'color':
        sorted.sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color]);
        break;
      case 'heat':
        sorted.sort((a, b) => {
          const scoreA = a.votes.up.length - a.votes.down.length;
          const scoreB = b.votes.up.length - b.votes.down.length;
          return scoreB - scoreA;
        });
        break;
      case 'time':
      default:
        sorted.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
    }
    return sorted;
  }, [cards, sortMode]);

  const positionedCards = useMemo(() => {
    const columns = Math.max(1, Math.floor((canvasSize.width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    return sortedCards.map((card, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const targetX = col * (CARD_WIDTH + CARD_GAP) + CARD_GAP;
      const targetY = row * (CARD_HEIGHT_ESTIMATE + CARD_GAP) + CARD_GAP;
      return {
        ...card,
        _displayX: targetX,
        _displayY: targetY,
        _row: row,
      };
    });
  }, [sortedCards, canvasSize.width]);

  const editingMap = useMemo(() => {
    const map: Record<string, OnlineUser[]> = {};
    users.forEach((u) => {
      if (u.editingCardId) {
        if (!map[u.editingCardId]) map[u.editingCardId] = [];
        map[u.editingCardId].push(u);
      }
    });
    return map;
  }, [users]);

  const maxRow = Math.max(0, ...positionedCards.map((c) => c._row));
  const canvasHeight = (maxRow + 1) * (CARD_HEIGHT_ESTIMATE + CARD_GAP) + CARD_GAP + 100;

  const statusLabels: Record<ConnectionStatus, string> = {
    connecting: '连接中',
    connected: '已连接',
    reconnecting: '重连中',
    disconnected: '已断开',
  };

  const remoteUsers = users.filter((u) => u.cursor);

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="app-title">
            <div className="app-title-icon">💡</div>
            头脑风暴卡片墙
          </div>
          <div className="connection-status">
            <span className={`status-dot status-${connectionStatus}`} />
            <span className="status-text">{statusLabels[connectionStatus]}</span>
          </div>
          <div className="user-count">
            <svg className="user-count-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {users.length + 1} 人在线
          </div>
        </div>
        <div className="toolbar-right">
          <select className="sort-select" value={sortMode} onChange={handleSortChange}>
            <option value="time">🕐 按编辑时间</option>
            <option value="heat">🔥 按投票热度</option>
            <option value="color">🎨 按标签颜色</option>
          </select>
          <button className="btn btn-secondary" onClick={exportCards} title="导出JSON">
            📤 导出
          </button>
          <button className="btn btn-primary" onClick={createCard}>
            ➕ 创建卡片
          </button>
        </div>
      </div>

      <div className="canvas-container" ref={canvasRef}>
        <div className="canvas-wall" style={{ height: canvasHeight }}>
          {positionedCards.map((card, idx) => (
            <Card
              key={card.id}
              card={{ ...card, x: card._displayX, y: card._displayY }}
              selfUserId={selfUserId}
              editingUsers={editingMap[card.id] || []}
              zIndex={idx + 1}
              onUpdate={sendUpdate}
              onDelete={sendDelete}
              onVote={sendVote}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onEditing={handleEditing}
              snapToGrid={snapToGrid}
            />
          ))}
          {cards.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✨</div>
              <div className="empty-state-title">开始你的头脑风暴</div>
              <div className="empty-state-desc">点击右上角「创建卡片」按钮，记录你的第一个创意</div>
            </div>
          )}
        </div>
      </div>

      {remoteUsers.map((user) =>
        user.cursor ? (
          <div
            key={user.id}
            className="remote-cursor"
            style={{
              transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
            }}
          >
            <div
              className="remote-cursor-avatar"
              style={{ background: user.avatarColor, color: user.avatarColor }}
            >
              <span style={{ color: 'white' }}>{getInitial(user.name)}</span>
            </div>
            <div className="remote-cursor-name">{user.name}</div>
          </div>
        ) : null
      )}

      {showSortIndicator && (
        <div className="sorting-indicator">
          正在重新排列卡片...
        </div>
      )}
    </div>
  );
}
