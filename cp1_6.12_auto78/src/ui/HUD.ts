import Phaser from 'phaser';
import { CreatureType } from '../entities/Creature';

interface ActivityRecord {
  type: CreatureType;
  timestamp: number;
}

const ACTIVITY_WINDOW_MS = 30000;
const BAR_HEIGHT = 30;
const BAR_MAX_WIDTH = 200;
const PROGRESS_WIDTH = 20;
const PROGRESS_HEIGHT = 300;

const CREATURE_COLORS: Record<CreatureType, number> = {
  [CreatureType.BUTTERFLY]: 0xff69b4,
  [CreatureType.BEE]: 0xffd700,
  [CreatureType.BEETLE]: 0x8b4513,
  [CreatureType.FIREFLY]: 0x00ffff,
};

const CREATURE_LABELS: Record<CreatureType, string> = {
  [CreatureType.BUTTERFLY]: 'Butterfly',
  [CreatureType.BEE]: 'Bee',
  [CreatureType.BEETLE]: 'Beetle',
  [CreatureType.FIREFLY]: 'Firefly',
};

export class HUD {
  private scene: Phaser.Scene;
  private activityRecords: ActivityRecord[] = [];
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private activityBars: Map<CreatureType, Phaser.GameObjects.Graphics> = new Map();
  private activityLabels: Map<CreatureType, Phaser.GameObjects.Text> = new Map();
  private currentBarWidths: Map<CreatureType, number> = new Map();
  private targetBarWidths: Map<CreatureType, number> = new Map();

  private waveGraphics!: Phaser.GameObjects.Graphics;
  private isLowEnergy: boolean = false;
  private grayOverlay!: Phaser.GameObjects.Rectangle;

  private leftPanelX: number = 0;
  private rightPanelX: number = 0;
  private baseY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.layout();
    this.createProgressBar();
    this.createActivityPanel();
    this.createWaveGraphics();
    this.createGrayOverlay();

