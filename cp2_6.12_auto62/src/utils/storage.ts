import { PlayerProgress, DailyTask } from '../types';
import { CARDS } from '../data/cards';

const STORAGE_KEY = 'nature_codex_progress';

const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const generateDailyTasks = (): DailyTask[] => [
  {
    id: 'gallery_view',
    name: '图鉴探索者',
    description: '浏览图鉴页面5次',
    target: 5,
    progress: 0,
    completed: false,
    reward: { type: 'fragment', cardId: CARDS[Math.floor(Math.random() * 5)].id, amount: 2 }
  },
  {
    id: 'battle_participate',
    name: '战斗新手',
    description: '参与3场对战',
    target: 3,
    progress: 0,
    completed: false,
    reward: { type: 'fragment', cardId: CARDS[Math.floor(Math.random() * 5 + 5)].id, amount: 2 }
  },
  {
    id: 'battle_win',
    name: '胜利之光',
    description: '赢得1场对战',
    target: 1,
    progress: 0,
    completed: false,
    reward: { type: 'fragment', cardId: CARDS[Math.floor(Math.random() * 5 + 10)].id, amount: 3 }
  }
];

export const createInitialProgress = (): PlayerProgress => {
  return {
    unlockedCards: [],
    fragments: {},
    totalBattles: 0,
    totalWins: 0,
    totalGalleryViews: 0,
    experience: 0,
    level: 1,
    dailyTasks: generateDailyTasks(),
    lastLoginDate: getTodayString(),
    consecutiveLogins: 1
  };
};

export const loadProgress = (): PlayerProgress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const progress = JSON.parse(raw) as PlayerProgress;
      const today = getTodayString();
      if (progress.lastLoginDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        progress.consecutiveLogins = progress.lastLoginDate === yesterdayStr
          ? progress.consecutiveLogins + 1
          : 1;
        progress.lastLoginDate = today;
        progress.dailyTasks = generateDailyTasks();
      }
      return progress;
    }
  } catch (e) {
    console.warn('Failed to load progress from localStorage', e);
  }
  const initial = createInitialProgress();
  initial.unlockedCards = [CARDS[0].id, CARDS[3].id];
  initial.fragments = {
    [CARDS[0].id]: 3,
    [CARDS[3].id]: 2,
    [CARDS[1].id]: 1
  };
  saveProgress(initial);
  return initial;
};

export const saveProgress = (progress: PlayerProgress): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress to localStorage', e);
  }
};

export const updateDailyTaskProgress = (
  progress: PlayerProgress,
  taskId: string,
  increment: number = 1
): PlayerProgress => {
  const updated = { ...progress, dailyTasks: progress.dailyTasks.map(t => ({ ...t })) };
  const task = updated.dailyTasks.find(t => t.id === taskId);
  if (task && !task.completed) {
    task.progress = Math.min(task.progress + increment, task.target);
    if (task.progress >= task.target) {
      task.completed = true;
      if (task.reward.type === 'fragment' && task.reward.cardId) {
        updated.fragments[task.reward.cardId] =
          (updated.fragments[task.reward.cardId] || 0) + task.reward.amount;
      }
    }
  }
  return updated;
};

export const addFragments = (
  progress: PlayerProgress,
  cardId: string,
  amount: number
): PlayerProgress => {
  const updated = { ...progress, fragments: { ...progress.fragments } };
  updated.fragments[cardId] = (updated.fragments[cardId] || 0) + amount;
  return updated;
};

export const canUnlockCard = (progress: PlayerProgress, cardId: string): boolean => {
  if (progress.unlockedCards.includes(cardId)) return false;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return false;
  return (progress.fragments[cardId] || 0) >= card.fragmentsRequired;
};

export const unlockCard = (progress: PlayerProgress, cardId: string): PlayerProgress => {
  if (!canUnlockCard(progress, cardId)) return progress;
  const card = CARDS.find(c => c.id === cardId);
  if (!card) return progress;
  return {
    ...progress,
    unlockedCards: [...progress.unlockedCards, cardId],
    fragments: {
      ...progress.fragments,
      [cardId]: (progress.fragments[cardId] || 0) - card.fragmentsRequired
    }
  };
};

export const calculateLevel = (experience: number): number => {
  return Math.floor(Math.sqrt(experience / 50)) + 1;
};
