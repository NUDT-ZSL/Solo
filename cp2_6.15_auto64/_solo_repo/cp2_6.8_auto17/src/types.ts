export type PartType = 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';

export interface PartOption {
  id: string;
  name: string;
  type: PartType;
}

export interface ColorOption {
  id: string;
  name: string;
  hex: string;
}

export interface OutfitState {
  bodyType: string;
  hair: { partId: string; colorId: string };
  top: { partId: string; colorId: string };
  bottom: { partId: string; colorId: string };
  shoes: { partId: string; colorId: string };
  accessory: { partId: string; colorId: string };
}

export interface SavedOutfit {
  id: string;
  name: string;
  description: string;
  outfit: OutfitState;
  timestamp: number;
}

export interface ParseResult {
  success: boolean;
  message: string;
  partialUpdates: Partial<OutfitState>;
}
