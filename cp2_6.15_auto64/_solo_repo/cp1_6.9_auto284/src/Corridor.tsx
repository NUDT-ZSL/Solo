import { useRef, useEffect, useState, useCallback } from 'react';
import { useApp, Fragment as FragmentType, OnlineUser } from './App';

type FlyingFragment = {
  id: string;
  fragment: FragmentType;
  startX: number;
  startY: number;
  startTime: number;
};

export default function Corridor() {
  const { fragments, onlineUsers, addCollectedFragment, socket, userId } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  
  const [corridorOffset, setCorridorOffset] = useState(0);
  const [hoveredFragmentId, setHoveredFragmentId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);
  const [flyingFragments, setFlyingFragments] = useState<FlyingFragment[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const lastSentOffsetRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayTimeRef = useRef(0);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }, []);

  const playDing = useCallback((freq: number = 880) => {
    const now = Date.now();
    if (now - lastPlayTimeRef.current < 100) return;
    lastPlayTimeRef.current = now;
    
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }, [getAudioCtx]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isDragging) {
      const delta = e.clientX - dragStartX;
      let newOffset = dragStartOffset - delta;
      if (newOffset < 0) newOffset = 0;
      if (newOffset > 10000) newOffset = 10000;
      setCorridorOffset(newOffset);
      
      if (Math.abs(newOffset - lastSentOffsetRef.current) > 50 && socket) {
        lastSentOffsetRef.current = newOffset;
        socket.emit('corridor:move', { position: { x, y }, offset: newOffset });
      }
    }
  }, [isDragging, dragStartX, dragStartOffset, socket]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartOffset(corridorOffset);
  }, [corridorOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
    setHoveredFragmentId(null);
  }, []);

  useEffect(() => {
    if (fragments.length === 0 || containerSize.width === 0) return;

    let nearestId: string | null = null;
    let nearestDist = Infinity;

    for (const frag of fragments) {
      const screenX = (frag.corridorX - corridorOffset) + frag.posX;
      const screenY = frag.posY;
      
      if (screenX < -100 || screenX > containerSize.width + 100) continue;
      
      const dx = mousePos.x - screenX;
      const dy = mousePos.y - screenY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 100 && dist < nearestDist) {
        nearestDist = dist;
        nearestId = frag.id;
      }
    }

    if (nearestId !== hoveredFragmentId) {
      setHoveredFragmentId(nearestId);
      if (nearestId && socket) {
        socket.emit('fragment:hover', nearestId);
      }
    }
  }, [mousePos, corridorOffset, fragments, containerSize, hoveredFragmentId, socket]);

  const handleFragmentClick = useCallback((fragment: FragmentType) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = (fragment.corridorX - corridorOffset) + fragment.posX;
    const screenY = fragment.posY;
    
    const flyingId = `fly-${fragment.id}-${Date.now()}`;
    setFlyingFragments(prev => [...prev, {
      id: flyingId,
      fragment,
      startX: screenX,
      startY: screenY,
      startTime: Date.now()
    }]);

    setTimeout(() => {
      addCollectedFragment(fragment, { x: screenX, y: screenY });
      setFlyingFragments(prev => prev.filter(f => f.id !== flyingId));
    }, 600);
  }, [corridorOffset, addCollectedFragment]);

  useEffect(() => {
    const animate = () => {
      setFlyingFragments(prev => prev);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const renderWalls = () => {
    const wallSegments = [];
    const segmentWidth = 1000;
    const startSegment = Math.floor(corridorOffset / segmentWidth) - 1;
    const endSegment = startSegment + Math.ceil(containerSize.width / segmentWidth) + 2;
    
    for (let i = startSegment; i <= endSegment; i++) {
      const left = i * segmentWidth - corridorOffset;
      wallSegments.push(
        <div
          key={`wall-${i}`}
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: 0,
            width: `${segmentWidth}px`,
            height: '100%',
            background: `
              linear-gradient(180deg, 
                hsl(210, 30%, 22%) 0%, 
                hsl(210, 30%, 28%) 40%,
                hsl(210, 30%, 26%) 70%,
                hsl(210, 35%, 20%) 100%
              )
            `,
            backgroundImage: `
              radial-gradient(ellipse 600px 300px at ${500 - (i % 2) * 200}px 30%, hsla(45, 60%, 70%, 0.08), transparent 70%),
              radial-gradient(ellipse 400px 200px at ${500 + (i % 2) * 300}px 60%, hsla(45, 60%, 70%, 0.05), transparent 70%)
            `,
            boxShadow: 'inset 0 60px 120px hsla(210, 50%, 5%, 0.6), inset 0 -60px 120px hsla(210, 50%, 5%, 0.8)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '70%',
              width: '100%',
              height: '30%',
              background: 'linear-gradient(180deg, hsl(210, 25%, 22%), hsl(210, 35%, 15%))',
              boxShadow: 'inset 0 4px 20px hsla(45, 50%, 60%, 0.1)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '70%',
              width: '100%',
              height: '30%',
              background: 'linear-gradient(180deg, hsla(45, 40%, 80%, 0.06), transparent 50%)',
              transform: 'scaleY(-1)',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, hsl(45, 50%, 55%), hsl(45, 70%, 75%), hsl(45, 50%, 55%))',
              boxShadow: '0 0 20px hsla(45, 80%, 70%, 0.5), 0 0 60px hsla(45, 80%, 70%, 0.2)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '70%',
              width: '100%',
              height: '3px',
              background: 'linear-gradient(90deg, hsl(45, 50%, 45%), hsl(45, 60%, 65%), hsl(45, 50%, 45%))',
              boxShadow: '0 0 15px hsla(45, 80%, 60%, 0.4)'
            }}
          />
        </div>
      );
    }
    return wallSegments;
  };

  const renderUserDots = () => {
    return onlineUsers.map((user: OnlineUser) => {
      const screenX = user.position.x - corridorOffset + 100;
      if (screenX < -50 || screenX > containerSize.width + 50) return null;
      
      const isActive = Date.now() - user.lastActive < 10000;
      
      return (
        <div
          key={user.id}
          style={{
            position: 'absolute',
            left: `${screenX}px`,
            top: `${Math.min(user.position.y + 50, containerSize.height - 100)}px`,
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, hsla(200, 80%, 85%, 0.9) 0%, hsla(200, 80%, 60%, 0.7) 60%, transparent 100%)',
            boxShadow: `0 0 ${isActive ? '20px' : '10px'} hsla(200, 80%, 70%, ${isActive ? 0.8 : 0.4})`,
            transform: 'translate(-50%, -50%)',
            animation: isActive ? 'pulse 1s infinite' : 'none',
            transition: 'all 0.5s ease-out',
            pointerEvents: 'none',
            zIndex: 5
          }}
          title={user.name}
        >
          <div
            style={{
              position: 'absolute',
              top: '-22px',
              left: '50%',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap',
              fontSize: '11px',
              color: 'hsl(200, 70%, 85%)',
              textShadow: '0 0 8px hsla(200, 80%, 60%, 0.8)',
              opacity: 0.8
            }}
          >
            {user.name}
          </div>
        </div>
      );
    });
  };

  const renderFragments = () => {
    return fragments.map(frag => {
      const screenX = (frag.corridorX - corridorOffset) + frag.posX;
      const screenY = frag.posY;
      
      if (screenX < -100 || screenX > containerSize.width + 100) return null;
      
      const isHovered = hoveredFragmentId === frag.id;
      const isCollectedByMe = frag.collectedBy.includes(userId);
      const collectedCount = frag.collectedBy.length;
      
      return (
        <div
          key={frag.id}
          onClick={(e) => {
            e.stopPropagation();
            if (!isDragging) {
              handleFragmentClick(frag);
            }
          }}
          onMouseEnter={() => {
            if (!isDragging && !isCollectedByMe) {
              playDing(660 + Math.random() * 200);
            }
          }}
          style={{
            position: 'absolute',
            left: `${screenX - 30}px`,
            top: `${screenY - 30}px`,
            width: '60px',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isDragging ? 'grabbing' : (isCollectedByMe ? 'default' : 'pointer'),
            zIndex: isHovered ? 20 : 10,
            transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
            transform: isHovered ? 'scale(1.25)' : 'scale(1)',
            opacity: isCollectedByMe ? 0.35 : 1,
            filter: isHovered ? 'brightness(1.3)' : 'none'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-15px',
              left: '-15px',
              right: '-15px',
              bottom: '-15px',
              borderRadius: '12px',
              background: `radial-gradient(circle, hsla(${frag.hue}, 80%, 75%, ${isHovered ? 0.5 : 0.25}) 0%, transparent 70%)`,
              transition: 'all 0.3s ease-out',
              filter: 'blur(8px)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              background: `
                linear-gradient(135deg, 
                  hsla(${frag.hue}, 60%, 25%, 0.85) 0%, 
                  hsla(${frag.hue}, 50%, 20%, 0.9) 50%,
                  hsla(${frag.hue}, 70%, 30%, 0.85) 100%
                )
              `,
              border: `1px solid hsla(${frag.hue}, 70%, 65%, ${isHovered ? 0.9 : 0.5})`,
              boxShadow: `
                inset 0 1px 0 hsla(${frag.hue}, 80%, 80%, 0.3),
                0 0 ${isHovered ? '25px' : '12px'} hsla(${frag.hue}, 80%, 65%, ${isHovered ? 0.6 : 0.35}),
                0 4px 20px rgba(0, 0, 0, 0.4)
              `,
              backdropFilter: 'blur(4px)',
              transition: 'all 0.3s ease-out'
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              fontSize: frag.text.length === 2 ? '18px' : '15px',
              fontWeight: 500,
              color: `hsl(${frag.hue}, 80%, 92%)`,
              textShadow: `0 0 10px hsla(${frag.hue}, 80%, 70%, 0.8)`,
              letterSpacing: '2px',
              textAlign: 'center',
              lineHeight: 1.2,
              whiteSpace: 'pre-wrap'
            }}
          >
            {frag.text.split('').map((c, i) => (
              <span key={i} style={{ display: 'block' }}>{c}</span>
            ))}
          </div>
          {collectedCount > 1 && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 55%))',
                color: 'hsl(30, 50%, 15%)',
                fontSize: '11px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px hsla(45, 80%, 60%, 0.6)'
              }}
            >
              {collectedCount}
            </div>
          )}
        </div>
      );
    });
  };

  const renderFlyingFragments = () => {
    const now = Date.now();
    return flyingFragments.map(fly => {
      const elapsed = now - fly.startTime;
      const progress = Math.min(elapsed / 600, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const targetX = containerSize.width / 2;
      const targetY = containerSize.height + 50;
      const currentX = fly.startX + (targetX - fly.startX) * easeProgress;
      const arcHeight = 150;
      const currentY = fly.startY + (targetY - fly.startY) * easeProgress - Math.sin(progress * Math.PI) * arcHeight;
      const scale = 1 - progress * 0.5;
      const opacity = 1 - progress * 0.5;
      
      return (
        <div
          key={fly.id}
          style={{
            position: 'absolute',
            left: `${currentX - 30}px`,
            top: `${currentY - 30}px`,
            width: '60px',
            height: '60px',
            pointerEvents: 'none',
            zIndex: 100,
            transform: `scale(${scale})`,
            opacity
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-20px',
              right: '-20px',
              bottom: '-20px',
              borderRadius: '50%',
              background: `radial-gradient(circle, hsla(${fly.fragment.hue}, 80%, 75%, 0.6) 0%, transparent 70%)`,
              filter: 'blur(10px)'
            }}
          />
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '8px',
              background: `linear-gradient(135deg, hsla(${fly.fragment.hue}, 60%, 30%, 0.95), hsla(${fly.fragment.hue}, 50%, 22%, 0.95))`,
              border: `1px solid hsla(${fly.fragment.hue}, 80%, 70%, 0.8)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 30px hsla(${fly.fragment.hue}, 80%, 65%, 0.6)`
            }}
          >
            <div
              style={{
                fontSize: fly.fragment.text.length === 2 ? '18px' : '15px',
                color: `hsl(${fly.fragment.hue}, 80%, 92%)`,
                textShadow: `0 0 10px hsla(${fly.fragment.hue}, 80%, 70%, 0.8)`,
                letterSpacing: '2px',
                textAlign: 'center'
              }}
            >
              {fly.fragment.text.split('').map((c, i) => (
                <span key={i} style={{ display: 'block' }}>{c}</span>
              ))}
            </div>
          </div>
        </div>
      );
    });
  };

  const renderNavigationHints = () => (
    <>
      <div
        style={{
          position: 'absolute',
          left: corridorOffset > 50 ? '16px' : '-60px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'hsla(45, 60%, 70%, 0.15)',
          border: '1px solid hsla(45, 60%, 70%, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsla(45, 70%, 80%, 0.7)',
          fontSize: '18px',
          transition: 'left 0.3s ease-out',
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        ‹
      </div>
      <div
        style={{
          position: 'absolute',
          right: corridorOffset < 9500 ? '16px' : '-60px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: 'hsla(45, 60%, 70%, 0.15)',
          border: '1px solid hsla(45, 60%, 70%, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsla(45, 70%, 80%, 0.7)',
          fontSize: '18px',
          transition: 'right 0.3s ease-out',
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        ›
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: 'hsla(45, 50%, 70%, 0.5)',
          letterSpacing: '4px',
          pointerEvents: 'none'
        }}
      >
        拖 动 鼠 标 漫 游 回 廊 · 点 击 碎 片 收 集
      </div>
    </>
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {renderWalls()}
      {renderFragments()}
      {renderUserDots()}
      {renderFlyingFragments()}
      {renderNavigationHints()}
    </div>
  );
}
