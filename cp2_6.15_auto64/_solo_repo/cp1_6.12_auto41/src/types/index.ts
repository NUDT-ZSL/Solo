export interface LyricLine {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
  style: LyricStyle;
}

export interface LyricStyle {
  fontFamily: '宋体' | '黑体' | '楷体' | 'Arial' | 'Georgia';
  fontSize: number;
  color: string;
  enterAnimation: 'fadeIn' | 'slideLeft' | 'riseUp' | 'zoomIn';
  exitAnimation: 'fadeOut' | 'slideRight' | 'zoomOut';
  animationDuration: number;
}

export interface LyricsMetadata {
  title?: string;
  artist?: string;
  album?: string;
}

export interface LyricsData {
  metadata: LyricsMetadata;
  lines: LyricLine[];
  totalDuration: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export type ExportProgress = {
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
};

export const FONT_FAMILIES = ['宋体', '黑体', '楷体', 'Arial', 'Georgia'] as const;
export const ENTER_ANIMATIONS = ['fadeIn', 'slideLeft', 'riseUp', 'zoomIn'] as const;
export const EXIT_ANIMATIONS = ['fadeOut', 'slideRight', 'zoomOut'] as const;

export const DEFAULT_STYLE: LyricStyle = {
  fontFamily: '黑体',
  fontSize: 36,
  color: '#ffffff',
  enterAnimation: 'fadeIn',
  exitAnimation: 'fadeOut',
  animationDuration: 0.5,
};
