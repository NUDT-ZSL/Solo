export type LightPreference = 'direct' | 'scattered' | 'shady';
export type LocationPreference = 'balcony' | 'living_room' | 'bedroom';
export type CareType = 'water' | 'fertilize';

export interface CareRecord {
  id: string;
  type: CareType;
  time: string;
  operator: string;
}

export interface Plant {
  id: string;
  name: string;
  variety: string;
  lightPreference: LightPreference;
  locationPreference: LocationPreference;
  waterInterval: number;
  fertilizeInterval: number;
  lastWaterTime: string;
  lastFertilizeTime: string;
  careRecords: CareRecord[];
  isSucculent: boolean;
}

export interface NeedCareItem {
  plantId: string;
  plantName: string;
  type: CareType;
  daysOverdue: number;
}

export const LIGHT_LABELS: Record<LightPreference, string> = {
  direct: '直射',
  scattered: '散射',
  shady: '阴暗',
};

export const LOCATION_LABELS: Record<LocationPreference, string> = {
  balcony: '阳台',
  living_room: '客厅',
  bedroom: '卧室',
};

export const CARE_TYPE_LABELS: Record<CareType, string> = {
  water: '浇水',
  fertilize: '施肥',
};
