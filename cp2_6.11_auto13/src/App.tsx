import { useState, useEffect, useRef } from 'react';
import { Capsule, MusicStyle, MUSIC_STYLES } from './types';
import CapsuleCard from './components/CapsuleCard';
import CreateForm from './components/CreateForm';
import ParticleAnimation from './components/ParticleAnimation';

type View = 'list' | 'create' | 'detail';

const App = () => {
  const [view, setView] = useState<View>('list');
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [selectedCapsule, setSelectedCapsule] = useState<Capsule | null>(null);
  const [filterStyle, setFilterStyle] = useState<MusicStyle | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const [detailPhase, setDetailPhase] = useState<'locked' | 'opening' | 'showing'>('locked');
  const [showContent, setShowContent] = useState(false);
  const [showImages, setShowImages] = useState<boolean[]>([]);
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchCapsules = async () => {
    try {
      const res = await fetch('/api/capsules');
      const data = await res.json();
      setCapsules(data);
    } catch (err) {
      console.error('获取胶囊列表失败', err);
    }
  };

  useEffect(() => {
    fetchCapsules();
  }, []);

  const handleCreate = async (data: {
    title: string;
    content: string;
    images: string[];
    musicStyle: MusicStyle;
    unlockDate: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/capsules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchCapsules();
        setView('list');
      } else {
        const err = await res.json();
        alert(err.error || '创建失败');
      }
    } catch (err) {
      alert('创建胶囊失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchCapsules();
      } else {
        const err = await res.json();
        alert(err.error || '删除失败');
      }
    } catch (err) {
      alert('删除胶囊失败，请重试');
    }
  };

  const handleViewDetail = async (capsule: Capsule) => {
    setSelectedCapsule(capsule);
    setDetailPhase(capsule.isUnlocked ? 'opening' : 'locked');
    setShowContent(false);
    setShowImages([]);
    setView('detail');

    if (capsule.isUnlocked) {
      setTimeout(() => {
        setDetailPhase('showing');
        setShowContent(true);
      }, 1200);
    }
  };

  useEffect(() => {
    if (detailPhase === 'showing' && selectedCapsule) {
      const timers: NodeJS.Timeout[] = [];
      selectedCapsule.images.forEach((_, index) => {
        timers.push(
          setTimeout(() => {
            setShowImages((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
          }, 1200 + index * 500)
        );
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [detailPhase, selectedCapsule]);

  useEffect(() => {
    if (view === 'detail' && selectedCapsule?.isUnlocked && audioRef.current) {
      audioRef.current.volume = volume;
      const playAudio = async () => {
        try {
          await audioRef.current?.play();
          setIsPlaying(true);
        } catch (err) {
          console.log('自动播放被阻止，需要用户交互');
        }
      };
      const timer = setTimeout(playAudio, 1000);
      return () => clearTimeout(timer);
    }
  }, [view, selectedCapsule, detailPhase]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const filteredCapsules = capsules.filter((c) => {
    if (filterStyle !== 'all' && c.musicStyle !== filterStyle) return false;
    if (filterStatus === 'locked' && c.isUnlocked) return false;
    if (filterStatus === 'unlocked' && !c.isUnlocked) return false;
    return true;
  });

  const renderHeader = () => (
    <div
      style={{
        padding: '24px 32px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: view !== 'list' ? 'pointer' : 'default',
        }}
        onClick={() => {
          if (view !== 'list') {
            setView('list');
            setSelectedCapsule(null);
            if (audioRef.current) {
              audioRef.current.pause();
              setIsPlaying(false);
            }
          }
        }}
      >
        <div style={{ fontSize: '32px' }}>✉️</div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#FFFFFF' }}>
            时光信使
          </h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
            穿越时间的信件
          </p>
        </div>
      </div>
      {view === 'list' && (
        <button
          onClick={() => setView('create')}
          style={{
            padding: '12px 28px',
            borderRadius: '8px',
            border: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#FFFFFF',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          + 创建胶囊
        </button>
      )}
    </div>
  );

  const renderList = () => (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '32px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>风格:</span>
          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value as MusicStyle | 'all')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">全部风格</option>
            {(Object.keys(MUSIC_STYLES) as MusicStyle[]).map((key) => (
              <option key={key} value={key} style={{ background: '#1A1A2E' }}>
                {MUSIC_STYLES[key].name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>状态:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'locked' | 'unlocked')}
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="all">全部状态</option>
            <option value="locked">已锁定</option>
            <option value="unlocked">已解锁</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          共 {filteredCapsules.length} 封胶囊
        </div>
      </div>

      {filteredCapsules.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
          <p style={{ fontSize: '16px' }}>还没有胶囊，创建你的第一封时间信件吧</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredCapsules.map((capsule) => (
            <CapsuleCard
              key={capsule.id}
              capsule={capsule}
              onClick={() => handleViewDetail(capsule)}
              onDelete={() => handleDelete(capsule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  const renderCreate = () => (
    <div style={{ padding: '40px 32px', maxWidth: '800px', margin: '0 auto' }}>
      <h2
        style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#FFFFFF',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        封存时光
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: 'rgba(255,255,255,0.5)',
          textAlign: 'center',
          marginBottom: '36px',
        }}
      >
        写下此刻的心情，寄给未来的自己
      </p>
      <CreateForm onSubmit={handleCreate} onCancel={() => setView('list')} />
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div style={{ color: '#FFFFFF', fontSize: '16px' }}>正在封存胶囊...</div>
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!selectedCapsule) return null;
    const style = MUSIC_STYLES[selectedCapsule.musicStyle];

    return (
      <div
        style={{
          position: 'relative',
          minHeight: 'calc(100vh - 80px)',
          padding: '40px 32px',
          overflow: 'hidden',
        }}
      >
        {selectedCapsule.isUnlocked && detailPhase !== 'locked' && (
          <ParticleAnimation style={selectedCapsule.musicStyle} active={detailPhase === 'showing'} />
        )}

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: '720px',
            margin: '0 auto',
          }}
        >
          <button
            onClick={() => {
              setView('list');
              setSelectedCapsule(null);
              if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
              }
            }}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#FFFFFF',
              padding: '8px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '24px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ← 返回列表
          </button>

          {detailPhase === 'locked' && <DetailLocked capsule={selectedCapsule} />}
          {(detailPhase === 'opening' || detailPhase === 'showing') && (
            <DetailUnlocked
              capsule={selectedCapsule}
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

  return (
    <div style={{ minHeight: '100vh' }}>
      {renderHeader()}
      {view === 'list' && renderList()}
      {view === 'create' && renderCreate()}
      {view === 'detail' && renderDetail()}
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
      if (diff <= 0) {
        setTimeLeft('已解锁');
        return;
      }
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
    <div
      style={{
        textAlign: 'center',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '48px 32px',
      }}
    >
      <div
        style={{
          width: '200px',
          height: '150px',
          margin: '0 auto 32px',
          background: style.gradient,
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
        }}
      >
        <svg width="120" height="90" viewBox="0 0 80 60" fill="none">
          <rect x="5" y="15" width="70" height="40" rx="3" fill="rgba(255,255,255,0.95)" />
          <path d="M5 15 L40 42 L75 15" stroke="rgba(255,255,255,0.95)" strokeWidth="2" fill="none" />
          <path d="M5 15 L40 38 L75 15" fill="rgba(0,0,0,0.08)" />
          <circle cx="40" cy="42" r="6" fill="#B71C1C">
            <animate attributeName="r" values="5;7;5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      <h2 style={{ fontSize: '26px', color: '#FFFFFF', marginBottom: '8px', fontWeight: '700' }}>
        {capsule.title}
      </h2>
      <div
        style={{
          display: 'inline-block',
          background: style.gradient,
          padding: '4px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#1A1A2E',
          marginBottom: '32px',
        }}
      >
        {style.name}
      </div>

      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
        🔒 胶囊已封存，距离解锁还有
      </div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#64B5F6',
          fontFamily: 'monospace',
          letterSpacing: '2px',
        }}
      >
        {timeLeft}
      </div>
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '16px' }}>
        解锁日期：{new Date(capsule.unlockDate).toLocaleString('zh-CN')}
      </div>
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

const DetailUnlocked = ({
  capsule,
  phase,
  showContent,
  showImages,
  volume,
  setVolume,
  isPlaying,
  togglePlay,
  audioRef,
}: DetailUnlockedProps) => {
  const style = MUSIC_STYLES[capsule.musicStyle];

  return (
    <div>
      <audio
        ref={audioRef}
        loop
        src={`data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=`}
      />

      <div
        style={{
          position: 'relative',
          height: '180px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          perspective: '800px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '200px',
            height: '140px',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '200px',
              height: '100px',
              background: style.gradient,
              borderRadius: '8px',
              boxShadow: `0 8px 32px rgba(0,0,0,0.3)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: phase === 'opening' ? '-50px' : '0px',
              left: 0,
              width: '100px',
              height: '70px',
              background: style.gradient,
              borderRadius: '8px 0 0 0',
              transformOrigin: 'bottom left',
              transform: phase === 'opening' ? 'rotateX(-120deg) rotateY(-30deg)' : 'rotateX(0deg)',
              transition: phase === 'opening' ? 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              opacity: phase === 'showing' ? 0 : 1,
              zIndex: 3,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: phase === 'opening' ? '-50px' : '0px',
              right: 0,
              width: '100px',
              height: '70px',
              background: style.gradient,
              borderRadius: '0 8px 0 0',
              transformOrigin: 'bottom right',
              transform: phase === 'opening' ? 'rotateX(-120deg) rotateY(30deg)' : 'rotateX(0deg)',
              transition: phase === 'opening' ? 'all 1s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              opacity: phase === 'showing' ? 0 : 1,
              zIndex: 3,
            }}
          />
        </div>
      </div>

      {phase === 'showing' && (
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            padding: '40px 32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '24px', color: '#FFFFFF', fontWeight: '700', marginBottom: '6px' }}>
                {capsule.title}
              </h2>
              <span
                style={{
                  background: style.gradient,
                  padding: '3px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#1A1A2E',
                }}
              >
                {style.name}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px 16px',
                borderRadius: '10px',
              }}
            >
              <button
                onClick={togglePlay}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (audioRef.current) audioRef.current.volume = v;
                }}
                style={{
                  width: '100px',
                  accentColor: '#667eea',
                }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                🔊 {Math.round(volume * 100)}%
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '16px',
              lineHeight: '2',
              color: 'rgba(255,255,255,0.9)',
              whiteSpace: 'pre-wrap',
              marginBottom: '32px',
              padding: '24px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '12px',
              opacity: showContent ? 1 : 0,
              transform: showContent ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.8s ease, transform 0.8s ease',
            }}
          >
            {capsule.content}
          </div>

          {capsule.images.length > 0 && (
            <div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                📷 回忆照片
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(capsule.images.length, 3)}, 1fr)`,
                  gap: '16px',
                }}
              >
                {capsule.images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      opacity: showImages[index] ? 1 : 0,
                      transform: showImages[index] ? 'scale(1)' : 'scale(0.8)',
                      transition: 'opacity 0.8s ease, transform 0.8s ease',
                    }}
                  >
                    <img
                      src={img}
                      alt={`照片 ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>封存时间：{new Date(capsule.createdAt).toLocaleString('zh-CN')}</span>
            <span>解锁时间：{new Date(capsule.unlockDate).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
