import Phaser from 'phaser';
import { GameScene } from './scene/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  canvas: document.getElementById('game') as HTMLCanvasElement,
  width: 800,
  height: 600,
  backgroundColor: '#2B1F3A',
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  }
};

new Phaser.Game(config);
