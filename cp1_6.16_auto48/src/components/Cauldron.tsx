import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrewingState, Material, mixColorWithHeat, getBubbleSpeed } from '../gameLogic';
import { SplashParticle, VortexParticle, SmokeParticle, GlowFlash } from '../types';

interface CauldronProps {
  brewingState: BrewingState;
  materials: Material[];
  onDrop: (materialId: string, x: number, y: number) => void;
  onStir: () => void;
  onHeatChange: (heat: number) => void;
  onBottle: () => void;
  onReset: () => void;
  onNewRecipe: () => void;
  splashParticles: SplashParticle[];
  vortexParticles: VortexParticle[];
  smokeParticles: SmokeParticle[];
  glowFlashes: GlowFlash[];
  isBrewing: boolean;
  showResult: boolean;
  lastResult: { success: boolean; quality: number; feedback: string } | null;
  bottleFlash: boolean;
  potionGlow: boolean;
  canStart: boolean;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  startY: number;
  endY: number;
  initialRadius: number;
  maxRadius: number;
  currentRadius: number;
  speed: number;
  initialAlpha: number;
  currentAlpha: number;
  wobble: number;
  wobbleSpeed: number;
  wobbleAmplitude: number;
  phase: 'rising' | 'popping';
  popLife: number;
  popMaxLife: number;
}

