import { Entity, EntityState, Missile, TimeGate } from './entities';

export interface FrameSnapshot {
  frameIndex: number;
  timestamp: number;
  entityStates: Map<string, EntityState>;
}

export type TimeMode = 'normal' | 'paused' | 'rewind' | 'fastforward';

export interface TimeStatus {
  timeScale: number;
  mode: TimeMode;
  rewindRemaining: number;
  fastForwardRemaining: number;
  rewindTotal: number;
  fastForwardTotal: number;
  snapshotCount: number;
  totalGameTime: number;
  timeLimit: number;
}

export class Timeline {
  entities: Entity[] = [];
  snapshots: FrameSnapshot[] = [];
  maxSnapshots: number = 300;
  currentFrameIndex: number = 0;
  timeScale: number = 1;
  mode: TimeMode = 'normal';

  rewindRemaining: number = 0;
  rewindDuration: number = 120;
  rewindTargetFrame: number = 0;

  fastForwardRemaining: number = 0;
  fastForwardDuration: number = 180;

  totalGameTime: number = 0;
  timeLimit: number = 1800;

  onWin?: () => void;
  onLose?: (reason: string) => void;
  private gameEnded: boolean = false;

  constructor() {}

  registerEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  setEntities(entities: Entity[]): void {
    this.entities = entities;
  }

  getStatus(): TimeStatus {
    return {
      timeScale: this.timeScale,
      mode: this.mode,
      rewindRemaining: this.rewindRemaining,
      fastForwardRemaining: this.fastForwardRemaining,
      rewindTotal: this.rewindDuration,
      fastForwardTotal: this.fastForwardDuration,
      snapshotCount: this.snapshots.length,
      totalGameTime: this.totalGameTime,
      timeLimit: this.timeLimit,
    };
  }

  togglePause(): void {
    if (this.mode === 'rewind' || this.mode === 'fastforward') return;
    if (this.gameEnded) return;

    if (this.mode === 'paused') {
      this.mode = 'normal';
      this.timeScale = 1;
    } else {
      this.mode = 'paused';
      this.timeScale = 0;
    }
    this.markAbnormalTimeFlow();
  }

  startRewind(): void {
    if (this.mode === 'rewind' || this.mode === 'fastforward') return;
    if (this.gameEnded) return;
    if (this.snapshots.length < 2) return;

    this.mode = 'rewind';
    this.timeScale = -1;
    this.rewindRemaining = this.rewindDuration;

    const targetIndex = Math.max(0, this.snapshots.length - 300);
    this.rewindTargetFrame = targetIndex;
    this.markAbnormalTimeFlow();
  }

  startFastForward(): void {
    if (this.mode === 'rewind' || this.mode === 'fastforward') return;
    if (this.gameEnded) return;

    this.mode = 'fastforward';
    this.timeScale = 2;
    this.fastForwardRemaining = this.fastForwardDuration;
    this.markAbnormalTimeFlow();
  }

  private markAbnormalTimeFlow(): void {
    const isAbnormal = this.mode !== 'normal';
    this.entities.forEach((e) => {
      e.abnormalTimeFlow = isAbnormal;
    });
  }

  update(): void {
    if (this.gameEnded) return;

    if (this.mode === 'normal' || this.mode === 'paused') {
      this.totalGameTime++;
      if (this.totalGameTime >= this.timeLimit) {
        this.triggerLose('时间耗尽！');
        return;
      }
    }

    if (this.mode === 'rewind') {
      this.updateRewind();
    } else if (this.mode === 'fastforward') {
      this.updateFastForward();
    } else if (this.mode === 'normal') {
      this.updateNormal();
    }

    if (this.mode !== 'rewind') {
      this.updateGateCoverage();
      this.checkWinCondition();
    }

    if (this.mode === 'normal' || this.mode === 'fastforward') {
      this.captureSnapshot();
    }
  }

  private updateNormal(): void {
    this.entities.forEach((entity) => {
      entity.update(1, this.timeScale);
      if (this.timeScale !== 0) {
        entity.pushGhostFrame();
      }
    });
  }

  private updateRewind(): void {
    this.rewindRemaining--;

    if (this.rewindRemaining <= 0 || this.snapshots.length <= 1) {
      this.exitRewind();
      return;
    }

    const snapshot = this.snapshots.pop();
    if (snapshot) {
      snapshot.entityStates.forEach((state, entityId) => {
        const entity = this.entities.find((e) => e.id === entityId);
        if (entity) {
          entity.restoreState(state);
          entity.pushGhostFrame();
        }
      });
    }
  }

  private exitRewind(): void {
    this.mode = 'normal';
    this.timeScale = 1;
    this.rewindRemaining = 0;
    this.markAbnormalTimeFlow();

    const gate = this.entities.find((e) => e.type === 'gate') as TimeGate;
    if (gate && !gate.isOpen && !gate.hasPassed) {
      this.triggerLose('时间回溯结束但门未打开！');
    }
  }

  private updateFastForward(): void {
    this.fastForwardRemaining--;
    if (this.fastForwardRemaining <= 0) {
      this.mode = 'normal';
      this.timeScale = 1;
      this.markAbnormalTimeFlow();
    }

    this.entities.forEach((entity) => {
      entity.update(1, this.timeScale);
      entity.pushGhostFrame();
    });
  }

  private captureSnapshot(): void {
    const entityStates = new Map<string, EntityState>();
    this.entities.forEach((entity) => {
      entityStates.set(entity.id, entity.captureState());
    });

    this.snapshots.push({
      frameIndex: this.currentFrameIndex++,
      timestamp: performance.now(),
      entityStates,
    });

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  private updateGateCoverage(): void {
    const gate = this.entities.find((e) => e.type === 'gate') as TimeGate;
    const missiles = this.entities.filter((e) => e.type === 'missile') as Missile[];

    if (!gate) return;

    let anyCovered = false;
    for (const missile of missiles) {
      if (gate.checkCoverage(missile.state.y)) {
        anyCovered = true;
        break;
      }
    }
    gate.recordCoverage(anyCovered);
  }

  private checkWinCondition(): void {
    const gate = this.entities.find((e) => e.type === 'gate') as TimeGate;
    const missiles = this.entities.filter((e) => e.type === 'missile') as Missile[];

    if (!gate || gate.hasPassed) return;

    for (const missile of missiles) {
      if (gate.checkPassThrough(missile)) {
        this.triggerWin();
        return;
      }
    }
  }

  private triggerWin(): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.mode = 'paused';
    this.timeScale = 0;
    if (this.onWin) {
      this.onWin();
    }
  }

  private triggerLose(reason: string): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.mode = 'paused';
    this.timeScale = 0;
    if (this.onLose) {
      this.onLose(reason);
    }
  }

  isGameEnded(): boolean {
    return this.gameEnded;
  }

  reset(): void {
    this.snapshots = [];
    this.currentFrameIndex = 0;
    this.timeScale = 1;
    this.mode = 'normal';
    this.rewindRemaining = 0;
    this.fastForwardRemaining = 0;
    this.totalGameTime = 0;
    this.gameEnded = false;
    this.entities.forEach((e) => e.clearGhostFrames());
    this.markAbnormalTimeFlow();
  }
}
