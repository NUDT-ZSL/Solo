import React, { useRef, useEffect, useState, useCallback } from 'react';
import Matter from 'matter-js';
import type { LevelElement, EnemyElement, CoinElement } from './types';

interface PreviewRunnerProps {
  elements: LevelElement[];
  isRunning: boolean;
  onStop: () => void;
  width: number;
}

const CANVAS_HEIGHT = 800;
const GRAVITY = 1.5;
const MOVE_SPEED = 3;
const JUMP_FORCE = -11;
const JUMP_HEIGHT = 64;
const JUMP_DURATION = 400;

interface FloatingText {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  text: string;
  startTime: number;
  color: string;
}

interface Enemy {
  body: Matter.Body;
  element: EnemyElement;
  startX: number;
  direction: number;
}

interface CoinBody {
  body: Matter.Body;
  element: CoinElement;
  collected: boolean;
}

const PreviewRunner: React.FC<PreviewRunnerProps> = ({ elements, isRunning, onStop, width }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerRef = useRef<Matter.Body | null>(null);
  const groundBodiesRef = useRef<Matter.Body[]>([]);
  const wallBodiesRef = useRef<Matter.Body[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const coinsRef = useRef<CoinBody[]>([]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const isJumpingRef = useRef(false);
  const jumpStartTimeRef = useRef(0);
  const isDamagedRef = useRef(false);
  const damageStartTimeRef = useRef(0);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const textIdCounterRef = useRef(0);
  const cameraXRef = useRef(0);
  const collectedCoinsRef = useRef<Set<string>>(new Set());
  const damagedEnemiesRef = useRef<Set<string>>(new Set());
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const isOnGroundRef = useRef(false);

  const [health, setHealth] = useState(3);
  const [score, setScore] = useState(0);
  const [simulationHealth, setSimulationHealth] = useState(3);
  const [simulationScore, setSimulationScore] = useState(0);

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (runnerRef.current) {
      Matter.Runner.stop(runnerRef.current);
    }
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
      Matter.Events.off(engineRef.current, 'collisionStart');
      Matter.Events.off(engineRef.current, 'collisionActive');
      Matter.Events.off(engineRef.current, 'collisionEnd');
    }
    engineRef.current = null;
    runnerRef.current = null;
    playerRef.current = null;
    groundBodiesRef.current = [];
    wallBodiesRef.current = [];
    enemiesRef.current = [];
    coinsRef.current = [];
    floatingTextsRef.current = [];
    collectedCoinsRef.current = new Set();
    damagedEnemiesRef.current = new Set();
    isJumpingRef.current = false;
    isDamagedRef.current = false;
    isOnGroundRef.current = false;
    cameraXRef.current = 0;

    if (overlayCanvasRef.current && overlayCanvasRef.current.parentNode) {
      overlayCanvasRef.current.parentNode.removeChild(overlayCanvasRef.current);
      overlayCanvasRef.current = null;
    }
  }, []);

  const initSimulation = useCallback(() => {
    cleanup();

    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY },
    });
    engineRef.current = engine;

    const groundBodies: Matter.Body[] = [];
    const wallBodies: Matter.Body[] = [];
    const enemies: Enemy[] = [];
    const coins: CoinBody[] = [];

    let minX = Infinity;

    elements.forEach((el) => {
      if (el.type === 'ground' || el.type === 'wall') {
        const body = Matter.Bodies.rectangle(
          el.x + el.width / 2,
          el.y + el.height / 2,
          el.width,
          el.height,
          {
            isStatic: true,
            label: el.type === 'ground' ? 'ground' : 'wall',
            friction: 0.5,
          }
        );
        if (el.type === 'ground') {
          groundBodies.push(body);
          if (el.x < minX) minX = el.x;
        } else {
          wallBodies.push(body);
        }
      } else if (el.type === 'enemy') {
        const body = Matter.Bodies.rectangle(el.x + 8, el.y + 8, 16, 16, {
          isStatic: false,
          label: 'enemy',
          friction: 0,
          frictionAir: 0,
          collisionFilter: {
            group: 0,
          },
        });
        (body as any).elementId = el.id;
        enemies.push({
          body,
          element: el,
          startX: el.x + 8,
          direction: 1,
        });
      } else if (el.type === 'coin') {
        const body = Matter.Bodies.rectangle(el.x + 8, el.y + 8, 16, 16, {
          isSensor: true,
          isStatic: true,
          label: 'coin',
        });
        (body as any).elementId = el.id;
        coins.push({
          body,
          element: el,
          collected: false,
        });
      }
    });

    const startX = minX !== Infinity ? minX + 16 : 100;
    const player = Matter.Bodies.rectangle(startX, 100, 16, 32, {
      label: 'player',
      friction: 0.1,
      frictionAir: 0.01,
      inertia: Infinity,
    });
    playerRef.current = player;
    groundBodiesRef.current = groundBodies;
    wallBodiesRef.current = wallBodies;
    enemiesRef.current = enemies;
    coinsRef.current = coins;

    const floor = Matter.Bodies.rectangle(600, CANVAS_HEIGHT + 100, 2400, 200, {
      isStatic: true,
      label: 'ground',
    });

    const worldBodies = [
      ...groundBodies,
      ...wallBodies,
      ...enemies.map(e => e.body),
      ...coins.map(c => c.body),
      player,
      floor,
    ];

    Matter.Composite.add(engine.world, worldBodies);

    Matter.Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        const labels = [bodyA.label, bodyB.label].sort();

        if (labels.includes('player') && (labels.includes('ground') || labels.includes('wall'))) {
          const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
          const otherBody = bodyA.label === 'player' ? bodyB : bodyA;

          if (playerBody.position.y < otherBody.position.y) {
            isOnGroundRef.current = true;
          }
        }

        if (labels.includes('player') && labels.includes('coin')) {
          const coinBody = bodyA.label === 'coin' ? bodyA : bodyB;
          const elementId = (coinBody as any).elementId as string;

          if (!collectedCoinsRef.current.has(elementId)) {
            collectedCoinsRef.current.add(elementId);

            const coin = coins.find(c => c.element.id === elementId);
            if (coin) {
              coin.collected = true;
              Matter.Composite.remove(engine.world, coin.body);

              setSimulationScore(prev => {
                const newScore = prev + coin.element.value;
                setScore(newScore);
                return newScore;
              });

              floatingTextsRef.current.push({
                id: textIdCounterRef.current++,
                x: coin.body.position.x,
                y: coin.body.position.y,
                targetX: width - 50,
                targetY: 50,
                text: `+${coin.element.value}`,
                startTime: performance.now(),
                color: '#fbbf24',
              });
            }
          }
        }

        if (labels.includes('player') && labels.includes('enemy')) {
          const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;
          const elementId = (enemyBody as any).elementId as string;

          if (!damagedEnemiesRef.current.has(elementId)) {
            damagedEnemiesRef.current.add(elementId);
            isDamagedRef.current = true;
            damageStartTimeRef.current = performance.now();

            setSimulationHealth(prev => {
              const newHealth = Math.max(0, prev - 1);
              setHealth(newHealth);
              if (newHealth <= 0) {
                setTimeout(onStop, 500);
              }
              return newHealth;
            });

            setTimeout(() => {
              damagedEnemiesRef.current.delete(elementId);
            }, 1000);
          }
        }
      }
    });

    Matter.Events.on(engine, 'collisionEnd', (event) => {
      const pairs = event.pairs;

      for (const pair of pairs) {
        const { bodyA, bodyB } = pair;
        const labels = [bodyA.label, bodyB.label].sort();

        if (labels.includes('player') && (labels.includes('ground') || labels.includes('wall'))) {
          isOnGroundRef.current = false;
        }
      }
    });

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = width;
    overlayCanvas.height = CANVAS_HEIGHT;
    overlayCanvas.style.position = 'absolute';
    overlayCanvas.style.top = '0';
    overlayCanvas.style.left = '0';
    overlayCanvas.style.pointerEvents = 'none';
    container.appendChild(overlayCanvas);
    overlayCanvasRef.current = overlayCanvas;

    setHealth(3);
    setScore(0);
    setSimulationHealth(3);
    setSimulationScore(0);
    lastTimeRef.current = performance.now();

    const gameLoop = (timestamp: number) => {
      if (!engineRef.current || !playerRef.current || !overlayCanvasRef.current) return;

      const now = timestamp;
      const player = playerRef.current;
      const currentHealth = simulationHealth;
      const currentScore = simulationScore;

      Matter.Body.setVelocity(player, {
        x: MOVE_SPEED,
        y: player.velocity.y,
      });

      if (isJumpingRef.current) {
        const jumpElapsed = now - jumpStartTimeRef.current;
        if (jumpElapsed >= JUMP_DURATION) {
          isJumpingRef.current = false;
        }
      }

      const playerBottom = player.position.y + 16;
      const playerRight = player.position.x + 8;

      for (const wall of wallBodies) {
        const wallWidth = wall.bounds.max.x - wall.bounds.min.x;
        const wallHeight = wall.bounds.max.y - wall.bounds.min.y;
        const wallLeft = wall.position.x - wallWidth / 2;
        const wallTop = wall.position.y - wallHeight / 2;

        const shouldJump =
          playerRight >= wallLeft - 4 &&
          playerRight <= wallLeft + 12 &&
          playerBottom >= wallTop + 4 &&
          player.position.y - 16 <= wallTop + wallHeight - 4 &&
          wallHeight <= JUMP_HEIGHT &&
          !isJumpingRef.current &&
          (isOnGroundRef.current || Math.abs(player.velocity.y) < 1.5);

        if (shouldJump) {
          Matter.Body.setVelocity(player, {
            x: MOVE_SPEED,
            y: JUMP_FORCE,
          });
          Matter.Body.setPosition(player, {
            x: player.position.x,
            y: player.position.y - 2,
          });
          isJumpingRef.current = true;
          jumpStartTimeRef.current = now;
          break;
        }
      }

      for (const enemy of enemies) {
        const { body, element, startX } = enemy;
        const patrolRange = element.patrolRange / 2;
        const minPosX = startX - patrolRange;
        const maxPosX = startX + patrolRange;

        Matter.Body.setVelocity(body, {
          x: enemy.direction * 1.5,
          y: body.velocity.y,
        });

        if (body.position.x <= minPosX) {
          enemy.direction = 1;
          Matter.Body.setPosition(body, { x: minPosX, y: body.position.y });
        } else if (body.position.x >= maxPosX) {
          enemy.direction = -1;
          Matter.Body.setPosition(body, { x: maxPosX, y: body.position.y });
        }
      }

      if (isDamagedRef.current && now - damageStartTimeRef.current >= 500) {
        isDamagedRef.current = false;
      }

      cameraXRef.current = Math.max(0, player.position.x - width / 3);

      floatingTextsRef.current = floatingTextsRef.current.filter(
        t => now - t.startTime < 800
      );

      const ctx = overlayCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, CANVAS_HEIGHT);

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);

        ctx.save();
        ctx.translate(-cameraXRef.current, 0);

        for (const el of elements) {
          if (el.type === 'ground') {
            const gradient = ctx.createLinearGradient(el.x, el.y, el.x, el.y + el.height);
            gradient.addColorStop(0, '#4ade80');
            gradient.addColorStop(1, '#22c55e');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            (ctx as any).roundRect(el.x, el.y, el.width, el.height, 4);
            ctx.fill();
          } else if (el.type === 'wall') {
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            (ctx as any).roundRect(el.x, el.y, el.width, el.height, 2);
            ctx.fill();
            ctx.strokeStyle = '#78350f';
            ctx.lineWidth = 1;
            for (let row = 0; row < el.height / 16; row++) {
              const y = el.y + row * 16;
              const offset = row % 2 === 0 ? 0 : 16;
              for (let col = 0; col < el.width / 16; col++) {
                const x = el.x + col * 16 + offset;
                ctx.strokeRect(x, y, 16, 16);
              }
            }
          } else if (el.type === 'enemy') {
            const cx = el.x + 8;
            const cy = el.y + 8;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(cx - el.patrolRange / 2, cy);
            ctx.lineTo(cx + el.patrolRange / 2, cy);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (el.type === 'coin') {
            if (!collectedCoinsRef.current.has(el.id)) {
              ctx.fillStyle = '#fbbf24';
              drawStar(ctx, el.x + 8, el.y + 8, 5, 8, 4);
            }
          }
        }

        if (playerRef.current) {
          const px = playerRef.current.position.x - 8;
          const py = playerRef.current.position.y - 16;

          if (isDamagedRef.current) {
            const flash = Math.floor((now - damageStartTimeRef.current) / 50) % 2;
            ctx.fillStyle = flash === 0 ? '#ef4444' : '#3b82f6';
          } else {
            ctx.fillStyle = '#3b82f6';
          }
          ctx.fillRect(px, py, 16, 32);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 3, py + 6, 3, 3);
          ctx.fillRect(px + 10, py + 6, 3, 3);
        }

        for (const text of floatingTextsRef.current) {
          const elapsed = now - text.startTime;
          const progress = elapsed / 800;
          const alpha = 1 - progress;
          const easeProgress = progress * progress * (3 - 2 * progress);
          const currentX = text.x + (text.targetX - text.x) * easeProgress;
          const currentY = text.y + (text.targetY - text.y) * easeProgress - 30 * easeProgress;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = text.color;
          ctx.font = 'bold 18px sans-serif';
          ctx.shadowColor = text.color;
          ctx.shadowBlur = 8;
          ctx.fillText(text.text, currentX - 15, currentY);
          ctx.restore();
        }

        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        (ctx as any).roundRect(width - 130, 10, 120, 75, 8);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`❤ ${currentHealth}/3`, width - 120, 40);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`★ ${currentScore}`, width - 120, 70);

        ctx.restore();
      }

      if (player.position.y > CANVAS_HEIGHT + 100) {
        onStop();
        return;
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [elements, width, onStop]);

  useEffect(() => {
    if (isRunning) {
      initSimulation();
    } else {
      cleanup();
    }
    return cleanup;
  }, [isRunning, initSimulation, cleanup]);

  useEffect(() => {
    if (isRunning && engineRef.current) {
      cleanup();
      setTimeout(initSimulation, 50);
    }
  }, [elements]);

  return (
    <div
      style={{
        width: width,
        height: CANVAS_HEIGHT,
        background: '#000000',
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        borderLeft: '1px solid #2e2e32',
        flexShrink: 0,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />

      {!isRunning && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            zIndex: 10,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#3b82f6">
            <polygon points="8,5 19,12 8,19" />
          </svg>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>点击「开始预览」运行模拟</p>
          {(health < 3 || score > 0) && (
            <p style={{ color: '#6b7280', fontSize: 12 }}>
              上次: ❤ {health}/3 &nbsp; ★ {score}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewRunner;
