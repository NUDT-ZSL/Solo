export interface PlantCard {
  id: string;
  name: string;
  scientificName: string;
  leafImage: string;
  distribution: string;
  uses: string;
  description: string;
  featureVector: number[];
}

export interface PlantDetail extends PlantCard {
  gallery: {
    leaves: string[];
    bark: string[];
    fruits: string[];
    flowers: string[];
  };
  comparison: ComparisonItem;
}

export interface RecognitionResult {
  plant: PlantDetail;
  confidence: number;
}

export interface ComparisonItem {
  plantId: string;
  leafShape: string;
  leafMargin: string;
  leafVein: string;
  fruit: string;
}

export interface FavoriteItem {
  plantId: string;
  addedAt: string;
}

export type ComparisonCategory = 'leafShape' | 'leafMargin' | 'leafVein' | 'fruit';

export const ComparisonLabels: Record<ComparisonCategory, { label: string; color: string }> = {
  leafShape: { label: '叶片形状', color: '#3b82f6' },
  leafMargin: { label: '叶缘锯齿', color: '#f59e0b' },
  leafVein: { label: '叶脉类型', color: '#10b981' },
  fruit: { label: '果实形态', color: '#8b5cf6' },
};

export type PageKey = 'recognition' | 'encyclopedia' | 'favorites' | 'discovery';
