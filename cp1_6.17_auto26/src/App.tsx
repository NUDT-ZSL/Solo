import React, { useState, useCallback, useMemo } from 'react';
import Board from './Board';
import MoodBoard from './MoodBoard';
import type { CardData, MoodBoardData, ViewType, ThemeColor, Rating, Comment } from './types';
import { generateId } from './utils';

const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
  'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400',
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400',
  'https://images.unsplash.com/photo-1633186710895-309db2eca9e4?w=400'
];

const createInitialCards = (): CardData[] => {
  return DEMO_IMAGES.map((url, idx) => ({
    id: generateId(),
    imageUrl: url,
    x: 80 + (idx % 3) * 280,
    y: 80 + Math.floor(idx / 3) * 320,
    width: 240,
    height: 280,
    tags: idx % 2 === 0 ? ['极简', '现代'] : ['自然', '复古'],
    ratings: [],
    comments: []
  }));
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewType>('board');
  const [cards, setCards] = useState<CardData[]>(createInitialCards);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moodBoard, setMoodBoard] = useState<MoodBoardData | null>(null);
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);

  const addCard = useCallback((imageUrl: string, x: number, y: number) => {
    const newCard: CardData = {
      id: generateId(),
      imageUrl,
      x,
      y,
      width: 240,
      height: 280,
      tags: [],
      ratings: [],
      comments: []
    };
    setCards(prev => [...prev, newCard]);
  }, []);

  const updateCardPosition = useCallback((id: string, x: number, y: number) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, x, y } : c));
  }, []);

  const updateCardTags = useCallback((id: string, tags: string[]) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, tags } : c));
  }, []);

  const addRating = useCallback((cardId: string, score: 1 | 2 | 3 | 4 | 5) => {
    const rating: Rating = {
      id: generateId(),
      userId: 'user1',
      score,
      createdAt: Date.now()
    };
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const filtered = c.ratings.filter(r => r.userId !== rating.userId);
      return { ...c, ratings: [...filtered, rating] };
    }));
  }, []);

  const addComment = useCallback((cardId: string, content: string) => {
    if (!content.trim()) return;
    const comment: Comment = {
      id: generateId(),
      userId: '用户' + Math.floor(Math.random() * 100),
      content: content.trim(),
      createdAt: Date.now()
    };
    setCards(prev => prev.map(c =>
      c.id === cardId ? { ...c, comments: [...c.comments, comment] } : c
    ));
  }, []);

  const handleSelection = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  const createMoodBoard = useCallback(() => {
    if (selectedIds.size === 0) return;
    const idArray = Array.from(selectedIds);
    const board: MoodBoardData = {
      id: generateId(),
      cardIds: idArray.slice(0, 9),
      themeColor: 'cool'
    };
    setMoodBoard(board);
    setView('moodboard');
  }, [selectedIds]);

  const setThemeColor = useCallback((color: ThemeColor) => {
    setMoodBoard(prev => prev ? { ...prev, themeColor: color } : null);
  }, []);

  const backToBoard = useCallback(() => {
    setView('board');
    setIsExporting(false);
  }, []);

  const filteredCards = useMemo(() => {
    if (ratingFilter === 0) return cards;
    return cards.filter(c => {
      if (c.ratings.length === 0) return false;
      const avg = c.ratings.reduce((s, r) => s + r.score, 0) / c.ratings.length;
      return avg >= ratingFilter;
    });
  }, [cards, ratingFilter]);

  const moodBoardCards = useMemo(() => {
    if (!moodBoard) return [];
    return moodBoard.cardIds
      .map(id => cards.find(c => c.id === id))
      .filter((c): c is CardData => !!c);
  }, [moodBoard, cards]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {view === 'board' ? (
        <Board
          cards={filteredCards}
          selectedIds={selectedIds}
          onSelection={handleSelection}
          onAddCard={addCard}
          onUpdatePosition={updateCardPosition}
          onUpdateTags={updateCardTags}
          onAddRating={addRating}
          onAddComment={addComment}
          onCreateMoodBoard={createMoodBoard}
          ratingFilter={ratingFilter}
          onRatingFilterChange={setRatingFilter}
          hasSelection={selectedIds.size > 0}
          isExporting={isExporting}
        />
      ) : (
        moodBoard && (
          <MoodBoard
            cards={moodBoardCards}
            themeColor={moodBoard.themeColor}
            onThemeChange={setThemeColor}
            onAddRating={addRating}
            onAddComment={addComment}
            onBack={backToBoard}
            isExporting={isExporting}
          />
        )
      )}
    </div>
  );
};

export default App;
