import { Application, Container } from 'pixi.js';
import { GameManager, GamePhase } from './managers/GameManager';
import { BattleScene } from './scenes/BattleScene';
import { ResultScene } from './scenes/ResultScene';
import { RuneTeam } from './entities/Rune';
import { GameStats } from './managers/GameManager';

class RuneFrontline {
  private app: Application;
  private gameManager: GameManager;
  private battleScene!: BattleScene;
  private resultScene!: ResultScene | null;
  private currentScene: Container | null = null;

  constructor() {
    this.app = new Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      antialias: true,
    });
    this.gameManager = new GameManager();

    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(this.app.view as HTMLCanvasElement);
    }

    window.addEventListener('resize', () => this.onResize());

    this.app.ticker.add((delta: number) => {
      if (this.battleScene && this.currentScene === this.battleScene) {
        this.battleScene.update(delta);
      }
      if (this.resultScene && this.currentScene === this.resultScene) {
        this.resultScene.update(delta);
      }
    });

    (this.app.view as HTMLCanvasElement).addEventListener('pointerdown', (e: PointerEvent) => {
      if (this.battleScene && this.currentScene === this.battleScene) {
        this.battleScene.handleBoardClick(e.clientX, e.clientY);
      }
    });

    this.showBattleScene();
  }

  private showBattleScene(): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene);
    }
    if (this.resultScene) {
      this.resultScene.destroy();
      this.resultScene = null;
    }

    this.gameManager.reset();
    this.battleScene = new BattleScene(this.gameManager);
    this.battleScene.setOnGameEnd((winner: RuneTeam, stats: GameStats) => {
      this.showResultScene(winner, stats);
    });
    this.battleScene.showDeployUI();

    this.app.stage.addChild(this.battleScene);
    this.currentScene = this.battleScene;
    this.onResize();
  }

  private showResultScene(winner: RuneTeam, stats: GameStats): void {
    if (this.currentScene) {
      this.app.stage.removeChild(this.currentScene);
    }

    this.resultScene = new ResultScene();
    this.resultScene.setOnRestart(() => {
      this.showBattleScene();
    });
    this.resultScene.showResult(winner, stats);

    this.app.stage.addChild(this.resultScene);
    this.currentScene = this.resultScene;
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.app.renderer.resize(w, h);

    if (this.battleScene && this.currentScene === this.battleScene) {
      this.battleScene.layout(w, h);
    }
  }
}

new RuneFrontline();
