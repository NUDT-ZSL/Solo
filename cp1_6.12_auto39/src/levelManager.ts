export interface Level {
  id: number;
  theme: string;
  letters: string[][];
  targetWords: string[];
}

export interface GameProgress {
  unlockedLevel: number;
  completedLevels: number[];
  levelWords: Record<number, string[]>;
  totalScore: number;
}

const STORAGE_KEY = 'puzzlephrase_progress';

const LEVELS: Level[] = [
  {
    id: 1,
    theme: '森林动物 Forest',
    letters: [
      ['D', 'E', 'E', 'R', 'F'],
      ['O', 'X', 'F', 'O', 'X'],
      ['G', 'B', 'E', 'A', 'R'],
      ['W', 'O', 'L', 'F', 'M'],
      ['H', 'A', 'R', 'E', 'S']
    ],
    targetWords: ['DEER', 'FOX', 'BEAR', 'WOLF', 'HARE', 'DOG', 'CAT', 'HORSE', 'MOUSE', 'RAT', 'GOAT', 'COW', 'PIG', 'BAT', 'OWL']
  },
  {
    id: 2,
    theme: '天气现象 Weather',
    letters: [
      ['R', 'A', 'I', 'N', 'W'],
      ['S', 'N', 'O', 'W', 'I'],
      ['F', 'O', 'G', 'N', 'N'],
      ['D', 'S', 'U', 'N', 'D'],
      ['C', 'L', 'O', 'U', 'D']
    ],
    targetWords: ['RAIN', 'SNOW', 'FOG', 'WIND', 'SUN', 'CLOUD', 'STORM', 'FROST', 'HAIL', 'MIST', 'DRIZZLE', 'SHOWER', 'BREEZE', 'GALE', 'FREEZE']
  },
  {
    id: 3,
    theme: '科技数码 Tech',
    letters: [
      ['C', 'O', 'D', 'E', 'R'],
      ['A', 'P', 'P', 'S', 'O'],
      ['M', 'A', 'I', 'L', 'B'],
      ['D', 'A', 'T', 'A', 'O'],
      ['C', 'H', 'I', 'P', 'T']
    ],
    targetWords: ['CODE', 'APP', 'MAIL', 'DATA', 'CHIP', 'ROBOT', 'PHONE', 'SCREEN', 'MOUSE', 'KEY', 'FILE', 'LINK', 'NET', 'WEB', 'BLOG']
  },
  {
    id: 4,
    theme: '海洋生物 Ocean',
    letters: [
      ['W', 'H', 'A', 'L', 'E'],
      ['C', 'O', 'R', 'A', 'L'],
      ['S', 'H', 'A', 'R', 'K'],
      ['F', 'I', 'S', 'H', 'Y'],
      ['C', 'R', 'A', 'B', 'S']
    ],
    targetWords: ['WHALE', 'CORAL', 'SHARK', 'FISH', 'CRAB', 'SEAL', 'EEL', 'RAY', 'TUNA', 'CLAM', 'KELP', 'REEF', 'TIDE', 'SURF', 'SHELL']
  },
  {
    id: 5,
    theme: '音乐乐器 Music',
    letters: [
      ['P', 'I', 'A', 'N', 'O'],
      ['D', 'R', 'U', 'M', 'S'],
      ['F', 'L', 'U', 'T', 'E'],
      ['H', 'A', 'R', 'P', 'A'],
      ['C', 'E', 'L', 'L', 'O']
    ],
    targetWords: ['PIANO', 'DRUM', 'FLUTE', 'HARP', 'CELLO', 'VIOLIN', 'GUITAR', 'TRUMPET', 'TUNE', 'NOTE', 'SONG', 'BEAT', 'RHYTHM', 'CHORD', 'BASS']
  },
  {
    id: 6,
    theme: '水果美食 Food',
    letters: [
      ['A', 'P', 'P', 'L', 'E'],
      ['G', 'R', 'A', 'P', 'E'],
      ['P', 'E', 'A', 'R', 'S'],
      ['M', 'E', 'L', 'O', 'N'],
      ['F', 'I', 'G', 'S', 'O']
    ],
    targetWords: ['APPLE', 'GRAPE', 'PEAR', 'MELON', 'FIG', 'PEACH', 'BERRY', 'MANGO', 'DATE', 'KIWI', 'LIME', 'PLUM', 'NUT', 'OLIVE', 'BREAD']
  },
  {
    id: 7,
    theme: '运动健身 Sports',
    letters: [
      ['R', 'U', 'N', 'S', 'W'],
      ['B', 'A', 'L', 'L', 'I'],
      ['G', 'O', 'A', 'L', 'N'],
      ['T', 'E', 'A', 'M', 'S'],
      ['R', 'A', 'C', 'E', 'S']
    ],
    targetWords: ['RUN', 'BALL', 'GOAL', 'TEAM', 'RACE', 'GOLF', 'SKI', 'BOX', 'JUMP', 'SWIM', 'CYCLE', 'DIVE', 'HIT', 'KICK', 'PASS']
  },
  {
    id: 8,
    theme: '宇宙星空 Space',
    letters: [
      ['S', 'T', 'A', 'R', 'S'],
      ['M', 'O', 'O', 'N', 'U'],
      ['M', 'A', 'R', 'S', 'N'],
      ['C', 'O', 'M', 'E', 'T'],
      ['N', 'E', 'B', 'U', 'L']
    ],
    targetWords: ['STAR', 'MOON', 'MARS', 'COMET', 'NEBULA', 'PLANET', 'ORBIT', 'GALAXY', 'SUN', 'RAY', 'PULSE', 'NOVA', 'VOID', 'COSMOS', 'DUST']
  },
  {
    id: 9,
    theme: '颜色光影 Color',
    letters: [
      ['R', 'E', 'D', 'B', 'L'],
      ['G', 'O', 'L', 'D', 'U'],
      ['P', 'I', 'N', 'K', 'E'],
      ['C', 'Y', 'A', 'N', 'S'],
      ['G', 'R', 'A', 'Y', 'E']
    ],
    targetWords: ['RED', 'BLUE', 'GOLD', 'PINK', 'CYAN', 'GRAY', 'BLACK', 'WHITE', 'GREEN', 'BROWN', 'PURPLE', 'ORANGE', 'IVORY', 'TEAL', 'LIME']
  },
  {
    id: 10,
    theme: '家庭居家 Home',
    letters: [
      ['B', 'E', 'D', 'S', 'O'],
      ['C', 'U', 'P', 'S', 'F'],
      ['L', 'A', 'M', 'P', 'A'],
      ['S', 'O', 'F', 'A', 'N'],
      ['K', 'E', 'Y', 'S', 'S']
    ],
    targetWords: ['BED', 'CUP', 'LAMP', 'SOFA', 'KEY', 'TABLE', 'CHAIR', 'DOOR', 'MIRROR', 'CLOCK', 'RUG', 'VASE', 'PLATE', 'BOWL', 'SHELF']
  },
  {
    id: 11,
    theme: '旅行出行 Travel',
    letters: [
      ['T', 'R', 'A', 'I', 'N'],
      ['P', 'L', 'A', 'N', 'E'],
      ['S', 'H', 'I', 'P', 'S'],
      ['R', 'O', 'A', 'D', 'S'],
      ['M', 'A', 'P', 'S', 'O']
    ],
    targetWords: ['TRAIN', 'PLANE', 'SHIP', 'ROAD', 'MAP', 'CAR', 'BUS', 'TAXI', 'BOAT', 'PORT', 'TICKET', 'PASS', 'VISIT', 'TOUR', 'TRIP']
  },
  {
    id: 12,
    theme: '工作职业 Jobs',
    letters: [
      ['D', 'O', 'C', 'T', 'O'],
      ['N', 'U', 'R', 'S', 'E'],
      ['T', 'E', 'A', 'C', 'H'],
      ['A', 'R', 'T', 'S', 'T'],
      ['C', 'O', 'O', 'K', 'S']
    ],
    targetWords: ['DOCTOR', 'NURSE', 'TEACH', 'ART', 'COOK', 'LAWYER', 'PILOT', 'FIRE', 'POLICE', 'FARM', 'BAKER', 'PAINTER', 'WRITER', 'SINGER', 'DANCE']
  },
  {
    id: 13,
    theme: '情感感受 Emotion',
    letters: [
      ['L', 'O', 'V', 'E', 'J'],
      ['H', 'A', 'P', 'P', 'Y'],
      ['C', 'A', 'L', 'M', 'S'],
      ['H', 'O', 'P', 'E', 'O'],
      ['P', 'R', 'I', 'D', 'E']
    ],
    targetWords: ['LOVE', 'HAPPY', 'CALM', 'HOPE', 'PRIDE', 'JOY', 'FEAR', 'ANGER', 'SAD', 'SHY', 'BRAVE', 'KIND', 'WARM', 'COOL', 'PEACE']
  },
  {
    id: 14,
    theme: '自然景观 Nature',
    letters: [
      ['T', 'R', 'E', 'E', 'S'],
      ['R', 'I', 'V', 'E', 'R'],
      ['L', 'A', 'K', 'E', 'S'],
      ['H', 'I', 'L', 'L', 'S'],
      ['R', 'O', 'C', 'K', 'S']
    ],
    targetWords: ['TREE', 'RIVER', 'LAKE', 'HILL', 'ROCK', 'FLOWER', 'GRASS', 'BUSH', 'STONE', 'SAND', 'OCEAN', 'ISLAND', 'CLIFF', 'CREEK', 'POND']
  },
  {
    id: 15,
    theme: '时间日历 Time',
    letters: [
      ['D', 'A', 'Y', 'S', 'W'],
      ['W', 'E', 'E', 'K', 'E'],
      ['M', 'O', 'N', 'T', 'E'],
      ['Y', 'E', 'A', 'R', 'K'],
      ['H', 'O', 'U', 'R', 'S']
    ],
    targetWords: ['DAY', 'WEEK', 'MONTH', 'YEAR', 'HOUR', 'DATE', 'TIME', 'NOON', 'DAWN', 'DUSK', 'EVE', 'MORN', 'SEASON', 'SPRING', 'AUTUMN']
  },
  {
    id: 16,
    theme: '身体部位 Body',
    letters: [
      ['H', 'E', 'A', 'D', 'S'],
      ['E', 'Y', 'E', 'S', 'K'],
      ['N', 'O', 'S', 'E', 'I'],
      ['H', 'A', 'N', 'D', 'N'],
      ['F', 'O', 'O', 'T', 'E']
    ],
    targetWords: ['HEAD', 'EYE', 'NOSE', 'HAND', 'FOOT', 'EAR', 'LIP', 'ARM', 'LEG', 'NECK', 'KNEE', 'BONE', 'SKIN', 'HAIR', 'TOOTH']
  },
  {
    id: 17,
    theme: '数字符号 Numbers',
    letters: [
      ['O', 'N', 'E', 'T', 'W'],
      ['F', 'O', 'U', 'R', 'O'],
      ['F', 'I', 'V', 'E', 'S'],
      ['T', 'E', 'N', 'S', 'I'],
      ['Z', 'E', 'R', 'O', 'X']
    ],
    targetWords: ['ONE', 'TWO', 'FOUR', 'FIVE', 'TEN', 'ZERO', 'THREE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'DOZEN', 'SCORE', 'SUM', 'PLUS']
  },
  {
    id: 18,
    theme: '文学阅读 Reading',
    letters: [
      ['B', 'O', 'O', 'K', 'S'],
      ['P', 'A', 'G', 'E', 'N'],
      ['P', 'O', 'E', 'M', 'O'],
      ['N', 'O', 'V', 'E', 'T'],
      ['T', 'E', 'X', 'T', 'S']
    ],
    targetWords: ['BOOK', 'PAGE', 'POEM', 'NOVEL', 'TEXT', 'STORY', 'VERSE', 'PLOT', 'AUTHOR', 'READ', 'WRITE', 'WORD', 'LINE', 'NOTE', 'QUOTE']
  },
  {
    id: 19,
    theme: '建筑地标 Buildings',
    letters: [
      ['T', 'O', 'W', 'E', 'R'],
      ['B', 'R', 'I', 'D', 'G'],
      ['C', 'A', 'S', 'T', 'L'],
      ['P', 'A', 'L', 'A', 'C'],
      ['H', 'O', 'U', 'S', 'E']
    ],
    targetWords: ['TOWER', 'BRIDGE', 'CASTLE', 'PALACE', 'HOUSE', 'HALL', 'DOME', 'ARCH', 'WALL', 'ROOF', 'PORT', 'FORT', 'TEMPLE', 'STATUE', 'FOUNT']
  },
  {
    id: 20,
    theme: '梦幻终章 Fantasy',
    letters: [
      ['D', 'R', 'A', 'G', 'O'],
      ['M', 'A', 'G', 'I', 'C'],
      ['S', 'T', 'A', 'R', 'S'],
      ['Q', 'U', 'E', 'E', 'N'],
      ['K', 'I', 'N', 'G', 'S']
    ],
    targetWords: ['DRAGON', 'MAGIC', 'STAR', 'QUEEN', 'KING', 'WIZARD', 'FAIRY', 'SPELL', 'SWORD', 'CROWN', 'WAND', 'ORB', 'GEM', 'ELF', 'HERO']
  }
];

const DEFAULT_PROGRESS: GameProgress = {
  unlockedLevel: 1,
  completedLevels: [],
  levelWords: {},
  totalScore: 0
};

export function getLevels(): Level[] {
  return LEVELS;
}

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS, levelWords: {} };
    const parsed = JSON.parse(raw) as GameProgress;
    return {
      unlockedLevel: parsed.unlockedLevel || 1,
      completedLevels: parsed.completedLevels || [],
      levelWords: parsed.levelWords || {},
      totalScore: parsed.totalScore || 0
    };
  } catch {
    return { ...DEFAULT_PROGRESS, levelWords: {} };
  }
}

