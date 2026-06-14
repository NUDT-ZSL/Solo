import { v4 as uuidv4 } from 'uuid';
import { eventBus } from '../event-bus';

export type StationStatus = 'normal' | 'delayed' | 'fault';

export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  flowRate: number;
  status: StationStatus;
}

const SHANGHAI_CENTER_LAT = 31.2304;
const SHANGHAI_CENTER_LNG = 121.4737;

const STATION_NAMES = [
  '人民广场', '南京东路', '静安寺', '徐家汇', '陆家嘴', '虹桥火车站',
  '中山公园', '漕河泾开发区', '莘庄', '共富新村', '彭浦新村', '上海火车站',
  '汉中路', '新闸路', '黄陂南路', '陕西南路', '常熟路', '衡山路',
  '肇嘉浜路', '上海体育馆', '上海游泳馆', '宜山路', '延安西路', '中山北路',
  '虹口足球场', '四平路', '海伦路', '宝山路', '江湾镇', '三门路',
  '翔殷路', '黄兴公园', '延吉中路', '江浦路', '鞍山新村', '大连路'
];

function generateStationCoords(index: number, total: number): { lat: number; lng: number } {
  const angle = (index / total) * Math.PI * 2 + Math.random() * 0.3;
  const radius = 0.03 + Math.random() * 0.08;
  const lat = SHANGHAI_CENTER_LAT + Math.sin(angle) * radius;
  const lng = SHANGHAI_CENTER_LNG + Math.cos(angle) * radius * 1.2;
  return { lat, lng };
}

function generateInitialStations(): Station[] {
  return STATION_NAMES.map((name, index) => {
    const { lat, lng } = generateStationCoords(index, STATION_NAMES.length);
    return {
      id: uuidv4(),
      name,
      lat,
      lng,
      flowRate: Math.floor(100 + Math.random() * 700),
      status: 'normal' as StationStatus
    };
  });
}

class SimulatedDataProvider {
  private stations: Station[] = [];
  private intervalId: number | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) return;

    this.stations = generateInitialStations();
    this.emitUpdate();
    this.isRunning = true;

    this.scheduleNextUpdate();
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  refresh(): void {
    this.updateFlows();
    this.emitUpdate();
  }

  getStations(): Station[] {
    return structuredClone(this.stations);
  }

  private scheduleNextUpdate(): void {
    this.intervalId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        this.updateFlows();
        this.emitUpdate();
        if (this.isRunning) {
          this.scheduleNextUpdate();
        }
      });
    }, 2000);
  }

  private updateFlows(): void {
    this.stations.forEach((station) => {
      const change = (Math.random() - 0.5) * 100;
      station.flowRate = Math.max(50, Math.min(1000, station.flowRate + change));

      const rand = Math.random();
      if (rand < 0.02) {
        station.status = 'fault';
      } else if (rand < 0.08) {
        station.status = 'delayed';
      } else {
        station.status = 'normal';
      }
    });
  }

  private emitUpdate(): void {
    eventBus.emit('data:update', this.stations);
  }
}

export const simulatedDataProvider = new SimulatedDataProvider();
