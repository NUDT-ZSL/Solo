import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import * as THREE from 'three';
import { BottleEngine } from './BottleEngine';
import { OceanBackground } from './OceanBackground';
import { StoryStorage, StoryData } from './StoryStorage';

const BOTTLE_STYLES = [
  { key: 'classic', label: '经典软木瓶', icon: '🍾' },
  { key: 'glaze', label: '琉璃瓶', icon: '✨' },
  { key: 'conch', label: '海螺瓶', icon: '🐚' },
  { key: 'shell', label: '贝壳瓶', icon: '🦪' },
  { key: 'raft', label: '木筏瓶', icon: '🪵' },
];

function OceanScene({ onBottleClick }: { onBottleClick: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BottleEngine | null>(null);
  const bgRef = useRef<OceanBackground | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const [hoveredTitle, setHoveredTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    camera.position.set(0, 0, 18);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ocean = new OceanBackground();
    scene.add(ocean.object);
    bgRef.current = ocean;

    const engine = new BottleEngine(container);
    engine.setBottleClickCallback(onBottleClick);
    engineRef.current = engine;

    StoryStorage.list().then((stories) => {
      stories.forEach((s) => engine.addBottle(s));
    });

    const clock = new THREE.Clock();
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      ocean.update(elapsed);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const titleInterval = setInterval(() => {
      setHoveredTitle(engine.getHoveredTitle());
    }, 100);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      clearInterval(titleInterval);
      engine.dispose();
      ocean.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
    };
  }, [onBottleClick]);

  const refreshBottles = useCallback(async () => {
    if (!engineRef.current) return;
    engineRef.current.clearBottles();
    const stories = await StoryStorage.list();
    stories.forEach((s) => engineRef.current!.addBottle(s));
  }, []);

  useEffect(() => {
    (window as any).__refreshBottles = refreshBottles;
    return () => {
      delete (window as any).__refreshBottles;
    };
  }, [refreshBottles]);

  return (
    <div ref={containerRef} className="ocean-scene">
      {hoveredTitle && <div className="hover-title">{hoveredTitle}</div>}
    </div>
  );
}

function ControlPanel({
  onPublish,
  onHot,
  onRandom,
}: {
  onPublish: () => void;
  onHot: () => void;
  onRandom: () => void;
}) {
  return (
    <div className="control-panel">
      <h2 className="panel-title">🌊 浪花记忆</h2>
      <p className="panel-subtitle">匿名故事漂流瓶</p>
      <button className="panel-btn publish-btn" onClick={onPublish}>
        ✍️ 发布故事
      </button>
      <button className="panel-btn hot-btn" onClick={onHot}>
        🔥 热度排行
      </button>
      <button className="panel-btn random-btn" onClick={onRandom}>
        🎲 随机打捞
      </button>
    </div>
  );
}

