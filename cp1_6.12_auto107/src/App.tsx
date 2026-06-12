import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { NoteCard } from './types';
import { noteApi } from './api';
import Canvas from './Canvas';
import { debounce, getGroupMembers } from './utils';

const App: React.FC = () => {
  const [cards, setCards] = useState<NoteCard[]>([]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', category: '学习' as '学习' | '工作' | '生活' });
  const [isMobile, setIsMobile] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const notes = await noteApi.getAll();
      setCards(notes.map(n => ({ ...n, linkedIds: n.linkedIds || [] })));
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useMemo(
    () => debounce((keyword: string) => {
      setDebouncedSearchKeyword(keyword);
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchKeyword(value);
    debouncedSearch(value);
  };

  const matchedCardIds = useMemo(() => {
    const ids = new Set<string>();
    if (!debouncedSearchKeyword.trim()) return ids;

    const keyword = debouncedSearchKeyword.toLowerCase();
    for (const card of cards) {
      if (
        card.title.toLowerCase().includes(keyword) ||
        card.content.toLowerCase().includes(keyword)
      ) {
        ids.add(card.id);
      }
    }
    return ids;
  }, [cards, debouncedSearchKeyword]);

  useEffect(() => {
    if (matchedCardIds.size === 0 || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - offset.x) / scale - 110;
    const centerY = (rect.height / 2 - offset.y) / scale - 60;

    const matchedCards = cards.filter(c => matchedCardIds.has(c.id));
    if (matchedCards.length === 0) return;

    const firstCard = matchedCards[0];
    const dx = centerX - firstCard.x;
    const dy = centerY - firstCard.y;

    const animateToCenter = () => {
      const startTime = performance.now();
      const startX = firstCard.x;
      const startY = firstCard.y;
      const duration = 1000;

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentDx = dx * easeOut;
        const currentDy = dy * easeOut;

        setCards(prev => prev.map(card => {
          if (matchedCardIds.has(card.id)) {
            return {
              ...card,
              x: card.x === firstCard.x ? startX + currentDx : card.x,
              y: card.y === firstCard.y ? startY + currentDy : card.y,
            };
          }
          return card;
        }));

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    };

    animateToCenter();
  }, [matchedCardIds]);

  const handleScaleChange = useCallback((newScale: number, newOffset: { x: number; y: number }) => {
    setScale(newScale);
    setOffset(newOffset);
  }, []);

  const handleOffsetChange = useCallback((newOffset: { x: number; y: number }) => {
    setOffset(newOffset);
  }, []);

  const handleResetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleAddCard = async () => {
    if (!newNote.title.trim() && !newNote.content.trim()) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = (rect.width / 2 - offset.x) / scale - 110;
    const centerY = (rect.height / 2 - offset.y) / scale - 60;

    const card: NoteCard = {
      id: uuidv4(),
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      category: newNote.category,
      x: centerX,
      y: centerY,
      linkedIds: [],
    };

    try {
      const savedCard = await noteApi.add(card);
      setCards(prev => [...prev, { ...savedCard, linkedIds: savedCard.linkedIds || [] }]);
      setNewNote({ title: '', content: '', category: '学习' });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleCardMove = useCallback(async (cardId: string, x: number, y: number) => {
    setCards(prev => prev.map(card =>
      card.id === cardId ? { ...card, x, y } : card
    ));

    const card = cards.find(c => c.id === cardId);
    if (card && card._id) {
      try {
        await noteApi.update(card._id, { x, y });
      } catch (err) {
        console.error('Failed to update note position:', err);
      }
    }
  }, [cards]);

  const handleCardsLinked = useCallback(async (cardId1: string, cardId2: string) => {
    setCards(prev => {
      const card1 = prev.find(c => c.id === cardId1);
      const card2 = prev.find(c => c.id === cardId2);
      if (!card1 || !card2) return prev;

      const newLinkedIds1 = Array.from(new Set([...card1.linkedIds, cardId2]));
      const newLinkedIds2 = Array.from(new Set([...card2.linkedIds, cardId1]));

      if (card1._id) {
        noteApi.update(card1._id, { linkedIds: newLinkedIds1 }).catch(err =>
          console.error('Failed to update linkedIds:', err)
        );
      }
      if (card2._id) {
        noteApi.update(card2._id, { linkedIds: newLinkedIds2 }).catch(err =>
          console.error('Failed to update linkedIds:', err)
        );
      }

      return prev.map(card => {
        if (card.id === cardId1) return { ...card, linkedIds: newLinkedIds1 };
        if (card.id === cardId2) return { ...card, linkedIds: newLinkedIds2 };
        return card;
      });
    });
  }, []);

  const handleCardDelete = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const groupMembers = getGroupMembers(cardId, cards);
    
    setCards(prev => {
      const remaining = prev.filter(c => c.id !== cardId);
      return remaining.map(c => ({
        ...c,
        linkedIds: c.linkedIds.filter(id => id !== cardId),
      }));
    });

    for (const member of groupMembers) {
      if (member.id !== cardId && member._id) {
        const newLinkedIds = member.linkedIds.filter(id => id !== cardId);
        noteApi.update(member._id, { linkedIds: newLinkedIds }).catch(err =>
          console.error('Failed to update linkedIds after delete:', err)
        );
      }
    }

    if (card._id) {
      try {
        await noteApi.delete(card._id);
      } catch (err) {
        console.error('Failed to delete note:', err);
      }
    }
  }, [cards]);

  if (isLoading) {
    return <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '16px', color: '#666' }}>加载中...</div>
    </div>;
  }

  return (
    <div className="app-container" ref={containerRef}>
      <Canvas
        cards={cards}
        scale={scale}
        offset={offset}
        onScaleChange={handleScaleChange}
        onOffsetChange={handleOffsetChange}
        onCardMove={handleCardMove}
        onCardDelete={handleCardDelete}
        searchKeyword={debouncedSearchKeyword}
        matchedCardIds={matchedCardIds}
        onCardsLinked={handleCardsLinked}
      />

      <button className="add-btn" onClick={() => setShowModal(true)}>
        +
      </button>

      <div className="zoom-controls">
        <span className="zoom-percent">{Math.round(scale * 100)}%</span>
        <button className="reset-btn" onClick={handleResetView}>重置</button>
      </div>

      <div className="search-container">
        {isMobile && !searchExpanded ? (
          <button
            className="search-icon-btn"
            onClick={() => setSearchExpanded(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        ) : (
          <div className={`search-input-wrapper ${isMobile && !searchExpanded ? 'collapsed' : ''}`}>
            <span className="search-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="搜索笔记内容..."
              value={searchKeyword}
              onChange={handleSearchChange}
              autoFocus={isMobile && searchExpanded}
            />
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <h2 className="modal-title">添加新笔记</h2>
            
            <div className="form-group">
              <label className="form-label">标题</label>
              <input
                type="text"
                className="form-input"
                maxLength={50}
                value={newNote.title}
                onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                placeholder="请输入笔记标题（最多50字）"
              />
              <div className="char-count">{newNote.title.length}/50</div>
            </div>

            <div className="form-group">
              <label className="form-label">