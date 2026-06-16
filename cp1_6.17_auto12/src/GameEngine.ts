import type { Port, Good, Ship, CargoItem, VoyageState, VoyageEvent, SettlementResult, PortTradeHistory } from './types';

export const INITIAL_GOODS: Good[] = [
  { id: 'spice', name: '香料', emoji: '🧂', weight: 10, basePrice: 50, sellPrice: 120 },
  { id: 'silk', name: '丝绸', emoji: '🧶', weight: 8, basePrice: 80, sellPrice: 180 },
  { id: 'porcelain', name: '瓷器', emoji: '🏺', weight: 15, basePrice: 60, sellPrice: 150 },
  { id: 'tea', name: '茶叶', emoji: '☕', weight: 5, basePrice: 30, sellPrice: 70 },
  { id: 'gem', name: '宝石', emoji: '💎', weight: 3, basePrice: 200, sellPrice: 450 },
];

export const INITIAL_PORTS: Port[] = [
  {
    id: 'quanzhou',
    name: '泉州',
    x: 15,
    y: 35,
    goods: [INITIAL_GOODS[0], INITIAL_GOODS[1], INITIAL_GOODS[3]],
    isExplored: true,
    prosperity: 5,
  },
  {
    id: 'guangzhou',
    name: '广州',
    x: 25,
    y: 55,
    goods: [INITIAL_GOODS[1], INITIAL_GOODS[2], INITIAL_GOODS[3]],
    isExplored: true,
    prosperity: 4,
  },
  {
    id: 'champa',
    name: '占城',
    x: 42,
    y: 60,
    goods: [INITIAL_GOODS[0], INITIAL_GOODS[3], INITIAL_GOODS[4]],
    isExplored: false,
    prosperity: 3,
  },
  {
    id: 'malacca',
    name: '满剌加',
    x: 55,
    y: 72,
    goods: [INITIAL_GOODS[0], INITIAL_GOODS[4], INITIAL_GOODS[2]],
    isExplored: false,
    prosperity: 4,
  },
  {
    id: 'india',
    name: '天竺',
    x: 75,
    y: 45,
    goods: [INITIAL_GOODS[4], INITIAL_GOODS[1], INITIAL_GOODS[2]],
    isExplored: false,
    prosperity: 5,
  },
];

export const INITIAL_SHIP: Ship = {
  hullLevel: 1,
  cannonLevel: 1,
  maxCapacity: 200,
  durability: 100,
  maxDurability: 100,
};

export function calculateRouteDistance(from: Port, to: Port): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function calculateVoyageDuration(distance: number): number {
  return Math.max(2000, Math.min(4000, distance * 80));
}

export function calculateCargoProfit(cargo: CargoItem[], destination: Port): number {
  let total = 0;
  for (const item of cargo) {
    const destGood = destination.goods.find(g => g.id === item.good.id);
    if (destGood) {
      total += (item.good.sellPrice - item.good.basePrice) * item.quantity;
    } else {
      total += Math.floor((item.good.sellPrice * 0.5 - item.good.basePrice) * item.quantity);
    }
  }
  return total;
}

export function calculatePlayerPower(ship: Ship): number {
  return ship.cannonLevel * 10 + ship.hullLevel * 15;
}

export function calculateWinRate(playerPower: number, piratePower: number): number {
  const total = playerPower + piratePower;
  if (total === 0) return 0.5;
  return Math.min(0.95, Math.max(0.05, playerPower / total));
}

export function generatePiratePower(): number {
  return Math.floor(Math.random() * 41) + 40;
}

export function checkEncounter(): 'pirate' | 'storm' | 'none' {
  const roll = Math.random();
  if (roll < 0.4) return 'pirate';
  if (roll < 0.6) return 'storm';
  return 'none';
}

export function resolveBattle(winRate: number): 'victory' | 'defeat' {
  return Math.random() < winRate ? 'victory' : 'defeat';
}

export function resolveFlee(): 'success' | 'fail' {
  return Math.random() < 0.5 ? 'success' : 'fail';
}

export function calculateSettlement(voyage: VoyageState): SettlementResult {
  let profit = calculateCargoProfit(voyage.cargo, voyage.toPort);
  let bonusGold = 0;
  let cargoLost = 0;
  let durabilityLost = 0;
  const eventSummary: string[] = [];

  for (const evt of voyage.events) {
    if (!evt.resolved) continue;
    if (evt.type === 'pirate') {
      if (evt.result === 'victory') {
        const cargoValue = voyage.cargo.reduce((s, c) => s + c.good.basePrice * c.quantity, 0);
        bonusGold += Math.floor(cargoValue * 0.2);
        eventSummary.push('击败海盗');
      } else if (evt.result === 'defeat') {
        cargoLost += 30;
        eventSummary.push('败于海盗');
      } else if (evt.result === 'flee_fail') {
        cargoLost += 30;
        durabilityLost += 5;
        eventSummary.push('逃离失败');
      } else {
        eventSummary.push('成功逃离');
      }
    } else if (evt.type === 'storm') {
      durabilityLost += 10;
      eventSummary.push('遭遇风暴');
    }
  }

  if (cargoLost > 0) {
    const lostRatio = cargoLost / 100;
    profit = Math.floor(profit * (1 - lostRatio));
  }

  return {
    profit: Math.max(0, profit + bonusGold),
    bonusGold,
    cargoLost,
    durabilityLost,
    events: eventSummary,
  };
}

export function getBezierControlPoint(from: Port, to: Port): { cx: number; cy: number } {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const offset = Math.min(15, Math.sqrt(dx * dx + dy * dy) * 0.3);
  return {
    cx: midX - dy * 0.3,
    cy: midY + dx * 0.2 - offset * 0.5,
  };
}

export function getPointOnBezier(
  from: Port,
  to: Port,
  t: number,
  control?: { cx: number; cy: number }
): { x: number; y: number } {
  const cp = control || getBezierControlPoint(from, to);
  const mt = 1 - t;
  const x = mt * mt * from.x + 2 * mt * t * cp.cx + t * t * to.x;
  const y = mt * mt * from.y + 2 * mt * t * cp.cy + t * t * to.y;
  return { x, y };
}

export function generateMockPortHistory(port: Port, allPorts: Port[]): PortTradeHistory[] {
  const otherPorts = allPorts.filter(p => p.id !== port.id);
  const history: PortTradeHistory[] = [];
  const now = Date.now();

  for (let i = 0; i < 3; i++) {
    const randomGood = port.goods[Math.floor(Math.random() * port.goods.length)];
    const randomOtherPort = otherPorts[Math.floor(Math.random() * otherPorts.length)];
    const baseProfit = (randomGood.sellPrice - randomGood.basePrice) * Math.floor(Math.random() * 10 + 5);
    const variance = Math.floor(baseProfit * 0.3 * (Math.random() - 0.5) * port.prosperity);

    history.push({
      id: `${port.id}-history-${i}`,
      goodName: randomGood.name,
      goodEmoji: randomGood.emoji,
      profit: baseProfit + variance,
      timestamp: now - (i + 1) * 3600000 * Math.floor(Math.random() * 24 + 1),
      otherPort: randomOtherPort.name,
    });
  }

  return history.sort((a, b) => b.timestamp - a.timestamp);
}
