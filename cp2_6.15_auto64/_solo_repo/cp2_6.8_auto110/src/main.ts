import { RocketState, updatePhysics } from './physics';
import {
  PlatformState,
  Particle,
  LandingStatus,
  checkLanding,
  createExplosionParticles,
  updateParticles
} from './collision';
import {
  Star,
  PlatformDecoration,
  createStars,
  createPlatformDecorations,
  drawBackground,
  drawRocket,
  drawPlatform,
  drawFuelBar,
  drawDashboard,
  drawAngleIndicator,
  drawThrustBar,
  drawParticles,
  drawStatusText,
  drawLowFuelVignette,
  drawFadeOverlay,
  drawTime
} from './renderer';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 700;
const MAX_FUEL = 100;
const MAX_THRUST = 10;
const PLATFORM_WIDTH = 120;
const PLATFORM_HEIGHT = 12;
const PLATFORM_AMPLITUDE = 80;
const PLATFORM_PERIOD = 3000;

interface GameState {
  rocket: RocketState;
  platform: PlatformState;
  particles: Particle[];
  stars: Star[];
  platformDecorations: PlatformDecoration[];
  landingStatus: LandingStatus;
  elapsedTime: number;
  startTime: number;
  successFlash: number;
  successTextAlpha: number;
  crashTextAlpha: number;
  crashTimer: number;
  fadeAlpha: number;
  fadeDirection: number;
  isFading: boolean;
  awaitingReset: boolean;
}

const keys: Record<string, boolean> = {};

function createInitialState(): GameState {
  const platformBaseX = CANVAS_WIDTH / 2;
  const platformY = CANVAS_HEIGHT - 100;

  return {
    rocket: {
      x: CANVAS_WIDTH / 2,
      y: 50,
      vx: 0,
      vy: 0,
      angle: 0,
      thrust: 0,
      fuel: MAX_FUEL
    },
    platform: {
      x: platformBaseX,
      y: platformY,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      baseX: platformBaseX
    },
    particles: [],
    stars: createStars(CANVAS_WIDTH, CANVAS_HEIGHT),
    platformDecorations: createPlatformDecorations(PLATFORM_WIDTH),
    landingStatus: 'flying',
    elapsedTime: 0,
    startTime: performance.now(),
    successFlash: 0,
    successTextAlpha: 0,
    crashTextAlpha: 0,
    crashTimer: 0,
    fadeAlpha: 0,
    fadeDirection: 0,
    isFading: false,
    awaitingReset: false
  };
}

function handleInput(rocket: RocketState): RocketState {
  const newRocket = { ...rocket };

  if (keys['KeyA'] || keys['ArrowLeft']) {
    newRocket.angle = Math.max(-30, newRocket.angle - 5);
  }
  if (keys['KeyD'] || keys['ArrowRight']) {
    newRocket.angle = Math.min(30, newRocket.angle + 5);
  }
  if (keys['KeyW'] || keys['ArrowUp']) {
    if (newRocket.fuel > 0) {
      newRocket.thrust = Math.min(MAX_THRUST, newRocket.thrust + 1);
    }
  }
  if (keys['KeyS'] || keys['ArrowDown']) {
    newRocket.thrust = Math.max(0, newRocket.thrust - 1);
  }

  return newRocket;
}

function updatePlatform(platform: PlatformState, currentTime: number): PlatformState {
  const phase = ((currentTime % PLATFORM_PERIOD) / PLATFORM_PERIOD) * Math.PI * 2;
  const offset = Math.sin(phase) * PLATFORM_AMPLITUDE;
  return {
    ...platform,
    x: platform.baseX + offset
  };
}

