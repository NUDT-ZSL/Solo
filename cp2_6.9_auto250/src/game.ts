import { v4 as uuidv4 } from 'uuid';

export type Depth = 'surface' | 'middle' | 'deep';
export type Skill = 'paralyze' | 'devour' | 'camouflage' | 'none';

export interface CardTemplate {
  name: string;
  depth: Depth;
  baseAttack: number;
  baseHealth: number;
  skill: Skill;
  emoji: string;
}

export interface Card {
  id: string;
  template: CardTemplate;
  revealed: boolean;
  scale: number;
  selected: boolean;
}

export interface Creature {
  id: string;
  cardId: string;
  template: CardTemplate;
  attack: number;
  maxHealth: number;
  health: number;
  owner: 'player' | 'enemy';
  x: number;
  y: number;
  alpha: number;
  targetId: string | null;
  flashing: number;
  shakeTime: number;
  resonance: boolean;
}

export interface EnergyOrb {
  id: string;
  x: number;
  y: number;
  owner: 'player' | 'enemy';
  size: number;
  color1: string;
  color2: string;
  consumed: boolean;
  highlighted: number;
  pulseCount: number;
  pulseTimer: number;
  ripple: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export interface AttackWave {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  color: string;
}

export interface BubbleParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
}

export interface GameState {
  turn: number;
  phase: 'sonar' | 'battle' | 'end';
  currentPlayer: 'player' | 'enemy';
  playerHand: Card[];
  enemyHand: Card[];
  playerCreatures: Creature[];
  enemyCreatures: Creature[];
  playerOrbs: EnergyOrb[];
  enemyOrbs: EnergyOrb[];
  floatingTexts: FloatingText[];
  attackWaves: AttackWave[];
  bubbles: BubbleParticle[];
  selectedCardId: string | null;
  sonarActive: boolean;
  sonarX: number;
  sonarY: number;
  sonarRadius: number;
  gameOver: boolean;
  winner: 'player' | 'enemy' | null;
  darkenAmount: number;
  message: string;
  messageTimer: number;
  canvasW: number;
  canvasH: number;
  hoverCardId: string | null;
  endTurnTimer: number;
  inEndPhase: boolean;
  sonarUsed: boolean;
}

const CARD_TEMPLATES: CardTemplate[] = [
  { name: '发光水母', depth: 'surface', baseAttack: 3, baseHealth: 12, skill: 'paralyze', emoji: '🪼' },
  { name: '荧光鱼', depth: 'surface', baseAttack: 4, baseHealth: 10, skill: 'none', emoji: '🐠' },
  { name: '海蝴蝶', depth: 'surface', baseAttack: 3, baseHealth: 14, skill: 'camouflage', emoji: '🦋' },
  { name: '幽灵鱿鱼', depth: 'middle', baseAttack: 6, baseHealth: 15, skill: 'camouflage', emoji: '🦑' },
  { name: '深海鳗鱼', depth: 'middle', baseAttack: 5, baseHealth: 16, skill: 'paralyze', emoji: '🐍' },
  { name: '灯眼鱼', depth: 'middle', baseAttack: 5, baseHealth: 14, skill: 'none', emoji: '👁️' },
  { name: '巨螯虾', depth: 'deep', baseAttack: 8, baseHealth: 20, skill: 'devour', emoji: '🦞' },
  { name: '獠牙鱼', depth: 'deep', baseAttack: 7, baseHealth: 17, skill: 'devour', emoji: '🦷' },
  { name: '深渊章鱼', depth: 'deep', baseAttack: 6, baseHealth: 18, skill: 'paralyze', emoji: '🐙' },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function createCard(): Card {
  return {
    id: uuidv4(),
    template: pick(CARD_TEMPLATES),
    revealed: false,
    scale: 1,
    selected: false,
  };
}

export function initGameState(w: number, h: number): GameState {
  const playerOrbs: EnergyOrb[] = [];
  const enemyOrbs: EnergyOrb[] = [];
  const coralXPlayer = w * 0.15;
  const coralXEnemy = w * 0.85;
  const coralYPlayer = h * 0.82;
  const coralYEnemy = h * 0.18;

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    playerOrbs.push({
      id: uuidv4(),
      x: coralXPlayer + Math.cos(angle) * 45,
      y: coralYPlayer + Math.sin(angle) * 25,
      owner: 'player',
      size: randInt(12, 18),
      color1: '#00FFAA',
      color2: '#00DDFF',
      consumed: false,
      highlighted: 0,
      pulseCount: 0,
      pulseTimer: 0,
      ripple: 0,
    });
    enemyOrbs.push({
      id: uuidv4(),
      x: coralXEnemy + Math.cos(angle) * 45,
      y: coralYEnemy + Math.sin(angle) * 25,
      owner: 'enemy',
      size: randInt(12, 18),
      color1: '#00FFAA',
      color2: '#00DDFF',
      consumed: false,
      highlighted: 0,
      pulseCount: 0,
      pulseTimer: 0,
      ripple: 0,
    });
  }

  const playerHand: Card[] = [];
  const enemyHand: Card[] = [];
  for (let i = 0; i < 3; i++) {
    playerHand.push(createCard());
    enemyHand.push(createCard());
  }

  return {
    turn: 1,
    phase: 'sonar',
    currentPlayer: 'player',
    playerHand,
    enemyHand,
    playerCreatures: [],
    enemyCreatures: [],
    playerOrbs,
    enemyOrbs,
    floatingTexts: [],
    attackWaves: [],
    bubbles: [],
    selectedCardId: null,
    sonarActive: false,
    sonarX: w * 0.5,
    sonarY: h * 0.5,
    sonarRadius: 150,
    gameOver: false,
    winner: null,
    darkenAmount: 0,
    message: '声呐探测阶段：悬停扫描对手区域',
    messageTimer: 3,
    canvasW: w,
    canvasH: h,
    hoverCardId: null,
    endTurnTimer: 0,
    inEndPhase: false,
    sonarUsed: false,
  };
}

