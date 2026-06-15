export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  collapsed: boolean;
  characterIds: string[];
}

export interface PersonalityTag {
  id: string;
  name: string;
  type: 'kind' | 'evil' | 'humorous' | 'other';
}

export interface Character {
  id: string;
  name: string;
  age: number;
  tags: PersonalityTag[];
  background: string;
  avatar?: string;
}

export interface Relation {
  id: string;
  source: string;
  target: string;
  type: 'friend' | 'enemy' | 'lover' | 'family';
}

export interface StoryProject {
  id: string;
  name: string;
  chapters: Chapter[];
  characters: Character[];
  relations: Relation[];
  createdAt: number;
  updatedAt: number;
}

export const TAG_COLORS: Record<PersonalityTag['type'], string> = {
  kind: '#3b82f6',
  evil: '#ef4444',
  humorous: '#eab308',
  other: '#6b7280',
};

export const RELATION_COLORS: Record<Relation['type'], string> = {
  friend: '#3b82f6',
  enemy: '#ef4444',
  lover: '#ec4899',
  family: '#22c55e',
};

export const RELATION_STYLES: Record<Relation['type'], string> = {
  friend: 'solid',
  enemy: 'dashed',
  lover: 'dotted',
  family: 'solid',
};
