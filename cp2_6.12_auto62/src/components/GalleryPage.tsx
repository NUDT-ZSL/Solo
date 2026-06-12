import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';
import { CARDS, CardData, RARITY_CONFIG, Rarity } from '../data/cards';
import { FrameRateController, easeOutElastic, easeOutCubic, randomRange, sineWave } from '../utils/animation';
import { Particle } from '../types';
import { canUnlockCard } from '../utils/storage';

interface UnlockAnimation {
  cardId: string;
  startTime: number;
}

const GALLERY_COLUMNS_DESKTOP = 5;
const GALLERY_COLUMNS_MOBILE = 3;
const MOBILE_BREAKPOINT = 768;

const GalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    progress,
    refreshGalleryViews,
    tryUnlockCard,
    setSelectedBattleCard
  } = useGame();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frcRef = useRef<FrameRateController | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const unlockAnimsRef = useRef<UnlockAnimation[]>([]);
  const animTimeRef = useRef<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [showDailyTasks, setShowDailyTasks] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    refreshGalleryViews();
  }, [refreshGalleryViews]);

  const getGridConfig = useCallback(() => {
    const columns = isMobile ? GALLERY_COLUMNS_MOBILE : GALLERY_COLUMNS_DESKTOP;
    const gapPercent = 2;
    const totalGapPercent = (columns - 1) * gapPercent;
    const cardWidthPercent = (100 - totalGapPercent) / columns;
    return { columns, gapPercent, cardWidthPercent };
  }, [isMobile]);

  const createUnlockParticles = useCallback((centerX: number, centerY: number) => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB', '#FF9FF3'];
    for (let i = 0; i < 60; i++) {
      const angle = (Math.PI * 2 * i) / 60 + randomRange(-0.3, 0.3);
      const speed = randomRange(3, 10);
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(3, 8),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 1000
      });
    }
    const edgeColors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#F1C40F', '#E74C3C'];
    for (let i = 0; i < 40; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx = 0, sy = 0;
      const w = typeof window !== 'undefined' ? window.innerWidth : 800;
      const h = typeof window !== 'undefined' ? window.innerHeight : 600;
      if (edge === 0) { sx = Math.random() * w; sy = 0; }
      else if (edge === 1) { sx = w; sy = Math.random() * h; }
      else if (edge === 2) { sx = Math.random() * w; sy = h; }
      else { sx = 0; sy = Math.random() * h; }
      const angle = Math.atan2(h / 2 - sy, w / 2 - sx) + randomRange(-0.5, 0.5);
      const speed = randomRange(1.5, 4);
      particlesRef.current.push({
        x: sx,
        y: sy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: randomRange(2, 5),
        color: edgeColors[Math.floor(Math.random() * edgeColors.length)],
        life: 0,
        maxLife: 1200
      });
    }
  }, []);

  const handleUnlock = useCallback((card: CardData, canvasX: number, canvasY: number) => {
    if (!canUnlockCard(progress, card.id)) return;
    const success = tryUnlockCard(card.id);
    if (success) {
      unlockAnimsRef.current.push({
        cardId: card.id,
        startTime: performance.now()
      });
      createUnlockParticles(canvasX, canvasY);
      setJustUnlocked(card.id);
      setTimeout(() => setJustUnlocked(null), 1500);
    }
  }, [progress, tryUnlockCard, createUnlockParticles]);

  const drawCard = useCallback((
    ctx: CanvasRenderingContext2D,
    card: CardData,
    x: number,
    y: number,
    width: number,
    height: number,
    unlocked: boolean,
    fragmentsCount: number,
    canUnlock: boolean,
    hovered: boolean,
    unlockProgress: number,
    time: number,
    canvasScale: number
  ) => {
    const rarityConfig = RARITY_CONFIG[card.rarity];
    const floatY = sineWave(time / 1000 + (x + y) * 0.001, 3, 2, 0);
    const drawX = x;
    const drawY = y + floatY * canvasScale;
    const scale = hovered ? 1.02 : 1;
    const unlockScale = unlockProgress > 0 ? easeOutElastic(unlockProgress) : 1;
    const finalScale = scale * unlockScale;
    const cx = drawX + width / 2;
    const cy = drawY + height / 2;
    const cardW = width * finalScale;
    const cardH = height * finalScale;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;
    const radius = 8 * canvasScale;
    const borderWidth = (hovered ? 4 : 3) * canvasScale;

    ctx.save();
    ctx.shadowColor = hovered ? rarityConfig.shadowColor : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = hovered ? 25 : 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4 * canvasScale;

    const bgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    bgGrad.addColorStop(0, 'rgba(30, 40, 70, 0.85)');
    bgGrad.addColorStop(1, 'rgba(20, 28, 50, 0.9)');
    roundRect(ctx, cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, rarityConfig.borderColors[0]);
    borderGrad.addColorStop(0.5, card.color);
    borderGrad.addColorStop(1, rarityConfig.borderColors[1]);
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = borderWidth;
    roundRect(ctx, cardX + borderWidth / 2, cardY + borderWidth / 2,
      cardW - borderWidth, cardH - borderWidth, radius - borderWidth / 2);
    ctx.stroke();

    if (!unlocked && unlockProgress <= 0) {
      ctx.save();
      roundRect(ctx, cardX + borderWidth, cardY + borderWidth,
        cardW - borderWidth * 2, cardH - borderWidth * 2, radius - borderWidth);
      ctx.clip();
      const lockGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
      lockGrad.addColorStop(0, 'rgba(80,80,100,0.9)');
      lockGrad.addColorStop(1, 'rgba(50,50,70,0.95)');
      ctx.fillStyle = lockGrad;
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.fillStyle = 'rgba(200,200,220,0.15)';
      ctx.font = `bold ${cardH * 0.28}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', cx, cy - cardH * 0.1);
      ctx.fillStyle = '#888';
      ctx.font = `${cardH * 0.09}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(card.name, cx, cy + cardH * 0.2);
      ctx.fillStyle = canUnlock ? '#FFD700' : '#666';
      ctx.font = `${cardH * 0.07}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(
        `${fragmentsCount}/${card.fragmentsRequired} 碎片`,
        cx,
        cy + cardH * 0.35
      );
      if (canUnlock) {
        const pulse = 0.5 + 0.5 * Math.sin(time / 200);
        ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2 * canvasScale;
        roundRect(ctx, cardX + borderWidth * 1.5, cardY + borderWidth * 1.5,
          cardW - borderWidth * 3, cardH - borderWidth * 3, radius - borderWidth * 1.5);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const imageAreaX = cardX + cardW * 0.1;
      const imageAreaY = cardY + cardH * 0.08;
      const imageAreaW = cardW * 0.8;
      const imageAreaH = cardH * 0.5;
      const imgRadius = 6 * canvasScale;
      const imgGrad = ctx.createRadialGradient(
        imageAreaX + imageAreaW / 2, imageAreaY + imageAreaH / 2, 0,
        imageAreaX + imageAreaW / 2, imageAreaY + imageAreaH / 2, imageAreaW * 0.8
      );
      imgGrad.addColorStop(0, card.color + '55');
      imgGrad.addColorStop(1, card.color + '11');
      roundRect(ctx, imageAreaX, imageAreaY, imageAreaW, imageAreaH, imgRadius);
      ctx.fillStyle = imgGrad;
      ctx.fill();
      ctx.font = `bold ${imageAreaH * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.emoji, imageAreaX + imageAreaW / 2, imageAreaY + imageAreaH / 2);
      const titleY = imageAreaY + imageAreaH + cardH * 0.06;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${cardH * 0.1}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(card.name, cx, titleY);
      const rarityLabelY = titleY + cardH * 0.06;
      ctx.font = `${cardH * 0.055}px -apple-system, BlinkMacSystemFont, sans-serif`;
      const rarityColors: Record<Rarity, string> = {
        common: '#C0C0C0',
        rare: '#FFD700',
        legendary: '#9B59B6'
      };
      ctx.fillStyle = rarityColors[card.rarity];
      ctx.fillText(`◆ ${rarityConfig.label}`, cx, rarityLabelY);
      const statsY = rarityLabelY + cardH * 0.08;
      const statFontSize = cardH * 0.065;
      ctx.font = `${statFontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#FF6B6B';
      ctx.fillText(`⚔ ${card.attack}`, cx - cardW * 0.28, statsY);
      ctx.fillStyle = '#4ECDC4';
      ctx.fillText(`🛡 ${card.defense}`, cx, statsY);
      ctx.fillStyle = '#69DB7C';
      ctx.fillText(`❤ ${card.hp}`, cx + cardW * 0.28, statsY);
    }
    ctx.restore();
  }, []);

  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ) => {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let hoveredCardIdx: number | null = null;
    let canvasWidth = 0, canvasHeight = 0, canvasScale = 1;
    const cardPositions: { x: number; y: number; w: number; h: number; card: CardData }[] = [];

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvasWidth = rect.width;
      canvasHeight = Math.max(rect.height, 800);
      canvas.width = canvasWidth * dpr;
      canvas.height = canvasHeight * dpr;
      canvas.style.width = canvasWidth + 'px';
      canvas.style.height = canvasHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cardPositions.length = 0;
      const { columns, gapPercent, cardWidthPercent } = getGridConfig();
      const gapPx = (canvasWidth * gapPercent) / 100;
      const padding = canvasWidth * 0.05;
      const usableWidth = canvasWidth - padding * 2;
      const cardWidth = (usableWidth - gapPx * (columns - 1)) / columns;
      const aspectRatio = 3 / 4;
      const cardHeight = cardWidth / aspectRatio;
      const minCardWidth = isMobile ? 80 : 100;
      const finalCardWidth = Math.max(cardWidth, minCardWidth);
      const finalCardHeight = finalCardWidth / aspectRatio;
      const finalColumns = finalCardWidth === minCardWidth
        ? Math.floor((canvasWidth - padding * 2 + gapPx) / (minCardWidth + gapPx))
        : columns;
      const actualPadding = (canvasWidth - (finalColumns * finalCardWidth + (finalColumns - 1) * gapPx)) / 2;
      CARDS.forEach((card, index) => {
        const col = index % finalColumns;
        const row = Math.floor(index / finalColumns);
        const x = actualPadding + col * (finalCardWidth + gapPx);
        const y = 80 + row * (finalCardHeight + gapPx * 1.5);
        cardPositions.push({ x, y, w: finalCardWidth, h: finalCardHeight, card });
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      hoveredCardIdx = null;
      for (let i = cardPositions.length - 1; i >= 0; i--) {
        const pos = cardPositions[i];
        if (mx >= pos.x && mx <= pos.x + pos.w &&
            my >= pos.y && my <= pos.y + pos.h) {
          hoveredCardIdx = i;
          canvas.style.cursor = 'pointer';
          break;
        }
      }
      if (hoveredCardIdx === null) {
        canvas.style.cursor = 'default';
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      for (let i = cardPositions.length - 1; i >= 0; i--) {
        const pos = cardPositions[i];
        if (mx >= pos.x && mx <= pos.x + pos.w &&
            my >= pos.y && my <= pos.y + pos.h) {
          const card = pos.card;
          const unlocked = progress.unlockedCards.includes(card.id);
          const fragmentsCount = progress.fragments[card.id] || 0;
          if (!unlocked && canUnlockCard(progress, card.id)) {
            handleUnlock(card, pos.x + pos.w / 2, pos.y + pos.h / 2);
          } else if (unlocked) {
            setSelectedCard(card);
          } else {
            setSelectedCard(card);
          }
          break;
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    frcRef.current = new FrameRateController(60);
    frcRef.current.onFrame((deltaTime: number) => {
      animTimeRef.current += deltaTime;
      const time = animTimeRef.current;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += deltaTime;
        if (p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx * (deltaTime / 16);
        p.y += p.vy * (deltaTime / 16);
        p.vy += 0.05 * (deltaTime / 16);
        const alpha = 1 - p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      cardPositions.forEach((pos, index) => {
        const unlocked = progress.unlockedCards.includes(pos.card.id);
        const fragmentsCount = progress.fragments[pos.card.id] || 0;
        let unlockProgress = 0;
        for (const ua of unlockAnimsRef.current) {
          if (ua.cardId === pos.card.id) {
            unlockProgress = Math.min(1, (time - ua.startTime) / 500);
            break;
          }
        }
        if (unlockProgress >= 1) {
          unlockAnimsRef.current = unlockAnimsRef.current.filter(ua => ua.cardId !== pos.card.id);
        }
        drawCard(
          ctx,
          pos.card,
          pos.x,
          pos.y,
          pos.w,
          pos.h,
          unlocked,
          fragmentsCount,
          canUnlockCard(progress, pos.card.id),
          hoveredCardIdx === index,
          unlockProgress,
          time,
          1
        );
      });
    });
    frcRef.current.start();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      frcRef.current?.stop();
    };
  }, [progress, drawCard, getGridConfig, handleUnlock, isMobile]);

  const handleStartBattle = () => {
    if (selectedCard && progress.unlockedCards.includes(selectedCard.id)) {
      setSelectedBattleCard(selectedCard);
      navigate('/battle');
    }
  };

  const handleClaimTaskReward = (taskId: string) => {
    // Already handled in storage
  };

  const columns = isMobile ? GALLERY_COLUMNS_MOBILE : GALLERY_COLUMNS_DESKTOP;
  const unlockedCount = progress.unlockedCards.length;
  const totalCount = CARDS.length;

  return (
    <div style={{ minHeight: '100%', padding: isMobile ? '12px' : '24px', position: 'relative' }}>
      <div style={headerStyle(isMobile)}>
        <div>
          <h1 style={titleStyle}>🌿 自然图鉴</h1>
          <p style={subtitleStyle}>
            已收集 {unlockedCount}/{totalCount} · Lv.{progress.level} · EXP {progress.experience}
          </p>
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '8px' : '12px' }}>
          <button
            style={taskButtonStyle(isMobile)}
            onClick={() => setShowDailyTasks(!showDailyTasks)}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            📋 任务
          </button>
          <button
            style={battleButtonStyle(isMobile)}
            onClick={() => {
              const unlocked = CARDS.filter(c => progress.unlockedCards.includes(c.id));
              if (unlocked.length > 0) {
                setSelectedBattleCard(unlocked[0]);
                navigate('/battle');
              }
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            ⚔ 对战
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDailyTasks && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: easeOutCubic }}
            style={taskPanelStyle(isMobile)}
          >
            <h3 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: isMobile ? '16px' : '18px' }}>
              🎯 每日任务
            </h3>
            {progress.dailyTasks.map(task => (
              <div key={task.id} style={taskItemStyle(isMobile)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{task.name}</div>
                  <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '6px' }}>
                    {task.description}
                  </div>
                  <div style={{
                    height: '6px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(task.progress / task.target) * 100}%`,
                      height: '100%',
                      background: task.completed
                        ? 'linear-gradient(90deg, #4ECDC4, #69DB7C)'
                        : 'linear-gradient(90deg, #4DABF7, #74C0FC)',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                    {task.progress}/{task.target}
                    {task.completed && <span style={{ color: '#69DB7C', marginLeft: '8px' }}>✓ 已完成</span>}
                  </div>
                </div>
                <div style={rewardStyle(isMobile)}>
                  <span style={{ fontSize: isMobile ? '18px' : '22px' }}>
                    {task.reward.cardId ? (CARDS.find(c => c.id === task.reward.cardId)?.emoji || '🎁') : '🎁'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#FFD700' }}>×{task.reward.amount}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} style={{ position: 'relative', marginTop: isMobile ? '12px' : '20px' }}>
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
      </div>

      <AnimatePresence>
        {selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={modalOverlayStyle}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ duration: 0.4, ease: easeOutCubic }}
              style={cardDetailModalStyle(isMobile, selectedCard.rarity)}
              onClick={e => e.stopPropagation()}
            >
              <div style={modalHeaderStyle}>
                <span style={{ fontSize: isMobile ? '48px' : '64px' }}>{selectedCard.emoji}</span>
                <div>
                  <h2 style={{ margin: 0, color: selectedCard.color, fontSize: isMobile ? '20px' : '24px' }}>
                    {selectedCard.name}
                  </h2>
                  <div style={{
                    color: RARITY_CONFIG[selectedCard.rarity].glow.includes('9B59B6')
                      ? '#9B59B6' : RARITY_CONFIG[selectedCard.rarity].glow.includes('FFD700')
                      ? '#FFD700' : '#C0C0C0',
                    fontSize: '14px',
                    marginTop: '4px'
                  }}>
                    ◆ {RARITY_CONFIG[selectedCard.rarity].label} · {selectedCard.type === 'plant' ? '🌱 植物' : '🐛 昆虫'}
                  </div>
                </div>
              </div>

              <p style={modalDescStyle}>
                {selectedCard.description}
              </p>

              <div style={modalStatsStyle(isMobile)}>
                <div style={statBlockStyle('#FF6B6B')}>
                  <div style={{ fontSize: isMobile ? '24px' : '32px' }}>⚔</div>
                  <div style={{ fontWeight: 'bold', fontSize: isMobile ? '18px' : '24px' }}>{selectedCard.attack}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>攻击</div>
                </div>
                <div style={statBlockStyle('#4ECDC4')}>
                  <div style={{ fontSize: isMobile ? '24px' : '32px' }}>🛡</div>
                  <div style={{ fontWeight: 'bold', fontSize: isMobile ? '18px' : '24px' }}>{selectedCard.defense}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>防御</div>
                </div>
                <div style={statBlockStyle('#69DB7C')}>
                  <div style={{ fontSize: isMobile ? '24px' : '32px' }}>❤</div>
                  <div style={{ fontWeight: 'bold', fontSize: isMobile ? '18px' : '24px' }}>{selectedCard.hp}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>生命</div>
                </div>
              </div>

              <div style={fragmentInfoStyle(isMobile)}>
                <div style={{ fontSize: '13px', color: '#aaa' }}>
                  💎 碎片: {progress.fragments[selectedCard.id] || 0}/{selectedCard.fragmentsRequired}
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  解锁条件: {selectedCard.collectCondition}
                </div>
              </div>

              <div style={modalButtonsStyle(isMobile)}>
                <button
                  style={cancelBtnStyle(isMobile)}
                  onClick={() => setSelectedCard(null)}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  关闭
                </button>
                {progress.unlockedCards.includes(selectedCard.id) ? (
                  <button
                    style={confirmBtnStyle(isMobile)}
                    onClick={handleStartBattle}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    ⚔ 出战
                  </button>
                ) : canUnlockCard(progress, selectedCard.id) ? (
                  <button
                    style={confirmBtnStyle(isMobile)}
                    onClick={() => {
                      const w = window.innerWidth, h = window.innerHeight;
                      handleUnlock(selectedCard, w / 2, h / 2);
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    🔓 解锁
                  </button>
                ) : (
                  <button
                    style={{ ...confirmBtnStyle(isMobile), opacity: 0.5, cursor: 'not-allowed' }}
                    disabled
                  >
                    碎片不足
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {justUnlocked && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.5, ease: easeOutElastic }}
          style={unlockToastStyle}
        >
          🎉 {CARDS.find(c => c.id === justUnlocked)?.name} 解锁成功！
        </motion.div>
      )}
    </div>
  );
};

const headerStyle = (mobile: boolean): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: mobile ? '12px' : '20px',
  padding: mobile ? '12px 16px' : '16px 24px',
  background: 'rgba(15, 30, 60, 0.6)',
  borderRadius: '12px',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
});

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '24px',
  background: 'linear-gradient(135deg, #69DB7C 0%, #4ECDC4 50%, #74C0FC 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