export function addFloatingText(state: GameState, x: number, y: number, text: string, color: string) {
  state.floatingTexts.push({
    id: uuidv4(),
    x, y, text, color,
    alpha: 1,
    vy: -1.2,
  });
}

export function spawnBubbles(state: GameState, x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    state.bubbles.push({
      id: uuidv4(),
      x, y,
      vx: (Math.random() - 0.5) * 3,
      vy: -Math.random() * 3 - 1,
      size: Math.random() * 6 + 3,
      alpha: 0.8,
      life: 0.3 + Math.random() * 0.2,
    });
  }
}

export function sonarScan(state: GameState) {
  const orbs = state.enemyOrbs.filter(o => !o.consumed);
  const revealCount = Math.max(1, Math.floor(orbs.length / 3));
  const shuffled = [...orbs].sort(() => Math.random() - 0.5);
  for (let i = 0; i < revealCount && i < shuffled.length; i++) {
    shuffled[i].highlighted = 3;
  }
}

export function summonCreature(state: GameState, cardId: string, orbId: string, owner: 'player' | 'enemy') {
  const hand = owner === 'player' ? state.playerHand : state.enemyHand;
  const orbs = owner === 'player' ? state.playerOrbs : state.enemyOrbs;
  const creatures = owner === 'player' ? state.playerCreatures : state.enemyCreatures;

  const card = hand.find(c => c.id === cardId);
  const orb = orbs.find(o => o.id === orbId);
  if (!card || !orb || orb.consumed) return false;

  orb.consumed = true;
  spawnBubbles(state, orb.x, orb.y, 12);

  const battlefieldY = owner === 'player' ? state.canvasH * 0.68 : state.canvasH * 0.32;
  const slot = creatures.length;
  const startX = state.canvasW * 0.35 + slot * 110;

  const creature: Creature = {
    id: uuidv4(),
    cardId: card.id,
    template: card.template,
    attack: card.template.baseAttack,
    maxHealth: card.template.baseHealth,
    health: card.template.baseHealth,
    owner,
    x: startX,
    y: battlefieldY,
    alpha: 0,
    targetId: null,
    flashing: 0,
    shakeTime: 0,
    resonance: false,
  };
  creatures.push(creature);

  const idx = hand.findIndex(c => c.id === cardId);
  if (idx >= 0) hand.splice(idx, 1);

  if (hand.length < 7) {
    hand.push(createCard());
  }

  state.selectedCardId = null;
  checkResonance(state);
  return true;
}

export function findLowestHealthTarget(state: GameState, attacker: Creature): Creature | null {
  const enemies = attacker.owner === 'player' ? state.enemyCreatures : state.playerCreatures;
  if (enemies.length === 0) return null;
  let lowest: Creature | null = null;
  for (const c of enemies) {
    if (c.health <= 0) continue;
    if (!lowest || c.health < lowest.health) lowest = c;
  }
  return lowest;
}

