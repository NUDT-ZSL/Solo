import Phaser from 'phaser';
import { UnderwaterScene } from './scenes/UnderwaterScene.js';
import { PuzzleScene } from './scenes/PuzzleScene.js';
import { GAME_CONFIG } from './types.js';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a1628',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_CONFIG.BASE_SCENE_WIDTH,
    height: GAME_CONFIG.BASE_SCENE_HEIGHT
  },
  scene: [UnderwaterScene, PuzzleScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  input: {
    mouse: {
      preventDefaultWheel: true
    },
    touch: {
      capture: true
    }
  },
  fps: {
    target: GAME_CONFIG.TARGET_FPS,
    forceSetTimeOut: true
  }
};

new Phaser.Game(config);
