import Phaser from 'phaser';
import BuildScene from './BuildScene';

export const GAME_CONFIG = {
  BASE_WIDTH: 1280,
  BASE_HEIGHT: 720,
  CENTER: { x: 640, y: 400 },
  ORBIT: {
    innerRadius: 80,
    outerRadius: 380,
    rings: 4,
    slotsPerRing: [8, 12, 16, 20]
  },
  ENEMY: {
    maxCount: 30
  },
  TOWER: {
    maxCount: 12
  }
};

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {}

  create(): void {
    this.scene.start('BuildScene');
  }
}

const scaleConfig: Phaser.Types.Core.ScaleConfig = {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: GAME_CONFIG.BASE_WIDTH,
  height: GAME_CONFIG.BASE_HEIGHT,
  parent: 'game-container'
};

const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#0a0015',
  scale: scaleConfig,
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [BootScene, BuildScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

const game = new Phaser.Game(gameConfig);

window.addEventListener('resize', () => {
  game.scale.refresh();
});

export default game;
