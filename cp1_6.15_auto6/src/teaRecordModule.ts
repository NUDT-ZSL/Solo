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

export interface TasteVector {
  categoryWeights: Record<TeaCategory, number>;
  originWeights: Record<string, number>;
  tempPreference: number;
  totalRecords: number;
  topOrigins: string[];
  preferredCategories: TeaCategory[];
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

interface RecordManager {
  records: TastingRecord[];
  addRecord: (record: Omit<TastingRecord, 'id' | 'createdAt'>) => TastingRecord;
  updateRecord: (id: string, updates: Partial<TastingRecord>) => TastingRecord | null;
  deleteRecord: (id: string) => boolean;
  getRecords: () => TastingRecord[];
  getTasteVector: () => TasteVector;
  getStats: () => ReturnType<typeof getCategoryStats>;
}

export function createRecordManager(initialRecords: TastingRecord[] = [] as TastingRecord[]): RecordManager {
  let records: TastingRecord[] = [...initialRecords];

  return {
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

export { extractKeywords };
