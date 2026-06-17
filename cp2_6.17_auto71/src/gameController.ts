import { Cat, AttributeChange, AttributeType } from './cat';

export type EventType = 'feed' | 'pet' | 'play' | 'clean';

export interface GameEvent {
  type: EventType;
  icon: string;
  name: string;
  description: string;
  changes: AttributeChange[];
  catIndex: number;
}

export interface LogEntry {
  turn: number;
  eventType: EventType;
  eventName: string;
  catName: string;
  changes: AttributeChange[];
  isDecay: boolean;
}

interface EventConfig {
  type: EventType;
  icon: string;
  name: string;
  description: string;
  probability: number;
  changes: AttributeChange[];
}

const EVENT_CONFIGS: EventConfig[] = [
  {
    type: 'feed',
    icon: '🍖',
    name: '喂食',
    description: '给猫咪喂了美味的食物',
    probability: 0.3,
    changes: [{ type: 'hunger', value: 5 }],
  },
  {
    type: 'pet',
    icon: '🤲',
    name: '抚摸',
    description: '温柔地抚摸了猫咪',
    probability: 0.3,
    changes: [{ type: 'happiness', value: 3 }],
  },
  {
    type: 'play',
    icon: '🎾',
    name: '玩耍',
    description: '和猫咪一起玩耍',
    probability: 0.25,
    changes: [
      { type: 'happiness', value: 5 },
      { type: 'hunger', value: -2 },
    ],
  },
  {
    type: 'clean',
    icon: '🧹',
    name: '清洁',
    description: '给猫咪做了清洁护理',
    probability: 0.15,
    changes: [
      { type: 'health', value: 4 },
      { type: 'happiness', value: -1 },
    ],
  },
];

export const EVENT_COLORS: Record<EventType, string> = {
  feed: '#ff5722',
  pet: '#9c27b0',
  play: '#4caf50',
  clean: '#00bcd4',
};

export class GameController {
  cats: Cat[];
  turn: number;
  logs: LogEntry[];
  currentEvent: GameEvent | null;
  eventTimer: number;
  isGameOver: boolean;
  private waitingForTurn: boolean;

  readonly EVENT_DURATION: number = 1500;
  readonly MAX_LOGS: number = 20;
  readonly MAX_CATS: number = 3;
  readonly MAX_NAME_LENGTH: number = 8;

  constructor(catNames: string[]) {
    this.cats = catNames.slice(0, this.MAX_CATS).map(name => new Cat(this.truncateName(name)));
    this.turn = 0;
    this.logs = [];
    this.currentEvent = null;
    this.eventTimer = 0;
    this.isGameOver = false;
    this.waitingForTurn = true;
  }

  private truncateName(name: string): string {
    const chars = Array.from(name);
    if (chars.length <= this.MAX_NAME_LENGTH) return name;
    return chars.slice(0, this.MAX_NAME_LENGTH).join('');
  }

  canAdvanceTurn(): boolean {
    return this.waitingForTurn && !this.isGameOver && this.currentEvent === null;
  }

  nextTurn(): boolean {
    if (!this.canAdvanceTurn()) return false;

    this.turn++;
    this.waitingForTurn = false;

    const activeCats = this.cats.filter(c => !c.isAway);
    if (activeCats.length === 0) {
      this.checkGameOver();
      return true;
    }

    for (const cat of this.cats) {
      if (cat.isAway) continue;
      const decayChanges = cat.decay();
      if (decayChanges.length > 0) {
        this.addLog({
          turn: this.turn,
          eventType: 'feed',
          eventName: '属性衰减',
          catName: cat.name,
          changes: decayChanges,
          isDecay: true,
        });
      }
    }

    const randomEvent = this.pickRandomEvent();
    const targetCatIndex = this.pickRandomActiveCat();

    if (randomEvent && targetCatIndex >= 0) {
      const event: GameEvent = {
        type: randomEvent.type,
        icon: randomEvent.icon,
        name: randomEvent.name,
        description: randomEvent.description,
        changes: randomEvent.changes.map(c => ({ ...c })),
        catIndex: targetCatIndex,
      };

      this.currentEvent = event;
      this.eventTimer = this.EVENT_DURATION;
    }

    this.checkGameOver();
    return true;
  }

  private pickRandomEvent(): EventConfig | null {
    const r = Math.random();
    let cumulative = 0;
    for (const config of EVENT_CONFIGS) {
      cumulative += config.probability;
      if (r <= cumulative) return config;
    }
    return EVENT_CONFIGS.length > 0 ? EVENT_CONFIGS[0] : null;
  }

  private pickRandomActiveCat(): number {
    const activeIndices: number[] = [];
    for (let i = 0; i < this.cats.length; i++) {
      if (!this.cats[i].isAway) activeIndices.push(i);
    }
    if (activeIndices.length === 0) return -1;
    return activeIndices[Math.floor(Math.random() * activeIndices.length)];
  }

  update(deltaTime: number): void {
    for (const cat of this.cats) {
      cat.updateAnimations(deltaTime);
    }

    if (this.currentEvent !== null) {
      this.eventTimer -= deltaTime;

      if (this.eventTimer <= 0) {
        this.applyEvent(this.currentEvent);
        this.currentEvent = null;
        this.waitingForTurn = true;
        this.checkGameOver();
      }
    }
  }

  private applyEvent(event: GameEvent): void {
    const cat = this.cats[event.catIndex];
    if (!cat || cat.isAway) return;

    cat.applyEvent(event.changes);

    this.addLog({
      turn: this.turn,
      eventType: event.type,
      eventName: event.name,
      catName: cat.name,
      changes: event.changes,
      isDecay: false,
    });
  }

  private addLog(log: LogEntry): void {
    this.logs.unshift(log);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  private checkGameOver(): void {
    if (this.cats.length === 0) {
      this.isGameOver = true;
      return;
    }

    const allAway = this.cats.every(c => c.isAway);
    this.isGameOver = allAway;
  }

  restart(catNames: string[]): void {
    this.cats = catNames.slice(0, this.MAX_CATS).map(name => new Cat(this.truncateName(name)));
    this.turn = 0;
    this.logs = [];
    this.currentEvent = null;
    this.eventTimer = 0;
    this.isGameOver = false;
    this.waitingForTurn = true;
  }

  formatChange(change: AttributeChange): string {
    const prefix = change.value >= 0 ? '+' : '';
    const labels: Record<AttributeType, string> = {
      health: '健康',
      hunger: '饱腹',
      happiness: '心情',
    };
    return `${labels[change.type]}${prefix}${change.value}`;
  }

  getAttributeLabel(type: AttributeType): string {
    const labels: Record<AttributeType, string> = {
      health: '健康',
      hunger: '饱腹',
      happiness: '心情',
    };
    return labels[type];
  }
}