function main() {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get 2D context');
    return;
  }
  const gameCtx: CanvasRenderingContext2D = ctx;

  let gameState = createInitialState();

  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Space' && gameState.awaitingReset && !gameState.isFading) {
      gameState.isFading = true;
      gameState.fadeDirection = 1;
      gameState.fadeAlpha = 0;
    }

    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  let lastTime = performance.now();

  function gameLoop(currentTime: number) {
    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2);
    lastTime = currentTime;

    const gameTime = (currentTime - gameState.startTime) / 1000;

    if (gameState.isFading) {
      gameState.fadeAlpha += gameState.fadeDirection * deltaTime * (1 / 0.3) * 0.016;

      if (gameState.fadeDirection === 1 && gameState.fadeAlpha >= 1) {
        gameState.fadeAlpha = 1;
        const newState = createInitialState();
        newState.stars = gameState.stars;
        gameState = newState;
        gameState.fadeDirection = -1;
        gameState.isFading = true;
      } else if (gameState.fadeDirection === -1 && gameState.fadeAlpha <= 0) {
        gameState.fadeAlpha = 0;
        gameState.fadeDirection = 0;
        gameState.isFading = false;
      }
    }

    if (gameState.landingStatus === 'flying' && !gameState.isFading) {
      gameState.rocket = handleInput(gameState.rocket);
      gameState.rocket = updatePhysics(
        gameState.rocket,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        deltaTime
      );
      gameState.platform = updatePlatform(gameState.platform, currentTime);
      gameState.elapsedTime = gameTime;

      const status = checkLanding(gameState.rocket, gameState.platform);
      if (status !== 'flying') {
        gameState.landingStatus = status;
        if (status === 'success') {
          gameState.successFlash = 0.4;
          gameState.successTextAlpha = 1;
          gameState.rocket.vy = 0;
          gameState.rocket.vx = 0;
          gameState.awaitingReset = true;
        } else {
          gameState.particles = createExplosionParticles(
            gameState.rocket.x,
            gameState.rocket.y
          );
          gameState.crashTextAlpha = 1;
          gameState.crashTimer = 1.2;
          gameState.awaitingReset = true;
        }
      }
    }

    if (gameState.landingStatus === 'success') {
      gameState.successFlash = Math.max(0, gameState.successFlash - deltaTime * 0.016);
      gameState.successTextAlpha = Math.max(0, gameState.successTextAlpha - deltaTime * 0.016);
    }

    if (gameState.landingStatus === 'crashed') {
      gameState.particles = updateParticles(gameState.particles);
      gameState.crashTimer -= deltaTime * 0.016;
      if (gameState.crashTimer <= 0) {
        gameState.crashTextAlpha = Math.max(0, gameState.crashTextAlpha - deltaTime * 0.016 * 2);
      }
    }

    gameCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(gameCtx, CANVAS_WIDTH, CANVAS_HEIGHT, gameState.stars, gameTime);
    drawPlatform(gameCtx, gameState.platform, gameState.platformDecorations);

    if (gameState.landingStatus !== 'crashed') {
      drawRocket(gameCtx, gameState.rocket, gameState.successFlash);
    }

    drawParticles(gameCtx, gameState.particles);

    drawDashboard(gameCtx, gameState.rocket, gameState.platform, gameState.elapsedTime);
    drawTime(gameCtx, gameState.elapsedTime, CANVAS_WIDTH);
    drawFuelBar(gameCtx, gameState.rocket.fuel, MAX_FUEL, gameTime);
    drawAngleIndicator(gameCtx, gameState.rocket.angle);
    drawThrustBar(gameCtx, gameState.rocket.thrust, MAX_THRUST, CANVAS_WIDTH);

    drawLowFuelVignette(
      gameCtx,
      gameState.rocket.fuel,
      MAX_FUEL,
      gameTime,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );

    if (gameState.landingStatus === 'success' && gameState.successTextAlpha > 0) {
      drawStatusText(
        gameCtx,
        '着陆成功！',
        '#FFFFFF',
        gameState.successTextAlpha,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        32
      );
    }

    if (gameState.landingStatus === 'crashed' && gameState.crashTextAlpha > 0) {
      drawStatusText(
        gameCtx,
        '坠毁！',
        '#E53935',
        gameState.crashTextAlpha,
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        36
      );
    }

    if (gameState.awaitingReset && gameState.landingStatus !== 'flying' && !gameState.isFading) {
      gameCtx.fillStyle = '#FFFFFF';
      gameCtx.font = '16px monospace';
      gameCtx.textAlign = 'center';
      gameCtx.globalAlpha = 0.7 + 0.3 * Math.sin(gameTime * 4);
      gameCtx.fillText('按空格键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
      gameCtx.globalAlpha = 1;
      gameCtx.textAlign = 'left';
    }

    if (gameState.fadeAlpha > 0) {
      drawFadeOverlay(gameCtx, gameState.fadeAlpha, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

main();