export function saveProgress(progress: GameProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function isUnlocked(levelId: number, progress: GameProgress): boolean {
  return levelId <= progress.unlockedLevel;
}

export function isCompleted(levelId: number, progress: GameProgress): boolean {
  return progress.completedLevels.includes(levelId);
}

export function getLevelFoundWords(levelId: number, progress: GameProgress): string[] {
  return progress.levelWords[levelId] || [];
}

export function getCompletionPercent(levelId: number, progress: GameProgress): number {
  const level = getLevelById(levelId);
  if (!level) return 0;
  const found = getLevelFoundWords(levelId, progress);
  return Math.min(100, Math.round((found.length / level.targetWords.length) * 100));
}

export function addFoundWord(levelId: number, word: string, progress: GameProgress): GameProgress {
  const upperWord = word.toUpperCase();
  const current = getLevelFoundWords(levelId, progress);
  if (current.includes(upperWord)) return progress;

  const newLevelWords = { ...progress.levelWords, [levelId]: [...current, upperWord] };
  const newProgress: GameProgress = {
    ...progress,
    levelWords: newLevelWords
  };

  const level = getLevelById(levelId);
  if (level) {
    const foundCount = newLevelWords[levelId].length;
    const targetCount = level.targetWords.length;
    const threshold = Math.ceil(targetCount * 0.8);

    if (foundCount >= threshold && !progress.completedLevels.includes(levelId)) {
      newProgress.completedLevels = [...progress.completedLevels, levelId];
      if (levelId >= progress.unlockedLevel && levelId < LEVELS.length) {
        newProgress.unlockedLevel = levelId + 1;
      }
    }
  }

  saveProgress(newProgress);
  return newProgress;
}

export function resetProgress(): GameProgress {
  const fresh = { ...DEFAULT_PROGRESS, levelWords: {} };
  saveProgress(fresh);
  return fresh;
}

export const TIME_LIMIT = 120;
