export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  description: string;
  color: string;
  x?: number;
  y?: number;
  lockedBy?: string;
  lockedByName?: string;
}

export interface Dependency {
  id: string;
  from: string;
  to: string;
}

export interface Timeline {
  id: string;
  title: string;
  description: string;
  shareCode: string;
  events: TimelineEvent[];
  dependencies: Dependency[];
  createdAt: number;
  updatedAt: number;
}

export interface Collaborator {
  id: string;
  name: string;
  timelineId: string;
}
