export type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface KeyResult {
  id: string;
  title: string;
  progress: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  quarter: Quarter;
  owner: string;
  keyResults: KeyResult[];
  lockedBy?: string;
  lockColor?: string;
  createdAt: number;
}

export type WsEventType = 
  | 'okr:list'
  | 'okr:created'
  | 'okr:updated'
  | 'okr:deleted'
  | 'okr:locked'
  | 'okr:unlocked'
  | 'users:online';

export interface WsMessage {
  type: WsEventType;
  data?: unknown;
}

export interface UserInfo {
  id: string;
  color: string;
}
