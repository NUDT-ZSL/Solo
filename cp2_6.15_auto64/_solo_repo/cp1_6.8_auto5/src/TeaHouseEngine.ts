export type TeaType = 'green' | 'red' | 'oolong' | 'white' | 'black' | 'flower';

export interface TeaMeta {
  type: TeaType;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  desc: string;
}

export const TEA_CATALOG: Record<TeaType, TeaMeta> = {
  green:  { type: 'green',  label: '绿茶', emoji: '🍵', color: '#7ba884', bgColor: 'rgba(123,168,132,0.15)', desc: '清新' },
  red:    { type: 'red',    label: '红茶', emoji: '☕', color: '#c47a5a', bgColor: 'rgba(196,122,90,0.15)',  desc: '温暖' },
  oolong: { type: 'oolong', label: '乌龙', emoji: '🫖', color: '#b8935a', bgColor: 'rgba(184,147,90,0.15)',  desc: '平静' },
  white:  { type: 'white',  label: '白茶', emoji: '🤍', color: '#d4c5a9', bgColor: 'rgba(212,197,169,0.2)',  desc: '淡然' },
  black:  { type: 'black',  label: '黑茶', emoji: '🖤', color: '#6b4c3b', bgColor: 'rgba(107,76,59,0.12)',   desc: '沉郁' },
  flower: { type: 'flower', label: '花茶', emoji: '🌸', color: '#d4838f', bgColor: 'rgba(212,131,143,0.15)', desc: '芬芳' },
};

export const TEA_TYPES: TeaType[] = ['green', 'red', 'oolong', 'white', 'black', 'flower'];

export interface MoodTea {
  id: string;
  teaType: TeaType;
  mood: string;
  createdAt: number;
  huigan: number;
}

const STORAGE_KEY = 'wuyin_chashe_moods';
const MY_MOODS_KEY = 'wuyin_chashe_my_ids';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function loadAllMoods(): MoodTea[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MoodTea[];
  } catch {
    return [];
  }
}

function saveAllMoods(moods: MoodTea[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(moods));
}

export function createMood(teaType: TeaType, mood: string): MoodTea {
  const tea: MoodTea = {
    id: generateId(),
    teaType,
    mood,
    createdAt: Date.now(),
    huigan: 0,
  };
  const all = loadAllMoods();
  all.unshift(tea);
  saveAllMoods(all);

  const myIds = loadMyIds();
  myIds.push(tea.id);
  saveMyIds(myIds);

  return tea;
}

export function addHuigan(teaId: string): MoodTea | null {
  const all = loadAllMoods();
  const idx = all.findIndex(t => t.id === teaId);
  if (idx === -1) return null;
  all[idx].huigan += 1;
  saveAllMoods(all);
  return all[idx];
}

export function loadMyIds(): string[] {
  try {
    const raw = localStorage.getItem(MY_MOODS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function saveMyIds(ids: string[]): void {
  localStorage.setItem(MY_MOODS_KEY, JSON.stringify(ids));
}

export function loadMyMoods(): MoodTea[] {
  const myIds = loadMyIds();
  const all = loadAllMoods();
  return myIds
    .map(id => all.find(t => t.id === id))
    .filter((t): t is MoodTea => t !== undefined);
}

export function getTotalHuigan(moods: MoodTea[]): number {
  return moods.reduce((sum, t) => sum + t.huigan, 0);
}

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
