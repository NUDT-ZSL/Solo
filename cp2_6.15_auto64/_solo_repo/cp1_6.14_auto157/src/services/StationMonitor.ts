import { eventBus } from '../event-bus';
import type { Station } from './SimulatedDataProvider';

export type CrowdLevel = 'green' | 'yellow' | 'orange' | 'red';

export interface StationStatus extends Station {
  crowdLevel: CrowdLevel;
  history: number[];
}

export interface CrowdLevelChangeEvent {
  stationId: string;
  stationName: string;
  oldLevel: CrowdLevel | null;
  newLevel: CrowdLevel;
}

const HISTORY_LENGTH = 10;

export function getCrowdLevel(flowRate: number): CrowdLevel {
  if (flowRate <= 250) return 'green';
  if (flowRate <= 500) return 'yellow';
  if (flowRate <= 750) return 'orange';
  return 'red';
}

const CROWD_LEVEL_ORDER: Record<CrowdLevel, number> = {
  red: 0,
  orange: 1,
  yellow: 2,
  green: 3
};

function sortByCrowdLevel(stations: StationStatus[]): StationStatus[] {
  return [...stations].sort((a, b) => {
    const levelDiff = CROWD_LEVEL_ORDER[a.crowdLevel] - CROWD_LEVEL_ORDER[b.crowdLevel];
    if (levelDiff !== 0) return levelDiff;
    return b.flowRate - a.flowRate;
  });
}

class StationMonitor {
  private stationMap: Map<string, StationStatus> = new Map();
  private previousLevels: Map<string, CrowdLevel> = new Map();
  private unsubscribe: (() => void) | null = null;

  start(): void {
    if (this.unsubscribe) return;

    this.unsubscribe = eventBus.on('data:update', (data) => {
      const stations = data as Station[];
      this.processData(stations);
    });
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.stationMap.clear();
    this.previousLevels.clear();
  }

  getStationStatuses(): StationStatus[] {
    const stations = Array.from(this.stationMap.values());
    return sortByCrowdLevel(stations);
  }

  getStationById(id: string): StationStatus | undefined {
    const station = this.stationMap.get(id);
    return station ? structuredClone(station) : undefined;
  }

  private processData(stations: Station[]): void {
    const levelChanges: CrowdLevelChangeEvent[] = [];

    stations.forEach((station) => {
      const existing = this.stationMap.get(station.id);
      const history = existing ? [...existing.history, station.flowRate] : [station.flowRate];
      if (history.length > HISTORY_LENGTH) {
        history.shift();
      }

      const newCrowdLevel = getCrowdLevel(station.flowRate);
      const prevLevel = this.previousLevels.get(station.id);

      if (prevLevel && prevLevel !== newCrowdLevel) {
        levelChanges.push({
          stationId: station.id,
          stationName: station.name,
          oldLevel: prevLevel,
          newLevel: newCrowdLevel
        });
      }

      this.previousLevels.set(station.id, newCrowdLevel);

      this.stationMap.set(station.id, {
        ...station,
        crowdLevel: newCrowdLevel,
        history
      });
    });

    this.emitStatusUpdate();

    if (levelChanges.length > 0) {
      this.emitLevelChanges(levelChanges);
    }
  }

  private emitStatusUpdate(): void {
    const statuses = this.getStationStatuses();
    eventBus.emit('status:update', statuses);
  }

  private emitLevelChanges(changes: CrowdLevelChangeEvent[]) {
    eventBus.emit('crowd-level:change', changes);
  }
}

export const stationMonitor = new StationMonitor();
