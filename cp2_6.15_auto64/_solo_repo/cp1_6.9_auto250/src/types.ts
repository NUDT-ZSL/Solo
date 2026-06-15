export type MoodColorKey =
  | 'duskOrange'
  | 'starryBlue'
  | 'mistPurple'
  | 'mintGreen'
  | 'rosePink'
  | 'lemonYellow'
  | 'deepSea'
  | 'cherryPink'
  | 'sunsetRed'
  | 'cloudGray'
  | 'forestGreen'
  | 'lavender';

export interface Capsule {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  moodColor: MoodColorKey;
  unlockDate: string;
  createdAt: string;
  openedAt?: string;
}

export interface CreateCapsuleDto {
  title: string;
  content: string;
  imageUrl?: string;
  moodColor: MoodColorKey;
  unlockDate: string;
}

export type FilterStatus = 'all' | 'locked' | 'unlocked';

export type CapsuleStatus = 'locked' | 'unlocked' | 'expired';

export interface AppState {
  capsules: Capsule[];
  loading: boolean;
  error: string | null;
  filterStatus: FilterStatus;
  filterColor: MoodColorKey | null;
}

export type AppAction =
  | { type: 'SET_CAPSULES'; payload: Capsule[] }
  | { type: 'ADD_CAPSULE'; payload: Capsule }
  | { type: 'UPDATE_CAPSULE'; payload: Capsule }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FILTER_STATUS'; payload: FilterStatus }
  | { type: 'SET_FILTER_COLOR'; payload: MoodColorKey | null };
