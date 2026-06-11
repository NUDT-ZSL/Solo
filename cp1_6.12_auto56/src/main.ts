import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { BeatScene } from './scenes/BeatScene';
import { SettingsScene } from './scenes/SettingsScene';
import { GameOverScene } from './scenes/GameOverScene';
import { DEFAULT_SETTINGS } from './types/gameTypes';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1A0A2E',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [MenuScene, BeatScene, SettingsScene, GameOverScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  audio: {
    disableWebAudio: false
  },
  input: {
    keyboard: {
      target: window
    },
    activePointers: 3
  }
};

const game = new Phaser.Game(config);

let currentSettings = { ...DEFAULT_SETTINGS };

game.events.on('ready', () => {
  console.log('BeatBounce 游戏已启动');
  console.log('配置:', JSON.stringify(config, null, 2));
});

window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

export { game, currentSettings, config };
