import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CARD_WIDTH, CARD_HEIGHT } from './components/Card';
import {
  CardData,
  Connection,
  computeConnections,
  getConnectionColor,
  getConnectionWidth
} from './utils/similarity';

interface GroupData {
  id: string;
  label: string;
  cardIds: string[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  ttl: number;
}

const App: React.FC = () => {
  const [cards, setCards] = useState<CardData[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [groupLabelInput, setGroupLabelInput] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const particleIdRef = useRef(0);
  const animFrameRef = useRef<number>();

  const newCardRef = useRef({
    title: '',
    description: '',
    tags: '',
    image: '' as string | null
  });
  const editCardRef = useRef({
    title: '',
    description: '',
    tags: '',
    image: '' as string | null
  });

  useEffect(() => {
    const checkWidth = () => setToolbarCollapsed(window.innerWidth < 1400);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      setCards(data || []);
    } catch (e) {
      console.error('Failed to load cards', e);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    setConnections(computeConnections(cards));
  }, [cards]);

  const highlightedIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const q = searchQuery.toLowerCase().trim();
    const set = new Set<string>();
    for (const c of cards) {
      const titleMatch = c.title.toLowerCase().includes(q);
      const descMatch = (c.description || '').toLowerCase().includes(q);
      const tagMatch = (c.tags || []).some(t => t.toLowerCase().includes(q));
      if (titleMatch || descMatch || tagMatch) set.add(c.id);
    }
    return set;
  }, [cards, searchQuery]);

  const filteredIds = useMemo(() => {
    if (!searchQuery.trim()) return new Set<string>();
    const set = new Set<string>();
    for (const c of cards) {
      if (!highlightedIds.has(c.id)) set.add(c.id);
    }
    return set;
  }, [cards, searchQuery, highlightedIds]);

  const animateParticles = useCallback(() => {
    if (connections.length === 0) {
      animFrameRef.current = requestAnimationFrame(animateParticles);
      return;
    }
    const cardMap = new Map(cards.map(c => [c.id, c]));
    const newParticles: Particle[] = [];
    const numToSpawn = Math.min(connections.length * 2, 40);
    for (let i = 0; i < numToSpawn; i++) {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      const from = cardMap.get(conn.from);
      const to = cardMap.get(conn.to);
      if (!from || !to) continue;
      const fromX = from.x + CARD_WIDTH / 2;
      const fromY = from.y + CARD_HEIGHT / 2;
      const toX = to.x + CARD_WIDTH / 2;
      const toY = to.y + CARD_HEIGHT / 2;
      const t = Math.random();
      const x = fromX + (toX - fromX) * (0.7 + Math.random() * 0.3);
      const y = fromY + (toY - fromY) * (0.7 + Math.random() * 0.3);
      newParticles.push({
        id: particleIdRef.current++,
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 4,
        size: 1 + Math.random(),
        opacity: 0.2 + Math.random() * 0.3,
        ttl: 30 + Math.random() * 40
      });
    }
    setParticles(prev => {
      const kept = prev
        .map(p => ({ ...p, ttl: p.ttl - 1, opacity: p.opacity * 0.96 }))
        .filter(p => p.ttl > 0);
      return [...kept, ...newParticles].slice(0, 150);
    });
    animFrameRef.current = requestAnimationFrame(animateParticles);
  }, [connections, cards]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(animateParticles);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [animateParticles]);

