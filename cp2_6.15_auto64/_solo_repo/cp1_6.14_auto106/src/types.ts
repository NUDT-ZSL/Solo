export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Character {
  id: string;
  name: string;
  description?: string;
}

export interface NodeData {
  id: string;
  x: number;
  y: number;
  title: string;
  description: string;
  tagId?: string;
  characterId?: string;
  timelinePosition?: number;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
}
