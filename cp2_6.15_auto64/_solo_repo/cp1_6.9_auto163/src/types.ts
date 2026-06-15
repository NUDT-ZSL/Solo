export type WeatherType = 'rain' | 'snow' | 'fog' | 'sunset';
export type FrameStyle = 'simple' | 'film' | 'dashed' | 'gold' | 'stamp';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PostcardData {
  id: string;
  imageData: string;
  weather: WeatherType;
  timeOfDay: number;
  frameStyle: FrameStyle;
  text: string;
  dominantColor: RGB;
  createdAt: number;
}

export interface UploadResponse {
  id: string;
  url: string;
  createdAt: number;
}
