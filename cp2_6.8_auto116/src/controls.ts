export interface GameConfig {
  aiSpeed: number;
  respawnDelay: number;
  crystalDropRate: number;
  canvasWidth: number;
  canvasHeight: number;
  playerSpeed: number;
  laserRange: number;
  crystalSpeed: number;
  enemyAcceleratedSpeed: number;
  enemyShootDistance: number;
  bulletSpeed: number;
  enemyHp: number;
  invincibleDuration: number;
  hitFlashDuration: number;
  maxParticles: number;
}

export const gameConfig: GameConfig = {
  aiSpeed: 1.5,
  respawnDelay: 15,
  crystalDropRate: 3,
  canvasWidth: 800,
  canvasHeight: 600,
  playerSpeed: 3,
  laserRange: 150,
  crystalSpeed: 2,
  enemyAcceleratedSpeed: 2.5,
  enemyShootDistance: 80,
  bulletSpeed: 3,
  enemyHp: 3,
  invincibleDuration: 60,
  hitFlashDuration: 9,
  maxParticles: 200
};

export interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
}

export const keys: KeyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
};

export function initControls(resetCallback: () => void): void {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = true;
    if (key === 'a') keys.a = true;
    if (key === 's') keys.s = true;
    if (key === 'd') keys.d = true;
    if (key === ' ') {
      keys.space = true;
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keys.w = false;
    if (key === 'a') keys.a = false;
    if (key === 's') keys.s = false;
    if (key === 'd') keys.d = false;
    if (key === ' ') keys.space = false;
  });

  const aiSpeedSlider = document.getElementById('aiSpeed') as HTMLInputElement;
  const respawnSlider = document.getElementById('respawnDelay') as HTMLInputElement;
  const crystalSlider = document.getElementById('crystalDropRate') as HTMLInputElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  const aiSpeedValue = document.getElementById('aiSpeedValue') as HTMLElement;
  const respawnValue = document.getElementById('respawnValue') as HTMLElement;
  const crystalValue = document.getElementById('crystalValue') as HTMLElement;

  if (aiSpeedSlider) {
    aiSpeedSlider.addEventListener('input', () => {
      gameConfig.aiSpeed = parseFloat(aiSpeedSlider.value);
      if (aiSpeedValue) aiSpeedValue.textContent = aiSpeedSlider.value;
    });
  }

  if (respawnSlider) {
    respawnSlider.addEventListener('input', () => {
      gameConfig.respawnDelay = parseFloat(respawnSlider.value);
      if (respawnValue) respawnValue.textContent = respawnSlider.value;
    });
  }

  if (crystalSlider) {
    crystalSlider.addEventListener('input', () => {
      gameConfig.crystalDropRate = parseInt(crystalSlider.value, 10);
      if (crystalValue) crystalValue.textContent = crystalSlider.value;
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', resetCallback);
  }

  handleResponsiveCanvas();
  window.addEventListener('resize', handleResponsiveCanvas);
}

export function handleResponsiveCanvas(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  if (window.innerWidth < 768) {
    gameConfig.canvasWidth = 400;
    gameConfig.canvasHeight = 300;
  } else {
    gameConfig.canvasWidth = 800;
    gameConfig.canvasHeight = 600;
  }

  canvas.width = gameConfig.canvasWidth;
  canvas.height = gameConfig.canvasHeight;
}
