import { create } from 'zustand';
import type { GameState, Port, CargoItem, VoyageEvent, VoyageState } from './types';
import { INITIAL_PORTS, INITIAL_SHIP, calculateRouteDistance, calculateVoyageDuration, checkEncounter, generatePiratePower, calculatePlayerPower, calculateWinRate, resolveBattle, resolveFlee, calculateSettlement, calculateCargoProfit } from './GameEngine';

interface GameActions {
  selectPort: (port: Port) => void;
  setDestination: (port: Port) => void;
  addCargo: (goodId: string, quantity: number, goods: import('./types').Good[]) => void;
  removeCargo: (goodId: string) => void;
  startVoyage: () => void;
  updateVoyageProgress: (progress: number) => void;
  handleEncounter: (encounterType: 'pirate' | 'storm') => void;
  resolveEncounter: (action: 'fight' | 'flee') => void;
  continueVoyage: () => void;
  settleVoyage: () => void;
  upgradeHull: () => void;
  upgradeCannon: () => void;
  cancelVoyage: () => void;
  clearSelection: () => void;
  setStormMessage: (msg: string | null) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ship: { ...INITIAL_SHIP },
  gold: 500,
  currentPort: INITIAL_PORTS[0],
  selectedPort: null,
  destinationPort: null,
  voyage: null,
  tradeRecords: [],
  ports: INITIAL_PORTS,
  cargo: [],
  stormMessage: null,

  selectPort: (port) => {
    const state = get();
    if (state.voyage?.status === 'sailing' || state.voyage?.status === 'encounter') return;
    if (!state.selectedPort || state.selectedPort.id === port.id) {
      set({ selectedPort: port, destinationPort: null });
    } else if (state.selectedPort.id !== port.id) {
      set({ destinationPort: port });
    }
  },

  setDestination: (port) => {
    set({ destinationPort: port });
  },

  addCargo: (goodId, quantity, goods) => {
    const state = get();
    const good = goods.find(g => g.id === goodId);
    if (!good) return;
    const currentWeight = state.cargo.reduce((s, c) => s + c.good.weight * c.quantity, 0);
    const newWeight = currentWeight + good.weight * quantity;
    if (newWeight > state.ship.maxCapacity) return;
    const existing = state.cargo.find(c => c.good.id === goodId);
    let newCargo: CargoItem[];
    if (existing) {
      newCargo = state.cargo.map(c =>
        c.good.id === goodId ? { ...c, quantity: c.quantity + quantity } : c
      );
    } else {
      newCargo = [...state.cargo, { good, quantity }];
    }
    set({ cargo: newCargo });
  },

  removeCargo: (goodId) => {
    set(state => ({ cargo: state.cargo.filter(c => c.good.id !== goodId) }));
  },

  startVoyage: () => {
    const state = get();
    if (!state.selectedPort || !state.destinationPort || state.cargo.length === 0) return;
    if (state.selectedPort.id === state.destinationPort.id) return;
    const voyage: VoyageState = {
      fromPort: state.selectedPort,
      toPort: state.destinationPort,
      cargo: [...state.cargo],
      progress: 0,
      events: [],
      status: 'sailing',
    };
    set({ voyage, cargo: [], selectedPort: null, destinationPort: null });
  },

  updateVoyageProgress: (progress) => {
    const state = get();
    if (!state.voyage || state.voyage.status !== 'sailing') return;
    const checkedPoints = [0.3, 0.6, 0.9];
    const voyage = { ...state.voyage, progress };
    for (const point of checkedPoints) {
      const alreadyChecked = voyage.events.some(e => Math.abs(e.progress - point) < 0.05);
      if (progress >= point && !alreadyChecked) {
        const encounter = checkEncounter();
        if (encounter === 'pirate') {
          const piratePower = generatePiratePower();
          const event: VoyageEvent = {
            type: 'pirate',
            progress: point,
            resolved: false,
            piratePower,
          };
          set({
            voyage: { ...voyage, status: 'encounter', events: [...voyage.events, event], currentEvent: event },
          });
          return;
        } else if (encounter === 'storm') {
          const event: VoyageEvent = {
            type: 'storm',
            progress: point,
            resolved: true,
            result: 'defeat',
          };
          const durabilityLoss = Math.floor(state.ship.maxDurability * 0.1);
          const newDurability = Math.max(0, state.ship.durability - durabilityLoss);
          set({
            voyage: { ...voyage, events: [...voyage.events, event] },
            ship: { ...state.ship, durability: newDurability },
            stormMessage: `⛈️ 风暴来袭！耐久度 -${durabilityLoss}%`,
          });
          return;
        }
      }
    }
    if (progress >= 1) {
      set({ voyage: { ...voyage, progress: 1, status: 'completed' } });
      return;
    }
    set({ voyage });
  },

