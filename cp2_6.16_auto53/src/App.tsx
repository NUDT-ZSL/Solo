import { useState, useCallback, useEffect } from 'react';
import Gallery3D from './components/Gallery3D';
import { works, Work } from './data/works';

function App() {
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCardClick = useCallback((id: number) => {
    setFocusedId(prev => (prev === id ? null : id));
  }, []);

  const handleDotClick = useCallback((work: Work) => {
    setFocusedId(prev => (prev === work.id ? null : work.id));
  }, []);

  const handleSceneClick = useCallback(() => {
    setFocusedId(null);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Gallery3D
        works={works}
        focusedId={focusedId}
        onCardClick={handleCardClick}
        onSceneClick={handleSceneClick}
        isMobile={isMobile}
      />

      <div
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          gap: '10px',
          zIndex: 10
        }}
      >
        {works.map(work => (
          <button
            key={work.id}
            onClick={() => handleDotClick(work)}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              border: 'none',
              background: focusedId === work.id ? '#fff' : '#aaa',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 0.3s ease',
              boxShadow: focusedId === work.id ? '0 0 8px rgba(255,255,255,0.6)' : 'none'
            }}
            aria-label={`聚焦到 ${work.title}`}
          />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '12px',
          zIndex: 10,
          textAlign: 'center',
          pointerEvents: 'none'
        }}
      >
        拖拽旋转视角 · 滚轮缩放 · 点击作品查看详情
      </div>
    </div>
  );
}

export default App;