export function creatureAttack(state: GameState, attacker: Creature) {
  const target = findLowestHealthTarget(state, attacker);
  if (!target) return;
  const damage = attacker.attack;
  target.health -= damage;
  target.flashing = 0.4;
  target.shakeTime = 0.3;
  addFloatingText(state, target.x, target.y - 30, `-${damage}`, '#FF3366');

  if (attacker.template.skill === 'paralyze') {
    addFloatingText(state, target.x, target.y - 50, '麻痹', '#FFAA00');
  }
  if (attacker.template.skill === 'devour' && target.health <= 0) {
    attacker.health = Math.min(attacker.maxHealth, attacker.health + 3);
    addFloatingText(state, attacker.x, attacker.y - 30, '+3', '#00FFAA');
  }

  state.attackWaves.push({
    id: uuidv4(),
    x1: attacker.x,
    y1: attacker.y,
    x2: target.x,
    y2: target.y,
    progress: 0,
    color: attacker.owner === 'player' ? '#00FFAA' : '#FF6688',
  });
}

export function autoAttackOnSummon(state: GameState, owner: 'player' | 'enemy') {
  const creatures = owner === 'player' ? state.playerCreatures : state.enemyCreatures;
  const latest = creatures[creatures.length - 1];
  if (latest) creatureAttack(state, latest);
}

export function volleyAttack(state: GameState, owner: 'player' | 'enemy') {
  const creatures = owner === 'player' ? state.playerCreatures : state.enemyCreatures;
  for (const c of creatures) {
    if (c.health > 0) creatureAttack(state, c);
  }
}

export function applyPressure(state: GameState) {
  const allCreatures = [...state.playerCreatures, ...state.enemyCreatures];
  for (const c of allCreatures) {
    if (c.health <= 0) continue;
    const loss = c.resonance ? 2 : 1;
    c.health -= loss;
    addFloatingText(state, c.x, c.y - 20, `-${loss}`, 'rgba(200,200,220,0.8)');
  }
}

export function removeDead(state: GameState) {
  state.playerCreatures = state.playerCreatures.filter(c => {
    if (c.health <= 0) {
      spawnBubbles(state, c.x, c.y, 20);
      return false;
    }
    return true;
  });
  state.enemyCreatures = state.enemyCreatures.filter(c => {
    if (c.health <= 0) {
      spawnBubbles(state, c.x, c.y, 20);
      return false;
    }
    return true;
  });
}

export function checkResonance(state: GameState) {
  for (const side of ['player', 'enemy'] as const) {
    const creatures = side === 'player' ? state.playerCreatures : state.enemyCreatures;
    const depthCount: Record<Depth, Creature[]> = { surface: [], middle: [], deep: [] };
    for (const c of creatures) depthCount[c.template.depth].push(c);
    for (const d of ['surface', 'middle', 'deep'] as Depth[]) {
      const arr = depthCount[d];
      const active = arr.length >= 2;
      for (const c of arr) {
        const prev = c.resonance;
        c.resonance = active;
        if (active && !prev) {
          c.attack += 2;
          addFloatingText(state, c.x, c.y - 40, '共鸣+2攻', '#00DDFF');
        } else if (!active && prev) {
          c.attack -= 2;
        }
      }
    }
  }
}

export function checkGameOver(state: GameState): boolean {
  const playerAlive = state.playerCreatures.some(c => c.health > 0);
  const enemyAlive = state.enemyCreatures.some(c => c.health > 0);
  const playerOrbs = state.playerOrbs.filter(o => !o.consumed).length;
  const enemyOrbs = state.enemyOrbs.filter(o => !o.consumed).length;
  const turn = state.turn;

  if (turn >= 3) {
    if (!playerAlive && playerOrbs === 0) {
      state.gameOver = true;
      state.winner = 'enemy';
      return true;
    }
    if (!enemyAlive && enemyOrbs === 0) {
      state.gameOver = true;
      state.winner = 'player';
      return true;
    }
  }
  return false;
}

export function nextPhase(state: GameState) {
  if (state.phase === 'sonar') {
    state.phase = 'battle';
    state.message = '战斗阶段：选择卡牌与能量卵召唤生物';
    state.messageTimer = 2.5;
  } else if (state.phase === 'battle') {
    state.phase = 'end';
    state.inEndPhase = true;
    state.endTurnTimer = 0;
    state.message = '回合结束：齐射攻击 + 深海压力';
    state.messageTimer = 2;
  }
}

