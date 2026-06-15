import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Artwork, SortOption } from './types';

interface VotingWallProps {
  artworks: Artwork[];
  onVote: (id: string) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  life: number;
  maxLife: number;
  phase: number;
  amplitude: number;
  frequency: number;
  colorStops: [number, number, number][];
}

interface ParticleCanvasProps {
  voteCount: number;
  width: number;
  height: number;
  isFullscreen: boolean;
}

const ResponsiveGrid: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w <= 768) setCols(2);
      else if (w <= 1200) setCols(3);
      else setCols(4);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return (
    <div
      style={{
        ...style,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        transition: 'grid-template-columns 0.5s ease-in-out'
      }}
    >
      {children}
    </div>
  );
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'latest', label: '📅 最新' },
  { value: 'hottest', label: '🔥 最热' },
  { value: 'random', label: '🎲 随机漫步' }
];

function getParticleConfig(voteCount: number) {
  if (voteCount <= 0) return { density: 0, maxParticles: 0, colorRange: 'none' as const };
  if (voteCount <= 5) return { density: 10, maxParticles: 15, colorRange: 'blue' as const };
  if (voteCount <= 20) return { density: 30, maxParticles: 40, colorRange: 'pink' as const };
  return { density: 60, maxParticles: 60, colorRange: 'gold' as const };
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const ParticleCanvas = ({ voteCount, width, height, isFullscreen }: ParticleCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const config = useMemo(() => {
    const base = getParticleConfig(voteCount);
    if (isFullscreen) {
      return {
        ...base,
        density: base.density * 2,
        speedMultiplier: 1.5
      };
    }
    return { ...base, speedMultiplier: 1 };
  }, [voteCount, isFullscreen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const spawnInterval = config.density > 0 ? 1000 / config.density : Infinity;
    const speedMult = config.speedMultiplier;

    let colorPalette: [number, number, number][];
    if (config.colorRange === 'blue') {
      colorPalette = [[79, 172, 254], [0, 242, 254]];
    } else if (config.colorRange === 'pink') {
      colorPalette = [[79, 172, 254], [255, 107, 157], [233, 69, 96]];
    } else if (config.colorRange === 'gold') {
      colorPalette = [[255, 107, 157], [255, 209, 102], [255, 215, 0], [233, 69, 96]];
    } else {
      colorPalette = [];
    }

    const spawnParticle = (): Particle | null => {
      if (config.maxParticles <= 0 || colorPalette.length < 2) return null;

      const radius = 2 + Math.random() * 2;
      const maxLife = 1500 + Math.random() * 2000;
      return {
        x: Math.random() * width,
        y: height + radius + Math.random() * 20,
        vx: 0,
        vy: -(0.3 + Math.random() * 0.5) * speedMult,
        radius,
        opacity: 0.6 + Math.random() * 0.4,
        life: maxLife,
        maxLife,
        phase: Math.random() * Math.PI * 2,
        amplitude: 10 + Math.random() * 30,
        frequency: 0.002 + Math.random() * 0.004,
        colorStops: colorPalette
      };
    };

    const animate = (timestamp: number) => {
      const dt = timeRef.current ? timestamp - timeRef.current : 16;
      timeRef.current = timestamp;

      ctx.clearRect(0, 0, width, height);

      if (config.density > 0 && timestamp - lastSpawnRef.current > spawnInterval) {
        lastSpawnRef.current = timestamp;
        if (particlesRef.current.length < config.maxParticles) {
          const p = spawnParticle();
          if (p) particlesRef.current.push(p);
        }
      }

      const surviving: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life -= dt;
        if (p.life <= 0) continue;

        p.y += p.vy * (dt / 16);
        p.phase += p.frequency * dt;
        p.x += Math.sin(p.phase) * p.amplitude * 0.02;

        const lifeRatio = p.life / p.maxLife;
        const currentOpacity = p.opacity * Math.min(lifeRatio * 2, 1);

        const colorT =
          config.colorRange === 'gold'
            ? (Math.sin(timestamp * 0.003 + p.phase) + 1) / 2
            : 1 - lifeRatio;

        const stops = p.colorStops;
        let color: string;
        if (stops.length === 2) {
          color = lerpColor(stops[0], stops[1], Math.max(0, Math.min(1, colorT)));
        } else {
          const segment = colorT * (stops.length - 1);
          const idx = Math.min(Math.floor(segment), stops.length - 2);
          const localT = segment - idx;
          color = lerpColor(stops[idx], stops[idx + 1], localT);
        }

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', `, ${currentOpacity})`));
        gradient.addColorStop(0.5, color.replace('rgb', 'rgba').replace(')', `, ${currentOpacity * 0.5})`));
        gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0)'));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = color.replace('rgb', 'rgba').replace(')', `, ${currentOpacity})`);
        ctx.fill();

        if (p.y > -20 && p.x > -50 && p.x < width + 50) {
          surviving.push(p);
        }
      }
      particlesRef.current = surviving;

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      particlesRef.current = [];
      timeRef.current = 0;
      lastSpawnRef.current = 0;
    };
  }, [width, height, config.density, config.maxParticles, config.colorRange, config.speedMultiplier]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        borderRadius: 16,
        zIndex: 2
      }}
    />
  );
};

