import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChartRenderer from './ChartRenderer';
import type { Story, JumpCondition } from './types';

interface StoryViewerProps {
  story: Story;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ story }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [isAnimating, setIsAnimating] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [highlightedPageId, setHighlightedPageId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`story_${story.id || story.shortCode}_bookmarks`);
    if (saved) {
      try {
        setBookmarks(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to parse bookmarks', e);
      }
    }
  }, [story.id, story.shortCode]);

  const saveBookmarks = useCallback((newBookmarks: Set<string>) => {
    localStorage.setItem(
      `story_${story.id || story.shortCode}_bookmarks`,
      JSON.stringify(Array.from(newBookmarks))
    );
  }, [story.id, story.shortCode]);

  const toggleBookmark = useCallback(() => {
    const currentPage = story.pages[currentPageIndex];
    if (!currentPage) return;
    
    setBookmarks(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(currentPage.id)) {
        newBookmarks.delete(currentPage.id);
      } else {
        newBookmarks.add(currentPage.id);
        setHighlightedPageId(currentPage.id);
        setTimeout(() => setHighlightedPageId(null), 2000);
      }
      saveBookmarks(newBookmarks);
      return newBookmarks;
    });
  }, [currentPageIndex, story.pages, saveBookmarks]);

  const checkJumpConditions = useCallback((label: string, value: number): string | null => {
    const currentPage = story.pages[currentPageIndex];
    if (!currentPage) return null;

    const conditions = story.jumpConditions.filter(c => c.sourcePageId === currentPage.id);
    
    for (const condition of conditions) {
      const fieldValue = condition.field === 'label' ? label : value;
      const conditionValue = condition.value;
      let matches = false;

      switch (condition.operator) {
        case '==':
          matches = String(fieldValue) === String(conditionValue);
          break;
        case '!=':
          matches = String(fieldValue) !== String(conditionValue);
          break;
        case '>':
          matches = Number(fieldValue) > Number(conditionValue);
          break;
        case '<':
          matches = Number(fieldValue) < Number(conditionValue);
          break;
        case '>=':
          matches = Number(fieldValue) >= Number(conditionValue);
          break;
        case '<=':
          matches = Number(fieldValue) <= Number(conditionValue);
          break;
      }

      if (matches) {
        const targetIndex = story.pages.findIndex(p => p.id === condition.targetPageId);
        if (targetIndex !== -1) {
          return story.pages[targetIndex].id;
        }
      }
    }
    return null;
  }, [currentPageIndex, story.pages, story.jumpConditions]);

  const goToPage = useCallback((targetIndex: number, dir: 'left' | 'right') => {
    if (isAnimating) return;
    if (targetIndex < 0 || targetIndex >= story.pages.length) return;

    setIsAnimating(true);
    setDirection(dir);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentPageIndex(targetIndex);
      setTimeout(() => {
        setIsTransitioning(false);
        setIsAnimating(false);
      }, 50);
    }, 500);
  }, [isAnimating, story.pages.length]);

  const handleDataPointClick = useCallback((label: string, value: number) => {
    const jumpTargetId = checkJumpConditions(label, value);
    if (jumpTargetId) {
      const targetIndex = story.pages.findIndex(p => p.id === jumpTargetId);
      if (targetIndex !== -1 && targetIndex !== currentPageIndex) {
        const dir = targetIndex > currentPageIndex ? 'right' : 'left';
        goToPage(targetIndex, dir);
      }
    } else {
      if (currentPageIndex < story.pages.length - 1) {
        goToPage(currentPageIndex + 1, 'right');
      }
    }
  }, [checkJumpConditions, currentPageIndex, story.pages, goToPage]);

  const goNext = useCallback(() => {
    if (currentPageIndex < story.pages.length - 1) {
      goToPage(currentPageIndex + 1, 'right');
    }
  }, [currentPageIndex, story.pages.length, goToPage]);

  const goPrev = useCallback(() => {
    if (currentPageIndex > 0) {
      goToPage(currentPageIndex - 1, 'left');
    }
  }, [currentPageIndex, goToPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'b' || e.key === 'B') {
        toggleBookmark();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, toggleBookmark]);

  const currentPage = story.pages[currentPageIndex];
  const isBookmarked = currentPage ? bookmarks.has(currentPage.id) : false;
  const isHighlighted = currentPage ? highlightedPageId === currentPage.id : false;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#1E1E2E',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10,
        background: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: 18, color: '#CDD6F4', fontWeight: 600 }}>
          {story.title}
        </h2>
        <button
          onClick={toggleBookmark}
          title="添加书签 (B)"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isBookmarked ? '#FAB387' : '#313244',
            color: isBookmarked ? '#1E1E2E' : '#CDD6F4',
            fontSize: 18,
            transition: 'all 0.2s ease'
          }}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>

      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        marginTop: 60,
        marginBottom: 80
      }}>
        {story.pages.map((page, idx) => {
          const offset = idx - currentPageIndex;
          const isActive = idx === currentPageIndex;
          const pageHighlighted = highlightedPageId === page.id;

          let translateX = '100%';
          if (offset === 0) translateX = '0%';
          else if (offset < 0) translateX = '-100%';
          else translateX = '100%';

          if (!isActive && Math.abs(offset) > 1) return null;

          return (
            <div
              key={page.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                padding: '40px 60px',
                transform: isTransitioning ? translateX : (isActive ? '0%' : translateX),
                opacity: isActive ? 1 : 0.3,
                transition: isTransitioning 
                  ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.5s ease-out'
                  : 'none',
                background: pageHighlighted 
                  ? 'linear-gradient(135deg, #1E1E2E 0%, rgba(250, 179, 135, 0.15) 100%)' 
                  : 'transparent',
                boxSizing: 'border-box'
              }}
            >
              <h1 style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#CDD6F4',
                marginBottom: 16
              }}>
                {page.title}
              </h1>
              
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 24
              }}>
                <div style={{
                  flex: 1,
                  background: '#313244',
                  borderRadius: 16,
                  padding: 24,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                  minHeight: 300
                }}>
                  <ChartRenderer 
                    config={page.chart} 
                    onDataPointClick={handleDataPointClick}
                    height="100%"
                  />
                </div>
                
                <div style={{
                  background: 'rgba(49, 50, 68, 0.5)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  borderLeft: '3px solid #89B4FA'
                }}>
                  <p style={{
                    fontSize: 16,
                    lineHeight: 1.8,
                    color: '#BAC2DE',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {page.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentPageIndex > 0 && (
        <button
          onClick={goPrev}
          style={{
            position: 'absolute',
            left: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(49, 50, 68, 0.9)',
            border: 'none',
            color: '#CDD6F4',
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#89B4FA';
            e.currentTarget.style.color = '#1E1E2E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(49, 50, 68, 0.9)';
            e.currentTarget.style.color = '#CDD6F4';
          }}
        >
          ‹
        </button>
      )}

      {currentPageIndex < story.pages.length - 1 && (
        <button
          onClick={goNext}
          style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(49, 50, 68, 0.9)',
            border: 'none',
            color: '#CDD6F4',
            fontSize: 24,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#89B4FA';
            e.currentTarget.style.color = '#1E1E2E';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(49, 50, 68, 0.9)';
            e.currentTarget.style.color = '#CDD6F4';
          }}
        >
          ›
        </button>
      )}

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 40px',
        background: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8
        }}>
          <span style={{ color: '#9CA3AF', fontSize: 14, minWidth: 60 }}>
            {currentPageIndex + 1} / {story.pages.length}
          </span>
          <div style={{
            flex: 1,
            height: 4,
            background: '#313244',
            borderRadius: 2,
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #89B4FA, #74C7EC)',
              borderRadius: 2,
              width: `${((currentPageIndex + 1) / story.pages.length) * 100}%`,
              transition: 'width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }} />
          </div>
          <span style={{ color: '#9CA3AF', fontSize: 14, minWidth: 120, textAlign: 'right' }}>
            点击数据点可触发跳转
          </span>
        </div>
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center'
        }}>
          {story.pages.map((page, idx) => (
            <button
              key={page.id}
              onClick={() => {
                const dir = idx > currentPageIndex ? 'right' : 'left';
                goToPage(idx, dir);
              }}
              style={{
                width: idx === currentPageIndex ? 32 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                background: bookmarks.has(page.id) 
                  ? '#FAB387' 
                  : (idx === currentPageIndex ? '#89B4FA' : '#45475A'),
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                padding: 0
              }}
              title={`第${idx + 1}页: ${page.title}${bookmarks.has(page.id) ? ' (已书签)' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoryViewer;
