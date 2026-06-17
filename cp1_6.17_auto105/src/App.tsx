import { useEffect, useRef, useState, useCallback } from 'react';
import { RoomModule, type RoomData } from './room-module';
import { SkillModule, type SkillState, type SkillEffect, type SkillHitData } from './skill-module';
import { EnemyModule, type Enemy, type EnemyProjectile } from './enemy-module';
import { HUD, FPSMonitor, LowFPSBorder } from './ui-module';
import { globalApi } from './rest-api';

const PLAYER_RADIUS = 15;
const PLAYER_SPEED = 150;
const MAX_HP = 100;
const GAME_WIDTH_BASE = 800;
const GAME_HEIGHT_BASE = 600;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const roomModuleRef = useRef(new RoomModule());
  const skillModuleRef = useRef(new SkillModule());
  const enemyModuleRef = useRef(new EnemyModule());

  useEffect(() => {
    skillModuleRef.current.registerRestApi(globalApi);
    enemyModuleRef.current.registerRestApi(globalApi);
    roomModuleRef.current.registerRestApi(globalApi);
  }, []);

  const playerRef = useRef({ x: 0, y: 0, dx: 0, dy: 0 });
  const keysRef = useRef<Record<string, boolean>>({});
  const roomRef = useRef<RoomData | null>(null);
  const portalVisibleRef = useRef(false);
  const portalRotationRef = useRef(0);
  const fadeRef = useRef({ alpha: 0, phase: 'none' as 'none' | 'out' | 'in' });
  const pendingRoomSwitchRef = useRef(false);
  const killedTotalRef = useRef(0);

  const [hp, setHp] = useState(MAX_HP);
  const [skills, setSkills] = useState<SkillState[]>(skillModuleRef.current.getSkills());
  const [enemyCount, setEnemyCount] = useState(8);
  const [killedInRoom, setKilledInRoom] = useState(0);
  const [roomIndex, setRoomIndex] = useState(1);
  const [fps, setFps] = useState(60);
  const [portalVisible, setPortalVisible] = useState(false);
  const [fadeAlpha, setFadeAlpha] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ w: GAME_WIDTH_BASE, h: GAME_HEIGHT_BASE });

  const hpRef = useRef(hp);
  useEffect(() => { hpRef.current = hp; }, [hp]);

  const handlePlayerHit = useCallback((damage: number) => {
    setHp(prev => Math.max(0, prev - damage));
  }, []);

  const generateNewRoom = useCallback((w: number, h: number) => {
    const room = roomModuleRef.current.generateRoom(w, h);
    roomRef.current = room;
    playerRef.current.x = room.playerSpawn.x;
    playerRef.current.y = room.playerSpawn.y;
    enemyModuleRef.current.initRoom(room);
    portalVisibleRef.current = false;
    setPortalVisible(false);
    setEnemyCount(enemyModuleRef.current.getEnemies().length);
    setKilledInRoom(0);
    setRoomIndex(roomModuleRef.current.getRoomIndex());
  }, []);

  const generateNewRoomViaApi = useCallback(async (w: number, h: number) => {
    const res = await globalApi.request<{ room: RoomData; roomIndex: number }>({
      method: 'POST', path: '/api/room/generate', body: { canvasWidth: w, canvasHeight: h }
    });
    if (!res.ok || !res.data.room) return;
    const room = res.data.room;
    roomRef.current = room;
    playerRef.current.x = room.playerSpawn.x;
    playerRef.current.y = room.playerSpawn.y;
    await globalApi.request({
      method: 'POST', path: '/api/enemies/init-room', body: room
    });
    portalVisibleRef.current = false;
    setPortalVisible(false);
    setEnemyCount(enemyModuleRef.current.getEnemies().length);
    setKilledInRoom(0);
    setRoomIndex(res.data.roomIndex);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = Math.min(rect.width - 32, 1000);
      const h = Math.min(rect.height - 32, 750);
      setCanvasSize({ w, h });
      if (roomRef.current) {
        generateNewRoom(w, h);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [generateNewRoom]);

  useEffect(() => {
    generateNewRoom(canvasSize.w, canvasSize.h);
  }, [canvasSize.w, canvasSize.h]);

  useEffect(() => {
    const sm = skillModuleRef.current;
    const em = enemyModuleRef.current;

    const onCooldown = (s: SkillState[]) => setSkills(s);
    const onHit = (data: SkillHitData) => {
      globalApi.request({
        method: 'POST', path: '/api/enemies/hit', body: data
      });
    };
    const onEnemyUpdate = (enemies: Enemy[], _projectiles: EnemyProjectile[]) => {
      setEnemyCount(enemies.length);
    };
    const onEnemyKilled = (_e: Enemy) => {
      killedTotalRef.current++;
      setKilledInRoom(prev => prev + 1);
    };
    const onAllCleared = () => {
      portalVisibleRef.current = true;
      setPortalVisible(true);
    };

    sm.on('skill:cooldown-update', onCooldown);
    sm.on('skill:hit', onHit);
    em.on('enemy:update', onEnemyUpdate);
    em.on('enemy:killed', onEnemyKilled);
    em.on('enemy:all-cleared', onAllCleared);

    return () => {
      sm.off('skill:cooldown-update', onCooldown);
      sm.off('skill:hit', onHit);
      em.off('enemy:update', onEnemyUpdate);
      em.off('enemy:killed', onEnemyKilled);
      em.off('enemy:all-cleared', onAllCleared);
    };
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      const px = playerRef.current.x;
      const py = playerRef.current.y;
      if (k === 'j') {
        skillModuleRef.current.castSkill('fireball', px, py);
        globalApi.request({ method: 'POST', path: '/api/skills/fireball/cast', body: { x: px, y: py } });
      }
      if (k === 'k') {
        skillModuleRef.current.castSkill('frost', px, py);
        globalApi.request({ method: 'POST', path: '/api/skills/frost/cast', body: { x: px, y: py } });
      }
      if (k === 'l') {
        skillModuleRef.current.castSkill('lightning', px, py);
        globalApi.request({ method: 'POST', path: '/api/skills/lightning/cast', body: { x: px, y: py } });
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let fpsTimer = 0;
    let frameCount = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        setFps(Math.round(frameCount / fpsTimer));
        frameCount = 0;
        fpsTimer = 0;
      }

      const keys = keysRef.current;
      let vx = 0, vy = 0;
      if (keys['w']) vy -= 1;
      if (keys['s']) vy += 1;
      if (keys['a']) vx -= 1;
      if (keys['d']) vx += 1;
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 0) { vx /= len; vy /= len; }
      skillModuleRef.current.setPlayerDirection(vx || playerRef.current.dx || 1, vy || playerRef.current.dy || 0);
      playerRef.current.dx = vx;
      playerRef.current.dy = vy;

      if (fadeRef.current.phase !== 'out') {
        const mv = PLAYER_SPEED * dt;
        const nx = playerRef.current.x + vx * mv;
        const ny = playerRef.current.y + vy * mv;
        const rm = roomModuleRef.current;
        if (rm.isWalkable(nx, playerRef.current.y, PLAYER_RADIUS)) playerRef.current.x = nx;
        if (rm.isWalkable(playerRef.current.x, ny, PLAYER_RADIUS)) playerRef.current.y = ny;
      }

      const room = roomRef.current;
      if (portalVisibleRef.current && room && fadeRef.current.phase === 'none' && !pendingRoomSwitchRef.current) {
        const dx = playerRef.current.x - room.portalPosition.x;
        const dy = playerRef.current.y - room.portalPosition.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 40 + PLAYER_RADIUS) {
          pendingRoomSwitchRef.current = true;
          fadeRef.current.phase = 'out';
          fadeRef.current.alpha = 0;
        }
      }

      if (fadeRef.current.phase === 'out') {
        fadeRef.current.alpha = Math.min(1, fadeRef.current.alpha + dt * 4);
        setFadeAlpha(fadeRef.current.alpha);
        if (fadeRef.current.alpha >= 1) {
          fadeRef.current.phase = 'in';
          pendingRoomSwitchRef.current = false;
          generateNewRoomViaApi(canvasSize.w, canvasSize.h);
        }
      } else if (fadeRef.current.phase === 'in') {
        fadeRef.current.alpha = Math.max(0, fadeRef.current.alpha - dt * 4);
        setFadeAlpha(fadeRef.current.alpha);
        if (fadeRef.current.alpha <= 0) {
          fadeRef.current.phase = 'none';
          fadeRef.current.alpha = 0;
        }
      }

      if (fadeRef.current.phase === 'none') {
        portalRotationRef.current += dt * 1;
        const enemiesForCollision = enemyModuleRef.current.getEnemies().map(e => ({
          id: e.id, x: e.x, y: e.y, size: e.size
        }));
        skillModuleRef.current.update(
          dt,
          playerRef.current.x,
          playerRef.current.y,
          enemiesForCollision,
          (x, y, r) => roomModuleRef.current.isWalkable(x, y, r)
        );
        enemyModuleRef.current.update(
          dt,
          playerRef.current.x,
          playerRef.current.y,
          (x, y, r) => roomModuleRef.current.isWalkable(x, y, r),
          handlePlayerHit
        );
      }

      render();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [canvasSize.w, canvasSize.h, generateNewRoom, generateNewRoomViaApi, handlePlayerHit]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !roomRef.current) return;

    const { w, h } = canvasSize;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0A0E27');
    grad.addColorStop(1, '#1A1A2E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const room = roomRef.current;
    const offsetX = (w - room.width) / 2;
    const offsetY = (h - room.height) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    ctx.strokeStyle = 'rgba(59,130,246,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= room.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * room.cellSize, 0);
      ctx.lineTo(i * room.cellSize, room.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * room.cellSize);
      ctx.lineTo(room.width, i * room.cellSize);
      ctx.stroke();
    }

    for (let gy = 0; gy < room.gridSize; gy++) {
      for (let gx = 0; gx < room.gridSize; gx++) {
        const type = room.grid[gy][gx];
        const x = gx * room.cellSize;
        const y = gy * room.cellSize;
        if (type === 'wall') {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(x, y, room.cellSize, room.cellSize);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(x + 0.5, y + 0.5, room.cellSize - 1, room.cellSize - 1);
        }
      }
    }

    for (const obs of room.obstacles) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(obs.x, obs.y, obs.size, obs.size);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
      ctx.shadowColor = 'rgba(100,116,139,0.4)';
      ctx.shadowBlur = 8;
      ctx.strokeRect(obs.x, obs.y, obs.size, obs.size);
      ctx.shadowBlur = 0;
    }

    if (portalVisibleRef.current) {
      const { x, y } = room.portalPosition;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(portalRotationRef.current);
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 40 - i * 10, 0, Math.PI * 2);
        ctx.strokeStyle = i === 0 ? '#FFD700' : '#FFA500';
        ctx.lineWidth = 4 - i;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,215,0,0.2)';
      ctx.fill();
      ctx.restore();
    }

    for (const p of enemyModuleRef.current.getProjectiles()) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#FF4444';
      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (const e of enemyModuleRef.current.getEnemies()) {
      const half = e.size / 2;
      ctx.save();
      if (e.hitFlash > 0) {
        ctx.fillStyle = '#FFFFFF';
      } else {
        ctx.fillStyle = e.color;
      }
      ctx.shadowColor = e.slowed ? 'rgba(135,206,235,0.6)' : 'rgba(231,76,60,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillRect(e.x - half, e.y - half, e.size, e.size);
      ctx.shadowBlur = 0;
      if (e.type === 'elite') {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(e.x - half - 1, e.y - half - 1, e.size + 2, e.size + 2);
      }
      const hpPct = e.hp / e.maxHp;
      if (hpPct < 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - half, e.y - half - 6, e.size, 3);
        ctx.fillStyle = hpPct > 0.5 ? '#2ECC40' : hpPct > 0.25 ? '#FFD700' : '#E74C3C';
        ctx.fillRect(e.x - half, e.y - half - 6, e.size * hpPct, 3);
      }
      ctx.restore();
    }

    const effects: SkillEffect[] = skillModuleRef.current.getEffects();
    for (const eff of effects) {
      if (eff.type === 'fireball') {
        for (const p of eff.particles) {
          const a = p.life / p.maxLife;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * a, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = a;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (eff.exploded) {
          const t = 1 - eff.explosionTimer / 0.3;
          ctx.beginPath();
          ctx.arc(eff.x, eff.y, eff.explosionRadius * t, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,140,0,${0.6 * (1 - t)})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(eff.x, eff.y, eff.explosionRadius * t * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,215,0,${0.8 * (1 - t)})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,140,0,0.85)';
          ctx.shadowColor = '#FF8C00';
          ctx.shadowBlur = 15;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.beginPath();
          ctx.arc(eff.x - eff.vx * 0.015, eff.y - eff.vy * 0.015, eff.radius * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,215,0,0.9)';
          ctx.fill();
        }
      } else if (eff.type === 'frost') {
        const a = eff.life / eff.maxLife;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(135,206,235,${0.2 * a})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, eff.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(135,206,235,${0.6 * a})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, eff.radius * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,230,255,${0.4 * a})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (eff.type === 'lightning') {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 10;
        const segCount = eff.segments.length;
        const fadeStart = Math.max(0, segCount - 8);
        for (let i = 0; i < segCount; i++) {
          const s = eff.segments[i];
          const alpha = i < fadeStart ? 0.3 : 0.4 + 0.6 * ((i - fadeStart) / Math.max(1, segCount - fadeStart));
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(s.from.x, s.from.y);
          ctx.lineTo(s.to.x, s.to.y);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(playerRef.current.x, playerRef.current.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#3B82F6';
    ctx.shadowColor = 'rgba(59,130,246,0.6)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(147,197,253,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const dirX = playerRef.current.dx;
    const dirY = playerRef.current.dy;
    if (dirX !== 0 || dirY !== 0) {
      const angle = Math.atan2(dirY, dirX);
      ctx.beginPath();
      ctx.moveTo(
        playerRef.current.x + Math.cos(angle) * (PLAYER_RADIUS - 3),
        playerRef.current.y + Math.sin(angle) * (PLAYER_RADIUS - 3)
      );
      ctx.lineTo(
        playerRef.current.x + Math.cos(angle) * (PLAYER_RADIUS + 6),
        playerRef.current.y + Math.sin(angle) * (PLAYER_RADIUS + 6)
      );
      ctx.strokeStyle = '#93C5FD';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    if (fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }, [canvasSize, fadeAlpha]);

  useEffect(() => { render(); }, [render]);

  return (
    <div ref={containerRef} style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(180deg, #050614 0%, #0A0E27 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", system-ui, sans-serif'
    }}>
      <div style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(59,130,246,0.25), inset 0 0 0 1px rgba(59,130,246,0.25)',
        transition: 'width 0.3s, height 0.3s'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          style={{ display: 'block', transition: 'all 0.1s linear' }}
        />
        <HUD
          hp={hp}
          maxHp={MAX_HP}
          skills={skills}
          enemyCount={enemyCount}
          killedCount={killedInRoom}
          roomIndex={roomIndex}
        />
        <FPSMonitor fps={fps} />
        {portalVisible && (
          <div style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#FFD700',
            fontSize: 14,
            fontWeight: 700,
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 16px',
            borderRadius: 20,
            border: '1px solid #FFD70060',
            textShadow: '0 0 10px rgba(255,215,0,0.6)',
            animation: 'pulse 1.5s infinite',
            zIndex: 5
          }}>
            ✨ 传送门已开启！走进金色圆环进入下一房间
          </div>
        )}
        {hp <= 0 && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <h2 style={{ color: '#E74C3C', fontSize: 48, margin: 0, textShadow: '0 0 20px rgba(231,76,60,0.8)' }}>你被击败了</h2>
            <p style={{ color: '#fff', fontSize: 18, marginTop: 16 }}>
              总击杀数: <span style={{ color: '#FFD700' }}>{killedTotalRef.current}</span> ｜
              通过房间: <span style={{ color: '#3498DB' }}>{roomIndex - 1}</span>
            </p>
            <button
              onClick={() => {
                killedTotalRef.current = 0;
                setHp(MAX_HP);
                generateNewRoom(canvasSize.w, canvasSize.h);
              }}
              style={{
                marginTop: 24,
                padding: '12px 36px',
                fontSize: 16,
                fontWeight: 700,
                background: '#3B82F6',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(59,130,246,0.5)'
              }}
            >
              重新开始
            </button>
          </div>
        )}
      </div>
      <LowFPSBorder active={fps < 45} />
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        lineHeight: 1.8,
        background: 'rgba(0,0,0,0.3)',
        padding: '10px 16px',
        borderRadius: 8,
        border: '1px solid rgba(59,130,246,0.15)',
        userSelect: 'none'
      }}>
        <div><span style={{ color: '#3B82F6', fontWeight: 700 }}>WASD</span> 移动</div>
        <div><span style={{ color: '#FFD700', fontWeight: 700 }}>J</span> 火球 (冷却3s)</div>
        <div><span style={{ color: '#3498DB', fontWeight: 700 }}>K</span> 冰霜光环 (冷却5s)</div>
        <div><span style={{ color: '#9B59B6', fontWeight: 700 }}>L</span> 闪电链 (冷却8s)</div>
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
          50% { opacity: 0.7; transform: translateX(-50%) scale(1.05); }
        }
        .hud-group {
          transition: transform 0.3s ease !important;
        }
        .skill-icon {
          transition: transform 0.3s ease, filter 0.15s;
        }
        .skill-icon:hover {
          transform: translateY(-4px) scale(1.08);
        }
      `}</style>
    </div>
  );
}
