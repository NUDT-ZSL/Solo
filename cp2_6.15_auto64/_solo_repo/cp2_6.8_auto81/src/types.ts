export type AnnotationType = 'highlight' | 'textbox';

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  createdAt: number;
  username: string;
}

export interface Snapshot {
  id: string;
  name: string;
  createdAt: number;
  annotations: Annotation[];
}

export type ToolType = 'none' | AnnotationType;

export type ClientMessageType = 'add' | 'move' | 'delete' | 'sync' | 'snapshot_create';
export type ServerMessageType = 'annotation_add' | 'annotation_move' | 'annotation_delete' |
  'user_count' | 'sync_all' | 'snapshot_created' | 'snapshot_list';

export interface ClientMessage {
  type: ClientMessageType;
  payload: any;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload: any;
}

export interface CompareSelection {
  versionA: string | null;
  versionB: string | null;
}
