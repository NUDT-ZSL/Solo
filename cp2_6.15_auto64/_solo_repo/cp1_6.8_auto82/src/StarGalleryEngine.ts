export type FocalLengthType = 'wide' | 'standard' | 'telephoto';
export type ThemeType = 'warm' | 'cool';

export interface Photo {
  id: string;
  title: string;
  imageUrl: string;
  exposureTime: number;
  aperture: string;
  iso: number;
  focalLengthType: FocalLengthType;
  theme: ThemeType;
  isFavorite: boolean;
}

export interface FilterState {
  minExposure: number;
  maxExposure: number;
  focalLengthFilter: 'all' | FocalLengthType;
}

export const FOCAL_LABELS: Record<FocalLengthType | 'all', string> = {
  all: '全部',
  wide: '广角',
  standard: '标准',
  telephoto: '长焦',
};

export const MOCK_PHOTOS: Photo[] = [
  { id: '1', title: '城市夜空', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=urban%20night%20sky%20with%20light%20pollution%20star%20trails%20cityscape%20long%20exposure%20photography&image_size=landscape_4_3', exposureTime: 1800, aperture: 'f/2.8', iso: 800, focalLengthType: 'wide', theme: 'warm', isFavorite: false },
  { id: '2', title: '沙漠星河', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=desert%20night%20sky%20pure%20star%20trails%20milky%20way%20long%20exposure&image_size=landscape_4_3', exposureTime: 1200, aperture: 'f/4.0', iso: 1600, focalLengthType: 'wide', theme: 'cool', isFavorite: false },
  { id: '3', title: '雪山穹顶', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=snow%20mountain%20night%20star%20trails%20aurora%20long%20exposure%20photography&image_size=landscape_4_3', exposureTime: 600, aperture: 'f/5.6', iso: 3200, focalLengthType: 'standard', theme: 'cool', isFavorite: false },
  { id: '4', title: '海边黄昏', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ocean%20sunset%20twilight%20star%20trails%20warm%20light%20long%20exposure&image_size=landscape_4_3', exposureTime: 300, aperture: 'f/8.0', iso: 400, focalLengthType: 'standard', theme: 'warm', isFavorite: false },
  { id: '5', title: '森林之夜', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=forest%20night%20star%20trails%20trees%20silhouette%20pure%20dark%20sky%20long%20exposure&image_size=landscape_4_3', exposureTime: 900, aperture: 'f/2.8', iso: 6400, focalLengthType: 'wide', theme: 'cool', isFavorite: false },
  { id: '6', title: '极地光弧', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=arctic%20aurora%20star%20trails%20ice%20landscape%20long%20exposure%20photography&image_size=landscape_4_3', exposureTime: 1500, aperture: 'f/4.0', iso: 3200, focalLengthType: 'wide', theme: 'cool', isFavorite: false },
  { id: '7', title: '古塔星轨', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=ancient%20pagoda%20tower%20star%20trails%20night%20sky%20long%20exposure%20warm%20light&image_size=landscape_4_3', exposureTime: 45, aperture: 'f/11', iso: 200, focalLengthType: 'telephoto', theme: 'warm', isFavorite: false },
  { id: '8', title: '湖面星影', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=calm%20lake%20reflection%20star%20trails%20night%20sky%20mirror%20water%20long%20exposure&image_size=landscape_4_3', exposureTime: 120, aperture: 'f/5.6', iso: 800, focalLengthType: 'standard', theme: 'cool', isFavorite: false },
  { id: '9', title: '大桥夜光', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=bridge%20night%20city%20lights%20star%20trails%20urban%20long%20exposure%20warm%20glow&image_size=landscape_4_3', exposureTime: 60, aperture: 'f/8.0', iso: 400, focalLengthType: 'telephoto', theme: 'warm', isFavorite: false },
  { id: '10', title: '高原银河', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=plateau%20milky%20way%20star%20trails%20pure%20dark%20sky%20long%20exposure%20photography&image_size=landscape_4_3', exposureTime: 1800, aperture: 'f/2.8', iso: 6400, focalLengthType: 'wide', theme: 'cool', isFavorite: false },
  { id: '11', title: '灯塔守望', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=lighthouse%20night%20star%20trails%20coastal%20warm%20beam%20light%20long%20exposure&image_size=landscape_4_3', exposureTime: 240, aperture: 'f/4.0', iso: 1600, focalLengthType: 'standard', theme: 'warm', isFavorite: false },
  { id: '12', title: '峡谷星空', imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=canyon%20night%20sky%20star%20trails%20rock%20formations%20pure%20dark%20long%20exposure&image_size=landscape_4_3', exposureTime: 600, aperture: 'f/5.6', iso: 3200, focalLengthType: 'telephoto', theme: 'cool', isFavorite: false },
];

import { create } from 'zustand';

interface GalleryState {
  photos: Photo[];
  filteredPhotos: Photo[];
  filters: FilterState;
  favoriteCount: number;
  setFilters: (filters: Partial<FilterState>) => void;
  toggleFavorite: (id: string) => void;
  randomize: () => void;
}

function filterPhotos(photos: Photo[], filters: FilterState): Photo[] {
  return photos.filter((p) => {
    if (p.exposureTime < filters.minExposure || p.exposureTime > filters.maxExposure) return false;
    if (filters.focalLengthFilter !== 'all' && p.focalLengthType !== filters.focalLengthFilter) return false;
    return true;
  });
}

function countFavorites(photos: Photo[]): number {
  return photos.filter((p) => p.isFavorite).length;
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const useGalleryStore = create<GalleryState>((set, get) => ({
  photos: MOCK_PHOTOS,
  filteredPhotos: filterPhotos(MOCK_PHOTOS, { minExposure: 1, maxExposure: 1800, focalLengthFilter: 'all' }),
  filters: { minExposure: 1, maxExposure: 1800, focalLengthFilter: 'all' },
  favoriteCount: 0,
  setFilters: (newFilters) => {
    const filters = { ...get().filters, ...newFilters };
    const filteredPhotos = filterPhotos(get().photos, filters);
    set({ filters, filteredPhotos });
  },
  toggleFavorite: (id) => {
    const photos = get().photos.map((p) =>
      p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
    );
    const filteredPhotos = filterPhotos(photos, get().filters);
    const favoriteCount = countFavorites(photos);
    set({ photos, filteredPhotos, favoriteCount });
  },
  randomize: () => {
    const shuffled = shuffleArray(get().filteredPhotos);
    set({ filteredPhotos: shuffled });
  },
}));

export function formatExposure(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}小时${m}分` : `${h}小时`;
}
