import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;

class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {}

  create(): void {
    this.scene.start('GameScene');
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0a0a2a',
  pixelArt: false,
  roundPixels: false,
  autoFocus: true,
  disableContextMenu: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 600 },
      debug: false
    }
  },

  audio: {
    disableWebAudio: false,
    noAudio: false
  },

  render: {
    antialias: true,
    antialiasGL: true,
    powerPreference: 'high-performance',
    batchSize: 2048,
    maxTextures: -1,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR'
  },

  fps: {
    target: 60,
    forceSetTimeOut: false
  },

  scene: [PreloadScene, GameScene]
};

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (container) {
    new Phaser.Game({
      ...config,
      parent: container
    });
  } else {
    new Phaser.Game(config);
  }
});
