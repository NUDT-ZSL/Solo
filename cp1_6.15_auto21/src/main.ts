import { MapManager } from './map-manager';
import {
  generateStations,
  simulateBikeActivity,
  createDispatchTask,
  calculateGlobalStats,
  type BikeStation,
  type DispatchTask,
  type GlobalStats
} from './data-generator';

const SIMULATION_INTERVAL = 5000;
const DISPATCH_BIKE_COUNT = 3;

class App {
  private mapManager: MapManager;
  private stations: BikeStation[] = [];
  private dispatchTasks: DispatchTask[] = [];
  private simulationTimer: number | null = null;
  private dispatchMode: boolean = false;
  private heatmapVisible: boolean = false;
  private currentPopupStationId: string | null = null;
  private animatedValues = {
    totalBikes: 0,
    avgOccupancy: 0
  };

  constructor() {
    this.mapManager = new MapManager('map', {
      onStationClick: (id) => this.handleStationClick(id),
      onStationSelect: (id) => this.handleStationSelect(id)
    });

    this.init();
  }

  private init(): void {
    this.stations = generateStations();
    this.mapManager.addStations(this.stations);

    this.updateStatsPanel();
    this.setupEventListeners();
    this.startSimulation();
    this.setupResponsive();
  }

  private setupEventListeners(): void {
    const popupClose = document.getElementById('popupClose');
    const overlay = document.getElementById('overlay');
    const heatmapToggle = document.getElementById('heatmapToggle');
    const dispatchModeBtn = document.getElementById('dispatchModeBtn');
    const drawerHandle = document.getElementById('drawerHandle');
    const statsPanel = document.getElementById('statsPanel');

    popupClose?.addEventListener('click', () => this.closePopup());
    overlay?.addEventListener('click', () => this.closePopup());

    heatmapToggle?.addEventListener('click', () => {
      this.toggleHeatmap();
    });

    dispatchModeBtn?.addEventListener('click', () => {
      this.toggleDispatchMode();
    });

    drawerHandle?.addEventListener('click', () => {
      statsPanel?.classList.toggle('open');
      drawerHandle.classList.toggle('open');
    });
  }

