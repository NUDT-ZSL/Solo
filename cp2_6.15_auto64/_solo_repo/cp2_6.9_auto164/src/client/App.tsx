import React, { useState, useEffect, useCallback, useRef } from 'react';
import DrawingBoard from './DrawingBoard';
import InspirationFeed from './InspirationFeed';
import VotePanel from './VotePanel';
import SynthesizeModal from './SynthesizeModal';
import { Inspiration, ShapeData } from '../types';

const App: React.FC = () => {
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, 'up' | 'down'>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showSynthesize, setShowSynthesize] = useState(false);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(200);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const draggingRef = useRef<'left' | 'right' | null>(null);

  useEffect(() => {
    const checkWidth = () => {
      const w = window.innerWidth;
      setIsMobile(w < 700);
      setIsTablet(w < 1000 && w >= 700);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const fetchInspirations = useCallback(async () => {
    try {
      const res = await fetch('/api/inspirations');
      const data = await res.json();
      setInspirations(data);
    } catch (e) {
      console.error('Failed to fetch inspirations:', e);
    }
  }, []);

  useEffect(() => {
    fetchInspirations();
    const interval = setInterval(fetchInspirations, 3000);
    return () => clearInterval(interval);
  }, [fetchInspirations]);

  const handleSubmitInspiration = async (shape: ShapeData) => {
    try {
      const res = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shape)
      });
      const data = await res.json();
      setInspirations((prev) => [data, ...prev]);
    } catch (e) {
      console.error('Failed to submit inspiration:', e);
    }
  };

  const handleVote = async (id: string, type: 'up' | 'down') => {
    setUserVotes((prev) => ({ ...prev, [id]: type }));
    setInspirations((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              upVotes: type === 'up' ? i.upVotes + 1 : i.upVotes,
              downVotes: type === 'down' ? i.downVotes + 1 : i.downVotes
            }
          : i
      )
    );

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type })
      });
      const data = await res.json();
      setInspirations(data);
    } catch (e) {
      console.error('Failed to vote:', e);
      setUserVotes((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleAddComment = async (id: string, content: string) => {
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content })
      });
      const data = await res.json();
      setInspirations(data);
    } catch (e) {
      console.error('Failed to add comment:', e);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current) return;
    if (draggingRef.current === 'left') {
      const newWidth = Math.max(180, Math.min(400, e.clientX));
      setLeftWidth(newWidth);
    } else if (draggingRef.current === 'right') {
      const newWidth = Math.max(180, Math.min(400, window.innerWidth - e.clientX));
      setRightWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null;
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const startDrag = (side: 'left' | 'right') => {
    draggingRef.current = side;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const showTopBar = inspirations.length >= 10;

  if (isMobile) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showTopBar && (
          <div style={topBarStyle}>
            <button onClick={() => setShowSynthesize(true)} style={topBarButtonStyle}>
              🎨 合成最终作品
            </button>
          </div>
        )}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#16213e',
            borderBottom: '1px solid #0f3460',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h1 style={{ fontSize: '18px', color: '#e0e0e0' }}>创意工坊</h1>
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#0f3460',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '20px'
            }}
          >
            ☰
          </button>
        </div>
        {showMobileMenu && (
          <div style={{ height: '45%', minHeight: '200px' }}>
            <InspirationFeed
              inspirations={inspirations}
              onVote={handleVote}
              onAddComment={handleAddComment}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userVotes={userVotes}
            />
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DrawingBoard onSubmit={handleSubmitInspiration} />
        </div>
        <div style={{ height: '30%', minHeight: '180px', borderTop: '1px solid #0f3460' }}>
          <VotePanel inspirations={inspirations} onSynthesize={() => setShowSynthesize(true)} />
        </div>
        {showSynthesize && (
          <SynthesizeModal inspirations={inspirations} onClose={() => setShowSynthesize(false)} />
        )}
      </div>
    );
  }

  if (isTablet) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {showTopBar && (
          <div style={topBarStyle}>
            <button onClick={() => setShowSynthesize(true)} style={topBarButtonStyle}>
              🎨 合成最终作品
            </button>
          </div>
        )}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {showMobileMenu && (
            <>
              <div style={{ width: leftWidth, height: '100%', flexShrink: 0 }}>
                <InspirationFeed
                  inspirations={inspirations}
                  onVote={handleVote}
                  onAddComment={handleAddComment}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  userVotes={userVotes}
                />
              </div>
              <div style={dividerStyle} onMouseDown={() => startDrag('left')} />
            </>
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#16213e',
                borderBottom: '1px solid #0f3460',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h1 style={{ fontSize: '18px', color: '#e0e0e0' }}>创意工坊</h1>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#0f3460',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                {showMobileMenu ? '✕' : '☰'}
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <DrawingBoard onSubmit={handleSubmitInspiration} />
            </div>
          </div>
        </div>
        <div style={{ height: '35%', minHeight: '200px', borderTop: '1px solid #0f3460' }}>
          <VotePanel inspirations={inspirations} onSynthesize={() => setShowSynthesize(true)} />
        </div>
        {showSynthesize && (
          <SynthesizeModal inspirations={inspirations} onClose={() => setShowSynthesize(false)} />
        )}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showTopBar && (
        <div style={topBarStyle}>
          <button onClick={() => setShowSynthesize(true)} style={topBarButtonStyle}>
            🎨 合成最终作品
          </button>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: leftWidth, height: '100%', flexShrink: 0 }}>
          <InspirationFeed
            inspirations={inspirations}
            onVote={handleVote}
            onAddComment={handleAddComment}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userVotes={userVotes}
          />
        </div>
        <div style={dividerStyle} onMouseDown={() => startDrag('left')} />
        <div style={{ flex: 1, minWidth: 500, height: '100%' }}>
          <DrawingBoard onSubmit={handleSubmitInspiration} />
        </div>
        <div style={dividerStyle} onMouseDown={() => startDrag('right')} />
        <div style={{ width: rightWidth, height: '100%', flexShrink: 0 }}>
          <VotePanel inspirations={inspirations} onSynthesize={() => setShowSynthesize(true)} />
        </div>
      </div>
      {showSynthesize && (
        <SynthesizeModal inspirations={inspirations} onClose={() => setShowSynthesize(false)} />
      )}
    </div>
  );
};

const topBarStyle: React.CSSProperties = {
  padding: '10px 20px',
  backgroundColor: 'linear-gradient(90deg, #0f3460 0%, #16213e 100%)',
  background: '#0f3460',
  borderBottom: '1px solid #0f3460',
  display: 'flex',
  justifyContent: 'center',
  zIndex: 10
};

const topBarButtonStyle: React.CSSProperties = {
  padding: '10px 28px',
  backgroundColor: '#e94560',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '0 0 20px rgba(233, 69, 96, 0.4)',
  transition: 'all 0.2s ease'
};

const dividerStyle: React.CSSProperties = {
  width: '4px',
  height: '100%',
  backgroundColor: '#0f3460',
  cursor: 'col-resize',
  flexShrink: 0,
  transition: 'background-color 0.2s ease',
  position: 'relative'
};

export default App;
