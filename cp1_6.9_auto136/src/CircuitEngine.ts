import { Component, Connection, CircuitState, SimParams } from './types';

interface PinKey {
  componentId: string;
  pinIndex: number;
}

function pinKeyToString(pk: PinKey): string {
  return `${pk.componentId}__pin${pk.pinIndex}`;
}

export interface CircuitDetectionResult {
  isClosed: boolean;
  totalResistance: number;
  batteryVoltage: number;
  orderedPath: PinKey[];
}

export function detectCircuit(
  connections: Connection[],
  components: Component[]
): CircuitDetectionResult {
  const battery = components.find((c) => c.type === 'battery');
  if (!battery) {
    return { isClosed: false, totalResistance: 0, batteryVoltage: 0, orderedPath: [] };
  }

  const adjacency: Map<string, PinKey[]> = new Map();

  const addEdge = (a: PinKey, b: PinKey) => {
    const ka = pinKeyToString(a);
    const kb = pinKeyToString(b);
    if (!adjacency.has(ka)) adjacency.set(ka, []);
    if (!adjacency.has(kb)) adjacency.set(kb, []);
    adjacency.get(ka)!.push(b);
    adjacency.get(kb)!.push(a);
  };

  for (const conn of connections) {
    const from: PinKey = { componentId: conn.fromId, pinIndex: conn.fromPinIndex };
    const to: PinKey = { componentId: conn.toId, pinIndex: conn.toPinIndex };
    addEdge(from, to);
  }

  const componentsById: Map<string, Component> = new Map();
  for (const comp of components) componentsById.set(comp.id, comp);

  const sameComponentInternalEdges: Array<[PinKey, PinKey]> = [];
  for (const comp of components) {
    if (comp.pinPositions.length < 2) continue;
    if (comp.type === 'switch') {
      if (comp.params.closed === true) {
        for (let i = 1; i < comp.pinPositions.length; i++) {
          sameComponentInternalEdges.push([
            { componentId: comp.id, pinIndex: 0 },
            { componentId: comp.id, pinIndex: i },
          ]);
        }
      }
    } else {
      for (let i = 1; i < comp.pinPositions.length; i++) {
        sameComponentInternalEdges.push([
          { componentId: comp.id, pinIndex: 0 },
          { componentId: comp.id, pinIndex: i },
        ]);
      }
    }
  }
  for (const [a, b] of sameComponentInternalEdges) addEdge(a, b);

  const posPin: PinKey = { componentId: battery.id, pinIndex: 0 };
  const negPin: PinKey = { componentId: battery.id, pinIndex: 1 };
  const posKey = pinKeyToString(posPin);
  const negKey = pinKeyToString(negPin);

  const visited: Set<string> = new Set();
  const parent: Map<string, { key: string; pk: PinKey } | null> = new Map();
  const queue: PinKey[] = [posPin];
  visited.add(posKey);
  parent.set(posKey, null);
  let found = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentKey = pinKeyToString(current);
    if (currentKey === negKey) {
      found = true;
      break;
    }
    const neighbors = adjacency.get(currentKey) || [];
    for (const nb of neighbors) {
      const nbKey = pinKeyToString(nb);
      if (!visited.has(nbKey)) {
        visited.add(nbKey);
        parent.set(nbKey, { key: currentKey, pk: current });
        queue.push(nb);
      }
    }
  }

  if (!found) {
    return { isClosed: false, totalResistance: 0, batteryVoltage: battery.params.voltage, orderedPath: [] };
  }

  const orderedPath: PinKey[] = [];
  let curKey: string | null = negKey;
  while (curKey) {
    const [cid, pidxStr] = curKey.split('__pin');
    orderedPath.unshift({ componentId: cid, pinIndex: parseInt(pidxStr, 10) });
    const p = parent.get(curKey);
    curKey = p ? p.key : null;
  }

  const componentIdsInPath = new Set<string>();
  for (const pk of orderedPath) componentIdsInPath.add(pk.componentId);

  let totalResistance = 0;
  for (const cid of componentIdsInPath) {
    const c = componentsById.get(cid);
    if (!c) continue;
    if (c.type === 'resistor') {
      totalResistance += Number(c.params.resistance) || 0;
    } else if (c.type === 'led') {
      totalResistance += 50;
    }
  }

  return {
    isClosed: true,
    totalResistance,
    batteryVoltage: Number(battery.params.voltage) || 0,
    orderedPath,
  };
}

export function calculatePower(voltage: number, currentMA: number): number {
  return voltage * currentMA;
}

export function computeSimParams(
  connections: Connection[],
  components: Component[]
): SimParams {
  const result = detectCircuit(connections, components);
  if (!result.isClosed || result.totalResistance === 0) {
    return {
      voltage: result.batteryVoltage,
      current: 0,
      power: 0,
      status: CircuitState.Open,
    };
  }
  const currentA = result.batteryVoltage / result.totalResistance;
  const currentMA = currentA * 1000;
  const powerMW = calculatePower(result.batteryVoltage, currentMA);
  return {
    voltage: result.batteryVoltage,
    current: currentMA,
    power: powerMW,
    status: CircuitState.Closed,
  };
}

export function bezierPoint(
  t: number,
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

export function bezierLengthApprox(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  steps = 30
): number {
  let total = 0;
  let prev = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cur = bezierPoint(t, p0, p1, p2);
    total += Math.hypot(cur.x - prev.x, cur.y - prev.y);
    prev = cur;
  }
  return total;
}
