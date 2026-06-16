import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Star, Constellation, Firefly, Nebula, BurstParticle } from './types';
import { CONFIG, CONSTELLATION_NAMES } from './config';

interface GameBoardProps {
  onConstellationClick: (constellation: Constellation) => void;
  canDivinate: boolean;
  stars: Star[];
  constellations: Constellation[];
  setStars: React.Dispatch<React.SetStateAction<Star[]>>;
  setConstellations: React.Dispatch<React.SetStateAction<Constellation[]>>;
}

const GameBoard: React.FC<GameBoardProps> = ({
  onConstellationClick,
  canDivinate,
  stars,
  constellations,
  setStars,
  setConstellations
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredConstellationId, setHoveredConstellationId] = useState<number | null>(null);
  const firefliesRef = useRef<Firefly[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const burstParticlesRef = useRef<BurstParticle[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const burstIdRef = useRef(0);
  const lastHoveredRef = useRef<number | null>(null);

  const initializeStars = useCallback((width: number, height: number) => {
    const newStars: Star[] = [];
    const skyHeight = height * 0.75;

    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
      newStars.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * skyHeight,
        size: CONFIG.SIZES.STAR_MIN + Math.random() * (CONFIG.SIZES.STAR_MAX - CONFIG.SIZES.STAR_MIN),
        breathPhase: Math.random() * Math.PI * 2,
        breathSpeed: CONFIG.ANIMATION.STAR_BREATH_MIN + Math.random() * (CONFIG.ANIMATION.STAR_BREATH_MAX - CONFIG.ANIMATION.STAR_BREATH_MIN),
        constellationId: null
      });
    }

    const newConstellations: Constellation[] = [];
    const availableStarIds = newStars.map(s => s.id);
    
    const constellationCount = CONFIG.CONSTELLATION_COUNT;
    const shuffledNames = [...CONSTELLATION_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < constellationCount; i++) {
      const starCount = CONFIG.MIN_CONSTELLATION_STARS + Math.floor(Math.random() * (CONFIG.MAX_CONSTELLATION_STARS - CONFIG.MIN_CONSTELLATION_STARS + 1));
      const selectedStarIds: number[] = [];

      for (let j = 0; j < starCount && availableStarIds.length > 0; j++) {
        const idx = Math.floor(Math.random() * availableStarIds.length);
        const starId = availableStarIds.splice(idx, 1)[0];
        selectedStarIds.push(starId);
        newStars[starId].constellationId = i;
      }

      newConstellations.push({
        id: i,
        name: shuffledNames[i % shuffledNames.length].name,
        zodiac: shuffledNames[i % shuffledNames.length].zodiac,
        starIds: selectedStarIds
      });
    }

    setStars(newStars);
    setConstellations(newConstellations);
  }, [setStars, setConstellations]);

  const initializeFireflies = useCallback((width: number, height: number) => {
    const fireflies: Firefly[] = [];
    const groundY = height * 0.7;

    for (let i = 0; i < CONFIG.FIREFLY_COUNT; i++) {
      fireflies.push({
        id: i,
        x: Math.random() * width,
        y: groundY + Math.random() * (height - groundY - 20),
        size: CONFIG.SIZES.FIREFLY_MIN + Math.random() * (CONFIG.SIZES.FIREFLY_MAX - CONFIG.SIZES.FIREFLY_MIN),
        opacity: CONFIG.SIZES.FIREFLY_OPACITY_MIN + Math.random() * (CONFIG.SIZES.FIREFLY_OPACITY_MAX - CONFIG.SIZES.FIREFLY_OPACITY_MIN),
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        blinkTimer: 0,
        blinkInterval: CONFIG.TIME.FIREFLY_BLINK_MIN + Math.random() * (CONFIG.TIME.FIREFLY_BLINK_MAX - CONFIG.TIME.FIREFLY_BLINK_MIN),
        isBlinking: true
      });
    }
    firefliesRef.current = fireflies;
  }, []);

  const initializeNebulae = useCallback((width: number, height: number) => {
    const nebulae: Nebula[] = [];
    const skyHeight = height * 0.75;
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      nebulae.push({
        id: i,
        x: Math.random() * width,
        y: Math.random() * skyHeight * 0.8,
        radiusX: 150 + Math.random() * 250,
        radiusY: 80 + Math.random() * 150,
        opacity: 0.1 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.0002,
        driftSpeed: 0.05 + Math.random() * 0.1,
        angle: Math.random() * Math.PI * 2
      });
    }
    nebulaeRef.current = nebulae;
  }, []);

  const spawnBurstParticles = useCallback((centerX: number, centerY: number) => {
    const colors = [CONFIG.COLORS.BURST_GOLD, CONFIG.COLORS.BURST_WHITE];
    const count = 10 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 40 + Math.random() * 80;
      burstParticlesRef.current.push({
        id: burstIdRef.current++,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.random() * 1,
        opacity: 1,
        life: 0,
        maxLife: CONFIG.BURST_PARTICLE_LIFE,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      initializeStars(dimensions.width, dimensions.height);
      initializeFireflies(dimensions.width, dimensions.height);
      initializeNebulae(dimensions.width, dimensions.height);
    }
  }, [dimensions, initializeStars, initializeFireflies, initializeNebulae]);

  useEffect(() => {
    if (hoveredConstellationId !== null && hoveredConstellationId !== lastHoveredRef.current) {
      const constellation = constellations.find(c => c.id === hoveredConstellationId);
      if (constellation && constellation.starIds.length > 0) {
        const centerStar = stars[constellation.starIds[Math.floor(constellation.starIds.length / 2)]];
        spawnBurstParticles(centerStar.x, centerStar.y);
      }
    }
    lastHoveredRef.current = hoveredConstellationId;
  }, [hoveredConstellationId, constellations, stars, spawnBurstParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const render = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0;
      const deltaMs = lastTimeRef.current ? currentTime - lastTimeRef.current : 0;
      lastTimeRef.current = currentTime;

      const { width, height } = dimensions;
      const groundY = height * 0.7;
      const skyHeight = groundY;

      const bgGradient = ctx.createLinearGradient(0, 0, 0, groundY);
      bgGradient.addColorStop(0, CONFIG.COLORS.BG_TOP);
      bgGradient.addColorStop(1, CONFIG.COLORS.BG_BOTTOM);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, groundY);

      const nebulaStart = hexToRgb(CONFIG.COLORS.NEBULA_COLOR_START);
      const nebulaEnd = hexToRgb(CONFIG.COLORS.NEBULA_COLOR_END);

      nebulaeRef.current.forEach(nebula => {
        nebula.rotation += nebula.rotationSpeed * deltaMs;
        nebula.angle += nebula.driftSpeed * deltaTime * 0.05;
        const driftX = Math.cos(nebula.angle) * 0.3;
        const driftY = Math.sin(nebula.angle * 0.7) * 0.2;
        nebula.x += driftX;
        nebula.y += driftY;

        if (nebula.x < -nebula.radiusX) nebula.x = width + nebula.radiusX;
        if (nebula.x > width + nebula.radiusX) nebula.x = -nebula.radiusX;
        if (nebula.y < -nebula.radiusY) nebula.y = skyHeight + nebula.radiusY;
        if (nebula.y > groundY + nebula.radiusY) nebula.y = -nebula.radiusY;

        ctx.save();
        ctx.translate(nebula.x, nebula.y);
        ctx.rotate(nebula.rotation);

        const nebulaGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(nebula.radiusX, nebula.radiusY));
        nebulaGradient.addColorStop(0, `rgba(${nebulaStart.r}, ${nebulaStart.g}, ${nebulaStart.b}, ${nebula.opacity})`);
        nebulaGradient.addColorStop(0.5, `rgba(${Math.floor((nebulaStart.r + nebulaEnd.r) / 2)}, ${Math.floor((nebulaStart.g + nebulaEnd.g) / 2)}, ${Math.floor((nebulaStart.b + nebulaEnd.b) / 2)}, ${nebula.opacity * 0.6})`);
        nebulaGradient.addColorStop(1, `rgba(${nebulaEnd.r}, ${nebulaEnd.g}, ${nebulaEnd.b}, 0)`);

        ctx.fillStyle = nebulaGradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, nebula.radiusX, nebula.radiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.fillStyle = CONFIG.COLORS.GROUND;
      ctx.fillRect(0, groundY, width, height - groundY);

      const time = currentTime / 1000;
      stars.forEach(star => {
        const breathScale = 1 + 0.3 * Math.sin(time * star.breathSpeed + star.breathPhase);
        const isHighlighted = hoveredConstellationId !== null && star.constellationId === hoveredConstellationId;
        const finalSize = star.size * breathScale * (isHighlighted ? CONFIG.SIZES.STAR_HIGHLIGHT_SCALE : 1);
        const alpha = 0.7 + 0.3 * Math.sin(time * star.breathSpeed + star.breathPhase);

        ctx.beginPath();
        ctx.arc(star.x, star.y, finalSize, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted 
          ? `rgba(255, 255, 200, ${alpha})` 
          : `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        if (isHighlighted) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, finalSize * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
          ctx.fill();
        }
      });

      constellations.forEach(constellation => {
        if (constellation.starIds.length < 2) return;

        const isHovered = constellation.id === hoveredConstellationId;
        const lineColor = isHovered ? CONFIG.COLORS.CONSTELLATION_LINE_HIGHLIGHT : CONFIG.COLORS.CONSTELLATION_LINE;
        const lineAlpha = isHovered ? CONFIG.SIZES.CONSTELLATION_LINE_HIGHLIGHT_ALPHA : CONFIG.SIZES.CONSTELLATION_LINE_ALPHA;
        const lineWidth = isHovered ? 2 : 1;

        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = lineAlpha;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        for (let i = 0; i < constellation.starIds.length - 1; i++) {
          const star1 = stars[constellation.starIds[i]];
          const star2 = stars[constellation.starIds[i + 1]];
          if (i === 0) {
            ctx.moveTo(star1.x, star1.y);
          }
          ctx.lineTo(star2.x, star2.y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (isHovered && constellation.starIds.length > 0) {
          const firstStar = stars[constellation.starIds[0]];
          ctx.font = '14px serif';
          ctx.fillStyle = CONFIG.COLORS.CONSTELLATION_TEXT;
          ctx.textAlign = 'center';
          
          const textY = firstStar.y - 25;
          ctx.fillText(`${constellation.name} · ${constellation.zodiac}`, firstStar.x, textY);
        }
      });

      burstParticlesRef.current = burstParticlesRef.current.filter(p => {
        p.life += deltaMs;
        if (p.life >= p.maxLife) return false;

        const progress = p.life / p.maxLife;
        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.opacity = 1 - progress;

        const rgb = hexToRgb(p.color);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2 * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${p.opacity * 0.3})`;
        ctx.fill();

        return true;
      });

      firefliesRef.current.forEach(firefly => {
        firefly.blinkTimer += deltaTime * 1000;
        if (firefly.blinkTimer >= firefly.blinkInterval) {
          firefly.blinkTimer = 0;
          firefly.isBlinking = !firefly.isBlinking;
          firefly.blinkInterval = CONFIG.TIME.FIREFLY_BLINK_MIN + Math.random() * (CONFIG.TIME.FIREFLY_BLINK_MAX - CONFIG.TIME.FIREFLY_BLINK_MIN);
        }

        firefly.x += firefly.vx;
        firefly.y += firefly.vy;

        if (firefly.x < 0) firefly.x = width;
        if (firefly.x > width) firefly.x = 0;
        if (firefly.y < groundY) firefly.vy = Math.abs(firefly.vy);
        if (firefly.y > height - 10) firefly.vy = -Math.abs(firefly.vy);

        if (Math.random() < 0.01) {
          firefly.vx = (Math.random() - 0.5) * 0.5;
          firefly.vy = (Math.random() - 0.5) * 0.3;
        }

        if (firefly.isBlinking) {
          const blinkAlpha = firefly.opacity * (0.5 + 0.5 * Math.sin(currentTime / 200));
          ctx.beginPath();
          ctx.arc(firefly.x, firefly.y, firefly.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 153, ${blinkAlpha})`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(firefly.x, firefly.y, firefly.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 153, ${blinkAlpha * 0.3})`;
          ctx.fill();
        }
      });

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationRef.current);
  }, [dimensions, stars, constellations, hoveredConstellationId]);

  const findConstellationAtPoint = useCallback((x: number, y: number): Constellation | null => {
    for (const constellation of constellations) {
      for (const starId of constellation.starIds) {
        const star = stars[starId];
        const distance = Math.sqrt((x - star.x) ** 2 + (y - star.y) ** 2);
        if (distance < 20) {
          return constellation;
        }
      }

      if (constellation.starIds.length >= 2) {
        for (let i = 0; i < constellation.starIds.length - 1; i++) {
          const star1 = stars[constellation.starIds[i]];
          const star2 = stars[constellation.starIds[i + 1]];
          
          const lineLen = Math.sqrt((star2.x - star1.x) ** 2 + (star2.y - star1.y) ** 2);
          if (lineLen === 0) continue;
          
          const t = Math.max(0, Math.min(1, ((x - star1.x) * (star2.x - star1.x) + (y - star1.y) * (star2.y - star1.y)) / (lineLen * lineLen)));
          const projX = star1.x + t * (star2.x - star1.x);
          const projY = star1.y + t * (star2.y - star1.y);
          const distToLine = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
          
          if (distToLine < 10) {
            return constellation;
          }
        }
      }
    }
    return null;
  }, [constellations, stars]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const constellation = findConstellationAtPoint(x, y);
    setHoveredConstellationId(constellation ? constellation.id : null);
    canvas.style.cursor = constellation ? (canDivinate ? 'pointer' : 'not-allowed') : 'default';
  }, [findConstellationAtPoint, canDivinate]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDivinate) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const constellation = findConstellationAtPoint(x, y);
    if (constellation) {
      if (constellation.starIds.length > 0) {
        const centerStar = stars[constellation.starIds[Math.floor(constellation.starIds.length / 2)]];
        spawnBurstParticles(centerStar.x, centerStar.y);
      }
      onConstellationClick(constellation);
    }
  }, [findConstellationAtPoint, onConstellationClick, canDivinate, stars, spawnBurstParticles]);

  const handleMouseLeave = useCallback(() => {
    setHoveredConstellationId(null);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default GameBoard;
