import { useState, useEffect, useRef, useCallback } from 'react';
import Editor from './Editor';
import Visualizer, { SentenceRibbon } from './Visualizer';
import { analyzeSentence, scoreToColor, splitSentences, hslToHex } from './emotionAnalyzer';
import { generateReport, downloadReport, ReportSentence } from './reportGenerator';

interface StoredSentence {
  id: string;
  text: string;
  score: number;
  color: string;
  hue: number;
  saturation: number;
  lightness: number;
  charCount: number;
  startIndex: number;
  endIndex: number;
  keywords?: string[];
}

type FilterType = 'all' | 'positive' | 'negative' | 'neutral';

const DEFAULT_TEXT = `今天的阳光洒在窗台上，温暖而明亮，我感到无比的幸福和满足。
可是，想起上周失去的那个机会，心中还是有些难过和遗憾。
不过我告诉自己，明天会更好，一定要振作起来！
生活总是充满了未知，有时候让人焦虑，有时候又充满惊喜。
只要我们保持乐观积极的心态，勇敢面对困难，就一定能找到属于自己的光明。
The beautiful sunset filled the sky with amazing colors and everyone felt joyful.
I was really sad when I failed the test, but I know I can do better next time.
Sometimes life is confusing, but with hope and kindness we can overcome anything.`;

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function App() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [sentences, setSentences] = useState<SentenceRibbon[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [dividerPos, setDividerPos] = useState<number>(40);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);
  const [shareId, setShareId] = useState<string>('');
  const [loadInput, setLoadInput] = useState<string>('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showLoadModal, setShowLoadModal] = useState<boolean>(false);

  const analyzeTimerRef = useRef<number | null>(null);
  const customColorsRef = useRef<Map<string, { hue: number; saturation: number; lightness: number; score: number }>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const analyzeText = useCallback((inputText: string) => {
    const parts = splitSentences(inputText);
    const results: SentenceRibbon[] = [];

    for (const part of parts) {
      const clean = part.text.replace(/\s+/g, '');
      if (clean.length === 0) continue;

      const analysis = analyzeSentence(part.text);
      const id = genId();
      const existing = customColorsRef.current.get(id);

      let hue: number, sat: number, light: number, score: number;
      if (existing) {
        hue = existing.hue;
        sat = existing.saturation;
        light = existing.lightness;
        score = existing.score;
      } else {
        const colorInfo = scoreToColor(analysis.score);
        hue = colorInfo.hue;
        sat = colorInfo.saturation;
        light = colorInfo.lightness;
        score = analysis.score;
      }

      const colorHex = hslToHex(hue, sat, light);

      results.push({
        id,
        text: part.text,
        score,
        color: colorHex,
        hue,
        saturation: sat,
        lightness: light,
        charCount: part.text.replace(/\s/g, '').length,
        startIndex: part.start,
        endIndex: part.end,
        keywords: analysis.keywords,
      });
    }

    setSentences(results);
  }, []);

  useEffect(() => {
    if (analyzeTimerRef.current) {
      clearTimeout(analyzeTimerRef.current);
    }
    analyzeTimerRef.current = window.setTimeout(() => {
      analyzeText(text);
    }, 20);
    return () => {
      if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    };
  }, [text, analyzeText]);

  const handleColorChange = useCallback((id: string, hue: number, saturation: number, lightness: number, score: number) => {
    customColorsRef.current.set(id, { hue, saturation, lightness, score });
    setSentences((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              hue,
              saturation,
              lightness,
              score,
              color: hslToHex(hue, saturation, lightness),
            }
          : s
      )
    );
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingDivider(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDivider) return;
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let pos: number;
      if (isMobile) {
        pos = ((e.clientY - rect.top) / rect.height) * 100;
      } else {
        pos = ((e.clientX - rect.left) / rect.width) * 100;
      }
      pos = Math.max(20, Math.min(80, pos));
      setDividerPos(pos);
    };
    const onUp = () => setIsDraggingDivider(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingDivider, isMobile]);

  const handleGenerateReport = useCallback(() => {
    const reportData: ReportSentence[] = sentences.map((s, i) => ({
      id: s.id,
      index: i,
      text: s.text,
      score: s.score,
      color: s.color,
      charCount: s.charCount,
      keywords: s.keywords,
    }));
    try {
      const canvas = generateReport(reportData);
      downloadReport(canvas);
      showToast('报告已生成并下载 🎨', 'success');
    } catch (err) {
      console.error(err);
      showToast('报告生成失败', 'error');
    }
  }, [sentences, showToast]);

  const handleSave = useCallback(async () => {
    try {
      const body = {
        text,
        sentences: sentences.map((s) => ({
          id: s.id,
          text: s.text,
          score: s.score,
          color: s.color,
          hue: s.hue,
          saturation: s.saturation,
          lightness: s.lightness,
          charCount: s.charCount,
          startIndex: s.startIndex,
          endIndex: s.endIndex,
          keywords: s.keywords,
        })),
      };
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.id) {
        setShareId(data.id);
        showToast(`会话已保存！ID: ${data.id}`, 'success');
        customColorsRef.current.clear();
        sentences.forEach((s) => {
          customColorsRef.current.set(s.id, { hue: s.hue, saturation: s.saturation, lightness: s.lightness, score: s.score });
        });
      } else {
        showToast(data.error || '保存失败', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('无法连接服务器', 'error');
    }
  }, [text, sentences, showToast]);

  const handleLoad = useCallback(async () => {
    const id = loadInput.trim();
    if (!id || id.length !== 6) {
      showToast('请输入有效的6位ID', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/load/${id}`);
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '加载失败', 'error');
        return;
      }
      setText(data.text || '');
      customColorsRef.current.clear();
      const loaded: SentenceRibbon[] = (data.sentences || []).map((s: StoredSentence) => {
        customColorsRef.current.set(s.id, { hue: s.hue, saturation: s.saturation, lightness: s.lightness, score: s.score });
        return {
          id: s.id,
          text: s.text,
          score: s.score,
          color: s.color,
          hue: s.hue,
          saturation: s.saturation,
          lightness: s.lightness,
          charCount: s.charCount,
          startIndex: s.startIndex,
          endIndex: s.endIndex,
          keywords: s.keywords || [],
        } as SentenceRibbon;
      });
      setSentences(loaded);
      setShowLoadModal(false);
      setLoadInput('');
      setShareId(id);
      showToast(`已加载会话 ${id}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('无法连接服务器', 'error');
    }
  }, [loadInput, showToast]);

  const copyShareId = useCallback(() => {
    if (!shareId) return;
    navigator.clipboard.writeText(shareId).then(
      () => showToast('ID 已复制到剪贴板', 'success'),
      () => showToast('复制失败', 'error')
    );
  }, [shareId, showToast]);

  const highlights = sentences.map((s) => ({
    id: s.id,
    start: s.startIndex,
    end: s.endIndex,
    color: s.color,
  }));

  const filterButtons: Array<{ key: FilterType; label: string; color: string }> = [
    { key: 'all', label: '全部', color: '#A78BFA' },
    { key: 'positive', label: '积极', color: '#22C55E' },
    { key: 'neutral', label: '中性', color: '#9CA3AF' },
    { key: 'negative', label: '消极', color: '#EF4444' },
  ];

  const btnBase = (active: boolean, color: string) => ({
    padding: '7px 16px',
    borderRadius: '10px',
    border: active ? `2px solid ${color}` : '2px solid transparent',
    backgroundColor: active ? `${color}22` : 'rgba(148, 163, 184, 0.08)',
    color: active ? color : '#94A3B8',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  const hoverScale = {
    transition: 'all 0.2s ease',
  } as const;

  const panelSize = isMobile
    ? { height: `${dividerPos}%`, width: '100%' }
    : { width: `${dividerPos}%`, height: '100%' };
  const vizSize = isMobile
    ? { height: `${100 - dividerPos}%`, width: '100%' }
    : { width: `${100 - dividerPos}%`, height: '100%' };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#1E1E2E',
        color: '#E2E8F0',
        fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: rgba(148,163,184,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(167,139,250,0.4); }
      `}</style>

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          backgroundColor: 'rgba(21, 21, 42, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
          flexShrink: 0,
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F97316 0%, #EF4444 25%, #9CA3AF 50%, #4A90D9 75%, #8B5CF6 100%)',
              boxShadow: '0 4px 20px rgba(167, 139, 250, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🎨
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '0.3px' }}>
              情绪色谱 · 写作调色盘
            </h1>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
              Emotion Chromatography Writer
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {filterButtons.map((b) => (
            <button
              key={b.key}
              onClick={() => setFilter(b.key)}
              style={btnBase(filter === b.key, b.color)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                if (filter !== b.key) {
                  e.currentTarget.style.backgroundColor = `${b.color}11`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                if (filter !== b.key) {
                  e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.08)';
                }
              }}
            >
              {b.label}
            </button>
          ))}

          <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(148,163,184,0.15)', margin: '0 4px' }} />

          <button
            onClick={handleSave}
            style={{
              ...hoverScale,
              padding: '7px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            💾 保存分享
          </button>

          <button
            onClick={() => setShowLoadModal(true)}
            style={{
              ...hoverScale,
              padding: '7px 16px',
              borderRadius: '10px',
              border: '1px solid rgba(148,163,184,0.2)',
              backgroundColor: 'rgba(148, 163, 184, 0.08)',
              color: '#94A3B8',
              fontSize: '13px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.08)';
            }}
          >
            🔗 加载ID
          </button>

          <button
            onClick={handleGenerateReport}
            style={{
              ...hoverScale,
              padding: '7px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #F97316, #EF4444)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            📊 生成报告
          </button>
        </div>
      </header>

      {shareId && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 28px',
            backgroundColor: 'rgba(167, 139, 250, 0.1)',
            borderBottom: '1px solid rgba(167, 139, 250, 0.2)',
            fontSize: '13px',
          }}
        >
          <span style={{ color: '#A78BFA', fontWeight: 600 }}>✅ 会话已保存</span>
          <span style={{ color: '#94A3B8' }}>分享ID:</span>
          <code
            onClick={copyShareId}
            style={{
              padding: '4px 12px',
              backgroundColor: 'rgba(167,139,250,0.2)',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '2px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: '#C4B5FD',
              userSelect: 'all',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 12px rgba(167,139,250,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {shareId}
          </code>
          <span style={{ color: '#64748B', fontSize: '12px' }}>(点击复制)</span>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          position: 'relative',
          overflow: 'hidden',
          padding: isMobile ? '0' : '0',
        }}
      >
        <div
          style={{
            ...panelSize,
            flexShrink: 0,
            padding: isMobile ? '0' : '20px 12px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: isMobile ? '200px' : 0,
            minWidth: isMobile ? 0 : '240px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: isMobile ? '12px 20px' : '0 8px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px' }}>✍️</span>
              <span style={{ fontSize: '14px', fontWeight: 600 }}>文本编辑区</span>
              <span style={{ fontSize: '11px', color: '#64748B' }}>
                ({text.length}字 / {sentences.length}句)
              </span>
            </div>
            {text && (
              <button
                onClick={() => {
                  setText('');
                  customColorsRef.current.clear();
                  setShareId('');
                }}
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(239,68,68,0.2)',
                  backgroundColor: 'rgba(239,68,68,0.08)',
                  color: '#F87171',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)';
                }}
              >
                清空
              </button>
            )}
          </div>
          <div style={{ flex: 1, padding: isMobile ? '0 20px 12px' : '0', minHeight: 0 }}>
            <Editor
              value={text}
              onChange={setText}
              sentenceHighlights={highlights}
              activeSentenceId={activeId}
              onSentenceClick={setActiveId}
            />
          </div>
        </div>

        <div
          onMouseDown={handleDividerMouseDown}
          style={{
            flexShrink: 0,
            position: 'relative',
            ...(isMobile
              ? { width: '100%', height: '8px', cursor: 'row-resize' }
              : { width: '8px', height: '100%', cursor: 'col-resize' }),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDraggingDivider ? 'rgba(167,139,250,0.3)' : 'transparent',
            transition: 'background-color 0.2s',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            if (!isDraggingDivider) e.currentTarget.style.backgroundColor = 'rgba(167,139,250,0.15)';
          }}
          onMouseLeave={(e) => {
            if (!isDraggingDivider) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div
            style={{
              ...(isMobile
                ? { width: '40px', height: '4px' }
                : { width: '4px', height: '40px' }),
              borderRadius: '2px',
              backgroundColor: isDraggingDivider ? '#A78BFA' : 'rgba(148,163,184,0.3)',
              transition: 'background-color 0.2s',
            }}
          />
        </div>

        <div
          style={{
            ...vizSize,
            flex: 1,
            padding: isMobile ? '0' : '20px 20px 20px 12px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: isMobile ? '200px' : 0,
            minWidth: 0,
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <Visualizer
              ribbons={sentences}
              filter={filter}
              activeId={activeId}
              onRibbonClick={setActiveId}
              onColorChange={handleColorChange}
            />
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: '12px',
            backgroundColor:
              toast.type === 'success'
                ? 'rgba(34, 197, 94, 0.95)'
                : toast.type === 'error'
                ? 'rgba(239, 68, 68, 0.95)'
                : 'rgba(167, 139, 250, 0.95)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            zIndex: 1000,
            animation: 'toastIn 0.3s ease-out',
          }}
        >
          {toast.msg}
        </div>
      )}

      {showLoadModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLoadModal(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 15, 30, 0.7)',
            backdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '400px',
              maxWidth: '100%',
              backgroundColor: '#1E1E2E',
              borderRadius: '18px',
              padding: '28px',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
              animation: 'modalIn 0.25s ease-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(167,139,250,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                🔗
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700 }}>加载分享会话</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>输入6位分享ID恢复编辑器状态</div>
              </div>
            </div>

            <input
              type="text"
              value={loadInput}
              onChange={(e) => setLoadInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLoad();
              }}
              placeholder="请输入6位ID..."
              maxLength={6}
              style={{
                width: '100%',
                padding: '14px 18px',
                borderRadius: '12px',
                border: '2px solid rgba(148,163,184,0.2)',
                backgroundColor: 'rgba(148,163,184,0.05)',
                color: '#E2E8F0',
                fontSize: '20px',
                fontFamily: 'monospace',
                letterSpacing: '8px',
                textAlign: 'center',
                outline: 'none',
                transition: 'all 0.2s',
                marginBottom: '16px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#A78BFA';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(167,139,250,0.15)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(148,163,184,0.2)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowLoadModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(148,163,184,0.2)',
                  backgroundColor: 'rgba(148,163,184,0.08)',
                  color: '#94A3B8',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'rgba(148,163,184,0.08)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleLoad}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(139,92,246,0.35)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                加载会话
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