  const apiUpdate = async (id: string, updates: Partial<CardData>) => {
    try {
      await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const handleDragStart = useCallback((id: string, _e: React.MouseEvent) => {
    // no-op: mouse handlers attached in Card
  }, []);

  const handleDragMove = useCallback((id: string, x: number, y: number) => {
    setCards(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, x, y };
      }
      if (selectedIds.has(id)) {
        const origCard = prev.find(cc => cc.id === id);
        if (origCard) {
          const dx = x - origCard.x;
          const dy = y - origCard.y;
          if (selectedIds.has(c.id) && c.id !== id) {
            return { ...c, x: c.x + dx, y: c.y + dy };
          }
        }
      }
      return c;
    }));
  }, [selectedIds]);

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    setCards(prev => prev.map(c => {
      if (c.id === id) {
        apiUpdate(id, { x, y });
        return { ...c, x, y };
      }
      if (selectedIds.has(id)) {
        const origCards = [...prev];
        const origCard = origCards.find(cc => cc.id === id);
        if (origCard) {
          const dx = x - origCard.x;
          const dy = y - origCard.y;
          if (selectedIds.has(c.id) && c.id !== id) {
            const newX = c.x + dx;
            const newY = c.y + dy;
            apiUpdate(c.id, { x: newX, y: newY });
            return { ...c, x: newX, y: newY };
          }
        }
      }
      return c;
    }));
  }, [selectedIds]);

  const handleCardClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSelectedIds(prev => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        return n;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  }, []);

  const handleCardDoubleClick = useCallback((id: string) => {
    const c = cards.find(cc => cc.id === id);
    if (c) {
      editCardRef.current = {
        title: c.title,
        description: c.description,
        tags: (c.tags || []).join(', '),
        image: c.image || null
      };
      setShowEditModal(id);
    }
  }, [cards]);

  const handleDeleteCard = useCallback(async (id: string) => {
    try {
      await fetch(`/api/cards/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Delete failed', e);
    }
    setCards(prev => prev.filter(c => c.id !== id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  }, []);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).id.startsWith('canvas-bg')) return;
    setSelectedIds(new Set());
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    setIsSelecting(true);
    setSelectionBox({ x: sx, y: sy, w: 0, h: 0 });

    const handleMove = (me: MouseEvent) => {
      const ex = me.clientX - rect.left;
      const ey = me.clientY - rect.top;
      setSelectionBox({
        x: Math.min(sx, ex),
        y: Math.min(sy, ey),
        w: Math.abs(ex - sx),
        h: Math.abs(ey - sy)
      });
    };

    const handleUp = (ue: MouseEvent) => {
      const ex = ue.clientX - rect.left;
      const ey = ue.clientY - rect.top;
      const box = {
        x1: Math.min(sx, ex),
        y1: Math.min(sy, ey),
        x2: Math.max(sx, ex),
        y2: Math.max(sy, ey)
      };
      setCards(prevCards => {
        const newSet = new Set<string>();
        for (const c of prevCards) {
          const cx1 = c.x, cy1 = c.y;
          const cx2 = c.x + CARD_WIDTH, cy2 = c.y + CARD_HEIGHT;
          if (cx1 < box.x2 && cx2 > box.x1 && cy1 < box.y2 && cy2 > box.y1) {
            newSet.add(c.id);
          }
        }
        setSelectedIds(newSet);
        return prevCards;
      });
      setIsSelecting(false);
      setSelectionBox({ x: 0, y: 0, w: 0, h: 0 });
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleCreateCard = async () => {
    const data = newCardRef.current;
    const payload = {
      title: data.title.trim() || '未命名卡片',
      description: data.description.trim(),
      tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      image: data.image,
      x: 150 + Math.random() * 200,
      y: 150 + Math.random() * 200
    };
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newCard = await res.json();
      setCards(prev => [...prev, newCard]);
    } catch (e) {
      console.error('Create failed', e);
    }
    newCardRef.current = { title: '', description: '', tags: '', image: null };
    setShowCreateModal(false);
  };

  const handleEditCard = async () => {
    if (!showEditModal) return;
    const id = showEditModal;
    const data = editCardRef.current;
    const updates = {
      title: data.title.trim() || '未命名卡片',
      description: data.description.trim(),
      tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
      image: data.image
    };
    try {
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await res.json();
      setCards(prev => prev.map(c => (c.id === id ? { ...c, ...updated } : c)));
    } catch (e) {
      console.error('Edit failed', e);
    }
    setShowEditModal(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.url) {
        if (target === 'new') newCardRef.current.image = data.url;
        else editCardRef.current.image = data.url;
      }
    } catch (err) {
      console.error('Upload failed', err);
    }
    e.target.value = '';
  };

  const handleGroupSelected = () => {
    if (selectedIds.size < 2) return;
    setShowGroupModal(true);
  };

  const confirmGroup = () => {
    const id = `group-${Date.now()}`;
    const group: GroupData = {
      id,
      label: groupLabelInput.trim() || `分组 ${groups.length + 1}`,
      cardIds: Array.from(selectedIds)
    };
    setGroups(prev => [...prev, group]);
    const newCards = cards.map(c => {
      if (selectedIds.has(c.id)) {
        apiUpdate(c.id, { groupId: id });
        return { ...c, groupId: id };
      }
      return c;
    });
    setCards(newCards);
    setShowGroupModal(false);
    setGroupLabelInput('');
  };

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      cards,
      groups
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspiration-heatmap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const importCards: CardData[] = data.cards || [];
        const importGroups: GroupData[] = data.groups || [];
        for (const c of importCards) {
          try {
            const payload = {
              title: c.title,
              description: c.description,
              tags: c.tags,
              image: c.image,
              x: c.x,
              y: c.y,
              groupId: c.groupId
            };
            await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
          } catch (err) {
            console.error('Import card failed', err);
          }
        }
        setGroups(importGroups);
        fetchCards();
      } catch (err) {
        alert('导入失败：文件格式无效');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getGroupBounds = (g: GroupData) => {
    const gcards = cards.filter(c => g.cardIds.includes(c.id));
    if (gcards.length === 0) return null;
    const xs = gcards.map(c => c.x);
    const ys = gcards.map(c => c.y);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 40;
    const maxX = Math.max(...xs.map(x => x + CARD_WIDTH)) + 20;
    const maxY = Math.max(...ys.map(y => y + CARD_HEIGHT)) + 20;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  };

  const cardMap = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        position: 'relative',
        background: '#0f0f1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        id="inspiration-canvas"
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1a 70%, #0a0a12 100%)',
          overflow: 'auto'
        }}
      >
        <div
          id="canvas-bg"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)
            `,
            backgroundSize: '40px 40px',
            pointerEvents: 'none'
          }}
        />

        <svg
          ref={svgRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '5000px',
            height: '5000px',
            pointerEvents: 'none',
            overflow: 'visible',
            zIndex: 5
          }}
        >
          <defs>
            {connections.map((conn, i) => (
              <linearGradient
                key={`grad-${i}`}
                id={`conn-grad-${i}`}
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor={getConnectionColor(0)} stopOpacity="0.1" />
                <stop offset="50%" stopColor={getConnectionColor(conn.similarity)} stopOpacity={0.25 + conn.similarity * 0.45} />
                <stop offset="100%" stopColor={getConnectionColor(1)} stopOpacity="0.1" />
              </linearGradient>
            ))}
            <filter id="glow-filter">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {connections.map((conn, i) => {
            const from = cardMap.get(conn.from);
            const to = cardMap.get(conn.to);
            if (!from || !to) return null;
            const x1 = from.x + CARD_WIDTH / 2;
            const y1 = from.y + CARD_HEIGHT / 2;
            const x2 = to.x + CARD_WIDTH / 2;
            const y2 = to.y + CARD_HEIGHT / 2;
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.08;
            return (
              <g key={`conn-${i}`} filter="url(#glow-filter)">
                <path
                  d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                  stroke={`url(#conn-grad-${i})`}
                  strokeWidth={getConnectionWidth(conn.similarity)}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.35 + conn.similarity * 0.5}
                />
              </g>
            );
          })}

          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.size}
              fill={`rgba(255, 180, 150, ${p.opacity})`}
            />
          ))}
        </svg>

        {groups.map(g => {
          const b = getGroupBounds(g);
          if (!b) return null;
          return (
            <motion.div
              key={g.id}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                borderRadius: '18px',
                background: 'rgba(74, 0, 224, 0.08)',
                border: '1px solid rgba(120, 80, 255, 0.25)',
                zIndex: 1,
                pointerEvents: 'none',
                boxShadow: '0 0 30px rgba(74, 0, 224, 0.2), inset 0 0 30px rgba(74, 0, 224, 0.05)'
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(74, 0, 224, 0.1), inset 0 0 20px rgba(74, 0, 224, 0.03)',
                  '0 0 40px rgba(74, 0, 224, 0.3), inset 0 0 40px rgba(74, 0, 224, 0.08)',
                  '0 0 20px rgba(74, 0, 224, 0.1), inset 0 0 20px rgba(74, 0, 224, 0.03)'
                ]
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-11px',
                  left: '14px',
                  padding: '3px 12px',
                  background: 'rgba(74, 0, 224, 0.6)',
                  border: '1px solid rgba(140, 100, 255, 0.5)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#ddd6fe',
                  fontWeight: 500,
                  letterSpacing: '0.3px',
                  backdropFilter: 'blur(6px)'
                }}
              >
                {g.label} · {g.cardIds.length}张
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {cards.map(card => (
            <Card
              key={card.id}
              card={card}
              isSelected={selectedIds.has(card.id)}
              isFiltered={filteredIds.has(card.id)}
              isHighlighted={highlightedIds.has(card.id)}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onClick={handleCardClick}
              onDoubleClick={handleCardDoubleClick}
              onDelete={handleDeleteCard}
            />
          ))}
        </AnimatePresence>

        {isSelecting && selectionBox.w > 0 && selectionBox.h > 0 && (
          <div
            style={{
              position: 'absolute',
              left: selectionBox.x,
              top: selectionBox.y,
              width: selectionBox.w,
              height: selectionBox.h,
              border: '1.5px dashed rgba(100, 180, 255, 0.8)',
              background: 'rgba(100, 180, 255, 0.08)',
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 2000
            }}
          />
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            zIndex: 100,
            background: 'rgba(15, 15, 26, 0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: toolbarCollapsed ? '10px 8px' : '14px 16px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: toolbarCollapsed ? 'column' : 'row',
            gap: toolbarCollapsed ? '10px' : '10px',
            alignItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}
        >
          {!toolbarCollapsed && (
            <input
              type="text"
              placeholder="🔍 搜索标题/标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '8px',
                padding: '7px 12px',
                color: '#e0e0e0',
                fontSize: '13px',
                outline: 'none',
                width: '200px',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(100,150,255,0.6)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          )}

          <ToolbarButton
            icon="＋"
            label="新建"
            collapsed={toolbarCollapsed}
            onClick={() => {
              newCardRef.current = { title: '', description: '', tags: '', image: null };
              setShowCreateModal(true);
            }}
            title="新建灵感卡片"
          />
          <ToolbarButton
            icon="👥"
            label="分组"
            collapsed={toolbarCollapsed}
            onClick={handleGroupSelected}
            disabled={selectedIds.size < 2}
            title="将选中卡片打组（至少选择2张）"
          />
          <ToolbarButton
            icon="⬇"
            label="导出"
            collapsed={toolbarCollapsed}
            onClick={handleExport}
            title="导出为JSON文件"
          />
          <ToolbarButton
            icon="⬆"
            label="导入"
            collapsed={toolbarCollapsed}
            onClick={() => fileInputRef.current?.click()}
            title="从JSON文件恢复"
          />

          {toolbarCollapsed && (
            <div style={{ position: 'relative' }}>
              <ToolbarButton
                icon="🔍"
                label=""
                collapsed={true}
                onClick={() => setToolbarCollapsed(false)}
                title="展开工具栏"
              />
            </div>
          )}

          {!toolbarCollapsed && (
            <div
              onClick={() => setToolbarCollapsed(true)}
              style={{
                cursor: 'pointer',
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                marginLeft: '4px',
                transition: 'all 0.2s'
              }}
              title="折叠工具栏"
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              «
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            background: 'rgba(15, 15, 26, 0.7)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '8px 14px',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '12px',
            backdropFilter: 'blur(12px)',
            zIndex: 100,
            display: 'flex',
            gap: '14px',
            alignItems: 'center'
          }}
        >
          <span>💡 卡片: <strong style={{ color: '#c4b5fd' }}>{cards.length}</strong></span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span>🔗 连线: <strong style={{ color: '#ffb86b' }}>{connections.length}</strong></span>
          {selectedIds.size > 0 && (
            <>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>✅ 选中: <strong style={{ color: '#64b5f6' }}>{selectedIds.size}</strong></span>
            </>
          )}
        </motion.div>

        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(15,15,26,0.7)',
              color: '#c4b5fd',
              fontSize: '16px',
              zIndex: 500,
              backdropFilter: 'blur(4px)'
            }}
          >
            正在加载灵感画布...
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />

        <AnimatePresence>
          {showCreateModal && (
            <CardModal
              title="✨ 创建新灵感卡片"
              initialData={newCardRef.current}
              onDataChange={d => Object.assign(newCardRef.current, d)}
              onConfirm={handleCreateCard}
              onCancel={() => setShowCreateModal(false)}
              onUploadClick={() => imageInputRef.current?.click()}
              uploadTarget="new"
            />
          )}
          {showEditModal && (
            <CardModal
              title="✏️ 编辑灵感卡片"
              initialData={editCardRef.current}
              onDataChange={d => Object.assign(editCardRef.current, d)}
              onConfirm={handleEditCard}
              onCancel={() => setShowEditModal(null)}
              onUploadClick={() => imageInputRef.current?.click()}
              uploadTarget="edit"
            />
          )}
          {showGroupModal && (
            <ModalShell onClose={() => setShowGroupModal(false)}>
              <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px', fontWeight: 600 }}>
                👥 创建组合标签
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', marginBottom: '12px' }}>
                已选中 <strong style={{ color: '#c4b5fd' }}>{selectedIds.size}</strong> 张卡片，为它们创建一个分组标签
              </p>
              <input
                type="text"
                placeholder="输入分组名称，例如：品牌创意、UI灵感..."
                value={groupLabelInput}
                onChange={e => setGroupLabelInput(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '13px',
                  marginBottom: '18px',
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <ModalButton onClick={() => setShowGroupModal(false)} variant="ghost">
                  取消
                </ModalButton>
                <ModalButton onClick={confirmGroup} variant="primary">
                  创建分组
                </ModalButton>
              </div>
            </ModalShell>
          )}
        </AnimatePresence>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            const target = showCreateModal ? 'new' : 'edit';
            handleImageUpload(e, target);
          }}
        />
      </div>
    </div>
  );
};