    Object.values(CreatureType).forEach(type => {
      this.currentBarWidths.set(type, 0);
      this.targetBarWidths.set(type, 0);
    });
  }

  private layout(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;

    if (w > 1200) {
      this.leftPanelX = 60;
      this.rightPanelX = w - 260;
    } else {
      this.leftPanelX = 60;
      this.rightPanelX = w - 260;
    }
    this.baseY = h / 2 - PROGRESS_HEIGHT / 2;
  }

  private createProgressBar(): void {
    this.progressBar = this.scene.add.graphics();
    this.progressText = this.scene.add.text(
      this.leftPanelX + PROGRESS_WIDTH / 2,
      this.baseY - 25,
      '0%',
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '16px',
        color: '#ffffff',
      }
    );
    this.progressText.setOrigin(0.5, 0.5);
  }

  private createActivityPanel(): void {
    const types = Object.values(CreatureType);
    types.forEach((type, i) => {
      const bar = this.scene.add.graphics();
      this.activityBars.set(type, bar);

      const label = this.scene.add.text(
        this.rightPanelX,
        this.baseY + i * (BAR_HEIGHT + 10) + BAR_HEIGHT / 2,
        CREATURE_LABELS[type],
        {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '8px',
          color: '#' + CREATURE_COLORS[type].toString(16).padStart(6, '0'),
        }
      );
      label.setOrigin(0, 0.5);
      this.activityLabels.set(type, label);
    });
  }

  private createWaveGraphics(): void {
    this.waveGraphics = this.scene.add.graphics();
  }

  private createGrayOverlay(): void {
    this.grayOverlay = this.scene.add.rectangle(
      this.scene.scale.width / 2,
      this.scene.scale.height / 2,
      this.scene.scale.width,
      this.scene.scale.height,
      0x000000,
      0
    );
    this.grayOverlay.setDepth(100);
    this.grayOverlay.setVisible(false);
  }

  recordCreatureSpawn(type: CreatureType): void {
    const now = this.scene.time.now;
    this.activityRecords.push({ type, timestamp: now });
    this.pruneOldRecords(now);
  }

  private pruneOldRecords(now: number): void {
    const cutoff = now - ACTIVITY_WINDOW_MS;
    let writeIdx = 0;
    for (let i = 0; i < this.activityRecords.length; i++) {
      if (this.activityRecords[i].timestamp >= cutoff) {
        this.activityRecords[writeIdx++] = this.activityRecords[i];
      }
    }
    this.activityRecords.length = writeIdx;
  }

  private computeActivityCounts(): Map<CreatureType, number> {
    this.pruneOldRecords(this.scene.time.now);
    const counts = new Map<CreatureType, number>();
    Object.values(CreatureType).forEach(t => counts.set(t, 0));
    for (let i = 0; i < this.activityRecords.length; i++) {
      const r = this.activityRecords[i];
      counts.set(r.type, (counts.get(r.type) || 0) + 1);
    }
    return counts;
  }

  updateProgress(progress: number): void {
    this.progressBar.clear();

    this.progressBar.fillStyle(0x333333, 0.5);
    this.progressBar.fillRect(this.leftPanelX, this.baseY, PROGRESS_WIDTH, PROGRESS_HEIGHT);

    const fillHeight = (progress / 100) * PROGRESS_HEIGHT;
    const fillY = this.baseY + PROGRESS_HEIGHT - fillHeight;

    const startColor = Phaser.Display.Color.IntegerToColor(0x8b4513);
    const endColor = Phaser.Display.Color.IntegerToColor(0x00ff00);

    for (let y = 0; y < fillHeight; y++) {
      const t = y / PROGRESS_HEIGHT;
      const r = Phaser.Math.Linear(startColor.red, endColor.red, t);
      const g = Phaser.Math.Linear(startColor.green, endColor.green, t);
      const b = Phaser.Math.Linear(startColor.blue, endColor.blue, t);
      this.progressBar.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      this.progressBar.fillRect(this.leftPanelX, fillY + y, PROGRESS_WIDTH, 1);
    }

    this.progressBar.lineStyle(2, 0x00ff7f, 0.8);
    this.progressBar.strokeRect(this.leftPanelX, this.baseY, PROGRESS_WIDTH, PROGRESS_HEIGHT);

    this.progressText.setText(`${Math.round(progress)}%`);
    this.progressText.setPosition(this.leftPanelX + PROGRESS_WIDTH / 2, this.baseY - 25);
  }

  updateActivity(): void {
    const counts = this.computeActivityCounts();
    const maxCount = Math.max(1, ...Array.from(counts.values()));

    Object.values(CreatureType).forEach(type => {
      const count = counts.get(type) || 0;
      const targetWidth = count > 0 ? (count / maxCount) * BAR_MAX_WIDTH : 0;
      this.targetBarWidths.set(type, targetWidth);
    });
  }

  smoothActivityBars(delta: number): void {
    const lerpFactor = 1 - Math.pow(0.001, delta / 500);

    Object.values(CreatureType).forEach((type, i) => {
      const current = this.currentBarWidths.get(type) || 0;
      const target = this.targetBarWidths.get(type) || 0;
      const newWidth = Phaser.Math.Linear(current, target, lerpFactor);
      this.currentBarWidths.set(type, newWidth);

      const bar = this.activityBars.get(type);
      if (bar) {
        bar.clear();
        bar.fillStyle(CREATURE_COLORS[type], 0.8);
        bar.fillRect(
          this.rightPanelX + 60,
          this.baseY + i * (BAR_HEIGHT + 10),
          newWidth,
          BAR_HEIGHT
        );
        bar.lineStyle(1, 0x00ff7f, 0.5);
        bar.strokeRect(
          this.rightPanelX + 60,
          this.baseY + i * (BAR_HEIGHT + 10),
          BAR_MAX_WIDTH,
          BAR_HEIGHT
        );
      }
    });
  }

  updateWaveform(volume: number, timeDomainData: Uint8Array, centerX: number, centerY: number, radius: number): void {
    this.waveGraphics.clear();
    if (this.isLowEnergy) return;

    this.waveGraphics.lineStyle(2, 0x7cfc00, 0.8);
    this.waveGraphics.beginPath();

    const amplitude = Phaser.Math.Linear(5, 40, volume);
    const steps = 120;

    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dataIndex = Math.floor((i / steps) * timeDomainData.length);
      const sample = timeDomainData.length > 0 ? (timeDomainData[dataIndex] - 128) / 128 : 0;
      const offset = sample * amplitude;

      const px = centerX + Math.cos(angle) * (radius + offset);
      const py = centerY + Math.sin(angle) * (radius + offset);

      if (i === 0) {
        this.waveGraphics.moveTo(px, py);
      } else {
        this.waveGraphics.lineTo(px, py);
      }
    }

    this.waveGraphics.closePath();
    this.waveGraphics.strokePath();
  }

  setLowEnergy(lowEnergy: boolean): void {
    this.isLowEnergy = lowEnergy;
    if (lowEnergy) {
      this.grayOverlay.setAlpha(0.3);
      this.grayOverlay.setVisible(true);
      this.waveGraphics.clear();
    } else {
      this.grayOverlay.setVisible(false);
    }
  }

  update(delta: number, progress: number, volume: number, timeDomainData: Uint8Array, centerX: number, centerY: number, potRadius: number): void {
    this.updateProgress(progress);
    this.updateActivity();
    this.smoothActivityBars(delta);
    this.updateWaveform(volume, timeDomainData, centerX, centerY, potRadius);
  }

  destroy(): void {
    this.progressBar.destroy();
    this.progressText.destroy();
    this.waveGraphics.destroy();
    this.grayOverlay.destroy();
    this.activityBars.forEach(b => b.destroy());
    this.activityLabels.forEach(l => l.destroy());
  }
}
