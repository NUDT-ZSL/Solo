export enum WaveformType {
  SINE = 'sine',
  SQUARE = 'square',
  SAWTOOTH = 'sawtooth'
}

export enum CardType {
  ATTACK = 'attack',
  DEFENSE = 'defense',
  DISRUPT = 'disrupt'
}

export interface SoundCard {
  id: string;
  name: string;
  type: CardType;
  waveform: WaveformType;
  frequency: number;
  duration: number;
  energyCost: number;
  value: number;
  description: string;
}

export interface PlayerState {
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  shield: number;
  hand: SoundCard[];
  deck: SoundCard[];
  discard: SoundCard[];
}

export function getWaveformColor(waveform: WaveformType): number {
  switch (waveform) {
    case WaveformType.SINE: return 0x3b82f6;
    case WaveformType.SQUARE: return 0xef4444;
    case WaveformType.SAWTOOTH: return 0x22c55e;
  }
}

export function getWaveformColorHex(waveform: WaveformType): string {
  switch (waveform) {
    case WaveformType.SINE: return '#3b82f6';
    case WaveformType.SQUARE: return '#ef4444';
    case WaveformType.SAWTOOTH: return '#22c55e';
  }
}

export function getAICardColor(waveform: WaveformType): number {
  switch (waveform) {
    case WaveformType.SINE: return 0x7c3aed;
    case WaveformType.SQUARE: return 0x9333ea;
    case WaveformType.SAWTOOTH: return 0x6d28d9;
  }
}

export function getFrequencyBand(frequency: number): 'low' | 'mid' | 'high' {
  if (frequency < 400) return 'low';
  if (frequency < 1000) return 'mid';
  return 'high';
}

const CARD_DEFINITIONS: Omit<SoundCard, 'id'>[] = [
  {
    name: '低频震荡',
    type: CardType.ATTACK,
    waveform: WaveformType.SINE,
    frequency: 220,
    duration: 1.2,
    energyCost: 1,
    value: 4,
    description: '低频正弦波攻击，造成4点伤害'
  },
  {
    name: '中频共鸣',
    type: CardType.ATTACK,
    waveform: WaveformType.SINE,
    frequency: 660,
    duration: 0.8,
    energyCost: 2,
    value: 7,
    description: '中频正弦波攻击，造成7点伤害'
  },
  {
    name: '高频方爆',
    type: CardType.ATTACK,
    waveform: WaveformType.SQUARE,
    frequency: 1500,
    duration: 0.6,
    energyCost: 3,
    value: 10,
    description: '高频方波爆发，造成10点伤害'
  },
  {
    name: '锯齿撕裂',
    type: CardType.ATTACK,
    waveform: WaveformType.SAWTOOTH,
    frequency: 880,
    duration: 1.0,
    energyCost: 4,
    value: 14,
    description: '锯齿波强力攻击，造成14点伤害'
  },
  {
    name: '正弦护盾',
    type: CardType.DEFENSE,
    waveform: WaveformType.SINE,
    frequency: 440,
    duration: 1.5,
    energyCost: 2,
    value: 6,
    description: '生成6点护盾值'
  },
  {
    name: '方波壁垒',
    type: CardType.DEFENSE,
    waveform: WaveformType.SQUARE,
    frequency: 330,
    duration: 2.0,
    energyCost: 3,
    value: 10,
    description: '生成10点护盾值'
  },
  {
    name: '锯齿干扰',
    type: CardType.DISRUPT,
    waveform: WaveformType.SAWTOOTH,
    frequency: 1200,
    duration: 0.5,
    energyCost: 2,
    value: 2,
    description: '降低对手2点能量'
  },
  {
    name: '高频扰乱',
    type: CardType.DISRUPT,
    waveform: WaveformType.SAWTOOTH,
    frequency: 1800,
    duration: 0.7,
    energyCost: 3,
    value: 3,
    description: '降低对手3点能量'
  }
];

export class CardDeck {
  private allCards: SoundCard[] = [];

  constructor() {
    this.allCards = CARD_DEFINITIONS.map((def, i) => ({
      ...def,
      id: `card_${i}`
    }));
  }

  getCardDefinitions(): SoundCard[] {
    return [...this.allCards];
  }

  createDeck(): SoundCard[] {
    const deck: SoundCard[] = [];
    for (let i = 0; i < 3; i++) {
      CARD_DEFINITIONS.forEach((def, j) => {
        deck.push({
          ...def,
          id: `card_${j}_copy${i}_${Math.random().toString(36).substring(2, 11)}`
        });
      });
    }
    return this.shuffleDeck(deck);
  }

  shuffleDeck(deck: SoundCard[]): SoundCard[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  drawCard(player: PlayerState): boolean {
    if (player.hand.length >= 5) return false;
    if (player.deck.length === 0) {
      if (player.discard.length === 0) return false;
      player.deck = this.shuffleDeck(player.discard);
      player.discard = [];
    }
    const card = player.deck.pop();
    if (card) {
      player.hand.push(card);
      return true;
    }
    return false;
  }

  initPlayerHand(player: PlayerState): void {
    for (let i = 0; i < 4; i++) {
      this.drawCard(player);
    }
  }

  playCard(player: PlayerState, cardId: string): SoundCard | null {
    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;
    const card = player.hand[cardIndex];
    if (player.energy < card.energyCost) return null;
    player.energy -= card.energyCost;
    player.hand.splice(cardIndex, 1);
    player.discard.push(card);
    return card;
  }
}
