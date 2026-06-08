export interface TimelineNode {
  id: string;
  position: number;
  date: string;
  title: string;
  description: string;
  icon: string;
  importance: number;
}

export type IconName = 'star' | 'compass' | 'camera' | 'music' | 'globe' | 'rocket' | 'bulb' | 'heart' | 'book' | 'gear' | 'flag' | 'trophy';
