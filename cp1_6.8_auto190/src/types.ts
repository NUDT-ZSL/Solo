export interface FrequencyBand {
  centerFreq: number;
  energy: number;
  emotionTag: string;
  color: string;
}

export interface AudioFeature {
  frequencyBands: FrequencyBand[];
  rhythmPeaks: number[];
  duration: number;
}

export interface Sculpture {
  id: string;
  name: string;
  userId: string;
  audioUrl: string;
  features: AudioFeature;
  thumbnailUrl: string;
  createdAt: string;
  tags: string[];
}

export interface SculptureCard {
  id: string;
  name: string;
  thumbnailUrl: string;
  tags: string[];
  createdAt: string;
}
