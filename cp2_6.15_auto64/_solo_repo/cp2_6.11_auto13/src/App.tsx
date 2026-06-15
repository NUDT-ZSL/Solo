import { useState, useEffect } from 'react';
import { Capsule, MUSIC_STYLES, MusicStyle } from './types';
import { CapsuleProvider, useCapsuleContext } from './context/CapsuleContext';
import CapsuleCard from './components/CapsuleCard';
import CreateForm from './components/CreateForm';
import ParticleAnimation from './components/ParticleAnimation';
import './styles/global.css';
import './styles/components.css';

const AppContent = () => {
  const {
    view, setView,
    selectedCapsule,
    filterStyle, setFilterStyle,
    filterStatus, setFilterStatus,
    filteredCapsules,
    isLoading,
    detailPhase,
    showContent, showImages,
    volume, setVolume,
    isPlaying, togglePlay,
    audioRef,
    handleViewDetail,
    navigateToList,
  } = useCapsuleContext();

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      {view === 'list' && <CapsuleList />}
      {view === 'create' && <CreatePage />}
      {view === 'detail' && selectedCapsule && (
        <DetailPage
          capsule={selectedCapsule}
          detailPhase={detailPhase}
          showContent={showContent}
          showImages={showImages}
          volume={volume}
          setVolume={setVolume}
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          audioRef={audioRef}
          onBack={navigateToList}
        />
      )}
    </div>
  );
};

const Header = () => {
  const { view, setView, navigateToList } = useCapsuleContext();

  return (
    <div className="header">
      <div className="header-brand" onClick={view !== 'list' ? navigateToList : undefined} style={{ cursor: view !== 'list' ? 'pointer' : 'default' }}>
        <div className="header-brand-icon">✉️</div>
        <div>
          <h1 className="header-title">时光信使</h1>
          <p className="header-subtitle">穿越时间的信件</p>
        </div>
      </div>
      {view === 'list' && (
        <button onClick={() => setView('create')} className="btn btn-primary" style={{ padding: '12px 28px' }}>
          + 创建胶囊
        </button>
      )}
    </div>
  );
};

const CreatePage = () => {
  const { setView, isLoading } = useCapsuleContext();
  return (
    <div className="create-container">
      <h2 className="create-title">封存时光</h2>
      <p className="create-subtitle">写下此刻的心情，寄给未来的自己</p>
      <CreateForm />
      {isLoading && (
        <div className="loading-overlay">
          <div>正在封存胶囊...</div>
        </div>
      )}
    </div>
  );
};

const CapsuleList = () => {
  const { filterStyle, setFilterStyle, filterStatus, setFilterStatus, filteredCapsules, handleViewDetail, setView } = useCapsuleContext();

  return (
    <div className="list-container">
      <div className="filter-bar">
        <div className="filter-group">
          <span className="filter-label">风格:</span>
          <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value as MusicStyle | 'all')} className="filter-select">
            <option value="all">全部风格</option>
            {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
              <option key={key} value={key}>{MUSIC_STYLES[key].name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <span className="filter-label">状态:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'locked' | 'unlocked')} className="filter-select">
            <option value="all">全部状态</option>
            <option value="locked">已锁定</option>
            <option value="unlocked">已解锁</option>
          </select>
        </div>
        <div className="filter-count">共 {filteredCapsules.length} 封胶囊</div>
      </div>

      {filteredCapsules.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <p style={{ fontSize: '16px' }}>还没有胶囊，创建你的第一封时间信件吧</p>
        </div>
      ) : (
        <div className="capsule-grid">
          {filteredCapsules.map((capsule) => (
            <CapsuleCard key={capsule.id} capsule={capsule} onClick={() => handleViewDetail(capsule)} />
          ))}
        </div>
      )}
    </div>
  );
};

interface DetailPageProps {
  capsule: Capsule;
  detailPhase: 'locked' | 'opening' | 'showing';
  showContent: boolean;
  showImages: boolean[];
  volume: number;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
  onBack: () => void;
}

const DetailPage = ({ capsule, detailPhase, showContent, showImages, volume, setVolume, isPlaying, togglePlay, audioRef, onBack }: DetailPageProps) => {
  const style = MUSIC_STYLES[capsule.musicStyle];

  return (
    <div className="detail-container">
      {capsule.isUnlocked && detailPhase !== 'locked' && (
        <ParticleAnimation style={capsule.musicStyle} active={detailPhase === 'showing'} />
      )}
      <div className="detail-content">
        <button onClick={onBack} className="btn-sm">← 返回列表</button>
        {detailPhase === 'locked' && <DetailLocked capsule={capsule} />}
        {(detailPhase === 'opening' || detailPhase === 'showing') && (
          <DetailUnlocked
            capsule={capsule}
            phase={detailPhase}
            showContent={showContent}
            showImages={showImages}
            volume={volume}
            setVolume={setVolume}
            isPlaying={isPlaying}
            togglePlay={togglePlay}
            audioRef={audioRef}
          />
        )}
      </div>
    </div>
  );
};

