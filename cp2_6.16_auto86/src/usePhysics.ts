import { useRef, useCallback, useEffect } from 'react';
import type {
  Player,
  Bubble,
  TrackingSpike,
  Fragment,
  Boss,
  GameState,
} from './types';
import {
  GRAVITY,
  ELASTIC_BOUNCE,
  STICKY_DURATION,
  PLAYER_RADIUS,
  BUBBLE_BREATH_PERIOD,
  BOSS_ROTATION_SPEED,
  BOSS_SPIKE_SPEED,
  BOSS_SPIKE_INTERVAL,
  FRAGMENT_COUNT,
  FRAGMENT_LIFE,
  FRAGMENT_MIN_SPEED,
  FRAGMENT_MAX_SPEED,
  FRAGMENT_RADIUS,
  LAYER_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
} from './constants';

function generateSpikeId(): string {
  return `spike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getBreathScale(phase: number): number {
  return 1 + 0.1 * Math.sin(phase * Math.PI * 2);
}

function checkCircleCollision(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < r1 + r2;
}

function createFragments(bubble: Bubble): Fragment[] {
  const fragments: Fragment[] = [];
  for (let i = 0; i < FRAGMENT_COUNT; i++) {
    const angle = (i / FRAGMENT_COUNT) * Math.PI * 2 + Math.random() * 0.5;
    const speed = FRAGMENT_MIN_SPEED + Math.random() * (FRAGMENT_MAX_SPEED - FRAGMENT_MIN_SPEED);
    fragments.push({
      x: bubble.x,
      y: bubble.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: FRAGMENT_RADIUS,
      color: bubble.color,
      life: FRAGMENT_LIFE,
    });
  }
  return fragments;
}

export interface UsePhysicsReturn {
  player: Player;
  updatePhysics: (
    deltaTime: number,
    gameState: GameState,
    callbacks: {
      onHitSpike: () => void;
      onNextLevel: () => void;
      onDamageBoss: () => void;
      onDefeatBoss: () => void;
    }
  ) => {
    updatedBubbles: Bubble[][];
    updatedBoss: Boss | null;
    updatedSpikes: TrackingSpike[];
  };
  handleBubbleClick: (
    bubbleId: string,
    gameState: GameState,
    onHitSpike: () => void
  ) => boolean;
  resetPlayer: (x: number, y: number) => void;
}

export function usePhysics(initialX: number, initialY: number): UsePhysicsReturn {
  const playerRef = useRef<Player>({
    x: initialX,
    y: initialY,
    vy: 0,
    radius: PLAYER_RADIUS,
    isStuck: false,
    stuckTimer: 0,
    currentBubbleId: null,
  });

  const lastTimeRef = useRef<number>(0);

  const resetPlayer = useCallback((x: number, y: number) => {
    playerRef.current = {
      x,
      y,
      vy: 0,
      radius: PLAYER_RADIUS,
      isStuck: false,
      stuckTimer: 0,
      currentBubbleId: null,
    };
  }, []);

  const handleBubbleClick = useCallback(
    (bubbleId: string, gameState: GameState, onHitSpike: () => void): boolean => {
      const player = playerRef.current;
      let clickedBubble: Bubble | null = null;
      let clickedLayerIndex = -1;
      let clickedBubbleIndex = -1;

      for (let i = 0; i < gameState.bubbles.length; i++) {
        for (let j = 0; j < gameState.bubbles[i].length; j++) {
          if (gameState.bubbles[i][j].id === bubbleId) {
            clickedBubble = gameState.bubbles[i][j];
            clickedLayerIndex = i;
            clickedBubbleIndex = j;
            break;
          }
        }
        if (clickedBubble) break;
      }

      if (!clickedBubble || clickedBubble.isBroken) return false;

      const bubbleScale = getBreathScale(clickedBubble.breathPhase);
      const effectiveRadius = clickedBubble.radius * bubbleScale;

      if (
        !checkCircleCollision(
          player.x,
          player.y,
          player.radius,
          clickedBubble.x,
          clickedBubble.y,
          effectiveRadius + 30
        )
      ) {
        return false;
      }

      switch (clickedBubble.type) {
        case 'elastic':
          player.vy = ELASTIC_BOUNCE;
          player.isStuck = false;
          player.stuckTimer = 0;
          player.currentBubbleId = null;
          break;
        case 'sticky':
          player.isStuck = true;
          player.stuckTimer = STICKY_DURATION;
          player.vy = 0;
          player.x = clickedBubble.x;
          player.y = clickedBubble.y - effectiveRadius - player.radius;
          player.currentBubbleId = bubbleId;
          break;
        case 'fragile':
          clickedBubble.isBroken = true;
          clickedBubble.fragments = createFragments(clickedBubble);
          player.vy = ELASTIC_BOUNCE * 0.7;
          player.currentBubbleId = null;
          break;
        case 'spike':
          onHitSpike();
          player.vy = ELASTIC_BOUNCE * 0.5;
          break;
      }

      return true;
    },
    []
  );

  const updatePhysics = useCallback(
    (
      deltaTime: number,
      gameState: GameState,
      callbacks: {
        onHitSpike: () => void;
        onNextLevel: () => void;
        onDamageBoss: () => void;
        onDefeatBoss: () => void;
      }
    ) => {
      const player = playerRef.current;
      const dt = deltaTime / 16.67;

      if (player.isStuck) {
        player.stuckTimer -= deltaTime;
        if (player.stuckTimer <= 0) {
          player.isStuck = false;
          player.stuckTimer = 0;
          player.vy = -100;
          player.currentBubbleId = null;
        }
      } else {
        player.vy += GRAVITY * dt;
        player.y += player.vy * dt * 0.1;
      }

      const breathIncrement = (deltaTime / BUBBLE_BREATH_PERIOD) * dt;

      const updatedBubbles = gameState.bubbles.map((layer) =>
        layer.map((bubble) => {
          const updated = { ...bubble };
          updated.breathPhase = (updated.breathPhase + breathIncrement) % 1;

          updated.fragments = updated.fragments
            .map((frag) => ({
              ...frag,
              x: frag.x + frag.vx * dt,
              y: frag.y + frag.vy * dt,
              vy: frag.vy + GRAVITY * 0.5 * dt,
              life: frag.life - deltaTime,
            }))
            .filter((frag) => frag.life > 0);

          return updated;
        })
      );

      if (player.y > GAME_HEIGHT + 100) {
        callbacks.onHitSpike();
        player.y = gameState.cameraY + GAME_HEIGHT - 100;
        player.vy = 0;
      }

      let currentLayer = Math.floor((player.y + gameState.cameraY) / LAYER_HEIGHT);
      const targetLayer = gameState.level;
      
      if (currentLayer >= targetLayer) {
        callbacks.onNextLevel();
      }

      let updatedBoss = gameState.boss;
      let updatedSpikes = [...gameState.trackingSpikes];

      if (gameState.boss && gameState.phase === 'boss') {
        updatedBoss = { ...gameState.boss };
        updatedBoss.rotation = (updatedBoss.rotation + (BOSS_ROTATION_SPEED * deltaTime) / 1000) % 360;
        updatedBoss.spikeTimer += deltaTime;

        if (updatedBoss.spikeTimer >= BOSS_SPIKE_INTERVAL && updatedBoss.active) {
          updatedBoss.spikeTimer = 0;
          for (let i = 0; i < 3; i++) {
            const angle = (updatedBoss.rotation + (i / 3) * 360) * (Math.PI / 180);
            updatedSpikes.push({
              id: generateSpikeId(),
              x: updatedBoss.x,
              y: updatedBoss.y,
              vx: Math.cos(angle) * BOSS_SPIKE_SPEED,
              vy: Math.sin(angle) * BOSS_SPIKE_SPEED,
              speed: BOSS_SPIKE_SPEED,
              isReflected: false,
              active: true,
            });
          }
        }

        updatedSpikes = updatedSpikes
          .map((spike) => {
            if (!spike.active) return spike;

            const updated = { ...spike };

            if (!updated.isReflected) {
              const dx = player.x - updated.x;
              const dy = player.y - updated.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0) {
                updated.vx = (dx / dist) * updated.speed;
                updated.vy = (dy / dist) * updated.speed;
              }
            }

            updated.x += updated.vx * dt * 0.1;
            updated.y += updated.vy * dt * 0.1;

            if (
              updated.x < -50 ||
              updated.x > GAME_WIDTH + 50 ||
              updated.y < gameState.cameraY - 100 ||
              updated.y > gameState.cameraY + GAME_HEIGHT + 100
            ) {
              updated.active = false;
            }

            if (checkCircleCollision(updated.x, updated.y, 8, player.x, player.y, player.radius)) {
              if (!updated.isReflected) {
                callbacks.onHitSpike();
                updated.active = false;
              }
            }

            for (const layer of updatedBubbles) {
              for (const bubble of layer) {
                if (bubble.isBroken || bubble.type !== 'elastic') continue;
                const bubbleScale = getBreathScale(bubble.breathPhase);
                const effectiveRadius = bubble.radius * bubbleScale;
                if (
                  checkCircleCollision(
                    updated.x,
                    updated.y,
                    8,
                    bubble.x,
                    bubble.y,
                    effectiveRadius
                  )
                ) {
                  const dx = updated.x - bubble.x;
                  const dy = updated.y - bubble.y;
                  const dist = Math.sqrt(dx * dx + dy * dy);
                  if (dist > 0) {
                    updated.vx = (dx / dist) * updated.speed * 1.5;
                    updated.vy = (dy / dist) * updated.speed * 1.5;
                  }
                  updated.isReflected = true;
                }
              }
            }

            if (
              updated.isReflected &&
              updatedBoss &&
              updatedBoss.active &&
              checkCircleCollision(
                updated.x,
                updated.y,
                8,
                updatedBoss.x,
                updatedBoss.y,
                updatedBoss.radius
              )
            ) {
              callbacks.onDamageBoss();
              updated.active = false;
              if (updatedBoss.health <= 15) {
                updatedBoss.active = false;
                callbacks.onDefeatBoss();
              }
            }

            return updated;
          })
          .filter((s) => s.active);
      }

      return { updatedBubbles, updatedBoss, updatedSpikes };
    },
    []
  );

  return {
    player: playerRef.current,
    updatePhysics,
    handleBubbleClick,
    resetPlayer,
  };
}
