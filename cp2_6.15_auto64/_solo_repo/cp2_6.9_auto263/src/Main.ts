import { AudioEngine, DIFFICULTY_CONFIG, type Difficulty } from './AudioEngine';
import { SceneManager, type BlockState } from './SceneManager';

type GamePhase = 'idle' | 'showingSequence' | 'awaitingInput' | 'gameOver';

class Game {
  private audioEngine: AudioEngine;
  private sceneManager: SceneManager;
  private canvas: HTMLCanvasElement;

  private score: number = 0;
  private timeLeft: number = 30;
  private currentRound: number = 1;
  private difficulty: Difficulty = 'normal';
  private phase: GamePhase = 'idle';

  private currentSequence: string[] = [];
  private playerInputIndex: number = 0;

  private scoreDisplay: HTMLElement;
  private timeDisplay: HTMLElement;
  private startBtn: HTMLElement;
  private restartBtn: HTMLElement;
  private difficultySelect: HTMLSelectElement;
  private gameOverModal: HTMLElement;
  private finalScoreDisplay: HTMLElement;

  private timerIntervalId: number | null = null;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');

    this.audioEngine = new AudioEngine();
    this.sceneManager = new SceneManager(this.canvas);

    this.scoreDisplay = document.getElementById('scoreDisplay') as HTMLElement;
    this.timeDisplay = document.getElementById('timeDisplay') as HTMLElement;
    this.startBtn = document.getElementById('startBtn') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLElement;
    this.difficultySelect = document.getElementById('difficultySelect') as HTMLSelectElement;
    this.gameOverModal = document.getElementById('gameOverModal') as HTMLElement;
    this.finalScoreDisplay = document.getElementById('finalScore') as HTMLElement;

    if (
      !this.scoreDisplay || !this.timeDisplay || !this.startBtn ||
      !this.restartBtn || !this.difficultySelect || !this.gameOverModal ||
      !this.finalScoreDisplay
    ) {
      throw new Error('UI elements not found');
    }

    this.bindEvents();
    this.preloadAudio();
    this.startRenderLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.startGame());
    this.difficultySelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.difficulty = target.value as Difficulty;
      this.sceneManager.setDifficulty(this.difficulty);
      this.preloadAudio();
      if (this.phase !== 'idle' && this.phase !== 'gameOver') {
        this.startGame();
      }
    });
  }

  private preloadAudio(): void {
    const config = DIFFICULTY_CONFIG[this.difficulty];
    this.audioEngine.preloadNotes(config.notes);
  }

  private startGame(): void {
    this.audioEngine.init().then(() => {
      this.score = 0;
      this.timeLeft = 30;
      this.currentRound = 1;
      this.phase = 'idle';
      this.playerInputIndex = 0;
      this.currentSequence = [];

      this.updateUI();
      this.hideGameOver();
      this.sceneManager.clearHighlights();
      this.sceneManager.setDifficulty(this.difficulty);
      this.sceneManager.updateState({
        score: 0,
        timeLeft: 30,
        isPlaying: true,
        isShowingSequence: false,
        difficulty: this.difficulty,
        currentRound: 1
      });

      this.startTimer();
      this.startNewRound();
    });
  }

  private startTimer(): void {
    if (this.timerIntervalId !== null) {
      window.clearInterval(this.timerIntervalId);
    }
    this.timerIntervalId = window.setInterval(() => {
      this.timeLeft -= 1;
      this.updateUI();
      this.sceneManager.updateState({ timeLeft: this.timeLeft });

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerIntervalId !== null) {
      window.clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
  }

  private endGame(): void {
    this.stopTimer();
    this.phase = 'gameOver';
    this.sceneManager.updateState({ isPlaying: false });
    this.finalScoreDisplay.textContent = String(this.score);
    this.showGameOver();
  }

  private startNewRound(): void {
    if (this.phase === 'gameOver') return;

    const config = DIFFICULTY_CONFIG[this.difficulty];
    const maxNotes = config.notes.length;
    const baseLength = Math.min(3 + this.currentRound - 1, 6);
    const sequenceLength = Math.min(baseLength, maxNotes);

    this.currentSequence = this.generateRandomSequence(config.notes, sequenceLength);
    this.playerInputIndex = 0;

    this.showSequence();
  }

  private generateRandomSequence(notes: string[], length: number): string[] {
    const shuffled = [...notes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, length);
  }

  private async showSequence(): Promise<void> {
    this.phase = 'showingSequence';
    this.sceneManager.updateState({ isShowingSequence: true });

    const config = DIFFICULTY_CONFIG[this.difficulty];

    await new Promise(resolve => setTimeout(resolve, 400));

    for (let i = 0; i < this.currentSequence.length; i++) {
      if ((this.phase as GamePhase) === 'gameOver') return;

      const noteName = this.currentSequence[i];
      const blockIndex = config.notes.indexOf(noteName);

      if (blockIndex !== -1) {
        this.sceneManager.highlightBlock(blockIndex, 'sequence');
        this.audioEngine.playNote(noteName);
      }

      if (i < this.currentSequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    if ((this.phase as GamePhase) === 'gameOver') return;

    this.phase = 'awaitingInput';
    this.sceneManager.updateState({ isShowingSequence: false });
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.phase !== 'awaitingInput') return;

    const block = this.sceneManager.getBlockAt(e.clientX, e.clientY);
    if (!block) return;

    this.processPlayerInput(block);
  }

  private processPlayerInput(block: BlockState): void {
    const expectedNote = this.currentSequence[this.playerInputIndex];
    const isCorrect = block.noteName === expectedNote;

    if (isCorrect) {
      this.handleCorrectInput(block);
    } else {
      this.handleIncorrectInput(block);
    }
  }

  private handleCorrectInput(block: BlockState): void {
    this.score += 10;
    this.playerInputIndex++;

    this.sceneManager.highlightBlock(block.index, 'correct');
    this.audioEngine.playNote(block.noteName);
    this.sceneManager.updateState({ score: this.score });
    this.updateUI();

    if (this.playerInputIndex >= this.currentSequence.length) {
      this.currentRound++;
      this.sceneManager.updateState({ currentRound: this.currentRound });

      window.setTimeout(() => {
        if (this.phase !== 'gameOver') {
          this.startNewRound();
        }
      }, 600);
    }
  }

  private handleIncorrectInput(block: BlockState): void {
    this.score = Math.max(0, this.score - 5);

    this.sceneManager.highlightBlock(block.index, 'wrong');
    this.audioEngine.playErrorSound();
    this.sceneManager.updateState({ score: this.score });
    this.updateUI();

    window.setTimeout(() => {
      if (this.phase !== 'gameOver') {
        this.startNewRound();
      }
    }, 800);
  }

  private updateUI(): void {
    this.scoreDisplay.textContent = String(this.score);
    this.timeDisplay.textContent = String(Math.max(0, this.timeLeft));

    if (this.timeLeft <= 10) {
      this.timeDisplay.classList.add('danger');
    } else {
      this.timeDisplay.classList.remove('danger');
    }
  }

  private showGameOver(): void {
    this.gameOverModal.classList.add('visible');
  }

  private hideGameOver(): void {
    this.gameOverModal.classList.remove('visible');
  }

  private startRenderLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.lastFrameTime) this.lastFrameTime = timestamp;
      this.lastFrameTime = timestamp;

      this.sceneManager.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    this.stopTimer();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