  private setupResponsive(): void {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        const drawerHandle = document.getElementById('drawerHandle');
        drawerHandle?.classList.remove('open');
      }
    };
    window.addEventListener('resize', handleResize);
  }

  private startSimulation(): void {
    this.simulationTimer = window.setInterval(() => {
      this.simulateActivity();
    }, SIMULATION_INTERVAL);
  }

  private simulateActivity(): void {
    const result = simulateBikeActivity(this.stations);
    this.stations = result.stations;

    this.mapManager.updateStations(this.stations, result.changedIds);
    this.updateStatsPanel();

    if (this.currentPopupStationId) {
      this.updatePopupContent(this.currentPopupStationId);
    }
  }

  private handleStationClick(stationId: string): void {
    if (this.dispatchMode) return;
    this.showStationDetail(stationId);
  }

  private handleStationSelect(_stationId: string): void {
    if (!this.dispatchMode) return;

    const { startId, endId } = this.mapManager.getDispatchSelection();

    if (startId && endId) {
      this.startDispatch(startId, endId);
    }
  }

  private showStationDetail(stationId: string): void {
    this.currentPopupStationId = stationId;
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return;

    const popup = document.getElementById('detailPopup');
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('popupTitle');
    const bikes = document.getElementById('popupBikes');
    const capacity = document.getElementById('popupCapacity');
    const rate = document.getElementById('popupRate');

    if (title) title.textContent = station.name;
    if (bikes) bikes.textContent = String(station.bikeCount);
    if (capacity) capacity.textContent = String(station.capacity);
    if (rate) rate.textContent = `${Math.round((station.bikeCount / station.capacity) * 100)}%`;

    popup?.classList.add('show');
    overlay?.classList.add('show');

    setTimeout(() => {
      this.mapManager.drawHistoryChart('historyChart', station.hourlyHistory);
    }, 100);
  }

  private updatePopupContent(stationId: string): void {
    const station = this.stations.find(s => s.id === stationId);
    if (!station) return;

    const bikes = document.getElementById('popupBikes');
    const rate = document.getElementById('popupRate');

    if (bikes) bikes.textContent = String(station.bikeCount);
    if (rate) rate.textContent = `${Math.round((station.bikeCount / station.capacity) * 100)}%`;
  }

  private closePopup(): void {
    const popup = document.getElementById('detailPopup');
    const overlay = document.getElementById('overlay');
    popup?.classList.remove('show');
    overlay?.classList.remove('show');
    this.currentPopupStationId = null;
  }

  private toggleHeatmap(): void {
    this.heatmapVisible = !this.heatmapVisible;
    this.mapManager.toggleHeatmap(this.heatmapVisible);

    const btn = document.getElementById('heatmapToggle');
    if (btn) {
      btn.textContent = this.heatmapVisible ? '关闭热力图' : '热力图';
      btn.classList.toggle('active', this.heatmapVisible);
    }
  }

  private toggleDispatchMode(): void {
    this.dispatchMode = !this.dispatchMode;
    this.mapManager.setDispatchMode(this.dispatchMode);

    const btn = document.getElementById('dispatchModeBtn');
    const hint = document.getElementById('dispatchHint');

    if (btn) {
      btn.textContent = this.dispatchMode ? '退出调度模式' : '调度模式';
      btn.classList.toggle('active', this.dispatchMode);
    }

    if (hint) {
      hint.style.display = this.dispatchMode ? 'block' : 'none';
    }
  }

  private startDispatch(fromId: string, toId: string): void {
    const fromStation = this.stations.find(s => s.id === fromId);
    const toStation = this.stations.find(s => s.id === toId);

    if (!fromStation || !toStation) return;

    const transferCount = Math.min(DISPATCH_BIKE_COUNT, fromStation.bikeCount);
    const actualTransfer = Math.min(transferCount, toStation.capacity - toStation.bikeCount);

    if (actualTransfer <= 0) {
      this.mapManager.clearDispatchSelection();
      return;
    }

    const task = createDispatchTask(fromId, toId, actualTransfer);
    task.status = 'moving';
    this.dispatchTasks.push(task);

    this.stations = this.stations.map(s => {
      if (s.id === fromId) {
        return { ...s, bikeCount: s.bikeCount - actualTransfer };
      }
      return s;
    });

    this.mapManager.updateStations(this.stations, [fromId]);
    this.mapManager.clearDispatchSelection();
    this.updateStatsPanel();

    this.mapManager.startDispatchAnimation(task, this.stations, () => {
      this.completeDispatch(task);
    });
  }

  private completeDispatch(task: DispatchTask): void {
    this.stations = this.stations.map(s => {
      if (s.id === task.toStationId) {
        const newCount = Math.min(s.capacity, s.bikeCount + task.bikeCount);
        return { ...s, bikeCount: newCount };
      }
      return s;
    });

    this.dispatchTasks = this.dispatchTasks.filter(t => t.id !== task.id);

    this.mapManager.updateStations(this.stations, [task.toStationId]);
    this.updateStatsPanel();

    if (this.currentPopupStationId === task.toStationId) {
      this.updatePopupContent(task.toStationId);
    }
  }

  private updateStatsPanel(): void {
    const stats = calculateGlobalStats(this.stations, this.dispatchTasks);

    this.animateValue(
      'totalBikes',
      this.animatedValues.totalBikes,
      stats.totalBikes
    );
    this.animatedValues.totalBikes = stats.totalBikes;

    this.animateValue(
      'avgOccupancy',
      this.animatedValues.avgOccupancy,
      stats.avgOccupancy,
      true
    );
    this.animatedValues.avgOccupancy = stats.avgOccupancy;

    const activeEl = document.getElementById('activeDispatches');
    if (activeEl) {
      activeEl.textContent = String(stats.activeDispatches);
    }
  }

  private animateValue(
    elementId: string,
    from: number,
    to: number,
    isPercent: boolean = false
  ): void {
    const element = document.getElementById(elementId);
    if (!element) return;

    const duration = 600;
    const startTime = performance.now();
    const diff = to - from;

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);

      element.textContent = isPercent ? `${current}%` : String(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }

  destroy(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
    }
    this.mapManager.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