const DetailLocked = ({ capsule }: { capsule: Capsule }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const style = MUSIC_STYLES[capsule.musicStyle];

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const unlock = new Date(capsule.unlockDate).getTime();
      const diff = unlock - now;
      if (diff <= 0) { setTimeLeft('已解锁'); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${d}天 ${h}时 ${m}分 ${s}秒`);
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [capsule.unlockDate]);

  return (
    <div className="glass-panel-compact">
      <div style={{ width: 200, height: 150, margin: '0 auto 32px', background: style.gradient, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <svg width="120" height="90" viewBox="0 0 80 60" fill="none">
          <rect x="5" y="15" width="70" height="40" rx="3" fill="rgba(255,255,255,0.95)" />
          <path d="M5 15 L40 42 L75 15" stroke="rgba(255,255,255,0.95)" strokeWidth="2" fill="none" />
          <path d="M5 15 L40 38 L75 15" fill="rgba(0,0,0,0.08)" />
          <circle cx="40" cy="42" r="6" fill="#B71C1C">
            <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      <h2 style={{ fontSize: 26, color: '#FFF', marginBottom: 8, fontWeight: 700 }}>{capsule.title}</h2>
      <div style={{ display: 'inline-block', background: style.gradient, padding: '4px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, color: '#1A1A2E', marginBottom: 32 }}>{style.name}</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>🔒 胶囊已封存，距离解锁还有</div>
      <div className="detail-locked-countdown">{timeLeft}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 16 }}>解锁日期：{new Date(capsule.unlockDate).toLocaleString('zh-CN')}</div>
    </div>
  );
};

interface DetailUnlockedProps {
  capsule: Capsule;
  phase: 'opening' | 'showing';
  showContent: boolean;
  showImages: boolean[];
  volume: number;
  setVolume: (v: number) => void;
  isPlaying: boolean;
  togglePlay: () => void;
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

const DetailUnlocked = ({ capsule, phase, showContent, showImages, volume, setVolume, isPlaying, togglePlay, audioRef }: DetailUnlockedProps) => {
  const style = MUSIC_STYLES[capsule.musicStyle];

  return (
    <div>
      <audio ref={audioRef} loop src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=" />
      <div style={{ position: 'relative', height: 180, marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 800 }}>
        <div style={{ position: 'relative', width: 200, height: 140, transformStyle: 'preserve-3d' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 200, height: 100, background: style.gradient, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} />
          <div style={{
            position: 'absolute', top: phase === 'opening' ? -50 : 0, left: 0, width: 100, height: 70,
            background: style.gradient, borderRadius: '8px 0 0 0', transformOrigin: 'bottom left',
            transform: phase === 'opening' ? 'rotateX(-120deg) rotateY(-30deg)' : 'rotateX(0deg)',
            transition: phase === 'opening' ? 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            opacity: phase === 'showing' ? 0 : 1, zIndex: 3,
          }} />
          <div style={{
            position: 'absolute', top: phase === 'opening' ? -50 : 0, right: 0, width: 100, height: 70,
            background: style.gradient, borderRadius: '0 8px 0 0', transformOrigin: 'bottom right',
            transform: phase === 'opening' ? 'rotateX(-120deg) rotateY(30deg)' : 'rotateX(0deg)',
            transition: phase === 'opening' ? 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            opacity: phase === 'showing' ? 0 : 1, zIndex: 3,
          }} />
        </div>
      </div>

      {phase === 'showing' && (
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h2 style={{ fontSize: 24, color: '#FFF', fontWeight: 700, marginBottom: 6 }}>{capsule.title}</h2>
              <span style={{ background: style.gradient, padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#1A1A2E' }}>{style.name}</span>
            </div>
            <div className="music-player">
              <button onClick={togglePlay} className="play-btn">{isPlaying ? '⏸' : '▶'}</button>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} style={{ width: 100, accentColor: '#667eea' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>🔊 {Math.round(volume * 100)}%</span>
            </div>
          </div>

          <div className={`content-fade-in ${showContent ? 'visible' : ''}`} style={{ fontSize: 16, lineHeight: 2, color: 'rgba(255,255,255,0.9)', whiteSpace: 'pre-wrap', marginBottom: 32, padding: 24, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
            {capsule.content}
          </div>

          {capsule.images.length > 0 && (
            <div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>📷 回忆照片</div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(capsule.images.length, 3)}, 1fr)`, gap: 16 }}>
                {capsule.images.map((img, index) => (
                  <div key={index} className={`image-zoom-in ${showImages[index] ? 'visible' : ''}`}>
                    <img src={img} alt={`照片 ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="meta-footer">
            <span>封存时间：{new Date(capsule.createdAt).toLocaleString('zh-CN')}</span>
            <span>解锁时间：{new Date(capsule.unlockDate).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <CapsuleProvider>
    <AppContent />
  </CapsuleProvider>
);

export default App;
