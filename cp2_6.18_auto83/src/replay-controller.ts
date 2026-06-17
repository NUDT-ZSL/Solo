import { GameState, PlayRecord, Player, Card } from './types';
import { UIRenderer } from './ui-renderer';

export interface ReplayStep {
  stepIndex: number;
  playRecord?: PlayRecord;
  players: Player[];
  description: string;
}

export class ReplayController {
  private gameState: GameState | null = null;
  private currentStep: number = 0;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private lastFrameTime: number = 0;
  private stepAccumulator: number = 0;
  private renderer: UIRenderer;
  private onStepChange?: (step: number) => void;
  private onStateChange?: (state: GameState) => void;
  private animationFrameId: number | null = null;
  private initialPlayers: Player[] = [];

  private readonly MIN_FPS = 30;
  private readonly SEEK_THROTTLE_MS = 1000 / this.MIN_FPS;
  private lastSeekRenderTime: number = 0;
  private pendingSeekStep: number | null = null;
  private seekAnimationFrameId: number | null = null;
  private isSeeking: boolean = false;

  constructor(renderer: UIRenderer) {
    this.renderer = renderer;
  }

  public loadGame(gameState: GameState): void {
    this.gameState = { ...gameState };
    this.currentStep = 0;
    this.isPlaying = false;
    this.stepAccumulator = 0;

    this.initialPlayers = gameState.players.map(p => ({
      ...p,
      hand: [...this.getInitialHand(gameState, p.id)]
    }));

    this.renderReplayState();
  }

  private getInitialHand(gameState: GameState, playerId: string): Card[] {
    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return [];

    let currentHand = [...player.hand];

    for (let i = gameState.playHistory.length - 1; i >= 0; i--) {
      const record = gameState.playHistory[i];
      if (record.playerId === playerId) {
        currentHand = [...record.cards, ...currentHand];
      }
    }

    return currentHand;
  }

  public play(): void {
    if (!this.gameState || this.isPlaying) return;
    if (this.currentStep >= this.getTotalSteps()) return;

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animationLoop();
  }

  public pause(): void {
    this.isPlaying = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public seekTo(step: number): void {
    if (!this.gameState) return;

    const totalSteps = this.getTotalSteps();
    const clampedStep = Math.max(0, Math.min(step, totalSteps));
    this.pendingSeekStep = clampedStep;

    if (this.isPlaying) {
      this.pause();
    }

    const now = performance.now();
    const timeSinceLastRender = now - this.lastSeekRenderTime;

    if (timeSinceLastRender >= this.SEEK_THROTTLE_MS) {
      this.executeSeek(clampedStep);
      this.lastSeekRenderTime = now;
    } else {
      if (this.seekAnimationFrameId === null) {
        this.scheduleSeekRender();
      }
    }
  }

  private scheduleSeekRender(): void {
    const now = performance.now();
    const timeSinceLastRender = now - this.lastSeekRenderTime;
    const delay = Math.max(0, this.SEEK_THROTTLE_MS - timeSinceLastRender);

    setTimeout(() => {
      this.seekAnimationFrameId = requestAnimationFrame(() => {
        if (this.pendingSeekStep !== null) {
          this.executeSeek(this.pendingSeekStep);
          this.lastSeekRenderTime = performance.now();
          this.pendingSeekStep = null;
        }
        this.seekAnimationFrameId = null;
      });
    }, delay);
  }

  private executeSeek(step: number): void {
    if (!this.gameState) return;

    this.currentStep = step;
    this.isSeeking = false;

    this.renderReplayState();

    if (this.onStepChange) {
      this.onStepChange(this.currentStep);
    }
  }

  public getCurrentStep(): number {
    return this.currentStep;
  }

  public getTotalSteps(): number {
    if (!this.gameState) return 0;
    return this.gameState.playHistory.length;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentPlayRecord(): PlayRecord | null {
    if (!this.gameState || this.currentStep === 0) return null;
    const index = Math.floor(this.currentStep) - 1;
    if (index < 0 || index >= this.gameState.playHistory.length) return null;
    return this.gameState.playHistory[index];
  }

  public getReplaySteps(): ReplayStep[] {
    if (!this.gameState) return [];

    const steps: ReplayStep[] = [];
    let playersState = this.initialPlayers.map(p => ({ ...p, hand: [...p.hand] }));

    steps.push({
      stepIndex: 0,
      players: playersState.map(p => ({ ...p, hand: [...p.hand] })),
      description: '游戏开始'
    });

    for (let i = 0; i < this.gameState.playHistory.length; i++) {
      const record = this.gameState.playHistory[i];
      const player = playersState.find(p => p.id === record.playerId);
      if (player) {
        player.hand = player.hand.filter(c => !record.cards.some(rc => rc.id === c.id));
      }

      const playerName = this.gameState.players.find(p => p.id === record.playerId)?.name || '未知';
      steps.push({
        stepIndex: i + 1,
        playRecord: record,
        players: playersState.map(p => ({ ...p, hand: [...p.hand] })),
        description: `${playerName} 出牌 ${record.cards.length} 张`
      });
    }

    return steps;
  }

  private animationLoop(): void {
    if (!this.isPlaying || !this.gameState) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    const stepsPerSecond = this.speed * 2;
    this.stepAccumulator += (deltaTime / 1000) * stepsPerSecond;

    while (this.stepAccumulator >= 1 && this.currentStep < this.getTotalSteps()) {
      this.currentStep++;
      this.stepAccumulator--;

      if (this.onStepChange) {
        this.onStepChange(this.currentStep);
      }
    }

    if (this.currentStep >= this.getTotalSteps()) {
      this.currentStep = this.getTotalSteps();
      this.isPlaying = false;
      this.onReplayEnd();
    }

    this.renderReplayState();

    if (this.isPlaying) {
      this.animationFrameId = requestAnimationFrame(() => this.animationLoop());
    }
  }

  private renderReplayState(): void {
    if (!this.gameState) return;

    const replayState = this.buildReplayState();
    this.renderer.render(replayState);

    if (this.onStateChange) {
      this.onStateChange(replayState);
    }
  }

  private buildReplayState(): GameState {
    if (!this.gameState) {
      throw new Error('没有加载的游戏');
    }

    const currentStepIndex = Math.floor(this.currentStep);

    let playersState = this.initialPlayers.map(p => ({ ...p, hand: [...p.hand] }));
    const tableCards: Card[] = [];

    for (let i = 0; i < currentStepIndex; i++) {
      const record = this.gameState.playHistory[i];
      const player = playersState.find(p => p.id === record.playerId);
      if (player) {
        player.hand = player.hand.filter(c => !record.cards.some(rc => rc.id === c.id));
        tableCards.push(...record.cards);
      }
    }

    const currentPlayerIndex = currentStepIndex % this.gameState.players.length;
    const isGameOver = currentStepIndex >= this.gameState.playHistory.length && this.gameState.isGameOver;

    return {
      ...this.gameState,
      players: playersState,
      currentPlayerIndex,
      tableCards,
      playHistory: this.gameState.playHistory.slice(0, currentStepIndex),
      isGameOver
    };
  }

  private onReplayEnd(): void {
    console.log('回放结束');
  }

  public setOnStepChange(callback: (step: number) => void): void {
    this.onStepChange = callback;
  }

  public setOnStateChange(callback: (state: GameState) => void): void {
    this.onStateChange = callback;
  }

  public destroy(): void {
    this.pause();
    if (this.seekAnimationFrameId !== null) {
      cancelAnimationFrame(this.seekAnimationFrameId);
      this.seekAnimationFrameId = null;
    }
    this.pendingSeekStep = null;
  }
}
