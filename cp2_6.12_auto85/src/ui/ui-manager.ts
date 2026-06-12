import {
  ControlMode,
  DriftState,
  LapRecord,
  ScorePopup,
  TrackPoint,
  MODE_NAMES,
  MODE_COLORS,
  MAX_HISTORY_RECORDS,
  STORAGE_KEY
} from '../types';
import { ReplayViewer } from '../replay/replay-viewer';

export class UIManager {
  private currentMode: ControlMode = 'advanced';
  private modeChangeCallback: ((mode: ControlMode) => void) | null = null;
  private recordSelectCallback: ((record: LapRecord) => void) | null = null;
  private historyRecords: LapRecord[] = [];
  private expandedRecordId: string | null = null;
  private miniTrackViewer: ReplayViewer | null = null;
  private lastScoreValue: number = 0;

  constructor() {
    this.loadHistoryRecords();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const mode = target.dataset.mode as ControlMode;
        if (mode) {
          this.setMode(mode);
        }
      });
    });

    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.showHistoryPanel());
    }

    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    if (closeHistoryBtn) {
      closeHistoryBtn.addEventListener('click', () => this.hideHistoryPanel());
    }

    const modeToggleBtn = document.getElementById('modeToggleBtn');
    if (modeToggleBtn) {
      modeToggleBtn.addEventListener('click', () => this.toggleModePanel());
    }

    this.updateModeIndicator();
    this.renderHistoryList();
  }

  updateDriftDisplay(state: DriftState): void {
    const driftDisplay = document.getElementById('driftDisplay');
    const angleEl = document.getElementById('driftAngle');
    const durationEl = document.getElementById('driftDuration');
    const scoreEl = document.getElementById('driftScore');

    if (!driftDisplay || !angleEl || !durationEl || !scoreEl) return;

    if (state.isActive) {
      driftDisplay.classList.remove('hidden');
      
      const angleDeg = (state.maxAngle * 180 / Math.PI).toFixed(1);
      angleEl.textContent = `${angleDeg}°`;
      durationEl.textContent = `${state.duration.toFixed(2)}s`;
      scoreEl.textContent = state.totalScore.toString();

      if (state.totalScore !== this.lastScoreValue) {
        scoreEl.classList.remove('flash');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('flash');
        this.lastScoreValue = state.totalScore;
      }
    } else {
      driftDisplay.classList.add('hidden');
    }
  }

  showModePanel(currentMode: ControlMode): void {
    this.currentMode = currentMode;
    const panel = document.getElementById('modePanel');
    if (panel) {
      panel.classList.remove('hidden');
      this.updateModeButtons();
      this.updateModeIndicator();
    }
  }

  hideModePanel(): void {
    const panel = document.getElementById('modePanel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  toggleModePanel(): void {
    const panel = document.getElementById('modePanel');
    if (panel) {
      if (panel.classList.contains('hidden')) {
        this.showModePanel(this.currentMode);
      } else {
        this.hideModePanel();
      }
    }
  }

  private setMode(mode: ControlMode): void {
    this.currentMode = mode;
    this.updateModeButtons();
    this.updateModeIndicator();
    
    if (this.modeChangeCallback) {
      this.modeChangeCallback(mode);
    }

    setTimeout(() => this.hideModePanel(), 500);
  }

  private updateModeButtons(): void {
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
      const target = btn as HTMLElement;
      if (target.dataset.mode === this.currentMode) {
        target.classList.add('active');
      } else {
        target.classList.remove('active');
      }
    });
  }

  private updateModeIndicator(): void {
    const activeBtn = document.querySelector('.mode-btn.active') as HTMLElement;
    const indicator = document.querySelector('.mode-indicator') as HTMLElement;
    
    if (!activeBtn || !indicator) return;

    const rect = activeBtn.getBoundingClientRect();
    const parentRect = activeBtn.parentElement?.getBoundingClientRect();
    
    if (!parentRect) return;

    indicator.style.left = `${rect.left - parentRect.left}px`;
    indicator.style.width = `${rect.width}px`;
  }

  onModeChange(callback: (mode: ControlMode) => void): void {
    this.modeChangeCallback = callback;
  }

  showReplayControls(enabled: boolean): void {
    const controls = document.getElementById('replayControls');
    const dataPanel = document.getElementById('replayData');
    
    if (controls) {
      if (enabled) {
        controls.classList.remove('hidden');
      } else {
        controls.classList.add('hidden');
      }
    }
    
    if (dataPanel) {
      if (enabled) {
        dataPanel.classList.remove('hidden');
      } else {
        dataPanel.classList.add('hidden');
      }
    }
  }

  updateReplayTime(current: number, duration: number): void {
    const timeEl = document.getElementById('replayTime');
    const slider = document.getElementById('replaySlider') as HTMLInputElement;
    const progress = document.getElementById('replayProgress');

    if (timeEl) {
      timeEl.textContent = `${current.toFixed(2)} / ${duration.toFixed(2)}s`;
    }
    
    if (slider && duration > 0) {
      const percent = (current / duration) * 100;
      slider.value = percent.toString();
      if (progress) {
        progress.style.width = `${percent}%`;
      }
    }
  }

  updateReplayData(point: TrackPoint | null): void {
    if (!point) return;

    const posEl = document.getElementById('dataPos');
    const speedEl = document.getElementById('dataSpeed');
    const angleEl = document.getElementById('dataAngle');
    const scoreEl = document.getElementById('dataScore');

    if (posEl) {
      posEl.textContent = `${point.position.x.toFixed(1)}, ${point.position.y.toFixed(1)}`;
    }
    if (speedEl) {
      speedEl.textContent = point.speed.toFixed(1);
    }
    if (angleEl) {
      const deg = Math.abs(point.driftAngle * 180 / Math.PI).toFixed(1);
      angleEl.textContent = `${deg}°`;
    }
    if (scoreEl) {
      scoreEl.textContent = point.score.toFixed(0);
    }
  }

  setReplaySliderListener(callback: (time: number) => void, getDuration: () => number): void {
    const slider = document.getElementById('replaySlider') as HTMLInputElement;
    if (slider) {
      slider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        const percent = parseFloat(target.value) / 100;
        const time = percent * getDuration();
        callback(time);
      });
    }
  }

  setPlayPauseListener(callback: () => void): void {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
      btn.addEventListener('click', callback);
    }
  }

  setExitReplayListener(callback: () => void): void {
    const btn = document.getElementById('exitReplayBtn');
    if (btn) {
      btn.addEventListener('click', callback);
    }
  }

  updatePlayPauseButton(isPlaying: boolean): void {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
      btn.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  showHistoryPanel(): void {
    const panel = document.getElementById('historyPanel');
    if (panel) {
      panel.classList.remove('hidden');
      this.renderHistoryList();
    }
  }

  hideHistoryPanel(): void {
    const panel = document.getElementById('historyPanel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  updateHistoryRecords(records: LapRecord[]): void {
    this.historyRecords = records.sort((a, b) => a.lapTime - b.lapTime).slice(0, MAX_HISTORY_RECORDS);
    this.saveHistoryRecords();
    this.renderHistoryList();
  }

  private loadHistoryRecords(): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.historyRecords = JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load history records:', e);
      this.historyRecords = [];
    }
  }

  private saveHistoryRecords(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.historyRecords));
    } catch (e) {
      console.error('Failed to save history records:', e);
    }
  }

  getHistoryRecords(): LapRecord[] {
    return [...this.historyRecords];
  }

  addHistoryRecord(record: LapRecord): void {
    this.historyRecords.push(record);
    this.historyRecords = this.historyRecords
      .sort((a, b) => a.lapTime - b.lapTime)
      .slice(0, MAX_HISTORY_RECORDS);
    this.saveHistoryRecords();
    this.renderHistoryList();
  }

  private renderHistoryList(): void {
    const listEl = document.getElementById('recordsList');
    if (!listEl) return;

    if (this.historyRecords.length === 0) {
      listEl.innerHTML = '<div class="empty-records">暂无记录<br>完成一圈后自动保存</div>';
      return;
    }

    listEl.innerHTML = '';

    this.historyRecords.forEach((record, index) => {
      const item = document.createElement('div');
      item.className = 'record-item';
      item.dataset.id = record.id;

      const isExpanded = this.expandedRecordId === record.id;

      item.innerHTML = `
        <div class="record-header">
          <div class="record-main">
            <span class="record-time">${(record.lapTime / 1000).toFixed(2)}s</span>
            <span class="record-meta">#${index + 1} · 积分 ${record.totalScore.toFixed(0)}</span>
          </div>
          <span class="mode-badge ${record.mode}">${MODE_NAMES[record.mode]}</span>
        </div>
        <div class="record-details ${isExpanded ? 'expanded' : ''}">
          <div class="record-details-content">
            <div class="detail-stats">
              <div class="detail-stat">
                <span class="label">平均漂移角</span>
                <span class="value">${record.avgDriftAngle.toFixed(1)}°</span>
              </div>
              <div class="detail-stat">
                <span class="label">总积分</span>
                <span class="value">${record.totalScore.toFixed(0)}</span>
              </div>
              <div class="detail-stat">
                <span class="label">圈速</span>
                <span class="value">${(record.lapTime / 1000).toFixed(2)}s</span>
              </div>
              <div class="detail-stat">
                <span class="label">采样点数</span>
                <span class="value">${record.trackData.length}</span>
              </div>
            </div>
            <canvas class="mini-track" data-mini-track="${record.id}"></canvas>
          </div>
        </div>
      `;

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleRecordExpand(record.id);
      });

      listEl.appendChild(item);

      if (isExpanded) {
        setTimeout(() => this.renderMiniTrack(record), 50);
      }
    });
  }

  private toggleRecordExpand(recordId: string): void {
    if (this.expandedRecordId === recordId) {
      this.expandedRecordId = null;
    } else {
      this.expandedRecordId = recordId;
      const record = this.historyRecords.find(r => r.id === recordId);
      if (record && this.recordSelectCallback) {
        this.recordSelectCallback(record);
      }
    }
    this.renderHistoryList();
  }

  private renderMiniTrack(record: LapRecord): void {
    const canvas = document.querySelector(`canvas[data-mini-track="${record.id}"]`) as HTMLCanvasElement;
    if (!canvas) return;

    if (!this.miniTrackViewer) {
      const tempCanvas = document.createElement('canvas');
      this.miniTrackViewer = new ReplayViewer(tempCanvas);
    }

    const trackGeometry = this.getTrackGeometry();
    if (trackGeometry) {
      this.miniTrackViewer.setTrackGeometry(trackGeometry);
    }
    this.miniTrackViewer.setCarColor(record.mode);
    this.miniTrackViewer.renderMiniTrack(canvas, record.trackData);
  }

  private trackGeometry: any = null;

  setTrackGeometry(geometry: any): void {
    this.trackGeometry = geometry;
  }

  private getTrackGeometry(): any {
    return this.trackGeometry;
  }

  onRecordSelect(callback: (record: LapRecord) => void): void {
    this.recordSelectCallback = callback;
  }

  addScorePopup(popup: ScorePopup): void {
    const container = document.getElementById('scorePopups');
    if (!container) return;

    const popupEl = document.createElement('div');
    popupEl.className = 'score-popup';
    popupEl.id = popup.id;
    popupEl.textContent = `+${popup.value}`;

    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(rect.width, rect.height) / 60;
      const screenX = rect.width / 2 + popup.position.x * scale;
      const screenY = rect.height / 2 + popup.position.y * scale;
      
      popupEl.style.left = `${screenX}px`;
      popupEl.style.top = `${screenY}px`;
    }

    container.appendChild(popupEl);

    setTimeout(() => {
      const el = document.getElementById(popup.id);
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 800);
  }

  showLapTime(lapTime: number): void {
    const lapInfo = document.getElementById('lapInfo');
    const lapTimeEl = document.getElementById('lapTime');
    
    if (lapInfo && lapTimeEl) {
      lapTimeEl.textContent = `圈速: ${(lapTime / 1000).toFixed(2)}s`;
      lapInfo.classList.remove('hidden');
      
      void lapInfo.offsetWidth;
      lapInfo.style.animation = 'none';
      void lapInfo.offsetWidth;
      lapInfo.style.animation = '';

      setTimeout(() => {
        lapInfo.classList.add('hidden');
      }, 3000);
    }
  }

  getCurrentMode(): ControlMode {
    return this.currentMode;
  }

  reset(): void {
    this.lastScoreValue = 0;
    const driftDisplay = document.getElementById('driftDisplay');
    if (driftDisplay) {
      driftDisplay.classList.add('hidden');
    }
  }
}
