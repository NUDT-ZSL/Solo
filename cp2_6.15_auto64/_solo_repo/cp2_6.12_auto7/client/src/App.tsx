import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import Card from './components/Card';
import { WSClient } from './utils/wsClient';
import type { Card as CardType, OnlineUser, SortMode, CardColor } from './types';
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
    x: Math.max(0, Math.round(x / GRID_SIZE) * GRID_SIZE),
    y: Math.max(0, Math.round(y / GRID_SIZE) * GRID_SIZE),
  };
}

function getInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

type PositionsMap = { [id: string]: { x: number; y: number } };
type FlipStyleMap = { [id: string]: React.CSSProperties };
type NewCardSet = Set<string>;

export default function App() {
  const [cards, setCards] = useState<CardType[]>([]);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [selfUserId, setSelfUserId] = useState<string>('');
  const [selfUserName, setSelfUserName] = useState<string>('');
  const [selfAvatarColor, setSelfAvatarColor] = useState<string>('#667eea');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [sortMode, setSortMode] = useState<SortMode>('time');
  const [showSortIndicator, setShowSortIndicator] = useState(false);

  // =============================================
  // 🔑 核心修复1：独立的坐标状态，持久化拖拽后的坐标
  // =============================================
  const [cardPositions, setCardPositions] = useState<PositionsMap>({});
  // 🔑 核心修复2：FLIP动画样式状态
  const [flipStyles, setFlipStyles] = useState<FlipStyleMap>({});
  // 🔑 核心修复3：新卡片标记（用于出现动画）
  const [newCards, setNewCards] = useState<NewCardSet>(new Set());
  // 🔑 是否正在进行排序动画
  const sortingRef = useRef(false);

  const wsClientRef = useRef<WSClient | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<{ [id: string]: HTMLDivElement | null }>({});
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const cursorThrottleRef = useRef<number>(0);
  const prevPositionsSnapshot = useRef<{ [id: string]: { left: number; top: number } } | null>(null);
  const isFirstInitRef = useRef(true);

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: Math.max(320, rect.width) });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  //  =============================================
  //  🔑 FLIP动画核心实现
  //  =============================================
  const getSortedTargetPositions = useCallback((cardList: CardType[], mode: SortMode, width: number): PositionsMap => {
    const columns = Math.max(1, Math.floor((width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    const sorted = [...cardList];
    switch (mode) {
      case 'color': sorted.sort((a, b) => COLOR_ORDER[a.color] - COLOR_ORDER[b.color]); break;
      case 'heat':
        sorted.sort((a, b) => (b.votes.up.length - b.votes.down.length) - (a.votes.up.length - a.votes.down.length));
        break;
      case 'time':
      default: sorted.sort((a, b) => b.updatedAt - a.updatedAt); break;
    }
    const result: PositionsMap = {};
    sorted.forEach((card, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      result[card.id] = {
        x: col * (CARD_WIDTH + CARD_GAP) + CARD_GAP,
        y: row * (CARD_HEIGHT_ESTIMATE + CARD_GAP) + CARD_GAP,
      };
    });
    return result;
  }, []);

  // =============================================
  // 🔑 FLIP First 步骤：记录当前DOM位置（切换排序前）
  // =============================================
  const captureCardRects = useCallback(() => {
    if (!wallRef.current) return;
    const rects: { [id: string]: { left: number; top: number } } = {};
    cards.forEach((card) => {
      const el = cardRefs.current[card.id];
      if (el) {
        const rect = el.getBoundingClientRect();
        rects[card.id] = { left: rect.left, top: rect.top };
      }
    });
    return rects;
  }, [cards]);

  // =============================================
  // 🔑 FLIP Last+Invert+Play：切换后计算位移并触发过渡
  // =============================================
  const runFlipAnimation = useCallback(() => {
    const prev = prevPositionsSnapshot.current;
    // 🔒 无论FLIP是否成功都要解除锁定
    const unlockTimeout = setTimeout(() => { sortingRef.current = false; }, 1200);
    const cleanupAndUnlock = () => {
      clearTimeout(unlockTimeout);
      sortingRef.current = false;
    };

    if (!prev || !wallRef.current) {
      prevPositionsSnapshot.current = null;
      cleanupAndUnlock();
      return;
    }

    const invertStyles: FlipStyleMap = {};
    const finalTarget: PositionsMap = {};
    let hasAnyMoved = false;

    cards.forEach((card) => {
      const el = cardRefs.current[card.id];
      const oldRect = prev[card.id];
      if (!el || !oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      const currentPos = cardPositions[card.id] || { x: card.x, y: card.y };
      invertStyles[card.id] = {
        transform: `translate(${currentPos.x + dx}px, ${currentPos.y + dy}px)`,
        transition: 'none',
      };
      finalTarget[card.id] = currentPos;
      hasAnyMoved = true;
    });

    prevPositionsSnapshot.current = null;

    if (!hasAnyMoved || Object.keys(invertStyles).length === 0) {
      cleanupAndUnlock();
      return;
    }

    // Invert Phase
    setFlipStyles(invertStyles);

    // Play Phase：双rAF确保浏览器完成布局
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const playStyles: FlipStyleMap = {};
        const ids = Object.keys(invertStyles);
        ids.forEach((id, i) => {
          const pos = finalTarget[id] || cardPositions[id] || { x: 0, y: 0 };
          playStyles[id] = {
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            transition: `transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
            // 波浪式延迟：按顺序错开，让动画有流动感
            transitionDelay: `${Math.min(i * 40, 500)}ms`,
          };
        });
        setFlipStyles(playStyles);
        // 动画+延迟全部结束后清理并解锁
        const maxDelay = Math.min((ids.length - 1) * 40, 500);
        setTimeout(() => {
          setFlipStyles({});
          cleanupAndUnlock();
        }, 700 + maxDelay);
      });
    });
  }, [cards, cardPositions]);

  useEffect(() => {
    // 跳过首次初始化
    if (isFirstInitRef.current) {
      isFirstInitRef.current = false;
      return;
    }
    if (sortingRef.current || prevPositionsSnapshot.current) {
      runFlipAnimation();
    }
  }, [cardPositions, runFlipAnimation]);

  // =============================================
  // WebSocket连接
  // =============================================
  useEffect(() => {
    const ws = new WSClient(ROOM_ID, {
      onStatus: (status) => setConnectionStatus(status),
      onInit: (data) => {
        setCards(data.cards);
        const initPos: PositionsMap = {};
        data.cards.forEach(c => { initPos[c.id] = { x: c.x, y: c.y }; });
        setCardPositions(initPos);
        setUsers(data.users.filter(u => u.id !== data.selfUserId));
        setSelfUserId(data.selfUserId);
        setSelfUserName(data.selfUserName);
        setSelfAvatarColor(data.selfAvatarColor);
      },
      onUserJoin: (user) => {
        if (user.id !== selfUserId) {
          setUsers(prev => {
            const exists = prev.find(u => u.id === user.id);
            if (exists) return prev.map(u => u.id === user.id ? user : u);
            return [...prev, user];
          });
        }
      },
      onUserLeave: (userId) => setUsers(prev => prev.filter(u => u.id !== userId)),
      onCardCreated: (card) => {
        setCards(prev => {
          if (prev.find(c => c.id === card.id)) return prev;
          // 标记为新卡片，触发出现动画
          setNewCards(s => new Set(s).add(card.id));
          setTimeout(() => setNewCards(s => { const n = new Set(s); n.delete(card.id); return n; }), 600);
          return [...prev, card];
        });
        setCardPositions(prev => ({ ...prev, [card.id]: { x: card.x, y: card.y } }));
      },
      onCardUpdated: (cardId, changes) => {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...changes } : c));
        if (changes.x !== undefined || changes.y !== undefined) {
          setCardPositions(prev => {
            const existing = prev[cardId] || { x: 0, y: 0 };
            return { ...prev, [cardId]: { x: changes.x ?? existing.x, y: changes.y ?? existing.y } };
          });
        }
      },
      onCardDeleted: (cardId) => {
        setCards(prev => prev.filter(c => c.id !== cardId));
        setCardPositions(prev => { const { [cardId]: _, ...rest } = prev; return rest; });
      },
      onCardVoted: (cardId, votes) => {
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, votes } : c));
      },
      onCursorMoved: (userId, x, y) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, cursor: { x, y } } : u));
      },
      onCardEditing: (userId, cardId) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, editingCardId: cardId } : u));
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
      wsClientRef.current.send({ type: 'cursor:move', x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // =============================================
  // 操作回调
  // =============================================
  const sendUpdate = useCallback((cardId: string, changes: Partial<CardType>) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...changes, updatedAt: Date.now() } : c));
    wsClientRef.current?.send({ type: 'card:update', cardId, changes });
  }, []);

  const sendDelete = useCallback((cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    setCardPositions(prev => { const { [cardId]: _, ...rest } = prev; return rest; });
    wsClientRef.current?.send({ type: 'card:delete', cardId });
  }, []);

  const sendVote = useCallback((cardId: string, vote: 'up' | 'down' | null) => {
    wsClientRef.current?.send({ type: 'card:vote', cardId, vote });
  }, []);

  const handleDragStart = useCallback((_cardId: string) => {}, []);

  // 🔑 拖拽结束时：更新独立的cardPositions状态，并通过WS广播
  const handleDragEnd = useCallback((cardId: string, x: number, y: number) => {
    const snapped = snapToGrid(x, y);
    setCardPositions(prev => ({ ...prev, [cardId]: snapped }));
    sendUpdate(cardId, { x: snapped.x, y: snapped.y });
  }, [sendUpdate]);

  const handleEditing = useCallback((cardId: string | null) => {
    wsClientRef.current?.send({ type: 'card:editing', cardId });
  }, []);

  // 🔑 创建卡片：坐标写入cardPositions（同时写入card数据）
  const createCard = useCallback(() => {
    const columns = Math.max(1, Math.floor((canvasSize.width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    // 在当前的cardPositions基础上计算新卡的位置，避免和已有卡片重叠
    const currentPositions = Object.values(cardPositions);
    const total = Math.max(cards.length, currentPositions.length);
    const col = total % columns;
    const row = Math.floor(total / columns);
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
    setCards(prev => [...prev, newCard]);
    setCardPositions(prev => ({ ...prev, [newCard.id]: snapped }));
    setNewCards(s => new Set(s).add(newCard.id));
    setTimeout(() => {
      setNewCards(s => { const n = new Set(s); n.delete(newCard.id); return n; });
    }, 600);
    wsClientRef.current?.send({ type: 'card:create', card: newCard });
  }, [cards.length, canvasSize.width, selfUserId, cardPositions]);

  // 🔑 导出JSON：完整功能修复
  const exportCards = useCallback(() => {
    try {
      const exportData = cards.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        color: c.color,
        position: cardPositions[c.id] || { x: c.x, y: c.y },
        votes: {
          upCount: c.votes.up.length,
          downCount: c.votes.down.length,
        },
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.updatedAt).toISOString(),
        createdBy: c.createdBy,
      }));
      const json = JSON.stringify({
        exportedAt: new Date().toISOString(),
        roomId: ROOM_ID,
        totalCards: exportData.length,
        cards: exportData,
      }, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `brainstorm-cards-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log(`已导出 ${exportData.length} 张卡片`);
    } catch (err) {
      console.error('导出失败：', err);
      alert('导出失败，请查看控制台');
    }
  }, [cards, cardPositions]);

  // =============================================
  // 🔑 排序切换：FLIP动画触发入口
  // =============================================
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as SortMode;
    if (mode === sortMode) return;
    if (sortingRef.current) return;

    // ============== FLIP Step 1: FIRST ==============
    prevPositionsSnapshot.current = captureCardRects() || null;
    sortingRef.current = true;
    setShowSortIndicator(true);
    setTimeout(() => setShowSortIndicator(false), 1000);

    // ============== 设置目标坐标（通过cardPositions触发布局重算）==============
    const targets = getSortedTargetPositions(cards, mode, canvasSize.width);
    setSortMode(mode);

    // ============== FLIP Step 2: LAST (通过 setState 触发重渲染) ==============
    setCardPositions(prev => {
      const next = { ...prev };
      Object.keys(targets).forEach(id => { next[id] = targets[id]; });
      return next;
    });
  };

  // 编辑者映射
  const editingMap = useMemo(() => {
    const map: { [id: string]: OnlineUser[] } = {};
    users.forEach(u => {
      if (u.editingCardId) {
        if (!map[u.editingCardId]) map[u.editingCardId] = [];
        map[u.editingCardId].push(u);
      }
    });
    return map;
  }, [users]);

  // 计算画布高度
  const canvasHeight = useMemo(() => {
    const columns = Math.max(1, Math.floor((canvasSize.width - CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
    const total = cards.length;
    const rows = Math.max(1, Math.ceil(total / columns));
    return rows * (CARD_HEIGHT_ESTIMATE + CARD_GAP) + CARD_GAP + 150;
  }, [cards.length, canvasSize.width]);

  // 检查所有卡片的最大Y值，确保画布够高
  const maxY = useMemo(() => {
    const vals = Object.values(cardPositions);
    const fromPos = vals.length > 0 ? Math.max(...vals.map(p => p.y)) : 0;
    return Math.max(fromPos + CARD_HEIGHT_ESTIMATE + 150, canvasHeight);
  }, [cardPositions, canvasHeight]);

  const statusLabels = {
    connecting: '连接中', connected: '已连接', reconnecting: '重连中', disconnected: '已断开',
  };
  const remoteUsers = users.filter(u => u.cursor);

  // 🔑 Card组件挂载后通过此回调把真正的DOM元素注册进来（用于FLIP动画获取位置）
  const registerCardDomRef = useCallback((cardId: string, el: HTMLDivElement | null) => {
    cardRefs.current[cardId] = el;
  }, []);

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
          <select className="sort-select" value={sortMode} onChange={handleSortChange} disabled={sortingRef.current || cards.length < 2}>
            <option value="time">🕐 按编辑时间</option>
            <option value="heat">🔥 按投票热度</option>
            <option value="color">🎨 按标签颜色</option>
          </select>
          <button className="btn btn-secondary" onClick={exportCards} title="导出所有卡片为JSON">
            📤 导出
          </button>
          <button className="btn btn-primary" onClick={createCard}>
            ➕ 创建卡片
          </button>
        </div>
      </div>

      <div className="canvas-container" ref={canvasRef}>
        <div className="canvas-wall" ref={wallRef} style={{ height: maxY, position: 'relative' }}>
          {cards.map((card, idx) => {
            const pos = cardPositions[card.id] || { x: card.x, y: card.y };
            const flipStyle = flipStyles[card.id];
            const isNew = newCards.has(card.id);
            return (
              <Card
                key={card.id}
                card={{ ...card, x: pos.x, y: pos.y }}
                selfUserId={selfUserId}
                editingUsers={editingMap[card.id] || []}
                zIndex={idx + 1}
                isNew={isNew}
                flipStyle={flipStyle}
                registerDomRef={registerCardDomRef}
                onUpdate={sendUpdate}
                onDelete={sendDelete}
                onVote={sendVote}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onEditing={handleEditing}
                snapToGrid={snapToGrid}
              />
            );
          })}
          {cards.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">✨</div>
              <div className="empty-state-title">开始你的头脑风暴</div>
              <div className="empty-state-desc">点击右上角「创建卡片」按钮，记录你的第一个创意</div>
            </div>
          )}
        </div>
      </div>

      {remoteUsers.map(user =>
        user.cursor ? (
          <div
            key={user.id}
            className="remote-cursor"
            style={{ transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)` }}
          >
            <div className="remote-cursor-avatar" style={{ background: user.avatarColor, color: user.avatarColor }}>
              <span style={{ color: 'white' }}>{getInitial(user.name)}</span>
            </div>
            <div className="remote-cursor-name">{user.name}</div>
          </div>
        ) : null
      )}

      {showSortIndicator && (
        <div className="sorting-indicator">正在重新排列卡片...</div>
      )}
    </div>
  );
}
