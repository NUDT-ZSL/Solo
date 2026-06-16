import { ServerData, SERVER_NAMES, MAX_HISTORY_LENGTH, MetricPoint } from './types';

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function generateSpikeValue(base: number, threshold: number): number {
  const shouldSike = Math.random() < 0.05;
  if (shouldSike) {
    return randomInRange(threshold - 5, 99);
  }
  return randomInRange(Math.max(0, base - 20), Math.min(100, base + 20));
}

function createHistory(value: number): MetricPoint[] {
  const now = Date.now();
  const history: MetricPoint[] = [];
  for (let i = MAX_HISTORY_LENGTH - 1; i >= 0; i--) {
    history.push({
      timestamp: now - i * 1000,
      value: randomInRange(Math.max(0, value - 15), Math.min(100, value + 15)),
    });
  }
  return history;
}

const baselineValues = [
  { cpu: 45, memory: 60, disk: 55, network: 30 },
  { cpu: 55, memory: 70, disk: 65, network: 40 },
  { cpu: 35, memory: 50, disk: 45, network: 25 },
  { cpu: 65, memory: 75, disk: 70, network: 50 },
];

export function generateInitialData(): ServerData[] {
  return SERVER_NAMES.map((name, i) => {
    const base = baselineValues[i];
    const cpu = generateSpikeValue(base.cpu, 85);
    const memory = generateSpikeValue(base.memory, 90);
    const disk = generateSpikeValue(base.disk, 80);
    const network = generateSpikeValue(base.network, 95);
    return {
      id: `server-${i + 1}`,
      name,
      cpu,
      memory,
      disk,
      network,
      cpuHistory: createHistory(cpu),
      memoryHistory: createHistory(memory),
      diskHistory: createHistory(disk),
      networkHistory: createHistory(network),
    };
  });
}

export function generateUpdatedData(prevData: ServerData[]): ServerData[] {
  const now = Date.now();
  return prevData.map((server, i) => {
    const base = baselineValues[i];
    const cpu = generateSpikeValue(base.cpu, 85);
    const memory = generateSpikeValue(base.memory, 90);
    const disk = generateSpikeValue(base.disk, 80);
    const network = generateSpikeValue(base.network, 95);

    const pushHistory = (history: MetricPoint[], val: number): MetricPoint[] => {
      const next = [...history, { timestamp: now, value: val }];
      return next.length > MAX_HISTORY_LENGTH ? next.slice(-MAX_HISTORY_LENGTH) : next;
    };

    return {
      ...server,
      cpu,
      memory,
      disk,
      network,
      cpuHistory: pushHistory(server.cpuHistory, cpu),
      memoryHistory: pushHistory(server.memoryHistory, memory),
      diskHistory: pushHistory(server.diskHistory, disk),
      networkHistory: pushHistory(server.networkHistory, network),
    };
  });
}
