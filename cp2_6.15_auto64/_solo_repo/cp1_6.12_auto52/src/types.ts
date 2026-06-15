export enum Mood {
  HAPPY = 'happy',
  SAD = 'sad',
  SURPRISED = 'surprised',
  CALM = 'calm',
  NOSTALGIC = 'nostalgic'
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  image_url: string;
  mood: Mood;
  latitude: number;
  longitude: number;
  created_at: string;
}

export const MOOD_EMOJI: Record<Mood, string> = {
  [Mood.HAPPY]: '😊',
  [Mood.SAD]: '😢',
  [Mood.SURPRISED]: '😮',
  [Mood.CALM]: '😌',
  [Mood.NOSTALGIC]: '🥹'
};

export const MOOD_COLOR: Record<Mood, string> = {
  [Mood.HAPPY]: '#FFB347',
  [Mood.SAD]: '#779ECB',
  [Mood.SURPRISED]: '#FF6961',
  [Mood.CALM]: '#77DD77',
  [Mood.NOSTALGIC]: '#CFCFC4'
};
