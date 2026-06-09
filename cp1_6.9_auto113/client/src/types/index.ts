export interface UploadResponse {
  fileId: string;
  fileName: string;
  duration: number;
  sampleRate: number;
  waveformData: number[];
  spectrumData: number[];
}

export interface DifferenceRegion {
  startTime: number;
  endTime: number;
  avgScore: number;
  description: string;
}

export interface CompareResponse {
  score: number;
  alignmentPath: [number, number][];
  frameScores: number[];
  differenceRegions: DifferenceRegion[];
  alignedWaveformA: number[];
  alignedWaveformB: number[];
  differenceMask: number[];
}

export interface AudioFileInfo {
  fileId: string;
  fileName: string;
  duration: number;
  sampleRate: number;
  waveformData: number[];
  spectrumData: number[];
}

export type UploadType = 'standard' | 'recording';
