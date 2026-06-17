import type { GameSession, PlayRecord, Player, Card } from './card-logic';
import { determinePlayType, getCardDisplay, calculateWinRate, getGameDuration } from './card-logic';
import { UIRenderer } from './ui-renderer';

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface ReplayState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentRecord: PlayRecord | null;
  players: Player[];
  isFinished: boolean;
}

export class ReplayController {
  private gameSession: GameSession | null = null;
  private renderer: UIRenderer;
  private state: ReplayState = {
    currentStep: 0,
    totalSteps: 0,
    isPlaying: false,
    speed: 1,
    currentRecord: null,
    players: [],
    isFinished: false
  };
  private animationId: number = 0;
  private lastTime: number = 0;
  private stepInterval: number = 1000;
  private onStateChange: ((state: ReplayState) => void) | null = null;
  private onFinish: (() => void) | null = null;
  private initialPlayers: Player[] = [];

  constructor(renderer: UIRenderer) {
    this.renderer = renderer;
    this.renderer.setReplayMode(true);
  }

  public loadGame(session: GameSession): void {
    this.gameSession = session;
    this.initialPlayers = JSON.parse(JSON.stringify(session.players));
    this.state = {
      currentStep: 0,
      totalSteps: session.records.length,
      isPlaying: false,
      speed: this.state.speed,
      currentRecord: null,
      players: JSON.parse(JSON.stringify(session.players)),
      isFinished: false
    };
    this.resetPlayersToStart();
    this.updateStepInterval();
    this.render();
    this.notifyStateChange();
  }

  private resetPlayersToStart(): void {
    this.state.players = JSON.parse(JSON.stringify(this.initialPlayers));
  }

  private updateStepInterval(): void {
    this.stepInterval = 1500 / this.state.speed;
  }

  public play(): void {
    if (this.state.isPlaying || this.state.isFinished) return;
    if (this.state.currentStep >= this.state.totalSteps) {
      this.seekTo(0);
    }
    this.state.isPlaying = true;
    this.lastTime = performance.now();
    this.animationLoop();
    this.notifyStateChange();
  }

  public pause(): void {
    this.state.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
    this.notifyStateChange();
  }

  public togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setSpeed(speed: PlaybackSpeed): void {
    this.state.speed = speed;
    this.updateStepInterval();
    this.notifyStateChange();
  }

  public seekTo(step: number): void {
    if (!this.gameSession) return;
    
    const clampedStep = Math.max(0, Math.min(step, this.state.totalSteps));
    this.state.currentStep = clampedStep;
    this.state.isFinished = clampedStep >= this.state.totalSteps;
    
    this.replayToStep(clampedStep);
    this.render();
    this.notifyStateChange();

    if (this.state.isFinished && this.state.isPlaying) {
      this.pause();
      this.onFinish?.();
    }
  }

  public stepForward(): void {
    this.seekTo(this.state.currentStep + 1);
  }

  public stepBackward(): void {
    this.seekTo(this.state.currentStep - 1);
  }

  public seekToProgress(progress: number): void {
    const step = Math.floor(progress * this.state.totalSteps);
    this.seekTo(step);
  }

  public getProgress(): number {
    if (this.state.totalSteps === 0) return 0;
    return this.state.currentStep / this.state.totalSteps;
  }

  public getState(): ReplayState {
    return { ...this.state };
  }

  public setOnStateChange(callback: (state: ReplayState) => void): void {
    this.onStateChange = callback;
  }

  public setOnFinish(callback: () => void): void {
    this.onFinish = callback;
  }

  private animationLoop(): void {
    if (!this.state.isPlaying) return;

    const now = performance.now();
    const delta = now - this.lastTime;

    if (delta >= this.stepInterval) {
      this.lastTime = now;
      this.stepForward();
      
      if (this.state.currentStep >= this.state.totalSteps) {
        this.pause();
        this.state.isFinished = true;
        this.onFinish?.();
        this.notifyStateChange();
        return;
      }
    }

    this.animationId = requestAnimationFrame(() => this.animationLoop());
  }

  private replayToStep(targetStep: number): void {
    if (!this.gameSession) return;

    this.resetPlayersToStart();
    
    for (let i = 0; i < targetStep; i++) {
      const record = this.gameSession.records[i];
      if (record && record.cards.length > 0) {
        const player = this.state.players.find(p => p.id === record.playerId);
        if (player) {
          player.hand = player.hand.filter(
            c => !record.cards.some(rc => rc.id === c.id)
          );
          player.playCount++;
        }
      }
    }

    if (targetStep > 0 && targetStep <= this.gameSession.records.length) {
      this.state.currentRecord = this.gameSession.records[targetStep - 1];
    } else {
      this.state.currentRecord = null;
    }

    this.renderer.updateState({
      currentPlayerIndex: this.getCurrentPlayerIndex(),
      tableCardsOpacity: 1
    });
  }

  private getCurrentPlayerIndex(): number {
    if (!this.gameSession || this.state.currentStep === 0) return 0;
    
    const record = this.gameSession.records[this.state.currentStep - 1];
    if (!record) return 0;
    
    const playerIndex = this.state.players.findIndex(p => p.id === record.playerId);
    return Math.max(0, playerIndex);
  }

  private render(): void {
    if (!this.gameSession) return;

    const recordsForRender = this.state.currentStep > 0 
      ? this.gameSession.records.slice(0, this.state.currentStep)
      : [];

    this.renderer.render(this.state.players, recordsForRender);
  }

  private notifyStateChange(): void {
    this.onStateChange?.({ ...this.state });
  }

  public getWinRateAnalysis(): { playerName: string; winRate: number; playCount: number }[] {
    if (!this.gameSession) return [];

    return this.state.players.map(player => ({
      playerName: player.name,
      winRate: calculateWinRate(this.gameSession!.records, player.id),
      playCount: player.playCount
    }));
  }

  public getCurrentPlayerName(): string {
    if (!this.state.currentRecord) return '';
    const player = this.state.players.find(p => p.id === this.state.currentRecord!.playerId);
    return player?.name || '';
  }

  public getCurrentPlayType(): string {
    if (!this.state.currentRecord || !this.gameSession) return '';
    return this.state.currentRecord.playType;
  }

  public getCurrentCardsDisplay(): string {
    if (!this.state.currentRecord) return '';
    return this.state.currentRecord.cards.map(c => getCardDisplay(c)).join(' ');
  }

  public getGameDuration(): string {
    if (!this.gameSession) return '';
    return getGameDuration(this.gameSession.startTime, this.gameSession.endTime);
  }

  public destroy(): void {
    this.pause();
    this.renderer.setReplayMode(false);
  }
}
