export interface Theme {
  id: string;
  name: string;
  keywords: string[];
  atmosphere: string;
  palette: string[];
  created_at?: number;
}

export interface SketchData {
  id: string;
  image_data: string;
  created_at: number;
  theme: Theme;
}

export interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}
