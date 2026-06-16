export interface Puzzle {
  id: string;
  artifactName: string;
  artifactType: string;
  correctSequence: number[];
  story: string;
}

export interface ArtifactReward {
  id: string;
  artifactName: string;
  artifactType: string;
  story: string;
}

export interface SolveResult {
  success: boolean;
  reward?: ArtifactReward;
}

export interface ArtifactPosition {
  row: number;
  col: number;
}

export type ArtifactType = '陶罐' | '石碑' | '玉璧';

export const ARTIFACT_COLORS: Record<ArtifactType, string> = {
  '陶罐': '#c8a165',
  '石碑': '#9e7b56',
  '玉璧': '#6ab04c',
};
