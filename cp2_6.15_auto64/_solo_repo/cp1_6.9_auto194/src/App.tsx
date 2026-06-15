import React, { useState, useEffect, useRef, useCallback } from 'react';
import Gallery from './Gallery';

export interface Fragment {
  id: string;
  text: string;
  color: string;
  createdAt: number;
}

const App: React.FC = () => {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFragments();
  }, []);

  const fetchFragments = async () => {
    try {
      const res = await fetch('/api/fragments');
      const data: Fragment[] = await res.json();
      setFragments(data.slice(0, 50));
    } catch (e) {
      console.error('Failed to fetch fragments:', e);
    }
  };

  const parseKeywords = (input: string): string[] => {
    const cleaned = input.trim();
    if (!cleaned) return [];
    return cleaned
      .split(/[,，、\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0)
      .slice(0, 3);
  };

  const generateFragment = useCallback(async () => {
    const keywords = parseKeywords(inputValue);
    if (keywords.length === 0) return;
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      const res = await fetch('/api/fragment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords })
      });
      const newFragment: Fragment = await res.json();
      setFragments(prev => {
        const updated = [newFragment, ...prev];
        if (updated.length > 50) updated.pop();
        return updated;
      });
      setInputValue('');
    } catch (e) {
      console.error('Failed to generate fragment:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [inputValue, isGenerating]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/fragment?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      setFragments(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error('Failed to delete fragment:', e);
    }
  }, []);

  const handleRetrospect = () => {
    setScrollOffset(prev => {
      const maxOffset = Math.max(0, (fragments.length - 12) * 260);
      const next = prev + 400;
      return next >= maxOffset ? 0 : Math.min(next, maxOffset);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      generateFragment();
    }
  };

  const handleRandom = () => {
    const randomWords = ['梦境', '星河', '时间', '记忆', '虚空', '光影', '潮汐', '旋律', '灰烬', '绽放'];
    const count = 1 + Math.floor(Math.random() * 3);
    const selected: string[] = [];
    const available = [...randomWords];
    for (let i = 0; i < count && available.length > 0; i++) {
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available[idx]);
      available.splice(idx, 1);
    }
    setInputValue(selected.join('、'));
  };

  const appStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #1c1c1e 0%, #2c1c2e 50%, #1c1c1e 100%)'
  };

  const headerStyle: React.CSSProperties = {
    padding: '40px 60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    flexShrink: 0
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '36px',
    fontWeight: 700,
    letterSpacing: '4px',
    background: 'linear-gradient(135deg, #f0c878 0%, #e89ab5 50%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '8px'
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '2px',
    fontWeight: 400
  };

  const inputWrapperStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '600px'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '14px 20px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '15px',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  };

  const inputFocusStyle: React.CSSProperties = {
    ...inputStyle,
    borderColor: 'rgba(255,200,100,0.4)',
    boxShadow: '0 0 8px rgba(255,200,100,0.3)'
  };

  const buttonBaseStyle: React.CSSProperties = {
    padding: '14px 28px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap'
  };

  const generateBtnStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: isGenerating
      ? 'rgba(167,139,250,0.5)'
      : 'linear-gradient(135deg, #f0c878 0%, #a78bfa 100%)',
    color: '#1c1c1e',
    boxShadow: isGenerating ? 'none' : '0 4px 15px rgba(240,200,120,0.3)',
    cursor: isGenerating ? 'not-allowed' : 'pointer',
    opacity: isGenerating ? 0.7 : 1
  };

  const randomBtnStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(255,255,255,0.15)'
  };

  const galleryContainerStyle: React.CSSProperties = {
    flex: 1,
    padding: '30px 40px 40px',
    margin: '0 30px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    position: 'relative'
  };

  const footerStyle: React.CSSProperties = {
    padding: '20px 60px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  };

  const statusStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: '1px'
  };

  const countHighlightStyle: React.CSSProperties = {
    color: '#f0c878',
    fontWeight: 600,
    margin: '0 4px'
  };

  const retrospectBtnStyle: React.CSSProperties = {
    ...buttonBaseStyle,
    padding: '10px 24px',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.2)',
    fontSize: '13px'
  };

  const [isInputFocused, setIsInputFocused] = useState(false);

  return (
    <div style={appStyle}>
      <header style={headerStyle}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={titleStyle}>意识碎片 · 文字画廊</h1>
          <p style={subtitleStyle}>Consciousness Fragments Gallery</p>
        </div>
        <div style={inputWrapperStyle}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder="输入1-3个关键词，用逗号或空格分隔…"
            style={isInputFocused ? inputFocusStyle : inputStyle}
          />
          <button
            onClick={handleRandom}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
              e.currentTarget.style.borderColor = 'rgba(255,200,100,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            style={randomBtnStyle}
          >
            随机
          </button>
          <button
            onClick={generateFragment}
            disabled={isGenerating}
            onMouseEnter={(e) => {
              if (!isGenerating) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(240,200,120,0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = isGenerating ? 'none' : '0 4px 15px rgba(240,200,120,0.3)';
            }}
            style={generateBtnStyle}
          >
            {isGenerating ? '生成中…' : '生 成'}
          </button>
        </div>
      </header>

      <div style={galleryContainerStyle} ref={galleryRef}>
        <Gallery
          fragments={fragments}
          scrollOffset={scrollOffset}
          onDelete={handleDelete}
        />
      </div>

      <footer style={footerStyle}>
        <span style={statusStyle}>
          展品总数：<span style={countHighlightStyle}>{fragments.length}</span> / 50
          {scrollOffset > 0 && (
            <span style={{ marginLeft: '20px', color: 'rgba(167,139,250,0.8)' }}>
              · 回溯位移 {scrollOffset}px
            </span>
          )}
        </span>
        <button
          onClick={handleRetrospect}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(240,200,120,0.5)';
            e.currentTarget.style.color = 'rgba(240,200,120,0.9)';
            e.currentTarget.style.background = 'rgba(240,200,120,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
            e.currentTarget.style.background = 'transparent';
          }}
          style={retrospectBtnStyle}
        >
          ← 回溯浏览
        </button>
      </footer>
    </div>
  );
};

export default App;
