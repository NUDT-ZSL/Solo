import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from './store';
import type { Character, EnergyBall, PowerUp, Buff, Knockback, SpeedLine } from './store';
import type { EntityType, BuffType } from './store';
import type { Particle } from './utils';
import { rgba, updateParticles } from './utils';
import {
  getAuraProperties,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  WALL_THICKNESS,
  GROUND_Y,
  GRAVITY,
  MOVE_SPEED,
  CHARGE_THRESHOLD,
  ENERGY_BALL_SPEED
} from './physics';
import {
  createInitialAIState,
  updateAI,
  createPowerUp,
  checkAIPowerUpCollision,
  generateInitialPowerUps,
  updateComboSystem,
  updateBuffPulseState,
  updateBuffsDurations,
  getBuffPulseAlpha,
  rotatePowerUps
} from './ai';
import type { AIState, ComboState } from './ai';

const COLORS = {
  backgroundStart: '#1A1A2E',
  backgroundEnd: '#16213E',
  wall: '#0F3460',
  player: '#00BFFF',
  ai: '#E94560',
  aura: '#FF3333',
  energyBall: '#FF8800',
  hpBg: '#800000',
  hpFill: '#FF3333',
  energyBg: '#000080',
  energyFill: '#00BFFF',
  comboGold: '#FFD700',
  exitBtn: '#8B0000',
  exitBtnHover: '#FF0000',
  buffGlow: '#00FFAA',
  speedLine: '#FFFFFF'
};

const GameCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exitHover, setExitHover] = useState(false);
  const [comboFloatY, setComboFloatY] = useState(0);
  const [lastCombo, setLastCombo] = useState(0);

  const aiStateRef = useRef<AIState>(createInitialAIState());
  const energyBallIdRef = useRef(200);
  const gameStateRef = useRef({
    powerUpsSpawned: false,
    previousPlayerHp: 100,
    previousAiHp: 100,
    hpTransitionPlayer: 1,
    hpTransitionAi: 1,
    goldGlowPhase: 0
  });

  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(performance.now());

  const state = useGameStore();
  const {
    arenaX, arenaY, arenaWidth, arenaHeight,
    player, ai, energyBalls, particles, powerUps, buffs, combo,
    speedLines, canvasWidth, canvasHeight, mouseX, mouseY, gameTime,
    buffPulsePhase
  } = state;

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    state.setCanvasSize(width, height);
  }, [state]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  useEffect(() => {
    if (!gameStateRef.current.powerUpsSpawned) {
      gameStateRef.current.powerUpsSpawned = true;
      const initial = generateInitialPowerUps();
      useGameStore.setState(s => ({
        powerUps: [...s.powerUps, ...initial]
      }));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      state.setKey(e.key, true);
      if (['w', 'W', 'a', 'A', 's', 'S', 'd', 'D', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      state.setKey(e.key, false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.setMousePosition(e.clientX - rect.left, e.clientY - rect.top);
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      state.setMousePosition(e.clientX - rect.left, e.clientY - rect.top);
      state.setPlayerCharging(true);
    };
    
    const handleMouseUp = () => {
      state.setPlayerCharging(false);
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [state]);

  const handleExitClick = () => {
    if (window.confirm('确定要退出游戏吗？')) {
      state.resetGame();
    }
  };

  useEffect(() => {
    if (combo !== lastCombo && combo > 0) {
      setComboFloatY(40);
      const start = performance.now();
      const animateCombo = (now: number) => {
        const elapsed = now - start;
        if (elapsed < 500) {
          setComboFloatY(40 * (1 - elapsed / 500));
          requestAnimationFrame(animateCombo);
        } else {
          setComboFloatY(0);
        }
      };
      requestAnimationFrame(animateCombo);
    }
    setLastCombo(combo);
  }, [combo, lastCombo]);

  useEffect(() => {
    const gameLoop = (now: number) => {
      const deltaTime = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const s = useGameStore.getState();
      const aiKnockback = s.knockbacks.some(k => k.entity === 'ai');
      const playerKnockback = s.knockbacks.some(k => k.entity === 'player');

      const aiInput = {
        ai: s.ai,
        player: s.player,
        deltaTime,
        gameTime: s.gameTime,
        aiState: aiStateRef.current,
        powerUps: s.powerUps,
        buffs: s.buffs,
        knockbackActive: aiKnockback
      };
      
      const aiResult = updateAI(aiInput);
      aiStateRef.current = aiResult.updatedAIState;

      let updatedAi = aiResult.updatedAi;

      if (aiResult.shouldAttack) {
        const ownerBuff = s.buffs.find(b => b.entity === 'ai' && b.type === 'attack');
        const damageMul = ownerBuff ? 2 : 1;
        const startX = updatedAi.x + updatedAi.width / 2;
        const startY = updatedAi.y + updatedAi.height / 2;
        const dx = aiResult.attackTargetX - startX;
        const dy = aiResult.attackTargetY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const newBall: EnergyBall = {
          id: ++energyBallIdRef.current,
          x: startX,
          y: startY,
          vx: (dx / dist) * ENERGY_BALL_SPEED,
          vy: (dy / dist) * ENERGY_BALL_SPEED,
          owner: 'ai' as EntityType,
          damage: 10 * damageMul,
          radius: 20
        };
        
        useGameStore.setState(gs => ({
          energyBalls: [...gs.energyBalls, newBall]
        }));
      }

      const aiCollectedIds = checkAIPowerUpCollision(updatedAi, s.powerUps);
      let updatedPowerUps = s.powerUps;
      let updatedBuffs = [...s.buffs];
      
      for (const id of aiCollectedIds) {
        const pu = s.powerUps.find(p => p.id === id);
        if (pu) {
          updatedPowerUps = updatedPowerUps.filter(p => p.id !== id);
          const existingBuff = updatedBuffs.find(b => b.entity === 'ai' && b.type === pu.type);
          if (existingBuff) {
            existingBuff.duration = 5;
            existingBuff.maxDuration = 5;
          } else {
            let buffIdCounter = 9000;
            updatedBuffs.push({
              id: ++buffIdCounter,
              type: pu.type,
              entity: 'ai',
              duration: 5,
              maxDuration: 5,
              color: pu.color
            });
          }
        }
      }

      if (aiResult.newPowerUpsToSpawn > 0) {
        const activeCount = updatedPowerUps.filter(p => !p.collected).length;
        if (activeCount < 3) {
          updatedPowerUps = [...updatedPowerUps, createPowerUp()];
        }
      }

      updatedPowerUps = rotatePowerUps(updatedPowerUps, deltaTime);

      const buffResult = updateBuffsDurations(updatedBuffs, deltaTime);
      updatedBuffs = buffResult.activeBuffs;

      const playerSpeedBuff = updatedBuffs.find(b => b.entity === 'player' && b.type === 'speed');
      const playerSpeedMul = playerSpeedBuff ? 1.3 : 1;
      
      let playerX = s.player.x;
      let playerY = s.player.y;
      let playerVx = 0;
      let playerVy = s.player.vy;
      let playerOnGround = s.player.onGround;
      let playerFacing = s.player.facing;
      let playerChargeTime = s.player.chargeTime;
      let playerEnergy = s.player.energy;
      let playerIsCharging = s.player.isCharging;

      if (s.keys['a'] || s.keys['A'] || s.keys['ArrowLeft']) {
        playerVx = -MOVE_SPEED * playerSpeedMul;
        playerFacing = -1;
      }
      if (s.keys['d'] || s.keys['D'] || s.keys['ArrowRight']) {
        playerVx = MOVE_SPEED * playerSpeedMul;
        playerFacing = 1;
      }
      if ((s.keys['w'] || s.keys['W'] || s.keys['ArrowUp'] || s.keys[' ']) && playerOnGround && !playerKnockback) {
        playerVy = -500;
        playerOnGround = false;
      }

      if (playerIsCharging) {
        playerChargeTime += deltaTime;
        playerEnergy = Math.min(100, (playerChargeTime / 2) * 100);
      } else {
        playerEnergy = 0;
      }

      if (!playerKnockback) {
        playerVy += GRAVITY * deltaTime;
        playerX += playerVx * deltaTime;
        playerY += playerVy * deltaTime;

        if (playerY + s.player.height >= GROUND_Y) {
          playerY = GROUND_Y - s.player.height;
          playerVy = 0;
          playerOnGround = true;
        }

        const leftBound = WALL_THICKNESS;
        const rightBound = ARENA_WIDTH - WALL_THICKNESS;
        playerX = Math.max(leftBound, Math.min(rightBound - s.player.width, playerX));
      }

      const newPlayer: Character = {
        ...s.player,
        x: playerX,
        y: playerY,
        vx: playerVx,
        vy: playerVy,
        onGround: playerOnGround,
        facing: playerFacing,
        chargeTime: playerChargeTime,
        energy: playerEnergy,
        isCharging: playerIsCharging
      };

      if (!aiKnockback) {
        let aiX = updatedAi.x;
        let aiY = updatedAi.y;
        if (aiY + updatedAi.height >= GROUND_Y) {
          aiY = GROUND_Y - updatedAi.height;
        }
        const leftBound = WALL_THICKNESS;
        const rightBound = ARENA_WIDTH - WALL_THICKNESS;
        aiX = Math.max(leftBound, Math.min(rightBound - updatedAi.width, aiX));
        updatedAi = { ...updatedAi, x: aiX, y: aiY };
      }

      const newKnockbacks: Knockback[] = [];
      let finalPlayerX = newPlayer.x;
      let finalPlayerY = newPlayer.y;
      let finalAiX = updatedAi.x;
      let finalAiY = updatedAi.y;

      for (const kb of s.knockbacks) {
        const newElapsed = kb.elapsed + deltaTime;
        if (newElapsed >= kb.duration) {
          if (kb.entity === 'player') {
            finalPlayerX = kb.targetX;
            finalPlayerY = kb.targetY;
          } else {
            finalAiX = kb.targetX;
            finalAiY = kb.targetY;
          }
        } else {
          const t = newElapsed / kb.duration;
          const eased = 1 - Math.pow(1 - t, 3);
          const cx = kb.startX + (kb.targetX - kb.startX) * eased;
          const cy = kb.startY + (kb.targetY - kb.startY) * eased;
          if (kb.entity === 'player') {
            finalPlayerX = cx;
            finalPlayerY = cy;
          } else {
            finalAiX = cx;
            finalAiY = cy;
          }
          newKnockbacks.push({ ...kb, elapsed: newElapsed });
        }
      }

      const plBoundL = WALL_THICKNESS;
      const plBoundR = ARENA_WIDTH - WALL_THICKNESS;
      finalPlayerX = Math.max(plBoundL, Math.min(plBoundR - s.player.width, finalPlayerX));
      finalAiX = Math.max(plBoundL, Math.min(plBoundR - updatedAi.width, finalAiX));

      const finalPlayer: Character = { ...newPlayer, x: finalPlayerX, y: finalPlayerY };
      const finalAi: Character = { ...updatedAi, x: finalAiX, y: finalAiY };

      const playerCollectedIds: number[] = [];
      const remainingPowerUps: PowerUp[] = [];
      for (const pu of updatedPowerUps) {
        if (pu.collected) continue;
        const pCx = finalPlayer.x + finalPlayer.width / 2;
        const pCy = finalPlayer.y + finalPlayer.height / 2;
        const pHalfW = finalPlayer.width / 2;
        const pHalfH = finalPlayer.height / 2;
        const dist = Math.max(
          Math.abs(pu.x - pCx) - pHalfW,
          Math.abs(pu.y - pCy) - pHalfH
        );
        if (dist < 16) {
          playerCollectedIds.push(pu.id);
          const existingBuff = updatedBuffs.find(b => b.entity === 'player' && b.type === pu.type);
          if (existingBuff) {
            existingBuff.duration = 5;
            existingBuff.maxDuration = 5;
          } else {
            let pbid = 8000;
            updatedBuffs.push({
              id: ++pbid,
              type: pu.type,
              entity: 'player',
              duration: 5,
              maxDuration: 5,
              color: pu.color
            });
          }
        } else {
          remainingPowerUps.push(pu);
        }
      }

      const movedBalls = s.energyBalls.map(b => ({
        ...b,
        x: b.x + b.vx * deltaTime,
        y: b.y + b.vy * deltaTime
      })).filter(b =>
        b.x > -50 && b.x < ARENA_WIDTH + 50 &&
        b.y > -50 && b.y < ARENA_HEIGHT + 50
      );

      const remainingBalls: EnergyBall[] = [];
      let newParticles = [...s.particles];
      let hitsToPlayer = 0;
      let hitsToAiFromPlayer = 0;
      let playerHp = finalPlayer.hp;
      let aiHp = finalAi.hp;
      const additionalKnockbacks: Knockback[] = [];

      let pId = 7000;

      for (const ball of movedBalls) {
        let hit = false;
        let targetType: EntityType | null = null;
        let targetCx = 0;
        let targetCy = 0;

        if (ball.owner !== 'player') {
          const closestX = Math.max(finalPlayer.x, Math.min(ball.x, finalPlayer.x + finalPlayer.width));
          const closestY = Math.max(finalPlayer.y, Math.min(ball.y, finalPlayer.y + finalPlayer.height));
          const cdx = ball.x - closestX;
          const cdy = ball.y - closestY;
          if (cdx * cdx + cdy * cdy < ball.radius * ball.radius && playerHp > 0) {
            hit = true;
            targetType = 'player';
            targetCx = finalPlayer.x + finalPlayer.width / 2;
            targetCy = finalPlayer.y + finalPlayer.height / 2;
          }
        }

        if (!hit && ball.owner !== 'ai') {
          const closestX = Math.max(finalAi.x, Math.min(ball.x, finalAi.x + finalAi.width));
          const closestY = Math.max(finalAi.y, Math.min(ball.y, finalAi.y + finalAi.height));
          const cdx = ball.x - closestX;
          const cdy = ball.y - closestY;
          if (cdx * cdx + cdy * cdy < ball.radius * ball.radius && aiHp > 0) {
            hit = true;
            targetType = 'ai';
            targetCx = finalAi.x + finalAi.width / 2;
            targetCy = finalAi.y + finalAi.height / 2;
          }
        }

        if (hit && targetType) {
          const ddx = ball.x - targetCx;
          const ddy = ball.y - targetCy;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
          const kx = -ddx / dist;
          const ky = -ddy / dist;
          const kDist = 80;
          
          if (targetType === 'player') {
            playerHp = Math.max(0, playerHp - ball.damage);
            hitsToPlayer++;
            additionalKnockbacks.push({
              entity: 'player',
              startX: finalPlayer.x,
              startY: finalPlayer.y,
              targetX: finalPlayer.x + kx * kDist,
              targetY: finalPlayer.y + Math.min(0, ky) * kDist * 0.5,
              duration: 0.2,
              elapsed: 0
            });
          } else {
            aiHp = Math.max(0, aiHp - ball.damage);
            additionalKnockbacks.push({
              entity: 'ai',
              startX: finalAi.x,
              startY: finalAi.y,
              targetX: finalAi.x + kx * kDist,
              targetY: finalAi.y + Math.min(0, ky) * kDist * 0.5,
              duration: 0.2,
              elapsed: 0
            });
            if (ball.owner === 'player') {
              hitsToAiFromPlayer++;
            }
          }

          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 150 + Math.random() * 150;
            newParticles.push({
              id: ++pId,
              x: ball.x,
              y: ball.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: ['#FF8800', '#FFAA00', '#FFD700', '#FF3333'][Math.floor(Math.random() * 4)],
              size: 4 + Math.random() * 4,
              life: 0.3,
              maxLife: 0.3
            });
          }
        } else {
          remainingBalls.push(ball);
        }
      }

      newParticles = updateParticles(newParticles, deltaTime);
      if (newParticles.length > 30) {
        newParticles = newParticles.slice(-30);
      }

      const comboState: ComboState = {
        combo: s.combo,
        comboStartTime: s.comboStartTime,
        comboResetTime: s.comboResetTime
      };
      const newComboState = updateComboSystem(comboState, s.gameTime, hitsToAiFromPlayer);

      const pulseState = updateBuffPulseState({ pulsePhase: s.buffPulsePhase }, deltaTime, 2);

      const newSpeedLines: SpeedLine[] = s.speedLines
        .map(l => ({ ...l, x: l.x + l.speed * deltaTime }))
        .filter(l => l.x < ARENA_WIDTH + 50);

      if (Math.random() < 0.1 && newSpeedLines.length < 20) {
        newSpeedLines.push({
          id: Math.floor(Math.random() * 100000),
          x: -30,
          y: ARENA_HEIGHT - 20 + Math.random() * 15,
          length: 10 + Math.random() * 20,
          speed: 200 + Math.random() * 100
        });
      }

      gameStateRef.current.hpTransitionPlayer = Math.min(1, gameStateRef.current.hpTransitionPlayer + deltaTime / 0.3);
      gameStateRef.current.hpTransitionAi = Math.min(1, gameStateRef.current.hpTransitionAi + deltaTime / 0.3);
      
      if (playerHp !== gameStateRef.current.previousPlayerHp) {
        gameStateRef.current.previousPlayerHp = playerHp;
        gameStateRef.current.hpTransitionPlayer = 0;
      }
      if (aiHp !== gameStateRef.current.previousAiHp) {
        gameStateRef.current.previousAiHp = aiHp;
        gameStateRef.current.hpTransitionAi = 0;
      }

      if (newComboState.combo > 5) {
        gameStateRef.current.goldGlowPhase += deltaTime * 2 * Math.PI;
      }

      useGameStore.setState({
        player: { ...finalPlayer, hp: playerHp },
        ai: { ...finalAi, hp: aiHp },
        energyBalls: remainingBalls,
        particles: newParticles,
        powerUps: remainingPowerUps,
        buffs: updatedBuffs,
        knockbacks: [...newKnockbacks, ...additionalKnockbacks],
        speedLines: newSpeedLines,
        combo: newComboState.combo,
        comboStartTime: newComboState.comboStartTime,
        buffPulsePhase: pulseState.pulsePhase,
        gameTime: s.gameTime + deltaTime
      });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const offsetX = arenaX;
    const offsetY = arenaY;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGrad.addColorStop(0, '#0a0a14');
    bgGrad.addColorStop(1, '#0f0f1e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.save();
    const arenaGrad = ctx.createLinearGradient(offsetX, offsetY, offsetX, offsetY + ARENA_HEIGHT);
    arenaGrad.addColorStop(0, COLORS.backgroundStart);
    arenaGrad.addColorStop(1, COLORS.backgroundEnd);
    ctx.fillStyle = arenaGrad;
    ctx.fillRect(offsetX, offsetY, ARENA_WIDTH, ARENA_HEIGHT);

    ctx.strokeStyle = 'rgba(0, 191, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const y = offsetY + (ARENA_HEIGHT / 8) * i;
      ctx.beginPath();
      ctx.moveTo(offsetX + WALL_THICKNESS, y);
      ctx.lineTo(offsetX + ARENA_WIDTH - WALL_THICKNESS, y);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(offsetX, offsetY, WALL_THICKNESS, ARENA_HEIGHT);
    ctx.fillRect(offsetX + ARENA_WIDTH - WALL_THICKNESS, offsetY, WALL_THICKNESS, ARENA_HEIGHT);

    ctx.fillStyle = '#0F3460';
    ctx.fillRect(offsetX, offsetY + GROUND_Y, ARENA_WIDTH, ARENA_HEIGHT - GROUND_Y);

    const groundGrad = ctx.createLinearGradient(offsetX, offsetY + GROUND_Y, offsetX, offsetY + GROUND_Y + 5);
    groundGrad.addColorStop(0, '#2a5298');
    groundGrad.addColorStop(1, 'rgba(42, 82, 152, 0)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(offsetX, offsetY + GROUND_Y - 5, ARENA_WIDTH, 5);

    if (combo > 5) {
      const glowAlpha = 0.1 + 0.1 * (0.5 + 0.5 * Math.sin(gameStateRef.current.goldGlowPhase));
      const glowGrad = ctx.createRadialGradient(
        offsetX + ARENA_WIDTH / 2, offsetY + ARENA_HEIGHT / 2, 50,
        offsetX + ARENA_WIDTH / 2, offsetY + ARENA_HEIGHT / 2, Math.max(ARENA_WIDTH, ARENA_HEIGHT) / 1.5
      );
      glowGrad.addColorStop(0, rgba('#FFD700', 0));
      glowGrad.addColorStop(0.7, rgba('#FFD700', glowAlpha * 0.5));
      glowGrad.addColorStop(1, rgba('#FFD700', glowAlpha));
      ctx.fillStyle = glowGrad;
      ctx.fillRect(offsetX, offsetY, ARENA_WIDTH, ARENA_HEIGHT);
    }

    ctx.strokeStyle = rgba(COLORS.speedLine, 0.05);
    ctx.lineWidth = 2;
    for (const line of speedLines) {
      ctx.beginPath();
      ctx.moveTo(offsetX + line.x, offsetY + line.y);
      ctx.lineTo(offsetX + line.x + line.length, offsetY + line.y);
      ctx.stroke();
    }

    for (const pu of powerUps) {
      if (pu.collected) continue;
      ctx.save();
      ctx.translate(offsetX + pu.x, offsetY + pu.y);
      ctx.rotate((pu.rotation * Math.PI) / 180);
      ctx.globalAlpha = 0.7;
      
      const size = 16;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
      grad.addColorStop(0, rgba(pu.color, 0.6));
      grad.addColorStop(1, rgba(pu.color, 0));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pu.color;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pu.type === 'attack' ? '攻' : '速', 0, 0);

      ctx.restore();
    }

    const drawCharacter = (char: Character, color: string, entity: EntityType) => {
      const x = offsetX + char.x;
      const y = offsetY + char.y;
      const cx = x + char.width / 2;
      const cy = y + char.height / 2;

      if (char.isCharging) {
        const auraProps = getAuraProperties(char.chargeTime);
        const auraRadius = auraProps.diameter / 2;
        
        const auraGrad = ctx.createRadialGradient(cx, cy, auraRadius * 0.3, cx, cy, auraRadius);
        auraGrad.addColorStop(0, rgba('#FF3333', 0));
        auraGrad.addColorStop(0.7, rgba('#FF3333', auraProps.alpha * 0.6));
        auraGrad.addColorStop(1, rgba('#FF3333', auraProps.alpha));
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = rgba('#FF3333', Math.min(1, auraProps.alpha + 0.2));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      const entityBuffs = buffs.filter(b => b.entity === entity);
      if (entityBuffs.length > 0) {
        const pulseVal = getBuffPulseAlpha(buffPulsePhase);
        ctx.strokeStyle = rgba(COLORS.buffGlow, 0.5 + 0.3 * pulseVal);
        ctx.lineWidth = 3;
        
        const buffColor = entityBuffs[0]?.color || COLORS.buffGlow;
        const buffGrad = ctx.createLinearGradient(x, y, x + char.width, y + char.height);
        buffGrad.addColorStop(0, rgba(buffColor, 0.6 + 0.4 * pulseVal));
        buffGrad.addColorStop(0.5, rgba(COLORS.buffGlow, 0.6 + 0.4 * pulseVal));
        buffGrad.addColorStop(1, rgba(buffColor, 0.6 + 0.4 * pulseVal));
        ctx.strokeStyle = buffGrad;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 2, y - 2, char.width + 4, char.height + 4);
      }

      ctx.save();
      ctx.translate(cx, cy);
      if (char.facing < 0) ctx.scale(-1, 1);

      const bodyGrad = ctx.createLinearGradient(-char.width / 2, -char.height / 2, char.width / 2, char.height / 2);
      bodyGrad.addColorStop(0, color);
      bodyGrad.addColorStop(1, shadeColor(color, -30));
      ctx.fillStyle = bodyGrad;

      const headR = 12;
      ctx.beginPath();
      ctx.arc(0, -char.height / 2 + headR + 5, headR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(-char.width / 2 + 4, -char.height / 2 + headR * 2 + 5, char.width - 8, char.height / 2 - 5);

      ctx.fillStyle = shadeColor(color, -20);
      const legW = 8;
      ctx.fillRect(-char.width / 2 + 6, 0, legW, char.height / 2 - 5);
      ctx.fillRect(char.width / 2 - 6 - legW, 0, legW, char.height / 2 - 5);

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(4, -char.height / 2 + headR + 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(5, -char.height / 2 + headR + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      const hpBarW = 50;
      const hpBarH = 5;
      const hpRatio = char.hp / char.maxHp;
      const hpX = cx - hpBarW / 2;
      const hpY = y - 15;
      
      ctx.fillStyle = '#330000';
      ctx.fillRect(hpX, hpY, hpBarW, hpBarH);
      
      const hpColor = hpRatio > 0.5 ? '#4CAF50' : hpRatio > 0.25 ? '#FFC107' : '#F44336';
      ctx.fillStyle = hpColor;
      ctx.fillRect(hpX, hpY, hpBarW * hpRatio, hpBarH);
      
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(hpX, hpY, hpBarW, hpBarH);
    };

    drawCharacter(player, COLORS.player, 'player');
    drawCharacter(ai, COLORS.ai, 'ai');

    for (const ball of energyBalls) {
      const x = offsetX + ball.x;
      const y = offsetY + ball.y;

      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, ball.radius * 2.5);
      glowGrad.addColorStop(0, rgba(COLORS.energyBall, 0.8));
      glowGrad.addColorStop(0.5, rgba(COLORS.energyBall, 0.3));
      glowGrad.addColorStop(1, rgba(COLORS.energyBall, 0));
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(x, y, ball.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      const ballGrad = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, ball.radius);
      ballGrad.addColorStop(0, '#FFFFAA');
      ballGrad.addColorStop(0.5, COLORS.energyBall);
      ballGrad.addColorStop(1, '#CC5500');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(x, y, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      if (ball.owner === 'player') {
        ctx.strokeStyle = rgba(COLORS.player, 0.8);
      } else {
        ctx.strokeStyle = rgba(COLORS.ai, 0.8);
      }
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, ball.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const p of particles) {
      const x = offsetX + p.x;
      const y = offsetY + p.y;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = rgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(x, y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const hpBarW = 200;
    const hpBarH = 20;
    const hpBarX = 20;
    const hpBarY = 20;
    const currentHpRatio = player.hp / player.maxHp;

    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    
    const hpGrad = ctx.createLinearGradient(hpBarX, hpBarY, hpBarX, hpBarY + hpBarH);
    hpGrad.addColorStop(0, '#FF6666');
    hpGrad.addColorStop(0.5, COLORS.hpFill);
    hpGrad.addColorStop(1, '#CC0000');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(hpBarX, hpBarY, hpBarW * currentHpRatio, hpBarH);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`玩家 HP: ${player.hp}/${player.maxHp}`, hpBarX + 5, hpBarY + 14);

    const energyBarW = 100;
    const energyBarH = 10;
    const energyBarX = hpBarX;
    const energyBarY = hpBarY + hpBarH + 8;

    ctx.fillStyle = COLORS.energyBg;
    ctx.fillRect(energyBarX, energyBarY, energyBarW, energyBarH);
    
    const eGrad = ctx.createLinearGradient(energyBarX, energyBarY, energyBarX, energyBarY + energyBarH);
    eGrad.addColorStop(0, '#66FFFF');
    eGrad.addColorStop(0.5, COLORS.energyFill);
    eGrad.addColorStop(1, '#0088CC');
    ctx.fillStyle = eGrad;
    ctx.fillRect(energyBarX, energyBarY, energyBarW * (player.energy / 100), energyBarH);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(energyBarX, energyBarY, energyBarW, energyBarH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    const chargeText = player.isCharging && player.chargeTime >= CHARGE_THRESHOLD
      ? '蓄能完毕！'
      : player.isCharging
        ? `蓄能中 ${Math.floor(player.energy)}%`
        : '能量';
    ctx.fillText(chargeText, energyBarX, energyBarY + energyBarH + 12);

    const comboX = canvasWidth - 20;
    const comboY = 50;

    ctx.textAlign = 'right';
    ctx.font = 'bold 16px Orbitron, Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('连击', comboX, comboY - 20);

    if (combo > 0) {
      const yOffset = comboFloatY;
      ctx.font = 'bold 40px Orbitron, Arial';
      
      const isHighCombo = combo > 5;
      if (isHighCombo) {
        const glow = 0.5 + 0.5 * Math.sin(gameStateRef.current.goldGlowPhase);
        ctx.shadowColor = COLORS.comboGold;
        ctx.shadowBlur = 20 * glow;
      }
      
      ctx.fillStyle = isHighCombo ? COLORS.comboGold : '#FFFFFF';
      ctx.fillText(`${combo}`, comboX, comboY - yOffset);
      
      if (combo > 1) {
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = isHighCombo ? '#FFEE88' : '#FFAAAA';
        ctx.fillText('COMBO!', comboX, comboY + 15 - yOffset);
      }
      
      ctx.shadowBlur = 0;
    } else {
      ctx.font = 'bold 24px Orbitron, Arial';
      ctx.fillStyle = '#444444';
      ctx.fillText('0', comboX, comboY);
    }

    const buffIconSize = 40;
    const buffIconX = canvasWidth - 70;
    const buffIconY = 90;
    const playerBuffs = buffs.filter(b => b.entity === 'player');
    
    if (playerBuffs.length > 0) {
      const mainBuff = playerBuffs[0];
      
      ctx.save();
      const pulse = 0.7 + 0.3 * Math.sin(gameTime * 4 * Math.PI);
      ctx.globalAlpha = pulse;
      const g = ctx.createRadialGradient(buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2, 0, buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2, buffIconSize);
      g.addColorStop(0, rgba(mainBuff.color, 0.6));
      g.addColorStop(1, rgba(mainBuff.color, 0));
      ctx.fillStyle = g;
      ctx.fillRect(buffIconX - 10, buffIconY - 10, buffIconSize + 20, buffIconSize + 20);
      ctx.restore();

      ctx.fillStyle = '#222222';
      ctx.beginPath();
      ctx.arc(buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2, buffIconSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = mainBuff.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2 - 2, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(mainBuff.type === 'attack' ? '攻' : '速', buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2 + 1);

      const durationRatio = mainBuff.duration / mainBuff.maxDuration;
      ctx.strokeStyle = mainBuff.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(buffIconX + buffIconSize / 2, buffIconY + buffIconSize / 2, buffIconSize / 2 + 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * durationRatio);
      ctx.stroke();

      if (playerBuffs.length > 1) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`+${playerBuffs.length - 1}`, buffIconX + buffIconSize, buffIconY);
      }
    }

    const aiHpW = 200;
    const aiHpH = 20;
    const aiHpX = canvasWidth - 20 - aiHpW;
    const aiHpY = canvasHeight - 40;
    const aiHpRatio = ai.hp / ai.maxHp;

    ctx.fillStyle = COLORS.hpBg;
    ctx.fillRect(aiHpX, aiHpY, aiHpW, aiHpH);
    
    const aHpGrad = ctx.createLinearGradient(aiHpX, aiHpY, aiHpX, aiHpY + aiHpH);
    aHpGrad.addColorStop(0, '#FF6666');
    aHpGrad.addColorStop(0.5, '#E94560');
    aHpGrad.addColorStop(1, '#AA2244');
    ctx.fillStyle = aHpGrad;
    ctx.fillRect(aiHpX, aiHpY, aiHpW * aiHpRatio, aiHpH);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(aiHpX, aiHpY, aiHpW, aiHpH);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`敌人 HP: ${ai.hp}/${ai.maxHp}`, aiHpX + aiHpW - 5, aiHpY + 14);

    const instX = 20;
    const instY = canvasHeight - 100;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('A/D - 移动  W/空格 - 跳跃  鼠标长按 - 蓄力攻击', instX, instY);
    ctx.fillText('蓄力 0.5秒以上后松开，向鼠标方向射出能量球', instX, instY + 14);

  }, [
    arenaX, arenaY, arenaWidth, arenaHeight, canvasWidth, canvasHeight,
    player, ai, energyBalls, particles, powerUps, buffs, combo,
    speedLines, mouseX, mouseY, gameTime, exitHover, comboFloatY,
    buffPulsePhase
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050510',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            cursor: 'crosshair',
            imageRendering: 'pixelated',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
        <button
          onClick={handleExitClick}
          onMouseEnter={() => setExitHover(true)}
          onMouseLeave={() => setExitHover(false)}
          style={{
            position: 'absolute',
            right: 15,
            bottom: 15,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: 'none',
            background: exitHover ? '#FF0000' : '#8B0000',
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: exitHover ? 'rotate(15deg)' : 'rotate(0deg)',
            transition: 'all 0.2s ease-out',
            boxShadow: exitHover
              ? '0 0 20px rgba(255,0,0,0.6)'
              : '0 0 10px rgba(139,0,0,0.4)'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

export default GameCanvas;
