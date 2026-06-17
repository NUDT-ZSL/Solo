export interface IVideoClip {
  id: string;
  color: string;
  duration: number;
}

export enum EffectType {
  None = 'none',
  Fade = 'fade',
  Slide = 'slide',
  Scale = 'scale',
}

export interface ITimelineState {
  clips: IVideoClip[];
  transitions: Record<string, EffectType>;
}
