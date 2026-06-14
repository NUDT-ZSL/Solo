import './style.css';
import { DataGenerator, type SensorData } from './data-generator';
import { SceneManager } from './scene-manager';
import { UIPanel } from './ui-panel';

class CityAuraApp {
  private dataGenerator: DataGenerator;
  private sceneManager: SceneManager;
  private uiPanel: UIPanel;

  private currentData: SensorData[] = [];
  private selectedSensorId: string | null = null;
  private selectedGridX: number = 0;
  private selectedGridY: number = 0;
  private isPlaybackMode: boolean = false;

  constructor() {
    this.dataGenerator = new DataGenerator();
    this.sceneManager = new SceneManager('scene-canvas');
    this.uiPanel = new UIPanel({
      onPauseToggle: () => this.handlePauseToggle(),
      onSetView: (mode) => this.sceneManager.setView(mode),
      onPlaybackModeChange: (enabled) => this.handlePlaybackModeChange(enabled),
      onPlaybackTimeChange: (timestamp) => this.handlePlaybackTimeChange(timestamp)
    });

    this.bindEvents();
    this.start();
  }

  private bindEvents(): void {
    this.dataGenerator.on('data', (data) => this.handleDataUpdate(data));

    this.sceneManager.onSelectionChange((sensorId, gridX, gridY) => {
      this.selectedSensorId = sensorId;
      this.selectedGridX = gridX;
      this.selectedGridY = gridY;

      if (sensorId) {
        const sensorData = this.currentData.find((d) => d.id === sensorId);
        this.uiPanel.updateSelectedPoint(sensorId, gridX, gridY, sensorData);
        this.updateHistoryChart();
      } else {
        this.uiPanel.updateSelectedPoint(null, 0, 0);
      }
    });

    window.addEventListener('resize', () => {
      this.uiPanel.handleResize();
    });
  }

  private handleDataUpdate(data: SensorData[]): void {
    this.currentData = data;
    this.sceneManager.updateSensorData(data);
    this.uiPanel.updateGlobalAqi(data);

    if (this.selectedSensorId) {
      const sensorData = data.find((d) => d.id === this.selectedSensorId);
      this.uiPanel.updateSelectedPoint(
        this.selectedSensorId,
        this.selectedGridX,
        this.selectedGridY,
        sensorData
      );
      this.updateHistoryChart();
    }

    if (!this.isPlaybackMode) {
      this.uiPanel.updateTimeSliderRange(Date.now(), Date.now() - 60000);
    }
  }

  private updateHistoryChart(): void {
    if (!this.selectedSensorId) return;
    const history = this.dataGenerator.getSensorHistory(this.selectedSensorId, 10);
    this.uiPanel.updateHistoryChart(history);
  }

  private handlePauseToggle(): void {
    if (this.isPlaybackMode) {
      this.isPlaybackMode = false;
      const checkbox = document.getElementById('playback-mode') as HTMLInputElement;
      if (checkbox) checkbox.checked = false;
      const slider = document.getElementById('time-slider') as HTMLInputElement;
      if (slider) {
        slider.disabled = true;
        slider.value = '100';
      }
      const timeDisplay = document.getElementById('time-display') as HTMLElement;
      if (timeDisplay) timeDisplay.textContent = '实时';
      this.dataGenerator.resume();
      this.uiPanel.setPaused(false);
      return;
    }

    const isRunning = this.dataGenerator.getIsRunning();
    if (isRunning) {
      this.dataGenerator.pause();
      this.uiPanel.setPaused(true);
    } else {
      if (!this.dataGenerator.getHistory().length) {
        this.dataGenerator.start();
      } else {
        this.dataGenerator.resume();
      }
      this.uiPanel.setPaused(false);
    }
  }

  private handlePlaybackModeChange(enabled: boolean): void {
    this.isPlaybackMode = enabled;

    if (enabled) {
      this.dataGenerator.pause();
      if (!this.uiPanel) return;
    } else {
      if (this.dataGenerator.getIsRunning()) {
        this.dataGenerator.resume();
      }
      this.uiPanel.setPaused(false);
    }
  }

  private handlePlaybackTimeChange(timestamp: number): void {
    this.isPlaybackMode = true;
    this.dataGenerator.setPlaybackTime(timestamp);
  }

  private start(): void {
    this.dataGenerator.start();
  }

  public dispose(): void {
    this.dataGenerator.stop();
    this.sceneManager.dispose();
    this.uiPanel.dispose();
  }
}

let app: CityAuraApp | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new CityAuraApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
