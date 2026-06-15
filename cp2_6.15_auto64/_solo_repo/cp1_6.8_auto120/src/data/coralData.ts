import type { CoralData } from '../store/useReefStore';

const SPECIES = [
  '鹿角珊瑚',
  '脑珊瑚',
  '扇形珊瑚',
  '管状珊瑚',
  '蘑菇珊瑚',
  '柳珊瑚',
  '石珊瑚',
  '花瓶珊瑚',
];

const HEALTH_STATES = ['优良', '良好', '一般'];

const COLOR_TYPES: Array<'pink' | 'purple' | 'orange' | 'green'> = ['pink', 'purple', 'orange', 'green'];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateCoralData(): CoralData[] {
  const rand = seededRandom(42);
  const corals: CoralData[] = [];
  const count = 10;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.8;
    const radius = 2 + rand() * 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    corals.push({
      id: `coral-${i}`,
      species: SPECIES[Math.floor(rand() * SPECIES.length)],
      depth: +(2 + rand() * 18).toFixed(1),
      health: HEALTH_STATES[Math.floor(rand() * HEALTH_STATES.length)],
      colorType: COLOR_TYPES[Math.floor(rand() * COLOR_TYPES.length)],
      position: [x, 0, z],
      scale: 0.6 + rand() * 0.8,
      tentaclePhase: rand() * Math.PI * 2,
    });
  }

  return corals;
}