export function endTurnProcess(state: GameState, dt: number): boolean {
  state.endTurnTimer += dt;
  if (state.endTurnTimer > 0.3 && state.endTurnTimer < 0.35) {
    volleyAttack(state, 'player');
    volleyAttack(state, 'enemy');
  }
  if (state.endTurnTimer > 1.0 && state.endTurnTimer < 1.05) {
    applyPressure(state);
    removeDead(state);
    checkResonance(state);
  }
  if (state.endTurnTimer > 1.6) {
    if (checkGameOver(state)) return true;
    state.turn += 1;
    state.currentPlayer = state.currentPlayer === 'player' ? 'enemy' : 'player';
    state.phase = 'sonar';
    state.inEndPhase = false;
    state.endTurnTimer = 0;
    state.sonarUsed = false;
    state.message = `第 ${state.turn} 回合 - 声呐探测阶段`;
    state.messageTimer = 2.5;

    if (state.currentPlayer === 'enemy') {
      setTimeout(() => aiTurn(state), 500);
    }
    return true;
  }
  return false;
}

export function aiTurn(state: GameState) {
  if (state.gameOver) return;
  if (state.phase === 'sonar') {
    const orbs = state.playerOrbs.filter(o => !o.consumed);
    const revealCount = Math.max(1, Math.floor(orbs.length / 3));
    const shuffled = [...orbs].sort(() => Math.random() - 0.5);
    for (let i = 0; i < revealCount && i < shuffled.length; i++) {
      shuffled[i].highlighted = 3;
    }
    setTimeout(() => {
      if (state.gameOver) return;
      state.phase = 'battle';
      aiBattlePhase(state);
    }, 1000);
  }
}

function aiBattlePhase(state: GameState) {
  if (state.gameOver) return;
  const availableOrbs = state.enemyOrbs.filter(o => !o.consumed);
  if (availableOrbs.length > 0 && state.enemyHand.length > 0) {
    const card = state.enemyHand[0];
    const orb = availableOrbs[0];
    orb.pulseCount = 2;
    orb.pulseTimer = 0;
    setTimeout(() => {
      if (state.gameOver) return;
      summonCreature(state, card.id, orb.id, 'enemy');
      autoAttackOnSummon(state, 'enemy');
      setTimeout(() => {
        nextPhase(state);
      }, 800);
    }, 400);
  } else {
    nextPhase(state);
  }
}

export function updateState(state: GameState, dt: number) {
  for (const orb of [...state.playerOrbs, ...state.enemyOrbs]) {
    if (orb.highlighted > 0) orb.highlighted = Math.max(0, orb.highlighted - dt);
    if (orb.pulseTimer > 0) {
      orb.pulseTimer -= dt;
      if (orb.pulseTimer <= 0 && orb.pulseCount > 0) {
        orb.pulseCount--;
        orb.pulseTimer = 0.25;
      }
    }
    if (orb.ripple > 0) orb.ripple = Math.max(0, orb.ripple - dt * 3);
  }

  for (const c of [...state.playerCreatures, ...state.enemyCreatures]) {
    if (c.alpha < 1) c.alpha = Math.min(1, c.alpha + dt * 2.5);
    if (c.flashing > 0) c.flashing = Math.max(0, c.flashing - dt * 2.5);
    if (c.shakeTime > 0) c.shakeTime = Math.max(0, c.shakeTime - dt * 3);
  }

  state.floatingTexts = state.floatingTexts.filter(t => {
    t.y += t.vy;
    t.alpha -= dt * 2;
    return t.alpha > 0;
  });

  state.attackWaves = state.attackWaves.filter(w => {
    w.progress += dt * 2.5;
    return w.progress < 1;
  });

  state.bubbles = state.bubbles.filter(b => {
    b.x += b.vx;
    b.y += b.vy;
    b.vy -= dt * 0.5;
    b.life -= dt;
    b.alpha = Math.max(0, b.life / 0.5);
    return b.life > 0;
  });

  if (state.messageTimer > 0) state.messageTimer = Math.max(0, state.messageTimer - dt);

  if (state.inEndPhase) {
    endTurnProcess(state, dt);
  }

  if (state.gameOver) {
    const target = state.winner === 'enemy' ? 1 : 0.3;
    state.darkenAmount += (target - state.darkenAmount) * dt * 0.8;
  }
}
