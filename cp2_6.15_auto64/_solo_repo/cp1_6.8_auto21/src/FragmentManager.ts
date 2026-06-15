import type { Fragment, RuneSymbol, RuneCombo, Vec2, PlayerState } from './types';

export const ALL_RUNE_SYMBOLS: RuneSymbol[] = [
  'triangle',
  'circle',
  'diamond',
  'hexagon',
  'star',
  'crescent',
  'spiral',
  'cross',
];

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function distance(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function randomSymbol(): RuneSymbol {
  return ALL_RUNE_SYMBOLS[Math.floor(Math.random() * ALL_RUNE_SYMBOLS.length)];
}

export function generateLevelCombo(level: number): RuneCombo {
  const combos: RuneCombo[] = [
    { symbols: shuffleArray(ALL_RUNE_SYMBOLS).slice(0, 2), name: '星尘低语' },
    { symbols: shuffleArray(ALL_RUNE_SYMBOLS).slice(0, 2), name: '虚空回响' },
    { symbols: shuffleArray(ALL_RUNE_SYMBOLS).slice(0, 3), name: '暗流共鸣' },
    { symbols: shuffleArray(ALL_RUNE_SYMBOLS).slice(0, 3), name: '深渊呼唤' },
    { symbols: shuffleArray(ALL_RUNE_SYMBOLS).slice(0, 4), name: '终焉之光' },
  ];
  return combos[Math.min(Math.max(level, 1), 5) - 1];
}

let audioCtx: AudioContext | null = null;

function playCollectBeep(): void {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {
    // audio not available
  }
}

export class FragmentManager {
  fragments: Fragment[] = [];
  combo: RuneCombo;
  comboMatched: boolean = false;

  constructor(
    fragmentCount: number,
    combo: RuneCombo,
    canvasWidth: number,
    canvasHeight: number,
    playerPos: Vec2
  ) {
    this.combo = combo;
    this.generateFragments(fragmentCount, canvasWidth, canvasHeight, playerPos);
  }

  private generateFragments(
    fragmentCount: number,
    canvasWidth: number,
    canvasHeight: number,
    playerPos: Vec2
  ): void {
    this.fragments = [];
    this.comboMatched = false;

    const shuffledComboSymbols = shuffleArray(this.combo.symbols);
    const symbols: RuneSymbol[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      if (i < shuffledComboSymbols.length) {
        symbols.push(shuffledComboSymbols[i]);
      } else {
        symbols.push(randomSymbol());
      }
    }

    const positions: Vec2[] = [];
    for (let i = 0; i < fragmentCount; i++) {
      let pos: Vec2 | null = null;
      for (let attempt = 0; attempt < 500; attempt++) {
        const x = 60 + Math.random() * (canvasWidth - 120);
        const y = 60 + Math.random() * (canvasHeight - 120);
        const candidate: Vec2 = { x, y };

        if (distance(candidate, playerPos) < 80) continue;

        let tooClose = false;
        for (const existing of positions) {
          if (distance(candidate, existing) < 50) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        pos = candidate;
        break;
      }

      if (!pos) {
        pos = {
          x: 60 + Math.random() * (canvasWidth - 120),
          y: 60 + Math.random() * (canvasHeight - 120),
        };
      }

      positions.push(pos);
      this.fragments.push({
        id: `frag_${i}`,
        pos,
        symbol: symbols[i],
        collected: false,
        scale: 1,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }
  }

  update(dt: number): void {
    for (const frag of this.fragments) {
      if (frag.collected) {
        frag.scale -= dt * 4;
        if (frag.scale < 0) {
          frag.scale = 0;
        }
      } else {
        frag.glowPhase += dt * 2;
      }
    }
  }

  checkCollection(player: PlayerState): Fragment[] {
    const collected: Fragment[] = [];
    for (const frag of this.fragments) {
      if (frag.collected) continue;
      if (distance(player.pos, frag.pos) < player.radius + 15) {
        frag.collected = true;
        collected.push(frag);
        playCollectBeep();
      }
    }
    return collected;
  }

  checkCombo(): boolean {
    const collectedSymbols = this.fragments
      .filter((f) => f.collected)
      .map((f) => f.symbol);

    const allMatched = this.combo.symbols.every((sym) => {
      const idx = collectedSymbols.indexOf(sym);
      if (idx === -1) return false;
      collectedSymbols.splice(idx, 1);
      return true;
    });

    if (allMatched) {
      this.comboMatched = true;
    }
    return this.comboMatched;
  }

  getCollectedCount(): number {
    return this.fragments.filter((f) => f.collected).length;
  }

  getTotalCount(): number {
    return this.fragments.length;
  }

  reset(
    fragmentCount: number,
    combo: RuneCombo,
    canvasWidth: number,
    canvasHeight: number,
    playerPos: Vec2
  ): void {
    this.combo = combo;
    this.generateFragments(fragmentCount, canvasWidth, canvasHeight, playerPos);
  }
}
