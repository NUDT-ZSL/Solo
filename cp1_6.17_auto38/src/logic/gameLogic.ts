const SIMPLE_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me'
];

const ADVANCED_WORDS = [
  'quasar', 'nebula', 'warp', 'hyperspace', 'quantum', 'celestial',
  'cosmic', 'stellar', 'interstellar', 'trajectory', 'equilibrium',
  'synchronize', 'calibrate', 'traverse', 'permeate', 'illuminate',
  'cascade', 'oscillate', 'resonate', 'propagate', 'paradigm',
  'vicinity', 'phenomenon', 'ambiguous', 'ephemeral', 'serendipity',
  'exponential', 'metamorphosis', 'asynchronous', 'juxtapose'
];

const PUNCTUATIONS = ['.', ',', '!', '?', ';', ':', '"', '(', ')', '-'];

const STORY_FRAGMENTS = [
  'The ship drifted through silent darkness.',
  'Stars blinked like distant fireflies.',
  'A faint signal emerged from the void.',
  'Crew members monitored the control panel.',
  'The engine hummed with steady rhythm.',
  'Unknown galaxies appeared on the horizon.',
  'Time moved differently in deep space.',
  'Ancient debris floated past the viewport.',
  'The navigation system recalibrated itself.',
  'We were not alone in this universe.'
];

const LEVEL_NAMES = [
  '起航',
  '月球轨道',
  '小行星带',
  '火星殖民地',
  '木星引力井',
  '土星环',
  '海王星深空',
  '星际边界',
  '半人马座α',
  '未知星云'
];

export interface LevelResult {
  text: string;
  name: string;
}

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSentence(useAdvanced: boolean, usePunctuation: boolean): string {
  const wordCount = randomInt(6, 12);
  const words: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    if (useAdvanced && Math.random() < 0.3) {
      words.push(randomFromArray(ADVANCED_WORDS));
    } else {
      words.push(randomFromArray(SIMPLE_WORDS));
    }
  }

  let sentence = words.join(' ');
  sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

  if (usePunctuation && Math.random() < 0.7) {
    const punct = randomFromArray(PUNCTUATIONS.filter(p => !['"', '(', ')', '-'].includes(p)));
    sentence += punct;
  }

  return sentence;
}

export function generateLevelText(level: number): LevelResult {
  const levelIndex = Math.min(level - 1, LEVEL_NAMES.length - 1);
  const levelName = LEVEL_NAMES[levelIndex];

  if (level === 1) {
    const wordCount = randomInt(10, 15);
    const words: string[] = [];
    while (words.length < wordCount) {
      words.push(randomFromArray(SIMPLE_WORDS));
    }
    let text = words.join(' ');
    text = text.charAt(0).toUpperCase() + text.slice(1) + '.';
    return { text, name: levelName };
  }

  const useAdvanced = level >= 3;
  const usePunctuation = level >= 2;

  const sentences: string[] = [];
  const targetWordCount = 50;
  let totalWords = 0;

  while (totalWords < targetWordCount) {
    const sentence = generateSentence(useAdvanced, usePunctuation);
    sentences.push(sentence);
    totalWords += sentence.split(' ').length;
  }

  if (level >= 4 && Math.random() < 0.5) {
    const fragment = randomFromArray(STORY_FRAGMENTS);
    const insertPos = randomInt(0, sentences.length - 1);
    sentences.splice(insertPos, 0, fragment);
  }

  return { text: sentences.join(' '), name: levelName };
}

export function calculateScore(
  correctChars: number,
  destroyedMeteors: number,
  completedLevels: number
): number {
  const charScore = correctChars * 10;
  const meteorScore = destroyedMeteors * 25;
  const levelBonus = completedLevels * 200;
  return charScore + meteorScore + levelBonus;
}

export function isGameOver(lives: number): boolean {
  return lives <= 0;
}

export function getMeteorSpeed(level: number): number {
  const baseSpeed = 80;
  const speedMultiplier = 1 + (level - 1) * 0.15;
  return baseSpeed * speedMultiplier;
}

export function getMeteorSpawnInterval(level: number): [number, number] {
  const baseMin = Math.max(3000, 5000 - (level - 1) * 200);
  const baseMax = Math.max(6000, 15000 - (level - 1) * 800);
  return [baseMin, baseMax];
}