  handleEncounter: (encounterType) => {
    if (encounterType === 'storm') {
      const state = get();
      const durabilityLoss = Math.floor(state.ship.maxDurability * 0.1);
      const newDurability = Math.max(0, state.ship.durability - durabilityLoss);
      set({
        ship: { ...state.ship, durability: newDurability },
        stormMessage: `⛈️ 风暴来袭！耐久度 -${durabilityLoss}%`,
      });
    }
  },

  resolveEncounter: (action) => {
    const state = get();
    if (!state.voyage?.currentEvent) return;
    const evt = state.voyage.currentEvent;
    let result: 'victory' | 'defeat' | 'flee_success' | 'flee_fail';
    if (action === 'fight') {
      const playerPower = calculatePlayerPower(state.ship);
      const winRate = calculateWinRate(playerPower, evt.piratePower ?? 60);
      result = resolveBattle(winRate);
    } else {
      result = resolveFlee() ? 'flee_success' : 'flee_fail';
    }
    const updatedEvents = state.voyage.events.map(e =>
      e === evt ? { ...e, resolved: true, result } : e
    );
    const updatedVoyage = {
      ...state.voyage,
      events: updatedEvents,
      currentEvent: undefined,
      status: 'sailing' as const,
    };
    if (result === 'victory') {
      const cargoValue = state.voyage.cargo.reduce((s, c) => s + c.good.basePrice * c.quantity, 0);
      updatedVoyage.bonusGold = Math.floor(cargoValue * 0.2);
    }
    if (result === 'defeat' || result === 'flee_fail') {
      const durabilityLoss = result === 'flee_fail' ? 5 : 0;
      set({
        voyage: updatedVoyage,
        ship: { ...state.ship, durability: Math.max(0, state.ship.durability - durabilityLoss) },
      });
    } else {
      set({ voyage: updatedVoyage });
    }
  },

  continueVoyage: () => {
    const state = get();
    if (!state.voyage) return;
    set({ voyage: { ...state.voyage, status: 'sailing', currentEvent: undefined } });
  },

  settleVoyage: () => {
    const state = get();
    if (!state.voyage || state.voyage.status !== 'completed') return;
    const settlement = calculateSettlement(state.voyage);
    const destPort = state.voyage.toPort;
    const updatedPorts = state.ports.map(p =>
      p.id === destPort.id ? { ...p, isExplored: true } : p
    );
    const record = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      fromPort: state.voyage.fromPort.name,
      toPort: state.voyage.toPort.name,
      profit: settlement.profit,
      events: settlement.events,
    };
    set({
      gold: state.gold + settlement.profit,
      currentPort: destPort,
      voyage: null,
      tradeRecords: [record, ...state.tradeRecords],
      ports: updatedPorts,
      ship: { ...state.ship, durability: Math.min(state.ship.maxDurability, state.ship.durability + 20) },
    });
  },

  upgradeHull: () => {
    const state = get();
    if (state.ship.hullLevel >= 5) return;
    const cost = state.ship.hullLevel * 200;
    if (state.gold < cost) return;
    set({
      gold: state.gold - cost,
      ship: {
        ...state.ship,
        hullLevel: state.ship.hullLevel + 1,
        maxCapacity: state.ship.maxCapacity + 50,
        maxDurability: state.ship.maxDurability + 20,
        durability: Math.min(state.ship.maxDurability + 20, state.ship.durability + 20),
      },
    });
  },

  upgradeCannon: () => {
    const state = get();
    if (state.ship.cannonLevel >= 5) return;
    const cost = state.ship.cannonLevel * 150;
    if (state.gold < cost) return;
    set({
      gold: state.gold - cost,
      ship: { ...state.ship, cannonLevel: state.ship.cannonLevel + 1 },
    });
  },

  cancelVoyage: () => {
    set({ voyage: null, selectedPort: null, destinationPort: null, cargo: [] });
  },

  clearSelection: () => {
    set({ selectedPort: null, destinationPort: null });
  },

  setStormMessage: (msg) => {
    set({ stormMessage: msg });
  },
}));
