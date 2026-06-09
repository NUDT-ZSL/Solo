import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Copy,
  Check,
  ArrowLeft,
  Share2,
  Palette,
} from 'lucide-react';
import EmotionInput from './components/EmotionInput.js';
import ArtCanvas, { type ArtCanvasHandle } from './components/ArtCanvas.js';
import type {
  ArtGenerationResponse,
  ArtSaveResponse,
  ArtRecord,
  EmotionCategory,
} from '../shared/types.js';

const emotionLabelMap: Record<EmotionCategory, string> = {
  positive: '明媚心绪',
  negative: '静思流深',
  neutral: '平和如镜',
};

function Home() {
  const [loading, setLoading] = useState(false);
  const [artData, setArtData] = useState<ArtGenerationResponse | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedLink, setSavedLink] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<ArtRecord[]>([]);
  const canvasRef = useRef<ArtCanvasHandle>(null);
  const nav = useNavigate();

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch('/api/arts');
      if (r.ok) {
        const data = await r.json();
        setHistory(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSubmit = async (text: string) => {
    setLoading(true);
    setArtData(null);
    setSavedLink('');
    setInputText(text);
    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || '生成失败');
      }
      const data: ArtGenerationResponse = await resp.json();
      setArtData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artData || !canvasRef.current) return;
    setSaveLoading(true);
    try {
      const thumbnail = canvasRef.current.getThumbnail();
      const resp = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          emotion: artData.emotion,
          palette: artData.palette,
          curves: artData.curves,
          thumbnail,
        }),
      });
      if (!resp.ok) {
        throw new Error('保存失败');
      }
      const data: ArtSaveResponse = await resp.json();
      const fullUrl = `${window.location.origin}${data.shortUrl}`;
      setSavedLink(fullUrl);
      await loadHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!savedLink) return;
    try {
      await navigator.clipboard.writeText(savedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const handleThumbClick = (id: string) => {
    nav(`/art/${id}`);
  };

  return (
    <div className="app">
      <section className="hero">
        <h1 className="hero-title">语纹织机</h1>
        <p className="hero-subtitle">以情绪为线 · 织就独属你的抽象光纹</p>
      </section>

      <section className="emotion-input-section">
        <EmotionInput onSubmit={handleSubmit} loading={loading} disabled={false} />
      </section>

      <section className="art-section">
        <div className="art-canvas-wrapper">
          {artData?.emotion && (
            <div className="emotion-tag">
              <span className="emotion-dot" />
              <span>
                {emotionLabelMap[artData.emotion.category]} ·{' '}
                {Math.round(artData.emotion.score * 100)}%
              </span>
            </div>
          )}

          {!artData && !loading && (
            <div className="art-canvas-empty">
              <Sparkles className="empty-icon" strokeWidth={1.2} />
              <p className="empty-text">输入心情 · 织就光纹</p>
            </div>
          )}

          {loading && (
            <div className="loading-overlay">
              <div className="loader" />
            </div>
          )}

          {artData && (
            <ArtCanvas
              ref={canvasRef}
              curves={artData.curves}
              palette={artData.palette}
              canvasWidth={800}
              canvasHeight={600}
              playing={true}
            />
          )}
        </div>
      </section>

      {artData && (
        <section className="share-section">
          <div className="share-actions">
            <button
              className="glass-button primary"
              onClick={handleSave}
              disabled={saveLoading}
            >
              {saveLoading ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: '2px solid rgba(255,255,255,0.2)',
                    borderTopColor: 'var(--emotion-primary)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }}
                />
              ) : (
                <>
                  <Share2 size={18} strokeWidth={2} />
                  <span>保存并分享</span>
                </>
              )}
            </button>
            <button
              className="glass-button"
              onClick={() => handleSubmit(inputText)}
              disabled={loading || saveLoading}
              title="重新生成"
            >
              <Palette size={18} strokeWidth={2} />
              <span>重新织就</span>
            </button>
          </div>

          {savedLink && (
            <div className="link-box" style={{ marginTop: 8 }}>
              <span className="link-box-text">{savedLink}</span>
              <button className="copy-btn" onClick={handleCopy} title="复制链接">
                {copied ? <Check size={18} strokeWidth={2.4} color="var(--emotion-primary)" /> : <Copy size={18} strokeWidth={2} />}
              </button>
              {copied && <span className="copy-toast">已复制</span>}
            </div>
          )}
        </section>
      )}

      <section className="history-section">
        <h2 className="section-title">· 近期织就 ·</h2>
        {history.length === 0 ? (
          <div className="empty-history">
            <Sparkles size={28} strokeWidth={1.2} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p>还没有作品 · 织就你的第一幅语纹吧</p>
          </div>
        ) : (
          <div className="thumbs-grid">
            {history.map((item, idx) => (
              <div
                key={item.id}
                className="thumb-card"
                style={{ animationDelay: `${idx * 60}ms` }}
                onClick={() => handleThumbClick(item.id)}
              >
                <img src={item.thumbnail} alt={item.text} />
                <span className="thumb-label">{item.text}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ArtDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [record, setRecord] = useState<ArtRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<ArtCanvasHandle>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/art/${id}`);
        if (r.ok) {
          setRecord(await r.json());
        }
      } catch {}
      setLoading(false);
    })();
  }, [id]);

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => nav('/')}>
          <ArrowLeft size={18} strokeWidth={2} />
          <span>返回</span>
        </button>
        <h2 className="detail-text">
          {record ? `“${record.text}”` : loading ? '加载中…' : '作品不存在'}
        </h2>
      </div>

      <div className="detail-canvas-wrapper">
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="loader" />
          </div>
        )}
        {!loading && !record && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              color: 'var(--text-secondary)',
            }}
          >
            <Sparkles size={64} strokeWidth={1.2} style={{ opacity: 0.4 }} />
            <p style={{ letterSpacing: '0.08em', fontWeight: 300 }}>作品不存在或已过期</p>
            <Link to="/" className="glass-button" style={{ textDecoration: 'none' }}>
              <span>返回首页</span>
            </Link>
          </div>
        )}
        {record && (
          <ArtCanvas
            ref={canvasRef}
            curves={record.curves}
            palette={record.palette}
            canvasWidth={typeof window !== 'undefined' ? window.innerWidth : 1200}
            canvasHeight={typeof window !== 'undefined' ? window.innerHeight : 800}
            playing={true}
          />
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/art/:id" element={<ArtDetail />} />
    </Routes>
  );
}

export default App;
