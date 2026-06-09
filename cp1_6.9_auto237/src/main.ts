import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0015',
  width: window.innerWidth,
  height: window.innerHeight,
  pixelArt: false,
  antialias: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    antialiasGL: true,
    transparent: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  scene: [GameScene]
};

class RuneSpellcraftGame {
  public game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game(config);
    this.setupWindowHandlers();
  }

  private setupWindowHandlers(): void {
    window.addEventListener('resize', () => {
      this.game.scale.resize(window.innerWidth, window.innerHeight);
      const scene = this.game.scene.getScene('GameScene');
      if (scene) {
        scene.events.emit('windowResized', {
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    });
  }
}

window.addEventListener('load', () => {
  new RuneSpellcraftGame();
});
