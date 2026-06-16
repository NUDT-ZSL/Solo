/*
 * 游戏核心引擎 - 纯函数模块，无副作用
 * 被调用：useGameState.ts, App.tsx, MinerPanel.tsx, MarketPanel.tsx, EquipmentPanel.tsx
 * 接收：当前游戏状态对象 (GameState)
 * 返回：更新后的游戏状态对象 (GameState)
 * 数据流向：组件 -> 调用引擎函数 -> 返回新状态 -> 组件更新UI
 */

import {
  GameState,
  Miner,
  MinerLevel,
  ResourceType,
  EquipmentType,
  GameEvent,
  EventType,
  MINER_TEMPLATES,
  INITIAL_RESOURCES,
  INITIAL_EQUIPMENT,
  PRICE_FLUCTUATION,
  BASE_OUTPUT,
  MAX_STORAGE_BASE,
  PriceDirection,
} from './types';

let animationFrameId: number | null = null;
let lastTimestamp = 0;

/*
 * 计算资源产量
 * 执行耗时估算：~0.1ms - 0.5ms (O(n) 遍历矿工列表，n为矿工数量)
 * 逻辑：遍历已雇佣矿工列表，累加每个矿工的基础效率，乘以基础产量和设备加成
 */
export function calcResourceOutput(state: GameState): number {
  const miners = state.miners;
  
  let totalEfficiency = 0;
  for (let i = 0; i < miners.length; i++) {
    totalEfficiency += miners[i].efficiency;
  }
  
  const pickaxeBonus = 1 + state.equipment.pickaxe.level * state.equipment.pickaxe.effect;
  let eventMultiplier = 1;
  
  if (state.activeEvent) {
    const now = Date.now();
    if (now - state.activeEvent.startTime < state.activeEvent.duration * 1000) {
      eventMultiplier = state.activeEvent.effectMultiplier;
    }
  }
  
  const output = BASE_OUTPUT * totalEfficiency * pickaxeBonus * eventMultiplier;
  
  return output;
}

/*
 * 计算总矿工效率
 * 执行耗时估算：~0.05ms - 0.3ms (O(n) 遍历矿工列表)
 */
export function calcTotalEfficiency(miners: Miner[]): number {
  let total = 0;
  for (let i = 0; i < miners.length; i++) {
    total += miners[i].efficiency;
  }
  return total;
}

/*
 * 计算设备升级费用
 * 执行耗时估算：~0.01ms (指数运算，常数时间)
 * 逻辑：升级费用呈指数曲线增长 baseCost * (1.5 ^ level)
 */
export function calcUpgradeCost(equipmentType: EquipmentType, currentLevel: number): number {
  const baseCosts: Record<EquipmentType, number> = {
    pickaxe: 50,
    furnace: 80,
    warehouse: 100,
  };
  
  const baseCost = baseCosts[equipmentType];
  const cost = Math.floor(baseCost * Math.pow(1.5, currentLevel));
  
  return cost;
}

/*
 * 雇佣矿工
 * 执行耗时估算：~0.1ms (创建新矿工对象，常数时间)
 */