function PublishModal({
  onClose,
  onPublished,
}: {
  onClose: () => void;
  onPublished: () => void;
}) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [style, setStyle] = useState('classic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('请写下你的故事');
      return;
    }
    if (content.length > 200) {
      setError('故事不能超过200字');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await StoryStorage.create({
        title: title.trim() || undefined,
        content: content.trim(),
        style,
      });
      onPublished();
      onClose();
    } catch (e: any) {
      setError(e.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content publish-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">✍️ 写一段故事，放入漂流瓶</h3>
        <input
          className="story-input"
          type="text"
          placeholder="故事标题（选填）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
        />
        <textarea
          className="story-textarea"
          placeholder="写下你的故事...（200字以内）"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={200}
          rows={4}
        />
        <div className="char-count">{content.length}/200</div>
        <div className="style-selector">
          <p className="style-label">选择漂流瓶样式：</p>
          <div className="style-options">
            {BOTTLE_STYLES.map((s) => (
              <button
                key={s.key}
                className={`style-option ${style === s.key ? 'active' : ''}`}
                onClick={() => setStyle(s.key)}
              >
                <span className="style-icon">{s.icon}</span>
                <span className="style-name">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            取消
          </button>
          <button className="btn-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '漂流中...' : '放入海域 🌊'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoryCard({
  story,
  onClose,
  onSalvage,
}: {
  story: StoryData;
  onClose: () => void;
  onSalvage: (id: string) => void;
}) {
  const [salvaged, setSalvaged] = useState(false);
  const [salvageAnimating, setSalvageAnimating] = useState(false);

  const handleSalvage = async () => {
    setSalvageAnimating(true);
    try {
      await StoryStorage.salvage(story.id);
      await StoryStorage.read(story.id);
      setSalvaged(true);
      onSalvage(story.id);
    } catch {}
    setSalvageAnimating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content story-card ${salvageAnimating ? 'salvage-animating' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="card-close" onClick={onClose}>
          ✕
        </button>
        {story.title && <h3 className="card-title">{story.title}</h3>}
        <p className="card-content">{story.content}</p>
        <div className="card-meta">
          <span className="meta-item">
            {BOTTLE_STYLES.find((s) => s.key === story.style)?.icon}{' '}
            {BOTTLE_STYLES.find((s) => s.key === story.style)?.label}
          </span>
          <span className="meta-item">👁 {story.read_count} 次阅读</span>
          <span className="meta-item">⚓ {story.salvage_count} 次打捞</span>
        </div>
        <p className="card-time">
          {new Date(story.created_at).toLocaleString('zh-CN')}
        </p>
        <button
          className={`salvage-btn ${salvaged ? 'salvaged' : ''}`}
          onClick={handleSalvage}
          disabled={salvaged || salvageAnimating}
        >
          {salvaged ? '✨ 已打捞' : salvageAnimating ? '打捞中...' : '⚓ 打捞'}
        </button>
      </div>
    </div>
  );
}

function HotRanking({ onBack }: { onBack: () => void }) {
  const [stories, setStories] = useState<StoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StoryStorage.hot()
      .then(setStories)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-overlay">
      <div className="page-content hot-page">
        <div className="page-header">
          <h2>🔥 热度排行</h2>
          <button className="back-btn" onClick={onBack}>
            ← 返回海域
          </button>
        </div>
        {loading ? (
          <p className="loading-text">加载中...</p>
        ) : stories.length === 0 ? (
          <p className="empty-text">还没有故事呢</p>
        ) : (
          <div className="ranking-list">
            {stories.map((s, i) => (
              <div key={s.id} className="ranking-item">
                <span className="ranking-num">{i + 1}</span>
                <div className="ranking-info">
                  <h4 className="ranking-title">{s.title || '匿名故事'}</h4>
                  <p className="ranking-excerpt">
                    {s.content.length > 50 ? s.content.slice(0, 50) + '...' : s.content}
                  </p>
                </div>
                <span className="ranking-views">👁 {s.read_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function UILayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPublish, setShowPublish] = useState(false);
  const [selectedStory, setSelectedStory] = useState<StoryData | null>(null);
  const [showHot, setShowHot] = useState(false);

  const handleBottleClick = useCallback(async (storyId: string) => {
    try {
      const story = await StoryStorage.read(storyId);
      setSelectedStory(story);
    } catch {}
  }, []);

  const handleSalvage = useCallback((storyId: string) => {
    const refresh = (window as any).__refreshBottles;
    if (refresh) refresh();
  }, []);

  const handlePublished = useCallback(() => {
    const refresh = (window as any).__refreshBottles;
    if (refresh) refresh();
  }, []);

  const handleRandom = useCallback(async () => {
    try {
      const story = await StoryStorage.random();
      await StoryStorage.read(story.id);
      setSelectedStory(story);
    } catch {}
  }, []);

  return (
    <div className="app-container">
      <OceanScene onBottleClick={handleBottleClick} />
      <ControlPanel
        onPublish={() => setShowPublish(true)}
        onHot={() => setShowHot(true)}
        onRandom={handleRandom}
      />
      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          onPublished={handlePublished}
        />
      )}
      {selectedStory && (
        <StoryCard
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          onSalvage={handleSalvage}
        />
      )}
      {showHot && <HotRanking onBack={() => setShowHot(false)} />}
    </div>
  );
}
