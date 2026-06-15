import Phaser from 'phaser';
import { PhysicsScene } from './scenes/PhysicsScene';
import { GUIScene } from './scenes/GUIScene';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 225;

export const SCALE_DATA = {
  scale: 1,
  baseWidth: BASE_WIDTH,
  baseHeight: BASE_HEIGHT,
  currentWidth: BASE_WIDTH,
  currentHeight: BASE_HEIGHT
};

export class GameData {
  static timeScale: number = 1;
  static repairProgress: number = 0;
  static totalTargets: number = 3;
  static repairedTargets: number = 0;
  static fps: number = 60;

  static reset(): void {
    GameData.timeScale = 1;
    GameData.repairProgress = 0;
    GameData.totalTargets = 3;
    GameData.repairedTargets = 0;
    GameData.fps = 60;
  }
}

function calculateScale(): { scale: number; w: number; h: number } {
  const windowRatio = window.innerWidth / window.innerHeight;
  const targetRatio = BASE_WIDTH / BASE_HEIGHT;

  let width: number;
  let height: number;

  if (windowRatio > targetRatio) {
    height = Math.max(MIN_HEIGHT, Math.min(BASE_HEIGHT, window.innerHeight));
    width = height * targetRatio;
  } else {
    width = Math.max(MIN_WIDTH, Math.min(BASE_WIDTH, window.innerWidth));
    height = width / targetRatio;
  }

  const scale = width / BASE_WIDTH;
  return { scale, w: Math.floor(width), h: Math.floor(height) };
}

function initGame(): void {
  const { scale, w, h } = calculateScale();
  SCALE_DATA.scale = scale;
  SCALE_DATA.currentWidth = w;
  SCALE_DATA.currentHeight = h;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#3E2723',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE_WIDTH,
      height: BASE_HEIGHT
    },
    scene: [PhysicsScene, GUIScene],
    fps: {
      target: 60,
      forceSetTimeOut: true
    },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: false
    }
  };

  const game = new Phaser.Game(config);

  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      const newScale = calculateScale();
      SCALE_DATA.scale = newScale.scale;
      SCALE_DATA.currentWidth = newScale.w;
      SCALE_DATA.currentHeight = newScale.h;
      game.scale.resize(BASE_WIDTH, BASE_HEIGHT);
      game.events.emit('resize');
    }, 100);
  });
}

window.addEventListener('DOMContentLoaded', initGame);
