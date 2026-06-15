export type TeaCategory = '绿茶' | '红茶' | '乌龙' | '普洱' | '白茶';

export interface TastingRecord {
  id?: string;
  teaName: string;
  category: TeaCategory;
  origin: string;
  temperature: number;
  tastingDate: string;
  notes: string;
  rating: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeaItem {
  id: string;
  name: string;
  category: TeaCategory;
  origin: string;
  temp: number;
  flavor: string[];
  description: string;
}

export interface TasteVector {
  categoryWeights: Record<TeaCategory, number>;
  originWeights: Record<string, number>;
  tempPreference: number;
  totalRecords: number;
  topOrigins: string[];
  preferredCategories: TeaCategory[];
}

export interface FormState {
  teaName: string;
  category: TeaCategory;
  origin: string;
  temperature: number;
  tastingDate: string;
  notes: string;
  rating: number;
}

export const CATEGORY_COLORS: Record<TeaCategory, string> = {
  '绿茶': '#7CCD7C',
  '红茶': '#FF7F50',
  '乌龙': '#D2691E',
  '普洱': '#8B4513',
  '白茶': '#FFE4B5'
};

export const CATEGORY_GRADIENTS: Record<TeaCategory, string> = {
  '绿茶': 'linear-gradient(135deg, #7CCD7C 0%, #3CB371 100%)',
  '红茶': 'linear-gradient(135deg, #FF7F50 0%, #DC143C 100%)',
  '乌龙': 'linear-gradient(135deg, #D2691E 0%, #8B4513 100%)',
  '普洱': 'linear-gradient(135deg, #8B4513 0%, #3D2B1F 100%)',
  '白茶': 'linear-gradient(135deg, #FFE4B5 0%, #F5DEB3 100%)'
};

export const TEA_CATEGORIES: TeaCategory[] = ['绿茶', '红茶', '乌龙', '普洱', '白茶'];

export function createEmptyForm(): FormState {
  return {
    teaName: '',
    category: '绿茶',
    origin: '',
    temperature: 85,
    tastingDate: new Date().toISOString().split('T')[0],
    notes: '',
    rating: 4
  };
}

function createEmptyVector(): TasteVector {
  const categoryWeights = {} as Record<TeaCategory, number>;
  TEA_CATEGORIES.forEach(c => { categoryWeights[c] = 0; });
  return {
    categoryWeights,
    originWeights: {},
    tempPreference: 85,
    totalRecords: 0,
    topOrigins: [],
    preferredCategories: []
  };
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const positiveWords = ['醇厚', '回甘', '鲜爽', '清甜', '蜜香', '花香', '浓香', '岩韵', '兰香', '柔甜', '生津', '清爽'];
  positiveWords.forEach(w => {
    if (text.includes(w)) keywords.add(w);
  });
  return Array.from(keywords);
}

export function calculateTasteVector(records: TastingRecord[]): TasteVector {
  const vector = createEmptyVector();
  if (records.length === 0) return vector;

  const recencyFactor = 1 / records.length;

  records.forEach((record, index) => {
    const weight = 1 - (index * recencyFactor * 0.5);
    const ratingBoost = record.rating >= 4 ? (record.rating - 3) : 0.3;
    const adjustedWeight = weight * ratingBoost;

    vector.categoryWeights[record.category] += adjustedWeight;
    const originKey = record.origin;
    vector.originWeights[originKey] = (vector.originWeights[originKey] || 0) + adjustedWeight;
    vector.tempPreference += record.temperature * adjustedWeight;
    vector.totalRecords++;
  });

  const totalWeight = records.reduce((sum, _, i) => {
    const w = 1 - (i * recencyFactor * 0.5);
    const rb = records[i].rating >= 4 ? (records[i].rating - 3) : 0.3;
    return sum + w * rb;
  }, 0);

  if (totalWeight > 0) {
    vector.tempPreference = vector.tempPreference / totalWeight;
  }

  vector.preferredCategories = [...TEA_CATEGORIES]
    .sort((a, b) => vector.categoryWeights[b] - vector.categoryWeights[a])
    .filter(c => vector.categoryWeights[c] > 0) as TeaCategory[];

  vector.topOrigins = Object.entries(vector.originWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([origin]) => origin);

  return vector;
}

export function getCategoryStats(records: TastingRecord[]): Array<{ category: TeaCategory; count: number; fill: string }> {
  const counts = {} as Record<TeaCategory, number>;
  TEA_CATEGORIES.forEach(c => { counts[c] = 0; });
  records.forEach(r => { counts[r.category]++; });
  return TEA_CATEGORIES.map(c => ({
    category: c,
    count: counts[c],
    fill: CATEGORY_COLORS[c]
  }));
}

export function searchTeaLibrary(library: TeaItem[], query: string): Array<{ id: string; name: string; category: TeaCategory; origin: string; temp: number }> {
  if (!query || query.length === 0) return [];
  const kw = query.toLowerCase();
  return library
    .filter(t => t.name.toLowerCase().includes(kw))
    .slice(0, 8)
    .map(t => ({ id: t.id, name: t.name, category: t.category, origin: t.origin, temp: t.temp }));
}

export function analyzeNotes(notes: string): { flavors: string[]; summary: string } {
  const flavors = extractKeywords(notes);
  let summary = '口感描述简洁';
  if (flavors.length >= 3) {
    summary = '品鉴笔记详尽，味觉层次丰富';
  } else if (flavors.length >= 1) {
    summary = `捕捉到${flavors.join('、')}等风味特征`;
  }
  if (notes.length > 100) {
    summary += '，记录细致入微';
  }
  return { flavors, summary };
}

export function getTemperatureColor(temp: number): string {
  const ratio = (temp - 60) / 40;
  const r = Math.round(135 + ratio * (255 - 135));
  const g = Math.round(206 + ratio * (99 - 206));
  const b = Math.round(235 + ratio * (71 - 235));
  return `rgb(${r}, ${g}, ${b})`;
}

interface RecordManager {
  addRecord: (record: Omit<TastingRecord, 'id' | 'createdAt'>) => TastingRecord;
  updateRecord: (id: string, updates: Partial<TastingRecord>) => TastingRecord | null;
  deleteRecord: (id: string) => boolean;
  getRecords: () => TastingRecord[];
  getTasteVector: () => TasteVector;
  getStats: () => ReturnType<typeof getCategoryStats>;
  initialize: (records: TastingRecord[]) => void;
}

export function createRecordManager(initialRecords: TastingRecord[] = []): RecordManager {
  let records: TastingRecord[] = [...initialRecords];

  return {
    initialize(newRecords) {
      records = [...newRecords];
    },

    addRecord(record) {
      const newRecord: TastingRecord = {
        ...record,
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString()
      };
      records = [newRecord, ...records];
      return newRecord;
    },

    updateRecord(id, updates) {
      const idx = records.findIndex(r => r.id === id);
      if (idx === -1) return null;
      records[idx] = { ...records[idx], ...updates, updatedAt: new Date().toISOString() };
      return records[idx];
    },

    deleteRecord(id) {
      const len = records.length;
      records = records.filter(r => r.id !== id);
      return records.length < len;
    },

    getRecords() {
      return [...records];
    },

    getTasteVector() {
      return calculateTasteVector(records);
    },

    getStats() {
      return getCategoryStats(records);
    }
  };
}

export async function fetchTeaLibrary(): Promise<TeaItem[]> {
  try {
    const res = await fetch('/api/teas');
    if (res.ok) return res.json();
  } catch {}
  return getFallbackTeaLibrary();
}

export async function fetchTastingRecords(): Promise<TastingRecord[]> {
  try {
    const res = await fetch('/api/records');
    if (res.ok) return res.json();
  } catch {}
  return [];
}

export async function saveRecord(record: FormState | TastingRecord): Promise<TastingRecord | null> {
  try {
    const res = await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

export async function updateRecordApi(id: string, updates: Partial<TastingRecord>): Promise<TastingRecord | null> {
  try {
    const res = await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) return res.json();
  } catch {}
  return null;
}

export async function deleteRecordApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export function getFallbackTeaLibrary(): TeaItem[] {
  return [
    { id: 't1', name: '西湖龙井', category: '绿茶', origin: '浙江杭州', temp: 80, flavor: ['鲜爽', '豆香', '清甜'], description: '扁平光滑，色泽嫩绿，香气清高持久' },
    { id: 't2', name: '碧螺春', category: '绿茶', origin: '江苏苏州', temp: 75, flavor: ['花果香', '鲜醇', '回甘'], description: '卷曲成螺，满身披毫，银白隐翠' },
    { id: 't6', name: '正山小种', category: '红茶', origin: '福建武夷山', temp: 90, flavor: ['松烟香', '桂圆汤', '醇厚'], description: '条索肥实，色泽乌润，带松烟香' },
    { id: 't7', name: '祁门红茶', category: '红茶', origin: '安徽祁门', temp: 90, flavor: ['祁门香', '鲜醇', '回甘'], description: '紧细匀整，色泽乌润，蜜糖香似花似果' },
    { id: 't11', name: '铁观音', category: '乌龙', origin: '福建安溪', temp: 95, flavor: ['兰花香', '观音韵', '回甘'], description: '螺旋紧结，色泽砂绿，七泡有余香' },
    { id: 't12', name: '大红袍', category: '乌龙', origin: '福建武夷山', temp: 95, flavor: ['岩韵', '醇厚', '回甘持久'], description: '条索紧结，色泽绿褐鲜润，岩骨花香' },
    { id: 't16', name: '生普饼茶', category: '普洱', origin: '云南西双版纳', temp: 100, flavor: ['兰香', '苦涩', '回甘'], description: '紧压成饼，色泽青绿，香气清纯' },
    { id: 't21', name: '福鼎白毫银针', category: '白茶', origin: '福建福鼎', temp: 85, flavor: ['毫香', '鲜甜', '清爽'], description: '芽头肥壮，满披白毫，挺直如针' }
  ];
}

export interface DeleteAnimationState {
  isDeleting: (id: string) => boolean;
  triggerDelete: (id: string) => Promise<boolean>;
}

export function createDeleteHandler(
  onStart: (id: string) => void,
  onComplete: (id: string) => void,
  delayMs: number = 300
): DeleteAnimationState {
  const deletingIds = new Set<string>();

  return {
    isDeleting: (id: string) => deletingIds.has(id),
    triggerDelete: async (id: string) => {
      deletingIds.add(id);
      onStart(id);
      return new Promise(resolve => {
        setTimeout(async () => {
          const success = await deleteRecordApi(id);
          deletingIds.delete(id);
          onComplete(id);
          resolve(success);
        }, delayMs);
      });
    }
  };
}

export function getCardAnimationDelay(index: number, staggerMs: number = 100): string {
  return `${Math.min(index * staggerMs, 1000)}ms`;
}

export function formToRecord(form: FormState): Omit<TastingRecord, 'id' | 'createdAt'> {
  return { ...form };
}

export function recordToForm(record: TastingRecord): FormState {
  return {
    teaName: record.teaName,
    category: record.category,
    origin: record.origin,
    temperature: record.temperature,
    tastingDate: record.tastingDate,
    notes: record.notes,
    rating: record.rating
  };
}

export { extractKeywords };