interface ToolbarButtonProps {
  icon: string;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, collapsed, onClick, disabled, title }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.05 } : {}}
    whileTap={!disabled ? { scale: 0.95 } : {}}
    onClick={!disabled ? onClick : undefined}
    title={title}
    style={{
      padding: collapsed ? '8px 10px' : '7px 14px',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: disabled ? 'rgba(255,255,255,0.02)' : 'rgba(74, 0, 224, 0.25)',
      color: disabled ? 'rgba(255,255,255,0.3)' : '#e0e0e0',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: collapsed ? '16px' : '13px',
      fontWeight: collapsed ? undefined : 500,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      whiteSpace: 'nowrap',
      transition: 'background 0.2s'
    }}
  >
    <span style={{ fontSize: collapsed ? '16px' : '14px' }}>{icon}</span>
    {!collapsed && label}
  </motion.button>
);

interface ModalShellProps {
  children: React.ReactNode;
  onClose: () => void;
}

const ModalShell: React.FC<ModalShellProps> = ({ children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(6px)'
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={e => e.stopPropagation()}
      style={{
        width: '420px',
        maxWidth: '90vw',
        background: 'linear-gradient(145deg, rgba(30, 28, 50, 0.98) 0%, rgba(18, 18, 32, 0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)'
      }}
    >
      {children}
    </motion.div>
  </motion.div>
);

interface CardModalProps {
  title: string;
  initialData: { title: string; description: string; tags: string; image: string | null };
  onDataChange: (d: Partial<{ title: string; description: string; tags: string; image: string | null }>) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onUploadClick: () => void;
  uploadTarget: 'new' | 'edit';
}

const CardModal: React.FC<CardModalProps> = ({ title, initialData, onDataChange, onConfirm, onCancel, onUploadClick }) => {
  return (
    <ModalShell onClose={onCancel}>
      <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '18px', fontWeight: 600 }}>{title}</h3>

      <div style={{ marginBottom: '14px' }}>
        <label style={LabelStyle}>标题 *</label>
        <input
          type="text"
          placeholder="给灵感取个名字..."
          defaultValue={initialData.title}
          autoFocus
          onChange={e => onDataChange({ title: e.target.value })}
          style={InputStyle}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={LabelStyle}>描述</label>
        <textarea
          placeholder="简短描述这个灵感..."
          defaultValue={initialData.description}
          onChange={e => onDataChange({ description: e.target.value })}
          style={{ ...InputStyle, height: '80px', resize: 'vertical', paddingTop: '10px', fontFamily: 'inherit' }}
          rows={3}
        />
      </div>

      <div style={{ marginBottom: '14px' }}>
        <label style={LabelStyle}>标签（用逗号分隔）</label>
        <input
          type="text"
          placeholder="例如: UI, 设计, 创新, 极简"
          defaultValue={initialData.tags}
          onChange={e => onDataChange({ tags: e.target.value })}
          style={InputStyle}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={LabelStyle}>封面图片（可选）</label>
        <div
          onClick={onUploadClick}
          style={{
            width: '100%',
            border: '1.5px dashed rgba(255,255,255,0.15)',
            borderRadius: '10px',
            padding: '14px',
            cursor: 'pointer',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.02)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(120,80,255,0.5)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(74,0,224,0.08)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
          }}
        >
          {initialData.image ? (
            <div style={{ position: 'relative' }}>
              <img
                src={initialData.image}
                alt="preview"
                style={{ maxHeight: '120px', borderRadius: '6px', display: 'block', margin: '0 auto' }}
              />
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
                点击更换图片
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>📷</div>
              点击上传图片
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <ModalButton onClick={onCancel} variant="ghost">取消</ModalButton>
        <ModalButton onClick={onConfirm} variant="primary">保存</ModalButton>
      </div>
    </ModalShell>
  );
};

const LabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: 'rgba(255,255,255,0.6)',
  marginBottom: '6px',
  fontWeight: 500
};

const InputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 13px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s'
};

interface ModalButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant: 'primary' | 'ghost';
}

const ModalButton: React.FC<ModalButtonProps> = ({ children, onClick, variant }) => (
  <motion.button
    whileHover={{ scale: 1.03 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    style={{
      padding: '8px 18px',
      borderRadius: '8px',
      border: variant === 'primary' ? 'none' : '1px solid rgba(255,255,255,0.12)',
      background: variant === 'primary'
        ? 'linear-gradient(135deg, #4a00e0 0%, #7c3aed 100%)'
        : 'rgba(255,255,255,0.04)',
      color: variant === 'primary' ? '#fff' : 'rgba(255,255,255,0.7)',
      fontSize: '13px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: variant === 'primary' ? '0 4px 16px rgba(74,0,224,0.35)' : 'none'
    }}
  >
    {children}
  </motion.button>
);

export default App;
