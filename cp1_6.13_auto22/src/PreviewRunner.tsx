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
const JUMP_FORCE = -12;
const JUMP_HEIGHT = 64;
const JUMP_DURATION = 400;

interface FloatingText {
  id: number;
  x: number;
  y: number;
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
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const playerRef = useRef<Matter.Body | null>(null);
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
    if (renderRef.current) {
      Matter.Render.stop(renderRef.current);
      renderRef.current.canvas.remove();
    }
    if (engineRef.current) {
      Matter.Engine.clear(engineRef.current);
    }
    engineRef.current = null;
    renderRef.current = null;
    runnerRef.current = null;
    playerRef.current = null;
    enemiesRef.current = [];
    coinsRef.current = [];
    floatingTextsRef.current = [];
    collectedCoinsRef.current = new Set();
    damagedEnemiesRef.current = new Set();
    isJumpingRef.current = false;
    isDamagedRef.current = false;
    cameraXRef.current = 0;
  }, []);

  const initSimulation = useCallback(() => {
    cleanup();

    const container = containerRef.current;
    if (!container) return;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY },
    });
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: container,
      engine: engine,
      options: {
        width: width,
        height: CANVAS_HEIGHT,
        wireframes: false,
        background: '#000000',
        showAngleIndicator: false,
        showCollisions: false,
        showVelocity: false,
      },
    });
    renderRef.current = render;

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
            render: {
              fillStyle: el.type === 'ground' ? '#22c55e' : '#92400e',
            },
          }
        );
        if (el.type === 'ground') {
          groundBodies.push(body);
          if (el.x < minX) minX = el.x;
        } else {
          wallBodies.push(body);
        }
      } else if (el.type === 'enemy') {
        const body = Matter.Bodies.circle(el.x + 8, el.y + 8, 8, {
          isStatic: false,
          render: {
            fillStyle: '#ef4444',
          },
          label: 'enemy',
        });
        enemies.push({
          body,
          element: el,
          startX: el.x + 8,
          direction: 1,
        });
      } else if (el.type === 'coin') {
        const body = Matter.Bodies.circle(el.x + 8, el.y + 8, 8, {
          isSensor: true,
          isStatic: true,
          render: {
            fillStyle: '#fbbf24',
          },
          label: 'coin',
        });
        coins.push({
          body,
          element: el,
          collected: false,
        });
      }
    });

    const startX = minX !== Infinity ? minX + 16 : 100;
    const player = Matter.Bodies.rectangle(startX, 100, 16, 32, {
      render: {
        fillStyle: '#3b82f6',
      },
      label: 'player',
      friction: 0.1,
      frictionAir: 0.02,
    });
    playerRef.current = player;
    enemiesRef.current = enemies;
    coinsRef.current = coins;

    const floor = Matter.Bodies.rectangle(600, CANVAS_HEIGHT + 50, 1200, 100, {
      isStatic: true,
      render: {
        fillStyle: '#1a1a1e',
      },
    });

    Matter.Composite.add(engine.world, [
      ...groundBodies,
      ...wallBodies,
      ...enemies.map(e => e.body),
      ...coins.map(c => c.body),
      player,
      floor,
    ]);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);
    Matter.Render.run(render);

    setHealth(3);
    setScore(0);
    setSimulationHealth(3);
    setSimulationScore(0);
    lastTimeRef.current = performance.now();

    const gameLoop = (timestamp: number) => {
      if (!engineRef.current || !playerRef.current || !renderRef.current) return;

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const player = playerRef.current;
      const now = timestamp;

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

      wallBodies.forEach(wall => {
        const wallLeft = wall.position.x - (wall.bounds.max.x - wall.bounds.min.x) / 2;
        const wallTop = wall.position.y - (wall.bounds.max.y - wall.bounds.min.y) / 2;
        const wallRight = wall.position.x + (wall.bounds.max.x - wall.bounds.min.x) / 2;
        const wallHeight = wall.bounds.max.y - wall.bounds.min.y;

        if (
          playerRight >= wallLeft - 2 &&
          playerRight <= wallLeft + 10 &&
          playerBottom >= wallTop &&
          player.position.y - 16 <= wallTop + wallHeight &&
          wallHeight <= JUMP_HEIGHT &&
          !isJumpingRef.current &&
          Math.abs(player.velocity.y) < 0.5
        ) {
          Matter.Body.setVelocity(player, {
            x: MOVE_SPEED,
            y: JUMP_FORCE,
          });
          isJumpingRef.current = true;
          jumpStartTimeRef.current = now;
        }
      });

      enemies.forEach(enemy => {
        const { body, element, startX, direction } = enemy;
        const patrolRange = element.patrolRange / 2;
        const minX = startX - patrolRange;
        const maxX = startX + patrolRange;

        Matter.Body.setPosition(body, {
          x: body.position.x + direction * 1.5,
          y: body.position.y,
        });

        if (body.position.x <= minX) {
          enemy.direction = 1;
        } else if (body.position.x >= maxX) {
          enemy.direction = -1;
        }

        const dx = Math.abs(body.position.x - player.position.x);
        const dy = Math.abs(body.position.y - player.position.y);

        if (dx < 20 && dy < 24 && !damagedEnemiesRef.current.has(element.id)) {
          damagedEnemiesRef.current.add(element.id);
          isDamagedRef.current = true;
          damageStartTimeRef.current = now;
          
          setSimulationHealth(prev => {
            const newHealth = Math.max(0, prev - 1);
            setHealth(newHealth);
            if (newHealth <= 0) {
              setTimeout(onStop, 500);
            }
            return newHealth;
          });

          setTimeout(() => {
            damagedEnemiesRef.current.delete(element.id);
          }, 1000);
        }
      });

      coins.forEach(coin => {
        if (coin.collected) return;

        const dx = Math.abs(coin.body.position.x - player.position.x);
        const dy = Math.abs(coin.body.position.y - player.position.y);

        if (dx < 20 && dy < 24 && !collectedCoinsRef.current.has(coin.element.id)) {
          coin.collected = true;
          collectedCoinsRef.current.add(coin.element.id);
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
            text: `+${coin.element.value}`,
            startTime: now,
            color: '#fbbf24',
          });
        }
      });

      if (isDamagedRef.current && now - damageStartTimeRef.current >= 500) {
        isDamagedRef.current = false;
      }

      cameraXRef.current = Math.max(0, player.position.x - width / 3);

      floatingTextsRef.current = floatingTextsRef.current.filter(
        t => now - t.startTime < 800
      );

      const ctx = render.canvas.getContext('2d');
      if (ctx) {
        ctx.save();

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, CANVAS_HEIGHT);

        ctx.save();
        ctx.translate(-cameraXRef.current, 0);

        elements.forEach(el => {
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
          } else if (el.type === 'coin') {
            if (!collectedCoinsRef.current.has(el.id)) {
              ctx.fillStyle = '#fbbf24';
              drawStar(ctx, el.x + 8, el.y + 8, 5, 8, 4);
            }
          }
        });

        if (playerRef.current) {
          const px = playerRef.current.position.x - 8;
          const py = playerRef.current.position.y - 16;

          if (isDamagedRef.current) {
            const flash = Math.floor((now - damageStartTimeRef.current) / 50) % 2;
            if (flash === 0) {
              ctx.fillStyle = '#ef4444';
            } else {
              ctx.fillStyle = '#3b82f6';
            }
          } else {
            ctx.fillStyle = '#3b82f6';
          }
          ctx.fillRect(px, py, 16, 32);

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 3, py + 6, 3, 3);
          ctx.fillRect(px + 10, py + 6, 3, 3);
        }

        floatingTextsRef.current.forEach(text => {
          const elapsed = now - text.startTime;
          const progress = elapsed / 800;
          const alpha = 1 - progress;
          const offsetY = progress * 40;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = text.color;
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText(text.text, text.x - 10, text.y - offsetY);
          ctx.restore();
        });

        ctx.restore();

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(width - 120, 10, 110, 70);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`❤ ${simulationHealth}/3`, width - 110, 35);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`★ ${simulationScore}`, width - 110, 60);

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
      initSimulation();
    }
  }, [elements, isRunning, cleanup, initSimulation]);

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
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
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
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="#3b82f6">
            <polygon points="8,5 19,12 8,19" />
          </svg>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>点击「开始预览」运行模拟</p>
          {health < 3 || score > 0 ? (
            <p style={{ color: '#6b7280', fontSize: 12 }}>
              上次: ❤ {health}/3 &nbsp; ★ {score}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PreviewRunner;