const subtitleStyle: React.CSSProperties = {
  margin: '4px 0 0 0',
  fontSize: '13px',
  color: '#888'
};

const taskButtonStyle = (mobile: boolean): React.CSSProperties => ({
  padding: mobile ? '10px 14px' : '10px 18px',
  minHeight: '48px',
  minWidth: '48px',
  background: 'rgba(78, 205, 196, 0.2)',
  border: '1px solid rgba(78, 205, 196, 0.4)',
  borderRadius: '8px',
  color: '#4ECDC4',
  fontSize: mobile ? '14px' : '15px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: 'inherit'
});

const battleButtonStyle = (mobile: boolean): React.CSSProperties => ({
  padding: mobile ? '10px 14px' : '10px 20px',
  minHeight: '48px',
  minWidth: '48px',
  background: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#fff',
  fontSize: mobile ? '14px' : '15px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)'
});

const taskPanelStyle = (mobile: boolean): React.CSSProperties => ({
  marginBottom: mobile ? '12px' : '16px',
  padding: mobile ? '14px 16px' : '18px 24px',
  background: 'rgba(20, 35, 70, 0.75)',
  borderRadius: '12px',
  backdropFilter: 'blur(15px)',
  border: '1px solid rgba(78, 205, 196, 0.2)',
  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
});

const taskItemStyle = (mobile: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: mobile ? '10px' : '16px',
  padding: mobile ? '10px 0' : '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.06)'
});

const rewardStyle = (mobile: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: mobile ? '6px 10px' : '8px 14px',
  background: 'rgba(255, 215, 0, 0.1)',
  borderRadius: '8px',
  border: '1px solid rgba(255, 215, 0, 0.2)',
  minWidth: mobile ? '48px' : '60px'
});

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  backdropFilter: 'blur(5px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',