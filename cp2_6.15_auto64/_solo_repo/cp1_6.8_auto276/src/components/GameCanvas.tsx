import React, { useRef, useEffect, useCallback } from 'react';
import { OrbitSystem } from '../game/OrbitSystem';
import { BallController } from '../game/BallController';

export interface GameCallbacks {
  onNodeActivated: (activated: number, total: number) => void;
  onDeath: () => void;
  onLevelComplete: () => void;
  onSwitchTriggered: () => void;
}

interface GameCanvasProps {
  level: number;
  paused: boolean;
  gameKey: number;
  callbacks: GameCallbacks;
}

export default function GameCanvas({ level, paused, gameKey, callbacks }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbitRef = useRef<OrbitSystem | null>(null);
  const ballRef = useRef<BallController | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const pausedRef = useRef(paused);
  const levelRef = useRef(level);
  const callbacksRef = useRef(callbacks);
  const inputRef = useRef({ mouseX: 0, mouseY: 0, active: false });
  const levelCompleteRef = useRef(false);
  const deadRef = useRef(false);
  const deathDelayRef = useRef(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { callbacksRef.current = callbacks; }, [callbacks]);

  const initLevel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const orbit = new OrbitSystem();
    orbit.generateLevel(levelRef.current, canvas.width, canvas.height);
    orbitRef.current = orbit;

    const ball = new BallController();
    const outerOrbit = orbit.orbits[0];
    ball.reset(0, -Math.PI / 2, orbit.centerX, orbit.centerY, outerOrbit.radius);
    ballRef.current = ball;

    levelCompleteRef.current = false;
    deadRef.current = false;
    deathDelayRef.current = 0;
    callbacksRef.current.onNodeActivated(0, orbit.getTotalNodes());
  }, [gameKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      if (orbitRef.current) {
        const w = rect.width;
        const h = rect.height;
        orbitRef.current.centerX = w / 2;
        orbitRef.current.centerY = h / 2;
        orbitRef.current.baseRadius = Math.min(w, h) * 0.36;
        orbitRef.current.generateLevel(levelRef.current, w, h);
        if (ballRef.current && orbitRef.current.orbits.length > 0) {
          const outerOrbit = orbitRef.current.orbits[0];
          ballRef.current.reset(0, -Math.PI / 2, orbitRef.current.centerX, orbitRef.current.centerY, outerOrbit.radius);
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    initLevel();
  }, [initLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      inputRef.current.mouseX = e.clientX - rect.left;
      inputRef.current.mouseY = e.clientY - rect.top;
      inputRef.current.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      inputRef.current.mouseX = t.clientX - rect.left;
      inputRef.current.mouseY = t.clientY - rect.top;
      inputRef.current.active = true;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      inputRef.current.mouseX = t.clientX - rect.left;
      inputRef.current.mouseY = t.clientY - rect.top;
      inputRef.current.active = true;
    };

    const handleMouseLeave = () => {
      inputRef.current.active = false;
    };

    const handleTouchEnd = () => {
      inputRef.current.active = false;
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return; }

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      const orbit = orbitRef.current;
      const ball = ballRef.current;
      if (!orbit || !ball) { rafRef.current = requestAnimationFrame(loop); return; }

      if (!pausedRef.current && !levelCompleteRef.current) {
        if (inputRef.current.active) {
          const mx = inputRef.current.mouseX;
          const my = inputRef.current.mouseY;
          const cx = orbit.centerX;
          const cy = orbit.centerY;
          const dx = mx - cx;
          const dy = my - cy;
          const maxDist = Math.min(w, h) * 0.5;
          orbit.tiltX = (dx / maxDist);
          orbit.tiltY = (dy / maxDist);
        } else {
          orbit.tiltX *= 0.92;
          orbit.tiltY *= 0.92;
        }

        if (ball.alive) {
          const accel = orbit.getTangentialAcceleration(ball.orbitIndex, ball.angle);
          ball.updateOrbit(orbit.centerX, orbit.centerY, orbit.orbits[ball.orbitIndex]?.radius ?? 100);
          ball.update(dt, accel);

          const nodeHit = orbit.checkNodeCollision(ball.orbitIndex, ball.angle, ball.ballRadius);
          if (nodeHit) {
            orbit.activateNode(nodeHit.orbitIdx, nodeHit.nodeIdx);
            const activated = orbit.getActivatedCount();
            const total = orbit.getTotalNodes();
            callbacksRef.current.onNodeActivated(activated, total);
            if (activated === total) {
              levelCompleteRef.current = true;
              setTimeout(() => callbacksRef.current.onLevelComplete(), 800);
            }
          }

          const switchHit = orbit.checkSwitchCollision(ball.orbitIndex, ball.angle, ball.ballRadius);
          if (switchHit) {
            orbit.triggerSwitch(switchHit.orbitIdx, switchHit.switchIdx);
            ball.reverse();
            callbacksRef.current.onSwitchTriggered();
          }

          const rampTarget = orbit.checkRampTransition(ball.orbitIndex, ball.angle);
          if (rampTarget !== null && ball.transitionCooldown <= 0) {
            const targetOrbit = orbit.orbits[rampTarget];
            if (targetOrbit) {
              ball.transitionTo(rampTarget, targetOrbit.radius);
            }
          }

          if (orbit.checkDangerCollision(ball.orbitIndex, ball.angle)) {
            ball.die();
            deadRef.current = true;
            deathDelayRef.current = 0;
            callbacksRef.current.onDeath();
          }
        } else {
          ball.update(dt, 0);
          deathDelayRef.current += dt;
        }

        orbit.update(dt);
      } else {
        orbit.update(0);
      }

      ctx.clearRect(0, 0, w, h);

      const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      bgGrad.addColorStop(0, '#0a0a2e');
      bgGrad.addColorStop(0.5, '#050520');
      bgGrad.addColorStop(1, '#000008');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      const time = now / 1000;
      orbit.render(ctx, time);
      ball.render(ctx, time);

      if (levelCompleteRef.current) {
        const alpha = Math.min(1, (time - lastTimeRef.current) * 0.5) * 0.15;
        ctx.fillStyle = `hsla(140, 100%, 70%, ${alpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      if (deadRef.current && deathDelayRef.current > 2.0) {
        deadRef.current = false;
        const outerOrbit = orbit.orbits[0];
        ball.reset(0, -Math.PI / 2, orbit.centerX, orbit.centerY, outerOrbit.radius);
        for (const orb of orbit.orbits) {
          for (const node of orb.nodes) node.activated = false;
          for (const sw of orb.switches) { sw.cooldown = 0; sw.justTriggered = false; }
        }
        orbit.burstParticles = [];
        callbacksRef.current.onNodeActivated(0, orbit.getTotalNodes());
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameKey]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
        cursor: 'crosshair',
      }}
    />
  );
}