interface ArtworkCardProps {
  artwork: Artwork;
  onVote: (id: string) => void;
  onEnterFullscreen: (artwork: Artwork) => void;
  index: number;
}

const ArtworkCard = ({ artwork, onVote, onEnterFullscreen, index }: ArtworkCardProps) => {
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 300, height: 300 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoting) return;
    setIsVoting(true);
    setHasVoted(true);
    onVote(artwork.id);
    setTimeout(() => setIsVoting(false), 400);
  };

  const handleCardClick = () => {
    onEnterFullscreen(artwork);
  };

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.card,
        ...(hovered ? styles.cardHover : {}),
        animationDelay: `${index * 50}ms`
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
    >
      <div style={styles.cardImageWrap}>
        <img src={artwork.imageUrl} alt={artwork.title} style={styles.cardImage} draggable={false} />
        {dimensions.width > 0 && (
          <ParticleCanvas
            voteCount={artwork.voteCount}
            width={dimensions.width}
            height={dimensions.width}
            isFullscreen={false}
          />
        )}
        <div style={{ ...styles.cardOverlay, opacity: hovered ? 1 : 0 }}>
          <span style={styles.overlayText}>点击查看大图</span>
        </div>
      </div>

      <div style={styles.cardInfo}>
        <div style={styles.cardTitle}>{artwork.title}</div>
        <div style={styles.cardActions}>
          <button
            onClick={handleVote}
            style={{
              ...styles.voteBtn,
              ...(hasVoted ? styles.voteBtnActive : {}),
              ...(isVoting ? styles.voteBtnAnimating : {})
            }}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" style={styles.heartIcon}>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={hasVoted ? '#e94560' : 'none'}
                stroke={hasVoted ? '#e94560' : '#ffffff88'}
                strokeWidth="2"
              />
            </svg>
          </button>
          <div style={styles.voteCount}>
            <span style={styles.voteCountIcon}>❤️</span>
            <span style={styles.voteCountNum}>{artwork.voteCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const VotingWall = ({ artworks, onVote }: VotingWallProps) => {
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [fullscreenArtwork, setFullscreenArtwork] = useState<Artwork | null>(null);
  const [fsDimensions, setFsDimensions] = useState({ width: 600, height: 600 });
  const fsContainerRef = useRef<HTMLDivElement>(null);

  const sortedArtworks = useMemo(() => {
    const copy = [...artworks];
    switch (sortBy) {
      case 'hottest':
        return copy.sort((a, b) => b.voteCount - a.voteCount);
      case 'random':
        return copy.sort(() => Math.random() - 0.5);
      case 'latest':
      default:
        return copy.sort((a, b) => b.createdAt - a.createdAt);
    }
  }, [artworks, sortBy]);

  const closeFullscreen = useCallback(() => {
    setFullscreenArtwork(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeFullscreen]);

  useEffect(() => {
    if (!fullscreenArtwork) return;
    const update = () => {
      if (fsContainerRef.current) {
        const rect = fsContainerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width * 0.7, rect.height * 0.7, 700);
        setFsDimensions({ width: size, height: size });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [fullscreenArtwork]);

  if (artworks.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>🖼️</div>
        <h2 style={styles.emptyTitle}>画廊还是空的</h2>
        <p style={styles.emptyText}>点击右上角的「上传作品」按钮，开启你的脉动画廊之旅！</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarInfo}>
          <span style={styles.toolbarCount}>共 {artworks.length} 件作品</span>
          <span style={styles.toolbarDivider}>·</span>
          <span style={styles.toolbarCount}>
            总票数 {artworks.reduce((s, a) => s + a.voteCount, 0)}
          </span>
        </div>
        <div style={styles.sortWrap}>
          <span style={styles.sortLabel}>排序：</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            style={styles.sortSelect}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ResponsiveGrid style={styles.grid}>
        {sortedArtworks.map((artwork, i) => (
          <ArtworkCard
            key={artwork.id}
            artwork={artwork}
            onVote={onVote}
            onEnterFullscreen={setFullscreenArtwork}
            index={i}
          />
        ))}
      </ResponsiveGrid>

      {fullscreenArtwork && (
        <div
          ref={fsContainerRef}
          style={styles.fullscreenMask}
          onClick={closeFullscreen}
        >
          <div
            style={styles.fullscreenCard}
            onClick={e => e.stopPropagation()}
          >
            <button style={styles.fsCloseBtn} onClick={closeFullscreen}>
              ✕
            </button>
            <div style={{ ...styles.fsImageWrap, width: fsDimensions.width, height: fsDimensions.height }}>
              <img src={fullscreenArtwork.imageUrl} alt={fullscreenArtwork.title} style={styles.fsImage} />
              <ParticleCanvas
                voteCount={fullscreenArtwork.voteCount}
                width={fsDimensions.width}
                height={fsDimensions.height}
                isFullscreen={true}
              />
            </div>
            <div style={styles.fsInfo}>
              <div style={styles.fsTitle}>{fullscreenArtwork.title}</div>
              <div style={styles.fsVotes}>
                ❤️ 获得 <strong style={{ color: '#e94560' }}>{fullscreenArtwork.voteCount}</strong> 票
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { width: '100%' },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0 24px',
    flexWrap: 'wrap',
    gap: 16
  },
  toolbarInfo: { display: 'flex', alignItems: 'center', gap: 10, color: '#8892b0', fontSize: 14 },
  toolbarCount: {},
  toolbarDivider: { opacity: 0.5 },
  sortWrap: { display: 'flex', alignItems: 'center', gap: 10 },
  sortLabel: { color: '#8892b0', fontSize: 14 },
  sortSelect: {
    padding: '8px 14px',
    fontSize: 14,
    background: 'rgba(15, 52, 96, 0.5)',
    color: '#fff',
    border: '1px solid rgba(233,69,96,0.3)',
    borderRadius: 10,
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.2s'
  },
  grid: {
    display: 'grid',
    gap: 24,
    transition: 'all 0.5s ease-in-out'
  },
  card: {
    background: 'linear-gradient(145deg, #16213e 0%, #1a1a2e 100%)',
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(233,69,96,0.3)',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    position: 'relative',
    border: '1px solid rgba(233,69,96,0.15)',
    animation: 'fadeInUp 0.5s ease both'
  },
  cardHover: {
    boxShadow: '0 12px 30px rgba(233,69,96,0.5)',
    transform: 'translateY(-4px)',
    borderColor: 'rgba(233,69,96,0.4)'
  },
  cardImageWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    overflow: 'hidden',
    background: '#0f3460'
  },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '16px',
    transition: 'opacity 0.25s ease',
    zIndex: 3,
    pointerEvents: 'none'
  },
  overlayText: {
    color: '#fff',
    fontSize: 13,
    padding: '6px 14px',
    background: 'rgba(233,69,96,0.8)',
    borderRadius: 20,
    backdropFilter: 'blur(4px)'
  },
  cardInfo: {
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: '#e6f1ff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1
  },
  cardActions: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  voteBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background 0.2s ease',
    outline: 'none',
    padding: 0
  },
  voteBtnActive: { background: 'rgba(233,69,96,0.15)' },
  voteBtnAnimating: {
    animation: 'voteBounce 0.4s ease, voteShake 0.2s ease 0.1s'
  },
  heartIcon: { display: 'block' },
  voteCount: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 10px',
    background: 'rgba(233,69,96,0.1)',
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 600,
    color: '#ff8fa3',
    minWidth: 52,
    justifyContent: 'center'
  },
  voteCountIcon: { fontSize: 12 },
  voteCountNum: { minWidth: 14, textAlign: 'center' },
  emptyState: {
    textAlign: 'center',
    padding: '100px 20px',
    color: '#8892b0'
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, color: '#e6f1ff', marginBottom: 8 },
  emptyText: { fontSize: 15, opacity: 0.8 },
  fullscreenMask: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
    backdropFilter: 'blur(6px)',
    padding: 24
  },
  fullscreenCard: {
    position: 'relative',
    background: 'linear-gradient(145deg, #16213e 0%, #1a1a2e 100%)',
    borderRadius: 20,
    padding: 24,
    maxWidth: '90vw',
    boxShadow: '0 24px 60px rgba(233,69,96,0.3)',
    border: '1px solid rgba(233,69,96,0.3)',
    animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  fsCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    transition: 'background 0.2s'
  },
  fsImageWrap: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#0f3460'
  },
  fsImage: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  fsInfo: {
    padding: '16px 4px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },
  fsTitle: { fontSize: 18, fontWeight: 700, color: '#e6f1ff' },
  fsVotes: { fontSize: 15, color: '#8892b0' }
};

const keyframesStyle = document.createElement('style');
keyframesStyle.textContent = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes voteBounce {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes voteShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('vw-keyframes')) {
  keyframesStyle.id = 'vw-keyframes';
  document.head.appendChild(keyframesStyle);
}

export default VotingWall;
