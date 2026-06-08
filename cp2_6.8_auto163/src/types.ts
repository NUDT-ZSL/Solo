export type CropRatio = 'original' | '1:1' | '4:3' | '16:9' | '9:16';

export interface EditParams {
  filterStrength: number;
  cropRatio: CropRatio;
  brightness: number;
  contrast: number;
}

export interface ImageItem {
  id: string;
  file: File;
  originalUrl: string;
  previewUrl: string | null;
  params: EditParams;
  selected: boolean;
}

export const defaultParams: EditParams = {
  filterStrength: 0,
  cropRatio: 'original',
  brightness: 0,
  contrast: 0,
};
