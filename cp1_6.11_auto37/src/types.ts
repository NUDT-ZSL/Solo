export type IdeaType = 'progress' | 'blocker' | 'plan';

export interface Idea {
  id: string;
  memberName: string;
  content: string;
  type: IdeaType;
  timestamp: number;
  voiceUrl?: string;
}

export interface CreateIdeaRequest {
  memberName: string;
  content: string;
  type: IdeaType;
  voiceBase64?: string;
}

export type FilterType = 'all' | IdeaType;