export function hireMiner(state: GameState, minerLevel: MinerLevel): GameState {
  const template = MINER_TEMPLATES.find(t => t.level === minerLevel);
  if (!template) return state;
  
  if (state.coins < template.cost) return state;
  
  const newMiner: Miner = {
    id: `miner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    level: minerLevel,
    name: template.name,
    efficiency: template.efficiency,
    status: 'mining',
    hiredAt: Date.now(),
  };
  
  const newMiners = [...state.miners, newMiner];
  const newTotalEfficiency = calcTotalEfficiency(newMiners);
  
  const newState: GameState = {
    ...state,
    coins: state.coins - template.cost,
    miners: newMiners,
    totalEfficiency: newTotalEfficiency,
    outputPerSecond: calcResourceOutput({ ...state, miners: newMiners, totalEfficiency: newTotalEfficiency }),
  };
  
  return newState;
}

/*
 * 升级设备
 * 执行耗时估算：~0.1ms (更新设备等级，更新动画粒子数量)
 * 逻辑：升级后根据新等级计算粒子数量（等级 * 5）
 */
export function upgradeEquipment(state: GameState, equipmentType: EquipmentType): GameState {
  const equipment = state.equipment[equipmentType];
  if (equipment.level >= equipment.maxLevel) return state;
  
  const cost = calcUpgradeCost(equipmentType, equipment.level);
  if (state.coins < cost) return state;
  
  const newLevel = equipment.level + 1;
  const newEquipment = {
    ...state.equipment,
    [equipmentType]: { ...equipment, level: newLevel },
  };
  
  const newParticleCount = newLevel * 5;
  const newAnimationSpeed = 1 + newLevel * 0.1;
  
  const newState: GameState = {
    ...state,
    coins: state.coins - cost,
    equipment: newEquipment,
    animationConfig: {
      particleCount: newParticleCount,
      animationSpeed: newAnimationSpeed,
    },
    outputPerSecond: calcResourceOutput({ ...state, equipment: newEquipment }),
  };
  
  return newState;
}

/*
 * 市场交易
 * 执行耗时估算：~0.05ms (资源数量加减运算)
 */
export function trade(
  state: GameState,
  resourceType: ResourceType,
  amount: number,
  isBuy: boolean
): GameState {
  const resource = state.resources[resourceType];
  const maxStorage = MAX_STORAGE_BASE + state.equipment.warehouse.level * state.equipment.warehouse.effect;
  
  if (isBuy) {
    const totalCost = Math.floor(resource.currentPrice * amount);
    if (state.coins < totalCost) return state;
    if (resource.amount + amount > maxStorage) return state;
    
    const newState: GameState = {
      ...state,
      coins: state.coins - totalCost,
      resources: {
        ...state.resources,
        [resourceType]: {
          ...resource,
          amount: resource.amount + amount,
        },
      },
    };
    
    return newState;
  } else {
    if (resource.amount < amount) return state;
    
    let priceMultiplier = 1;
    if (resourceType === 'copper') {
      priceMultiplier = 1 + state.equipment.furnace.level * state.equipment.furnace.effect;
    }
    
    const totalRevenue = Math.floor(resource.currentPrice * amount * priceMultiplier);
    
    const newState: GameState = {
      ...state,
      coins: state.coins + totalRevenue,
      resources: {
        ...state.resources,
        [resourceType]: {
          ...resource,
          amount: resource.amount - amount,
        },
      },
    };
    
    return newState;
  }
}

/*
 * 模拟市场价格波动
 * 执行耗时估算：~0.2ms - 0.5ms (遍历4种资源，计算随机波动)
 * 逻辑：使用 requestAnimationFrame 驱动，检查时间间隔（8-15秒随机）
 */
export function simulateMarketPrice(state: GameState, currentTime: number): GameState {
  if (currentTime < state.nextMarketUpdate) return state;
  
  const newResources = { ...state.resources };
  const resourceTypes: ResourceType[] = ['gold', 'copper', 'silver', 'gem'];
  
  for (const type of resourceTypes) {
    const resource = newResources[type];
    const fluctuation = PRICE_FLUCTUATION[type];
    const randomFactor = 1 + (Math.random() * 2 - 1) * fluctuation;
    const newPrice = Math.max(resource.basePrice * 0.5, Math.min(resource.basePrice * 2, resource.currentPrice * randomFactor));
    
    const priceDirection: PriceDirection = newPrice > resource.currentPrice ? 'up' : newPrice < resource.currentPrice ? 'down' : 'none';
    
    newResources[type] = {
      ...resource,
      currentPrice: Math.floor(newPrice * 100) / 100,
      priceDirection,
      lastPriceChange: currentTime,
    };
  }
  
  const nextInterval = 8000 + Math.random() * 7000;
  
  const newState: GameState = {
    ...state,
    resources: newResources,
    nextMarketUpdate: currentTime + nextInterval,
    marketUpdateInterval: nextInterval,
  };
  
  return newState;
}

/*
 * 触发随机事件
 * 执行耗时估算：~0.1ms (创建事件对象)
 */
export function triggerRandomEvent(state: GameState, currentTime: number): GameState {
  if (state.activeEvent) {
    if (currentTime - state.activeEvent.startTime < state.activeEvent.duration * 1000) {
      return state;
    }
  }
  
  if (currentTime < state.nextEventUpdate) return state;
  
  const eventTypes: EventType[] = ['vein_found', 'equipment_failure', 'merchant_visit'];
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  let event: GameEvent;
  
  switch (eventType) {
    case 'vein_found':
      event = {
        id: `event_${Date.now()}`,
        type: 'vein_found',
        title: '发现矿脉！',
        description: '矿工发现了一条富矿脉，产量提升50%，持续10秒！',
        duration: 10,
        startTime: currentTime,
        effectMultiplier: 1.5,
      };
      break;
    case 'equipment_failure':
      event = {
        id: `event_${Date.now()}`,
        type: 'equipment_failure',
        title: '设备故障！',
        description: '采矿设备出现故障，产量减半，持续8秒！',
        duration: 8,
        startTime: currentTime,
        effectMultiplier: 0.5,
      };
      break;
    case 'merchant_visit':
      event = {
        id: `event_${Date.now()}`,
        type: 'merchant_visit',
        title: '商人来访！',
        description: '神秘商人提供限量折扣，宝石购买享7折优惠！',
        duration: 15,
        startTime: currentTime,
        effectMultiplier: 1,
        discount: 0.7,
      };
      break;
  }
  
  const nextEventInterval = 20000 + Math.random() * 10000;
  
  const newState: GameState = {
    ...state,
    activeEvent: event,
    nextEventUpdate: currentTime + nextEventInterval,
    eventUpdateInterval: nextEventInterval,
    outputPerSecond: calcResourceOutput({ ...state, activeEvent: event }),
  };
  
  return newState;
}

/*
 * 更新资源采集
 * 执行耗时估算：~0.1ms (计算时间差，更新资源数量)
 */
export function updateResourceCollection(state: GameState, currentTime: number): GameState {
  const deltaTime = (currentTime - state.lastUpdateTime) / 1000;
  if (deltaTime <= 0) return state;
  
  const output = calcResourceOutput(state);
  const copperGain = output * deltaTime * 0.6;
  const silverGain = output * deltaTime * 0.25;
  const goldGain = output * deltaTime * 0.1;
  const gemGain = output * deltaTime * 0.05;
  
  const maxStorage = MAX_STORAGE_BASE + state.equipment.warehouse.level * state.equipment.warehouse.effect;
  
  const newResources = { ...state.resources };
  newResources.copper = {
    ...newResources.copper,
    amount: Math.min(maxStorage, newResources.copper.amount + copperGain),
  };
  newResources.silver = {
    ...newResources.silver,
    amount: Math.min(maxStorage, newResources.silver.amount + silverGain),
  };
  newResources.gold = {
    ...newResources.gold,
    amount: Math.min(maxStorage, newResources.gold.amount + goldGain),
  };
  newResources.gem = {
    ...newResources.gem,
    amount: Math.min(maxStorage, newResources.gem.amount + gemGain),
  };
  
  let activeEvent = state.activeEvent;
  if (activeEvent && currentTime - activeEvent.startTime >= activeEvent.duration * 1000) {
    activeEvent = null;
  }
  
  const newState: GameState = {
    ...state,
    resources: newResources,
    lastUpdateTime: currentTime,
    activeEvent,
    outputPerSecond: calcResourceOutput({ ...state, activeEvent }),
  };
  
  return newState;
}

/*
 * 游戏主循环更新
 * 执行耗时估算：~0.5ms - 1.5ms (调用多个子函数)
 * 逻辑：使用 requestAnimationFrame 驱动，单次更新耗时 < 10ms
 */
export function gameLoopUpdate(state: GameState, currentTime: number): GameState {
  let newState = state;
  
  newState = updateResourceCollection(newState, currentTime);
  newState = simulateMarketPrice(newState, currentTime);
  newState = triggerRandomEvent(newState, currentTime);
  
  return newState;
}

/*
 * 启动游戏循环（requestAnimationFrame 驱动）
 * 执行耗时估算：每次循环 ~1ms，符合 60fps 要求
 */
export function startGameLoop(
  currentState: GameState,
  onUpdate: (newState: GameState) => void,
  getState: () => GameState
): () => void {
  lastTimestamp = performance.now();
  
  function loop(timestamp: number) {
    const delta = timestamp - lastTimestamp;
    
    if (delta >= 16) {
      lastTimestamp = timestamp;
      const state = getState();
      const newState = gameLoopUpdate(state, Date.now());
      onUpdate(newState);
    }
    
    animationFrameId = requestAnimationFrame(loop);
  }
  
  animationFrameId = requestAnimationFrame(loop);
  
  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
}

/*
 * 创建初始游戏状态
 * 执行耗时估算：~0.1ms
 */
export function createInitialState(): GameState {
  const now = Date.now();
  
  const resources: GameState['resources'] = {
    gold: { ...INITIAL_RESOURCES.gold, currentPrice: INITIAL_RESOURCES.gold.basePrice, priceDirection: 'none', lastPriceChange: now },
    copper: { ...INITIAL_RESOURCES.copper, currentPrice: INITIAL_RESOURCES.copper.basePrice, priceDirection: 'none', lastPriceChange: now },
    silver: { ...INITIAL_RESOURCES.silver, currentPrice: INITIAL_RESOURCES.silver.basePrice, priceDirection: 'none', lastPriceChange: now },
    gem: { ...INITIAL_RESOURCES.gem, currentPrice: INITIAL_RESOURCES.gem.basePrice, priceDirection: 'none', lastPriceChange: now },
  };
  
  const equipment: GameState['equipment'] = {
    pickaxe: { ...INITIAL_EQUIPMENT.pickaxe, level: 1 },
    furnace: { ...INITIAL_EQUIPMENT.furnace, level: 1 },
    warehouse: { ...INITIAL_EQUIPMENT.warehouse, level: 1 },
  };
  
  const initialState: GameState = {
    coins: 100,
    miners: [],
    resources,
    equipment,
    outputPerSecond: 0,
    totalEfficiency: 0,
    activeEvent: null,
    nextMarketUpdate: now + 8000 + Math.random() * 7000,
    nextEventUpdate: now + 20000 + Math.random() * 10000,
    marketUpdateInterval: 8000,
    eventUpdateInterval: 20000,
    animationConfig: {
      particleCount: 5,
      animationSpeed: 1.1,
    },
    lastUpdateTime: now,
  };
  
  return initialState;
}
