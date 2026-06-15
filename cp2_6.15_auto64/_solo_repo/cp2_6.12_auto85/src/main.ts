import './styles.css';
import { RaceEngine } from './race/race-engine';
import { DriftScorer } from './race/drift-scorer';
import { ReplayRecorder } from './replay/replay-recorder';
import { ReplayViewer } from './replay/replay-viewer';
import { UIManager } from './ui/ui-manager';
import { ControlMode, LapRecord, TrackPoint } from './types';

class Game {
  private raceEngine: RaceEngine;
  private driftScorer: DriftScorer;
  private replayRecorder: ReplayRecorder;
  private replayViewer: ReplayViewer;
  private uiManager: UIManager;
  
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  private isReplayMode: boolean = false;
  private currentMode: ControlMode = 'advanced';
  private pendingReplayData: TrackPoint[] | null = null;
  private pendingReplayMode: ControlMode | null = null;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    this.raceEngine = new RaceEngine(canvas);
    this.driftScorer = new DriftScorer();
    this.replayRecorder = new ReplayRecorder();
    this.replayViewer = new ReplayViewer(canvas);
    this.uiManager = new UIManager();

    this.setupModuleConnections();
    this.replayViewer.setTrackGeometry(this.raceEngine.getTrackData());
    this.uiManager.setTrackGeometry(this.raceEngine.getTrackData());
    
    this.uiManager.showModePanel(this.currentMode);
    this.replayRecorder.startNewLap();
  }

  private setupModuleConnections(): void {
    this.driftScorer.onScorePopup((popup) => {
      if (!this.isReplayMode) {
        this.uiManager.addScorePopup(popup);
      }
    });

    this.uiManager.onModeChange((mode) => {
      this.currentMode = mode;
      this.raceEngine.setControlMode(mode);
      this.driftScorer.reset();
      this.raceEngine.resetCar();
      this.replayRecorder.startNewLap();
      this.uiManager.reset();
    });

    this.uiManager.onRecordSelect((record) => {
      this.startReplay(record.trackData, record.mode);
      this.uiManager.hideHistoryPanel();
    });

    this.uiManager.setReplaySliderListener(
      (time) => {
        this.replayViewer.seek(time);
      },
      () => this.replayViewer.getDuration()
    );

    this.uiManager.setPlayPauseListener(() => {
      this.replayViewer.toggle();
      this.uiManager.updatePlayPauseButton(this.replayViewer.isPlaying());
    });

    this.uiManager.setExitReplayListener(() => {
      this.exitReplay();
    });

    this.replayViewer.setOnTimeUpdate((current, duration) => {
      this.uiManager.updateReplayTime(current, duration);
    });

    this.replayViewer.setOnPointUpdate((point) => {
      this.uiManager.updateReplayData(point);
    });

    this.replayViewer.setOnPlaybackEnd(() => {
      this.uiManager.updatePlayPauseButton(false);
    });
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const now = performance.now();
    let deltaTime = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    deltaTime = Math.min(deltaTime, 0.05);

    if (this.isReplayMode) {
      this.updateReplay(deltaTime);
    } else {
      this.updateGame(deltaTime);
    }

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private updateGame(deltaTime: number): void {
    const carState = this.raceEngine.update(deltaTime);
    const driftState = this.driftScorer.update(carState, deltaTime);
    
    this.replayRecorder.record(carState, this.driftScorer.getTotalScore());
    
    this.raceEngine.render();
    this.uiManager.updateDriftDisplay(driftState);

    if (this.raceEngine.checkLapCompletion()) {
      const lapTime = this.raceEngine.getLapTime();
      const trackData = this.replayRecorder.finishLap();
      
      if (trackData && trackData.length > 0) {
        const record: LapRecord = {
          id: `lap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          lapTime: lapTime,
          avgDriftAngle: this.replayRecorder.getAvgDriftAngle(),
          totalScore: this.replayRecorder.getTotalScore(),
          mode: this.currentMode,
          trackData: trackData,
          createdAt: Date.now()
        };

        this.uiManager.addHistoryRecord(record);
        this.uiManager.showLapTime(lapTime);

        this.pendingReplayData = trackData;
        this.pendingReplayMode = this.currentMode;
        
        setTimeout(() => {
          if (this.pendingReplayData && this.pendingReplayMode) {
            this.startReplay(this.pendingReplayData, this.pendingReplayMode);
            this.pendingReplayData = null;
            this.pendingReplayMode = null;
          }
        }, 1500);
      }

      this.driftScorer.reset();
      this.replayRecorder.startNewLap();
    }
  }

  private updateReplay(deltaTime: number): void {
    this.replayViewer.update(deltaTime);
    this.replayViewer.render();
  }

  private startReplay(trackData: TrackPoint[], mode: ControlMode): void {
    this.isReplayMode = true;
    this.replayViewer.loadTrackData(trackData);
    this.replayViewer.setCarColor(mode);
    this.replayViewer.play(1.5);
    this.uiManager.showReplayControls(true);
    this.uiManager.updatePlayPauseButton(true);
    this.uiManager.reset();
  }

  private exitReplay(): void {
    this.isReplayMode = false;
    this.replayViewer.pause();
    this.uiManager.showReplayControls(false);
    this.uiManager.reset();
    this.raceEngine.resetCar();
    this.driftScorer.reset();
    this.replayRecorder.startNewLap();
    this.lastFrameTime = performance.now();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  getCurrentMode(): ControlMode {
    return this.currentMode;
  }

  isInReplayMode(): boolean {
    return this.isReplayMode;
  }
}

let game: Game | null = null;

function init(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startGame);
  } else {
    startGame();
  }
}

function startGame(): void {
  try {
    game = new Game();
    game.start();
    console.log('漂移追踪器已启动');
  } catch (error) {
    console.error('游戏启动失败:', error);
  }
}

init();

window.addEventListener('beforeunload', () => {
  if (game) {
    game.stop();
  }
});
