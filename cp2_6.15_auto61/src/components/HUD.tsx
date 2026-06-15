import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, X, RotateCcw } from 'lucide-react';
import type { Exhibit } from '../store/useStore';

interface HUDProps {
  selectedExhibit: Exhibit | null;
  onCloseExhibit: () => void;
  filterCategory: 'all' | 'sculpture' | 'painting' | 'installation';
  onFilterChange: (category: 'all' | 'sculpture' | 'painting' | 'installation') => void;
  themeMode: 'day' | 'night';
  onToggleTheme: () => void;
  currentGalleryName?: string;
}

export default function HUD({
  selectedExhibit,
  onCloseExhibit,
  filterCategory,
  onFilterChange,
  themeMode,
  onToggleTheme,
  currentGalleryName,
}: HUDProps) {
  const [displayName, setDisplayName] = useState('');
  const [displayDesc, setDisplayDesc] = useState('');
  const [showDesc, setShowDesc] = useState(false);

  const typeWriter = useCallback((text: string, setter: (s: string) => void, delay: number) => {
    setter('');
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setter(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, delay);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedExhibit) {
      setShowDesc(false);
      setDisplayDesc('');
      const cleanupName = typeWriter(selectedExhibit.name, setDisplayName, 100);
      const descTimer = setTimeout(() => {
        setShowDesc(true);
        const cleanupDesc = typeWriter(selectedExhibit.description, setDisplayDesc, 30);
        return () => cleanupDesc();
      }, selectedExhibit.name.length * 100 + 300);

      return () => {
        cleanupName();
        clearTimeout(descTimer);
      };
    } else {
      setDisplayName('');
      setDisplayDesc('');
      setShowDesc(false);
    }
  }, [selectedExhibit, typeWriter]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectedExhibit) {
      onCloseExhibit();
    }
  };

  const handleReset = () => {
    if ((window as any).resetCamera) {
      (window as any).resetCamera();
    }
  };

  const categories: { key: 'all' | 'sculpture' | 'painting' | 'installation'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'sculpture', label: '雕塑' },
    { key: 'painting', label: '绘画' },
    { key: 'installation', label: '装置' },
  ];

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 12,
          zIndex: 20,
          padding: '8px 16px',
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onFilterChange(cat.key)}
            style={{
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 13,
              fontWeight: filterCategory === cat.key ? 600 : 400,
              background: filterCategory === cat.key
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'transparent',
              color: filterCategory === cat.key ? '#fff' : '#777',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {currentGalleryName && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 240,
            zIndex: 15,
            color: 'rgba(255,255,255,0.6)',
            fontSize: 14,
            fontWeight: 300,
          }}
        >
          当前展厅：{currentGalleryName}
        </div>
      )}

      <button
        onClick={onToggleTheme}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {themeMode === 'day' ? (
          <Sun size={20} color="#ffd700" />
        ) : (
          <Moon size={20} color="#a0c4ff" />
        )}
      </button>

      <button
        onClick={handleReset}
        style={{
          position: 'absolute',
          bottom: 20,
          left: 240,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <RotateCcw size={18} color="#fff" />
      </button>

      {selectedExhibit && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 30,
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 80,
              right: 20,
              width: 320,
              background: 'rgba(26, 26, 46, 0.85)',
              backdropFilter: 'blur(8px)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'slideIn 0.3s ease',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: '#667eea', fontWeight: 600, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>
                  {selectedExhibit.category === 'sculpture' ? '雕塑' : selectedExhibit.category === 'painting' ? '绘画' : '装置'}
                </div>
                <h3 style={{ color: '#fff', fontSize: 22, fontWeight: 600, marginBottom: 4, minHeight: 30 }}>
                  {displayName}
                  <span style={{ display: 'inline-block', width: 2, height: 22, background: '#667eea', marginLeft: 4, animation: 'pulse 1s infinite' }}></span>
                </h3>
              </div>
              <button
                onClick={onCloseExhibit}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,107,107,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                <X size={16} color="#fff" />
              </button>
            </div>

            <div
              style={{
                width: '100%',
                height: 4,
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                borderRadius: 2,
                marginBottom: 20,
                opacity: 0.6,
              }}
            />

            {showDesc && (
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 300, lineHeight: 1.8, minHeight: 60 }}>
                {displayDesc}
              </p>
            )}

            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ padding: '4px 12px', background: selectedExhibit.color, borderRadius: 12, fontSize: 11, color: '#fff', fontWeight: 600 }}>
                {selectedExhibit.modelType === 'sphere' ? '球体' : '环面'}
              </div>
              <div style={{ padding: '4px 12px', background: 'rgba(102, 126, 234, 0.3)', borderRadius: 12, fontSize: 11, color: '#667eea', fontWeight: 600 }}>
                ID: {selectedExhibit.id}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
