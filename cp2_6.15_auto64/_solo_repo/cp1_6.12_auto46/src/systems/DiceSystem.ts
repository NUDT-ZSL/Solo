export enum DiceColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green'
}

export enum DiceRarity {
  BASIC = 'basic',
  ADVANCED = 'advanced'
}

export interface DiceFace {
  id: string;
  color: DiceColor;
  value: number;
  rarity: DiceRarity;
  effect?: string;
  effectValue?: number;
}

export interface Dice {
  id: string;
  faces: DiceFace[];
}

export interface BattleResult {
  playerDamage: number;
  playerDefense: number;
  playerHeal: number;
  aiDamage: number;
  aiDefense: number;
  aiHeal: number;
  playerDiceResults: { face: DiceFace; value: number }[];
  aiDiceResults: { face: DiceFace; value: number }[];
}

export interface MatchResult {
  playerWins: number;
  aiWins: number;
  totalRounds: number;
}

export class DiceSystem {
  private static idCounter = 0;

  public static readonly COLOR_MAP: Record<DiceColor, { main: string; light: string; dark: string }> = {
    [DiceColor.RED]: { main: '#e94560', light: '#ff6b8a', dark: '#b82a43' },
    [DiceColor.BLUE]: { main: '#0f3460', light: '#1a4a85', dark: '#0a2342' },
    [DiceColor.GREEN]: { main: '#16c79a', light: '#2de0b3', dark: '#0e9e79' }
  };

  public static readonly EFFECT_NAMES: Record<DiceColor, string[]> = {
    [DiceColor.RED]: ['火焰攻击', '雷霆一击', '狂暴打击', '烈焰风暴'],
    [DiceColor.BLUE]: ['护盾强化', '冰霜护甲', '神圣守护', '铁壁防御'],
    [DiceColor.GREEN]: ['生命恢复', '自然祝福', '治愈之光', '生命之泉']
  };

  public static generateId(): string {
    return `dice_${++this.idCounter}_${Date.now()}`;
  }

  public static createBasicFace(color: DiceColor, value: number): DiceFace {
    return {
      id: this.generateId(),
      color,
      value,
      rarity: DiceRarity.BASIC
    };
  }

  public static createAdvancedFace(color: DiceColor, value: number): DiceFace {
    const effectIndex = Math.floor(Math.random() * this.EFFECT_NAMES[color].length);
    const effectName = this.EFFECT_NAMES[color][effectIndex];
    const effectValue = value + Math.floor(Math.random() * 3) + 1;

    return {
      id: this.generateId(),
      color,
      value,
      rarity: DiceRarity.ADVANCED,
      effect: `${effectName}+${effectValue}`,
      effectValue
    };
  }

  public static createInitialPool(): DiceFace[] {
    const faces: DiceFace[] = [];
    const colors = [DiceColor.RED, DiceColor.BLUE, DiceColor.GREEN];

    for (let i = 0; i < 8; i++) {
      const color = colors[i % 3];
      const value = Math.floor(Math.random() * 4) + 1;
      faces.push(this.createBasicFace(color, value));
    }

    return faces;
  }

  public static checkMerge(grid: (DiceFace | null)[][]): { positions: { row: number; col: number }[]; color: DiceColor }[] {
    const merges: { positions: { row: number; col: number }[]; color: DiceColor }[] = [];
    const size = 3;

    for (let row = 0; row < size; row++) {
      const line: { row: number; col: number }[] = [];
      let currentColor: DiceColor | null = null;

      for (let col = 0; col < size; col++) {
        const face = grid[row][col];
        if (!face) {
          if (line.length >= 3) merges.push({ positions: line, color: currentColor! });
          line.length = 0;
          currentColor = null;
          continue;
        }

        if (!currentColor) {
          currentColor = face.color;
          line.push({ row, col });
        } else if (face.color === currentColor) {
          line.push({ row, col });
        } else {
          if (line.length >= 3) merges.push({ positions: line, color: currentColor });
          line.length = 0;
          currentColor = face.color;
          line.push({ row, col });
        }
      }
      if (line.length >= 3) merges.push({ positions: line, color: currentColor! });
    }

    for (let col = 0; col < size; col++) {
      const line: { row: number; col: number }[] = [];
      let currentColor: DiceColor | null = null;

      for (let row = 0; row < size; row++) {
        const face = grid[row][col];
        if (!face) {
          if (line.length >= 3) merges.push({ positions: line, color: currentColor! });
          line.length = 0;
          currentColor = null;
          continue;
        }

        if (!currentColor) {
          currentColor = face.color;
          line.push({ row, col });
        } else if (face.color === currentColor) {
          line.push({ row, col });
        } else {
          if (line.length >= 3) merges.push({ positions: line, color: currentColor });
          line.length = 0;
          currentColor = face.color;
          line.push({ row, col });
        }
      }
      if (line.length >= 3) merges.push({ positions: line, color: currentColor! });
    }

    return merges;
  }

