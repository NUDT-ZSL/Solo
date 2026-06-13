import { eventBus, GameEvent } from './EventBus';
import { gameLoop } from './GameLoop';
import { unitManager } from '../units/UnitManager';
import { waveManager } from '../levels/WaveManager';
import { canvasRenderer } from '../renderer/CanvasRenderer';
import { gameState } from '../state/GameState';
import { Position, PlantType } from '../types/gameTypes';

class GameManager {
  private isInitialized: boolean = false;

  init(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    gameLoop;
    waveManager;
    canvasRenderer;
    unitManager;
    gameState;

    console.log('FloraFormation 游戏初始化');
  }

  startGame(): void {
    gameState.reset();
    unitManager.reset();
    eventBus.emit(GameEvent.GAME_START);
  }

  restartGame(): void {
    eventBus.emit(GameEvent.GAME_RESTART);
    setTimeout(() => {
      eventBus.emit(GameEvent.GAME_START);
    }, 50);
  }

  selectPlant(plantType: PlantType | null): void {
    eventBus.emit(GameEvent.UI_SELECT_PLANT, plantType);
  }

  handleCanvasClick(pos: Position): void {
    const state = gameState.getState();
    if (state.isGameOver) return;

    const cell = unitManager.getCellAtPosition(pos.x, pos.y);
    if (!cell) return;

    if (state.selectedPlant && !cell.occupied) {
      if (gameState.canAfford(state.selectedPlant)) {
        unitManager.placePlant(cell.q, cell.r, state.selectedPlant);
      }
    }
  }

  handleCanvasMouseMove(pos: Position): void {
    eventBus.emit(GameEvent.CANVAS_MOUSE_MOVE, pos);
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    canvasRenderer.setCanvas(canvas);
  }

  resizeCanvas(): void {
    canvasRenderer.resize();
  }

  getGameState() {
    return gameState.getState();
  }

  getWaveInfo() {
    return {
      currentWave: waveManager.getCurrentWave(),
      timeToNextWave: waveManager.getTimeToNextWave(),
    };
  }
}

export const gameManager = new GameManager();
export default gameManager;
