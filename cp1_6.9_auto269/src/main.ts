import Phaser from 'phaser';
import { BattleScene } from './scenes/BattleScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-canvas-wrapper',
  width: 480 + 80,
  height: 480 + 120,
  backgroundColor: 'transparent',
  scene: [BattleScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

new Phaser.Game(config);
