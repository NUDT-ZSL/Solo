import { useState, useRef, useEffect, useCallback } from 'react';
import { PageType } from '../App';
import { Part, PartType, Monster, getPartsByType, calculatePower } from '../utils/monsterData';
import MonsterSprite from './MonsterSprite';
import { playClickSound, playDragStartSound, playDropSound } from '../utils/audio';

interface AssembleScreenProps {
  currentParts: {
    head: Part | null;
    torso: Part | null;
    legs: Part | null;
    tail: Part | null;
  };
  setPart: (type: PartType, part: Part | null) => void;
  clearParts: () => void;
  currentMonster: Monster | null;
  onAddToTeam: () => void;
  teamSize: number;
  onNavigate: (page: PageType) => void;
}

const PART_CATEGORIES: { type: PartType; label: string; icon: string }[] = [
  { type: 'head', label: '头部', icon: '👤' },
  { type: 'torso', label: '躯干', icon: '🧱' },
  { type: 'legs', label: '腿部', icon: '🦵' },
  { type: 'tail', label: '尾部', icon: '🐍' },
];

interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
}

export default function AssembleScreen({
  currentParts,
  setPart,
  clearParts,
  currentMonster,
  onAddToTeam,
  teamSize,
  onNavigate,
}: AssembleScreenProps) {
  const playSoundAndNav = (page: PageType) => {
    playClickSound();
    onNavigate(page);
  };

  const [activeCategory, setActiveCategory] = useState<PartType>('head');
  const [showCompleteBanner, setShowCompleteBanner] = useState(false);
  const [bannerKey, setBannerKey] = useState(0);
  const [prevComplete, setPrevComplete] = useState(false);
  const [dragOverType, setDragOverType] = useState<PartType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [partsAnimating, setPartsAnimating] = useState<Set<PartType>>(new Set());

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ParticleData[]>([]);
  const rafRef = useRef<number>(0);
  const particlesActiveRef = useRef(false);

  const parts = getPartsByType(activeCategory);
  const isComplete = !!currentParts.head && !!currentParts.torso && !!currentParts.legs && !!currentParts.tail;

  useEffect(() => {
    if (isComplete && !prevComplete) {
      setShowCompleteBanner(true);
      setBannerKey(k => k + 1);
      setPartsAnimating(new Set(['head', 'torso', 'legs', 'tail']));
      setTimeout(() => setPartsAnimating(new Set()), 300);
      const t = setTimeout(() => setShowCompleteBanner(false), 3000);
      return () => clearTimeout(t);
    }
    setPrevComplete(isComplete);
  }, [isComplete, prevComplete]);

  const startParticleAnimation = useCallback(() => {
    if (particlesActiveRef.current) return;
    particlesActiveRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const now = performance.now();
      const alive = particlesRef.current.filter(p => now - p.born < 400);

      if (alive.length === 0) {
        particlesRef.current = [];
        particlesActiveRef.current = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of alive) {
        const elapsed = now - p.born;
        const t = elapsed / 400;
        const alpha = 1 - t;
        const x = p.x + p.vx * t;
        const y = p.y + p.vy * t;
        const size = 3 * alpha + 1.5;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      particlesRef.current = alive;
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const triggerParticles = useCallback((centerX: number, centerY: number) => {
    const count = 8 + Math.floor(Math.random() * 5);
    const now = performance.now();
    const newParticles: ParticleData[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
      const speed = 30 + Math.random() * 50;
      newParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        born: now,
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
    startParticleAnimation();
  }, [startParticleAnimation]);

  const handleDragStart = (e: React.DragEvent, part: Part) => {
    playDragStartSound();
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', JSON.stringify(part));
    e.dataTransfer.effectAllowed = 'copy';
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 64, 64);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverType(null);
  };

  const handleDropOnSlot = (e: React.DragEvent, slotType: PartType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverType(null);
    setIsDragging(false);
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const part = JSON.parse(raw) as Part;
      if (part.type === slotType) {
        playDropSound();
        setPart(slotType, part);
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const canvas = canvasRef.current;
        if (canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const x = rect.left + rect.width / 2 - canvasRect.left;
          const y = rect.top + rect.height / 2 - canvasRect.top;
          triggerParticles(x, y);
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDragOverSlot = (e: React.DragEvent, slotType: PartType) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverType(slotType);
  };

  const handleDragLeaveSlot = (e: React.DragEvent) => {
    e.stopPropagation();
    setDragOverType(null);
  };

  const handleSlotClick = (slotType: PartType) => {
    if (currentParts[slotType]) {
      playClickSound();
      setPart(slotType, null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1E1E2E',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#2D2D44',
        borderBottom: '2px solid #455A64',
      }}>
        <button className="btn-pixel" onClick={() => playSoundAndNav('menu')}>
          ← 返回菜单
        </button>
        <h2 className="pixel-font" style={{ color: '#FFD54F', fontSize: 16 }}>
          🔧 怪兽工坊
        </h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            className="btn-pixel"
            onClick={() => { playClickSound(); clearParts(); }}
            style={{ backgroundColor: '#546E7A' }}
          >
            清空
          </button>
          <button
            className="btn-pixel"
            onClick={() => { playClickSound(); playSoundAndNav('prepare'); }}
            style={{ backgroundColor: '#1565C0' }}
          >
            队伍 ({teamSize}/3)
          </button>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        padding: 20,
        gap: 20,
        overflow: 'hidden',
      }}>
        <div style={{
          width: 320,
          backgroundColor: '#2D2D44',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            marginBottom: 16,
          }}>
            {PART_CATEGORIES.map(cat => (
              <button
                key={cat.type}
                onClick={() => { playClickSound(); setActiveCategory(cat.type); }}
                style={{
                  padding: '10px 4px',
                  border: 'none',
                  borderRadius: 6,
                  backgroundColor: activeCategory === cat.type ? '#FFD54F' : '#455A64',
                  color: activeCategory === cat.type ? '#1E1E2E' : '#FFFFFF',
                  cursor: 'pointer',
                  fontFamily: "'Press Start 2P', cursive",
                  fontSize: 9,
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: 18 }}>{cat.icon}</div>
                <div style={{ marginTop: 4 }}>{cat.label}</div>
              </button>
            ))}
          </div>

          <div
            className="assemble-parts-grid scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
              alignContent: 'start',
            }}
          >
            {parts.map(part => {
              const isSelected = currentParts[part.type]?.id === part.id;
              return (
                <div
                  key={part.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, part)}
                  onDragEnd={handleDragEnd}
                  className="assemble-part-tile"
                  data-selected={isSelected ? 'true' : 'false'}
                  style={{
                    width: 128,
                    height: 128,
                    backgroundColor: isSelected ? '#FFE0B2' : '#37474F',
                    border: '1px solid #1A1A2E',
                    borderRadius: 4,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    transition: 'background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                    userSelect: 'none',
                    position: 'relative',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '70%',
                    height: '55%',
                    backgroundColor: part.color,
                    border: `2px solid ${part.accentColor}`,
                    borderRadius: 4,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <PartIcon type={part.type} color={part.accentColor} />
                  </div>
                  <div style={{
                    marginTop: 6,
                    fontSize: 9,
                    color: isSelected ? '#1E1E2E' : '#ECEFF1',
                    fontFamily: "'Press Start 2P', cursive",
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}>
                    {part.name}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: 4,
                    fontSize: 7,
                    color: isSelected ? '#5D4037' : '#90A4AE',
                    fontFamily: "'Press Start 2P', cursive",
                  }}>
                    ⤓ 拖拽安装
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
        }}>
          <canvas
            ref={canvasRef}
            width={500}
            height={500}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          />

          {showCompleteBanner && (
            <div
              key={bannerKey}
              className="fade-in"
              style={{
                position: 'absolute',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                padding: '12px 32px',
                borderRadius: 8,
                fontFamily: "'Press Start 2P', cursive",
                fontSize: 14,
                boxShadow: '0 4px 20px rgba(76, 175, 80, 0.5)',
                zIndex: 50,
              }}
            >
              ✨ 怪兽组装完成！
            </div>
          )}

          <div style={{
            position: 'relative',
            width: 360,
            height: 360,
            backgroundImage: `
              linear-gradient(45deg, #C8E6C9 25%, transparent 25%),
              linear-gradient(-45deg, #C8E6C9 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #A5D6A7 75%),
              linear-gradient(-45deg, transparent 75%, #A5D6A7 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            backgroundColor: '#A5D6A7',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.2)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ position: 'relative', width: 260, height: 260 }}>
              {PART_CATEGORIES.map((cat) => {
                const positions: { [key in PartType]: React.CSSProperties } = {
                  head: { top: 0, left: 30, width: 200, height: 80 },
                  torso: { top: 70, left: 10, width: 240, height: 100 },
                  legs: { top: 155, left: 20, width: 220, height: 90 },
                  tail: { top: 80, left: 200, width: 80, height: 90 },
                };
                const pos = positions[cat.type];
                const part = currentParts[cat.type];
                const isOver = dragOverType === cat.type;
                const isAnimating = partsAnimating.has(cat.type);

                return (
                  <div
                    key={cat.type}
                    onDrop={(e) => handleDropOnSlot(e, cat.type)}
                    onDragOver={(e) => handleDragOverSlot(e, cat.type)}
                    onDragLeave={handleDragLeaveSlot}
                    onClick={() => handleSlotClick(cat.type)}
                    className={isAnimating ? 'part-snap' : ''}
                    style={{
                      position: 'absolute',
                      ...pos,
                      border: part
                        ? `2px solid ${isOver ? '#FFD54F' : '#4CAF50'}`
                        : isOver
                          ? '3px dashed #FFD54F'
                          : '2px dashed rgba(0,0,0,0.3)',
                      borderRadius: 8,
                      backgroundColor: part
                        ? 'rgba(255,255,255,0.1)'
                        : isOver
                          ? 'rgba(255, 213, 79, 0.3)'
                          : 'rgba(255,255,255,0.05)',
                      cursor: part ? 'pointer' : isOver ? 'copy' : 'default',
                      transition: 'all 0.3s ease',
                      transform: isAnimating
                        ? 'scale(1.05)'
                        : undefined,
                      zIndex: cat.type === 'tail' ? 1 : 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {!part && !isOver && (
                      <span style={{
                        fontSize: 10,
                        color: 'rgba(0,0,0,0.3)',
                        fontFamily: "'Press Start 2P', cursive",
                      }}>
                        {cat.label}
                      </span>
                    )}
                    {isOver && !part && (
                      <span style={{
                        fontSize: 10,
                        color: '#FFD54F',
                        fontFamily: "'Press Start 2P', cursive",
                      }}>
                        放置
                      </span>
                    )}
                    {part && (
                      <div style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        backgroundColor: '#E53935',
                        color: 'white',
                        fontSize: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.7,
                        cursor: 'pointer',
                      }}>
                        ×
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{
                position: 'absolute',
                top: 30,
                left: 30,
                width: 200,
                height: 200,
                pointerEvents: 'none',
                zIndex: 2,
              }}>
                <MonsterSprite parts={currentParts} size={200} showSlotLabels={false} />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#2D2D44',
            borderRadius: 12,
            padding: 16,
            width: 400,
            marginBottom: 16,
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
              marginBottom: 12,
            }}>
              <StatDisplay label="❤️ HP" value={currentMonster?.maxHp || 0} color="#E53935" />
              <StatDisplay label="⚔️ ATK" value={currentMonster?.attack || 0} color="#FF9800" />
              <StatDisplay label="⚡ SPD" value={currentMonster?.speed || 0} color="#00BCD4" />
            </div>
            {currentMonster && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#1E1E2E',
                borderRadius: 6,
              }}>
                <span className="pixel-font" style={{ fontSize: 10, color: '#81D4FA' }}>
                  {currentMonster.name}
                </span>
                <span className="pixel-font" style={{ fontSize: 12, color: '#FFD54F' }}>
                  战力 {calculatePower(currentMonster)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 16 }}>
            <button
              className="btn-pixel"
              onClick={() => { playClickSound(); onAddToTeam(); }}
              disabled={!currentMonster || teamSize >= 3}
              style={{ fontSize: 14, padding: '14px 32px' }}
            >
              {teamSize >= 3 ? '队伍已满' : '✅ 加入队伍'}
            </button>
          </div>

          {!isComplete && (
            <div style={{
              marginTop: 16,
              color: '#78909C',
              fontSize: 11,
              fontFamily: "'Press Start 2P', cursive",
              textAlign: 'center',
            }}>
              👆 拖拽部件到右侧槽位 · {PART_CATEGORIES.filter(c => !currentParts[c.type]).map(c => c.label).join(' · ')} 尚未安装
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PartIcon({ type, color }: { type: PartType; color: string }) {
  const size = 32;
  if (type === 'head') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <rect x="8" y="6" width="16" height="14" fill={color} rx="2" />
        <rect x="10" y="10" width="4" height="4" fill="#1E1E2E" />
        <rect x="18" y="10" width="4" height="4" fill="#1E1E2E" />
        <rect x="12" y="16" width="8" height="2" fill="#1E1E2E" />
      </svg>
    );
  }
  if (type === 'torso') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <rect x="6" y="4" width="20" height="24" fill={color} rx="2" />
        <rect x="10" y="10" width="4" height="4" fill="rgba(255,255,255,0.3)" />
        <rect x="18" y="10" width="4" height="4" fill="rgba(255,255,255,0.3)" />
        <rect x="12" y="18" width="8" height="6" fill="rgba(255,255,255,0.2)" />
      </svg>
    );
  }
  if (type === 'legs') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32">
        <rect x="6" y="4" width="8" height="24" fill={color} rx="2" />
        <rect x="18" y="4" width="8" height="24" fill={color} rx="2" />
        <rect x="4" y="26" width="12" height="3" fill="#1E1E2E" />
        <rect x="16" y="26" width="12" height="3" fill="#1E1E2E" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d="M4 16 Q 12 8, 24 12 Q 20 20, 8 22 Z" fill={color} />
      <rect x="20" y="10" width="3" height="3" fill="rgba(255,255,255,0.4)" />
      <rect x="14" y="16" width="3" height="3" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}

function StatDisplay({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 9,
        color: '#B0BEC5',
        fontFamily: "'Press Start 2P', cursive",
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        color,
        fontFamily: "'Press Start 2P', cursive",
      }}>
        {value}
      </div>
    </div>
  );
}