interface FlameParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  startSize: number;
  life: number;
  maxLife: number;
  colorPhase: number;
  wobbleOffset: number;
  wobbleSpeed: number;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInQuad(t: number): number {
  return t * t;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

const Cauldron: React.FC<CauldronProps> = ({
  brewingState,
  materials,
  onDrop,
  onStir,
  onHeatChange,
  onBottle,
  onReset,
  onNewRecipe,
  splashParticles,
  vortexParticles,
  smokeParticles,
  glowFlashes,
  isBrewing,
  showResult,
  lastResult,
  bottleFlash,
  potionGlow,
  canStart
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStirring, setIsStirring] = useState(false);
  const [stirPositions, setStirPositions] = useState<{ x: number; y: number; time: number }[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [flameParticles, setFlameParticles] = useState<FlameParticle[]>([]);
  const animationRef = useRef<number>();
  const lastBubbleTime = useRef<number>(0);
  const lastFlameTime = useRef<number>(0);
  const bubbleIdCounter = useRef<number>(0);
  const flameIdCounter = useRef<number>(0);

  const liquidColor = mixColorWithHeat(
    brewingState.addedMaterials,
    brewingState.currentHeat,
    materials
  );

  const bubbleSpeed = getBubbleSpeed(brewingState.currentHeat);
  const heat = brewingState.currentHeat;

  const getFireLevel = (): 'small' | 'medium' | 'large' | 'none' => {
    if (heat === 0) return 'none';
    if (heat <= 3) return 'small';
    if (heat <= 7) return 'medium';
    return 'large';
  };

  const getFireSpawnConfig = () => {
    const level = getFireLevel();
    switch (level) {
      case 'small':
        return {
          spawnInterval: 150,
          particlesPerSpawn: 1,
          maxParticles: 15,
          baseSize: 4,
          sizeVariation: 4,
          spreadX: 30,
          baseSpeed: 0.8,
          speedVariation: 0.5,
          baseLife: 25,
          lifeVariation: 15
        };
      case 'medium':
        return {
          spawnInterval: 60,
          particlesPerSpawn: 2,
          maxParticles: 35,
          baseSize: 7,
          sizeVariation: 6,
          spreadX: 60,
          baseSpeed: 1.5,
          speedVariation: 1,
          baseLife: 35,
          lifeVariation: 20
        };
      case 'large':
        return {
          spawnInterval: 25,
          particlesPerSpawn: 4,
          maxParticles: 70,
          baseSize: 12,
          sizeVariation: 10,
          spreadX: 100,
          baseSpeed: 2.5,
          speedVariation: 1.5,
          baseLife: 45,
          lifeVariation: 25
        };
      default:
        return {
          spawnInterval: 9999,
          particlesPerSpawn: 0,
          maxParticles: 0,
          baseSize: 0,
          sizeVariation: 0,
          spreadX: 0,
          baseSpeed: 0,
          speedVariation: 0,
          baseLife: 0,
          lifeVariation: 0
        };
    }
  };

  const getFlameColor = (colorPhase: number, alpha: number): { inner: string; outer: string } => {
    const level = getFireLevel();
    
    if (level === 'small') {
      const r = Math.round(100 + colorPhase * 50);
      const g = Math.round(180 + colorPhase * 40);
      const b = Math.round(255 - colorPhase * 50);
      return {
        inner: `rgba(${r}, ${g}, ${b}, ${alpha})`,
        outer: `rgba(${r}, ${g}, ${b}, 0)`
      };
    } else if (level === 'medium') {
      const r = 255;
      const g = Math.round(200 - colorPhase * 100);
      const b = Math.round(100 - colorPhase * 80);
      return {
        inner: `rgba(${r}, ${g}, ${Math.max(0, b)}, ${alpha})`,
        outer: `rgba(${r}, ${g}, ${Math.max(0, b)}, 0)`
      };
    } else {
      const r = 255;
      const g = Math.round(120 + colorPhase * 80);
      const b = Math.round(30 + colorPhase * 20);
      return {
        inner: `rgba(${r}, ${Math.max(0, g)}, ${b}, ${alpha})`,
        outer: `rgba(${r}, ${Math.max(0, g)}, ${b}, 0)`
      };
    }
  };

  useEffect(() => {
    if (!isBrewing || brewingState.addedMaterials.length === 0 || getFireLevel() === 'none') {
      setFlameParticles([]);
      return;
    }

    const config = getFireSpawnConfig();
    const centerX = 200;
    const baseY = 355;

    const spawnFlame = () => {
      const now = Date.now();
      
      if (now - lastFlameTime.current > config.spawnInterval) {
        lastFlameTime.current = now;
        
        const newParticles: FlameParticle[] = [];
        for (let i = 0; i < config.particlesPerSpawn; i++) {
          const life = config.baseLife + Math.random() * config.lifeVariation;
          
          newParticles.push({
            id: flameIdCounter.current++,
            x: centerX + (Math.random() - 0.5) * config.spreadX * 2,
            y: baseY + Math.random() * 15,
            vx: (Math.random() - 0.5) * 0.8,
            vy: -(config.baseSpeed + Math.random() * config.speedVariation),
            size: config.baseSize + Math.random() * config.sizeVariation,
            startSize: config.baseSize + Math.random() * config.sizeVariation,
            life,
            maxLife: life,
            colorPhase: Math.random(),
            wobbleOffset: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.08 + Math.random() * 0.08
          });
        }

        setFlameParticles(prev => 
          prev.concat(newParticles).slice(-config.maxParticles)
        );
      }
    };

    const interval = setInterval(spawnFlame, 16);
    return () => clearInterval(interval);
  }, [isBrewing, brewingState.addedMaterials.length, heat]);

  useEffect(() => {
    if (flameParticles.length === 0) return;

    const animateFlames = () => {
      setFlameParticles(prev => 
        prev
          .map(p => {
            const lifeRatio = p.life / p.maxLife;
            const wobble = Math.sin(Date.now() / 120 + p.wobbleOffset) * p.wobbleSpeed * 3;
            
            const sizeRatio = lifeRatio < 0.3
              ? lifeRatio / 0.3
              : 1 - ((lifeRatio - 0.3) / 0.7) * 0.4;
            
            return {
              ...p,
              x: p.x + p.vx + wobble,
              y: p.y + p.vy,
              vy: p.vy * 0.995,
              size: p.startSize * sizeRatio,
              colorPhase: (p.colorPhase + 0.02) % 1,
              life: p.life - 1
            };
          })
          .filter(p => p.life > 0)
      );
    };

    const interval = setInterval(animateFlames, 16);
    return () => clearInterval(interval);
  }, [flameParticles.length]);

  useEffect(() => {
    if (!isBrewing || brewingState.addedMaterials.length === 0) {
      setBubbles([]);
      return;
    }

    const spawnBubble = () => {
      const now = Date.now();
      const spawnInterval = bubbleSpeed / 3;
      
      if (now - lastBubbleTime.current > spawnInterval) {
        lastBubbleTime.current = now;
        
        const startY = 295 + Math.random() * 25;
        const endY = 120 + Math.random() * 50;
        const initialRadius = 2 + Math.random() * 3;
        const maxRadius = 8 + Math.random() * 10;
        const initialAlpha = 0.2 + Math.random() * 0.2;
        
        const newBubble: Bubble = {
          id: bubbleIdCounter.current++,
          x: 80 + Math.random() * 240,
          y: startY,
          startY,
          endY,
          initialRadius,
          maxRadius,
          currentRadius: initialRadius,
          speed: 0.8 + Math.random() * 1.2 + (heat / 10) * 2,
          initialAlpha,
          currentAlpha: initialAlpha,
          wobble: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.03 + Math.random() * 0.04,
          wobbleAmplitude: 4 + Math.random() * 6,
          phase: 'rising',
          popLife: 0,
          popMaxLife: 10
        };
        setBubbles(prev => 
          prev.concat(newBubble).slice(-45)
        );
      }
    };

    const interval = setInterval(spawnBubble, 40);
    return () => clearInterval(interval);
  }, [isBrewing, brewingState.addedMaterials.length, heat, bubbleSpeed]);

  useEffect(() => {
    if (bubbles.length === 0) return;

    const animateBubbles = () => {
      setBubbles(prev => 
        prev
          .map(b => {
            if (b.phase === 'rising') {
              const totalDistance = b.startY - b.endY;
              const traveledDistance = b.startY - b.y;
              const progress = Math.max(0, Math.min(1, traveledDistance / totalDistance));
              
              let radiusProgress: number;
              if (progress < 0.6) {
                radiusProgress = easeOutQuad(progress / 0.6);
              } else {
                radiusProgress = 1 - easeInQuad((progress - 0.6) / 0.4) * 0.6;
              }
              const newRadius = b.initialRadius + (b.maxRadius - b.initialRadius) * radiusProgress;
              
              let alphaProgress: number;
              if (progress < 0.15) {
                alphaProgress = easeInQuad(progress / 0.15);
              } else if (progress < 0.6) {
                alphaProgress = 1.0;
              } else {
                alphaProgress = 1 - easeInQuad((progress - 0.6) / 0.4) * 0.7;
              }
              const newAlpha = (0.4 + b.initialAlpha) * alphaProgress;
              
              const wobbleOffset = Math.sin(b.wobble) * b.wobbleAmplitude * 0.5;
              const newX = b.x + Math.sin(b.wobble) * 0.6;
              const newY = b.y - b.speed;
              
              if (newY <= b.endY) {
                return {
                  ...b,
                  y: b.endY,
                  phase: 'popping' as const,
                  popLife: b.popMaxLife,
                  currentRadius: newRadius,
                  currentAlpha: newAlpha
                };
              }
              
              return {
                ...b,
                x: newX + wobbleOffset,
                y: newY,
                wobble: b.wobble + b.wobbleSpeed,
                currentRadius: newRadius,
                currentAlpha: newAlpha
              };
            } else {
              const popProgress = 1 - b.popLife / b.popMaxLife;
              const popSizeMultiplier = 1 - easeInQuad(popProgress) * 0.8;
              const popAlphaMultiplier = 1 - easeOutQuad(popProgress);
              
              return {
                ...b,
                currentRadius: b.currentRadius * popSizeMultiplier,
                currentAlpha: b.currentAlpha * popAlphaMultiplier,
                popLife: b.popLife - 1
              };
            }
          })
          .filter(b => b.phase === 'rising' || b.popLife > 0)
      );
    };

    const interval = setInterval(animateBubbles, 16);
    return () => clearInterval(interval);
  }, [bubbles.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      if (getFireLevel() !== 'none') {
        const level = getFireLevel();
        let glowAlpha = 0;
        let glowColor = '';
        
        if (level === 'small') {
          glowAlpha = 0.15;
          glowColor = '100, 180, 255';
        } else if (level === 'medium') {
          glowAlpha = 0.3;
          glowColor = '255, 150, 50';
        } else {
          glowAlpha = 0.5;
          glowColor = '255, 80, 20';
        }
        
        const glowGradient = ctx.createRadialGradient(
          centerX, 355, 0,
          centerX, 355, 130 + heat * 6
        );
        glowGradient.addColorStop(0, `rgba(${glowColor}, ${glowAlpha})`);
        glowGradient.addColorStop(1, `rgba(${glowColor}, 0)`);
        
        ctx.beginPath();
        ctx.ellipse(centerX, 355, 130 + heat * 6, 55 + heat * 3, 0, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        flameParticles.forEach(particle => {
          const lifeRatio = particle.life / particle.maxLife;
          const alpha = lifeRatio * 0.8;
          
          const colors = getFlameColor(particle.colorPhase, alpha);
          
          const gradient = ctx.createRadialGradient(
            particle.x, particle.y, 0,
            particle.x, particle.y, particle.size
          );
          
          gradient.addColorStop(0, colors.inner);
          gradient.addColorStop(0.5, colors.inner);
          gradient.addColorStop(1, colors.outer);
          
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        });
      }

      if (isBrewing && brewingState.addedMaterials.length > 0) {
        const gradient = ctx.createRadialGradient(
          centerX, centerY + 20, 0,
          centerX, centerY + 20, 160
        );
        
        const [r, g, b] = hexToRgb(liquidColor);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
        gradient.addColorStop(0.7, `rgba(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)}, 0.85)`);
        gradient.addColorStop(1, `rgba(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}, 0.8)`);

        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 30, 150, 80, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        const time = Date.now() / 1000;
        const waveAmplitude = 3 + heat * 0.5;
        const waveFrequency = 0.02 + heat * 0.005;

        ctx.beginPath();
        ctx.moveTo(centerX - 150, centerY);
        for (let x = -150; x <= 150; x += 5) {
          const y = centerY + Math.sin((x + time * 100) * waveFrequency) * waveAmplitude;
          ctx.lineTo(centerX + x, y);
        }
        ctx.lineTo(centerX + 150, centerY + 80);
        ctx.lineTo(centerX - 150, centerY + 80);
        ctx.closePath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.75)`;
        ctx.fill();

        if (potionGlow) {
          const glowPulse = 0.5 + Math.sin(time * 2) * 0.5;
          ctx.save();
          ctx.shadowColor = '#9B59B6';
          ctx.shadowBlur = 20 + glowPulse * 20;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY + 30, 145, 75, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(155, 89, 182, ${0.1 + glowPulse * 0.2})`;
          ctx.fill();
          ctx.restore();
        }

        bubbles.forEach(bubble => {
          if (bubble.currentAlpha <= 0) return;
          
          ctx.beginPath();
          ctx.arc(bubble.x, bubble.y, bubble.currentRadius, 0, Math.PI * 2);
          
          const bubbleGradient = ctx.createRadialGradient(
            bubble.x - bubble.currentRadius * 0.35, 
            bubble.y - bubble.currentRadius * 0.35, 
            0,
            bubble.x, 
            bubble.y, 
            bubble.currentRadius
          );
          bubbleGradient.addColorStop(0, `rgba(255, 255, 255, ${bubble.currentAlpha * 0.9})`);
          bubbleGradient.addColorStop(0.4, `rgba(255, 255, 255, ${bubble.currentAlpha * 0.4})`);
          bubbleGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
          
          ctx.fillStyle = bubbleGradient;
          ctx.fill();
          
          if (bubble.phase === 'popping') {
            const popProgress = 1 - bubble.popLife / bubble.popMaxLife;
            ctx.strokeStyle = `rgba(255, 255, 255, ${bubble.currentAlpha * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.currentRadius, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      } else {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 30, 150, 80, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
        ctx.fill();
      }

      glowFlashes.forEach(flash => {
        const progress = 1 - flash.life / flash.maxLife;
        const currentRadius = flash.maxRadius * easeOutQuad(progress);
        const alpha = (1 - progress) * 0.9;
        
        const glowGradient = ctx.createRadialGradient(
          flash.x, flash.y, 0,
          flash.x, flash.y, currentRadius
        );
        
        const [fr, fg, fb] = hexToRgb(flash.color);
        glowGradient.addColorStop(0, `rgba(${fr}, ${fg}, ${fb}, ${alpha})`);
        glowGradient.addColorStop(0.3, `rgba(${fr}, ${fg}, ${fb}, ${alpha * 0.6})`);
        glowGradient.addColorStop(0.6, `rgba(${fr}, ${fg}, ${fb}, ${alpha * 0.2})`);
        glowGradient.addColorStop(1, `rgba(${fr}, ${fg}, ${fb}, 0)`);
        
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        ctx.save();
        ctx.shadowColor = flash.color;
        ctx.shadowBlur = 20 * (1 - progress);
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
        ctx.restore();
      });

      splashParticles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      vortexParticles.forEach(p => {
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + 30 + Math.sin(p.angle) * p.radius * 0.5;
        const alpha = p.life / 60;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });

      smokeParticles.forEach(p => {
        ctx.beginPath();
        ctx.arc(centerX - 50 + p.x, centerY - 100 + p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80, 80, 80, ${p.alpha * (p.life / 60)})`;
        ctx.fill();
      });

      if (bottleFlash) {
        const flashIntensity = Math.sin(Date.now() / 50) * 0.5 + 0.5;
        ctx.save();
        ctx.shadowColor = '#D4AC0D';
        ctx.shadowBlur = 30 + flashIntensity * 30;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 180, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 172, 13, ${0.1 + flashIntensity * 0.3})`;
        ctx.fill();
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isBrewing, brewingState.addedMaterials, heat, liquidColor, bubbles, flameParticles, glowFlashes, splashParticles, vortexParticles, smokeParticles, bottleFlash, potionGlow]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isBrewing) return;
    setIsStirring(true);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setStirPositions([{
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        time: Date.now()
      }]);
    }
  }, [isBrewing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isStirring || !isBrewing) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const now = Date.now();

    setStirPositions(prev => {
      const newPositions = prev.concat({ x, y, time: now });
      if (newPositions.length > 10) {
        newPositions.shift();
      }
      
      if (newPositions.length >= 5) {
        const firstPos = newPositions[0];
        const lastPos = newPositions[newPositions.length - 1];
        const timeDiff = lastPos.time - firstPos.time;
        
        if (timeDiff > 100 && timeDiff < 1000) {
          const centerX = 200;
          const centerY = 200;
          
          let totalAngle = 0;
          for (let i = 1; i < newPositions.length; i++) {
            const prevPos = newPositions[i - 1];
            const curr = newPositions[i];
            const angle1 = Math.atan2(prevPos.y - centerY, prevPos.x - centerX);
            const angle2 = Math.atan2(curr.y - centerY, curr.x - centerX);
            let diff = angle2 - angle1;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;
            totalAngle += diff;
          }
          
          if (Math.abs(totalAngle) > Math.PI * 0.8) {
            onStir();
            return [];
          }
        }
      }
      
      return newPositions;
    });
  }, [isStirring, isBrewing, onStir]);

  const handleMouseUp = useCallback(() => {
    setIsStirring(false);
    setStirPositions([]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const materialId = e.dataTransfer.getData('materialId');
    if (materialId && isBrewing) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        onDrop(materialId, e.clientX - rect.left, e.clientY - rect.top);
      }
    }
  }, [isBrewing, onDrop]);

  const handleMouseUpGlobal = useCallback((e: React.MouseEvent) => {
    if (!isBrewing) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 50 && x <= 350 && y >= 100 && y <= 320) {
      const centerX = 200;
      const centerY = 200;
      const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      if (distance < 150) {
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        const materialCard = targetElement?.closest('.material-card');
        if (materialCard) {
          const materialId = materialCard.getAttribute('data-material-id');
          if (materialId) {
            onDrop(materialId, x, y);
          }
        }
      }
    }
  }, [isBrewing, onDrop]);

  const hasMaterials = brewingState.addedMaterials.length > 0;
  const totalAmount = brewingState.addedMaterials.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div 
      className="cauldron-container"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`cauldron-body ${isStirring ? 'stirring' : ''} ${bottleFlash ? 'flashing' : ''}`}>
        <div className="cauldron-rim" />
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="cauldron-canvas"
        />
        <div className="cauldron-base" />
        <div className="cauldron-handles">
          <div className="handle left" />
          <div className="handle right" />
        </div>
      </div>

      <div className="brewing-info">
        <div className="info-row">
          <span className="info-label">🔥 火候：</span>
          <span className="info-value">{brewingState.currentHeat} / 10</span>
        </div>
        <div className="info-row">
          <span className="info-label">🥄 搅拌：</span>
          <span className="info-value">{brewingState.stirCount} 次</span>
        </div>
        <div className="info-row">
          <span className="info-label">🧪 材料：</span>
          <span className="info-value">{totalAmount} 份</span>
        </div>
        {potionGlow && (
          <div className="glow-indicator">✨ 配比正确！</div>
        )}
      </div>

      <div className="heat-control">
        <label className="heat-label">🔥 火候控制</label>
        <input
          type="range"
          min="0"
          max="10"
          value={brewingState.currentHeat}
          onChange={(e) => onHeatChange(parseInt(e.target.value))}
          className="heat-slider"
          disabled={!isBrewing}
        />
        <div className="heat-scale">
          {Array.from({ length: 11 }).map((_, i) => (
            <span 
              key={i} 
              className={`heat-mark ${i <= brewingState.currentHeat ? 'active' : ''}`}
            >
              {i}
            </span>
          ))}
        </div>
      </div>

      <div className="action-buttons">
        {!isBrewing && !showResult && (
          <button 
            className="magic-btn primary"
            onClick={onNewRecipe}
            disabled={!canStart}
          >
            📜 获取新配方
          </button>
        )}
        {isBrewing && (
          <>
            <button 
              className="magic-btn success"
              onClick={onBottle}
              disabled={!hasMaterials}
            >
              🍶 装瓶
            </button>
            <button 
              className="magic-btn secondary"
              onClick={onReset}
            >
              🔄 重置
            </button>
          </>
        )}
        {showResult && (
          <button 
            className="magic-btn primary"
            onClick={onNewRecipe}
          >
            📜 下一个配方
          </button>
        )}
      </div>

      <p className="hint">
        {isBrewing 
          ? '拖拽材料到坩埚中，用鼠标在坩埚上画圈搅拌' 
          : '点击获取新配方开始酿造'
        }
      </p>
    </div>
  );
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

export default Cauldron;
