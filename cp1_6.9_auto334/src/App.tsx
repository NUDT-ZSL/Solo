import React, { useState, useEffect, useCallback } from 'react';
import PoemCanvas from './PoemCanvas';
import Gallery from './Gallery';
import type { Poem, ViewMode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('editor');
  const [poems, setPoems] = useState<Poem[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<Poem | null>(null);
  const [loading, setLoading] = useState(true);
  const [browseCountdown, setBrowseCountdown] = useState(0);

  const fetchPoems = useCallback(async () => {
    try {
      const res = await fetch('/api/poems');
      const data = await res.json();
      setPoems(data.poems || []);
    } catch {
      setPoems(
        Array.from({ length: 4 }).map((_, i) => ({
          id: `demo-${i}`,
          content: [
            '明月松间照，清泉石上流。',
            '愿有岁月可回首，且以深情共白头。',
            '人生如逆旅，我亦是行人。',
            '落花人独立，微雨燕双飞。',
          ][i],
          createdAt: Date.now() - i * 100000,
          viewed: false,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoems();
  }, [fetchPoems]);

  const handleSealed = async (content: string) => {
    try {
      const res = await fetch('/api/poems', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      setPoems((prev) => [data.poem, ...prev]);
    } catch {
      const newPoem: Poem = {
        id: `local-${Date.now()}`,
        content,
        createdAt: Date.now(),
        viewed: false,
      };
      setPoems((prev) => [newPoem, ...prev]);
    }
  };

  const handleSelect = (poem: Poem) => {
    setSelectedPoem(poem);
    setMode('browse');
    setBrowseCountdown(5);
  };

  const handleVanished = async () => {
    if (selectedPoem) {
      try {
        await fetch(`/api/poems/${selectedPoem.id}/view`, { method: 'POST' });
      } catch {}
      setPoems((prev) => prev.filter((p) => p.id !== selectedPoem.id));
    }
    setTimeout(() => {
      setMode('gallery');
      setSelectedPoem(null);
    }, 800);
  };

  useEffect(() => {
    if (mode !== 'browse') return;
    if (browseCountdown <= 0) return;
    const t = setTimeout(() => setBrowseCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [mode, browseCountdown]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0C10',
        color: '#FAEBD7',
      }}
    >
      <nav
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 32px',
          gap: 24,
          background: 'linear-gradient(180deg, rgba(11,12,16,0.98), rgba(11,12,16,0.85))',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255, 200, 150, 0.08)',
        }}
      >
        <div
          style={{
            fontFamily: '"KaiTi", "楷体", serif',
            fontSize: 26,
            letterSpacing: 8,
            background: 'linear-gradient(135deg, #FF8C32, #9458CC)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginRight: 32,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
          onClick={() => {
            setMode('editor');
            setSelectedPoem(null);
          }}
        >
          流 光 诗 笺
        </div>
        {[
          { key: 'editor' as ViewMode, label: '书写诗笺' },
          { key: 'gallery' as ViewMode, label: '诗笺长廊' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => {
              setMode(item.key);
              setSelectedPoem(null);
            }}
            style={{
              padding: '8px 20px',
              background: mode === item.key ? 'rgba(255, 160, 90, 0.15)' : 'transparent',
              border: mode === item.key ? '1px solid rgba(255, 160, 90, 0.4)' : '1px solid transparent',
              color: mode === item.key ? '#FFB072' : '#AAA',
              borderRadius: 20,
              cursor: 'pointer',
              fontFamily: '"KaiTi", "楷体", serif',
              fontSize: 16,
              letterSpacing: 2,
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>加载中...</div>
      )}

      {!loading && mode === 'editor' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px',
            gap: 24,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              width: '100%',
              textAlign: 'center',
              marginBottom: 4,
            }}
          >
            <p
              style={{
                color: '#888',
                fontSize: 15,
                fontFamily: '"KaiTi", "楷体", serif',
                letterSpacing: 1,
                lineHeight: 1.8,
              }}
            >
              在羊皮卷轴上写下你的短诗，封存后每个汉字将化作流动的光粒
              <br />
              <span style={{ color: '#666', fontSize: 13 }}>
                （可拖拽光粒改变位置，拖出卷轴边界则爆炸成星尘）
              </span>
            </p>
          </div>
          <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden' }}>
            <PoemCanvas
              mode="editor"
              width={900}
              height={500}
              onSealed={handleSealed}
            />
          </div>
        </div>
      )}

      {!loading && mode === 'gallery' && (
        <Gallery poems={poems.filter((p) => !p.viewed)} onSelect={handleSelect} />
      )}

      {!loading && mode === 'browse' && selectedPoem && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 20px',
            gap: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              width: 900,
              maxWidth: '100%',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => {
                setMode('gallery');
                setSelectedPoem(null);
              }}
              style={{
                padding: '6px 18px',
                background: 'rgba(255,255,255,0.06)',
                color: '#BBB',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                cursor: 'pointer',
                fontFamily: '"KaiTi", "楷体", serif',
                fontSize: 14,
              }}
            >
              ← 返回长廊
            </button>
            <div
              style={{
                color: '#9458CC',
                fontSize: 14,
                fontFamily: '"KaiTi", "楷体", serif',
                letterSpacing: 1,
              }}
            >
              {browseCountdown > 0 ? `${browseCountdown} 秒后诗笺将消逝...` : ''}
            </div>
          </div>
          <div style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)', borderRadius: 8, overflow: 'hidden' }}>
            <PoemCanvas
              key={selectedPoem.id}
              mode="browse"
              poem={selectedPoem}
              width={900}
              height={500}
              autoVanish
              onVanished={handleVanished}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