  public static createDiceFromFace(face: DiceFace): Dice {
    const faces: DiceFace[] = [];
    const colors = [DiceColor.RED, DiceColor.BLUE, DiceColor.GREEN];

    faces.push({ ...face, id: this.generateId() });

    for (let i = 1; i < 6; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const value = Math.floor(Math.random() * 4) + 1;
      faces.push(this.createBasicFace(color, value));
    }

    return {
      id: this.generateId(),
      faces
    };
  }

  public static rollDice(dice: Dice): { face: DiceFace; value: number } {
    const faceIndex = Math.floor(Math.random() * dice.faces.length);
    const face = dice.faces[faceIndex];
    const rollValue = face.effectValue ?? face.value;
    return { face, value: rollValue };
  }

  public static calculateBattle(
    playerDice: Dice[],
    aiDice: Dice[]
  ): BattleResult {
    const playerDiceResults = playerDice.map(d => this.rollDice(d));
    const aiDiceResults = aiDice.map(d => this.rollDice(d));

    let playerDamage = 0;
    let playerDefense = 0;
    let playerHeal = 0;
    let aiDamage = 0;
    let aiDefense = 0;
    let aiHeal = 0;

    for (const result of playerDiceResults) {
      switch (result.face.color) {
        case DiceColor.RED:
          playerDamage += result.value;
          break;
        case DiceColor.BLUE:
          playerDefense += result.value;
          break;
        case DiceColor.GREEN:
          playerHeal += result.value;
          break;
      }
    }

    for (const result of aiDiceResults) {
      switch (result.face.color) {
        case DiceColor.RED:
          aiDamage += result.value;
          break;
        case DiceColor.BLUE:
          aiDefense += result.value;
          break;
        case DiceColor.GREEN:
          aiHeal += result.value;
          break;
      }
    }

    return {
      playerDamage,
      playerDefense,
      playerHeal,
      aiDamage,
      aiDefense,
      aiHeal,
      playerDiceResults,
      aiDiceResults
    };
  }

  public static resolveBattle(
    playerHP: number,
    aiHP: number,
    battle: BattleResult
  ): { newPlayerHP: number; newAiHP: number; playerNetLoss: number; aiNetLoss: number } {
    const playerActualDamage = Math.max(0, battle.aiDamage - battle.playerDefense);
    const aiActualDamage = Math.max(0, battle.playerDamage - battle.aiDefense);

    const newPlayerHP = Math.max(0, Math.min(100, playerHP - playerActualDamage + battle.playerHeal));
    const newAiHP = Math.max(0, Math.min(100, aiHP - aiActualDamage + battle.aiHeal));

    return {
      newPlayerHP,
      newAiHP,
      playerNetLoss: playerHP - newPlayerHP,
      aiNetLoss: aiHP - newAiHP
    };
  }

  public static createAIDice(count: number): Dice[] {
    const dice: Dice[] = [];
    const colors = [DiceColor.RED, DiceColor.BLUE, DiceColor.GREEN];

    for (let i = 0; i < count; i++) {
      const faces: DiceFace[] = [];
      for (let j = 0; j < 6; j++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const value = Math.floor(Math.random() * 4) + 1;
        faces.push(this.createBasicFace(color, value));
      }
      dice.push({ id: this.generateId(), faces });
    }

    return dice;
  }
}
