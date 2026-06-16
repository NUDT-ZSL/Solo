export interface TextOperation {
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
  timestamp: number;
}

export interface CursorPosition {
  row: number;
  column: number;
  position: number;
}

export interface UserInfo {
  userId: string;
  username: string;
  role: 'student' | 'teacher';
  color: string;
  connectedAt: number;
}

export interface StudentMetrics {
  userId: string;
  username: string;
  connectedDuration: number;
  operationCount: number;
  cursorPosition: CursorPosition;
  activityHistory: number[];
}

export interface ClientJoinMessage {
  type: 'join';
  userId: string;
  username: string;
  role: 'student' | 'teacher';
  roomId: string;
}

export interface ClientOpMessage {
  type: 'op';
  userId: string;
  roomId: string;
  operation: TextOperation;
}

export interface ClientCursorMessage {
  type: 'cursor';
  userId: string;
  roomId: string;
  cursorPosition: CursorPosition;
}

export interface ClientLeaveMessage {
  type: 'leave';
  userId: string;
  roomId: string;
}

export type ClientMessage =
  | ClientJoinMessage
  | ClientOpMessage
  | ClientCursorMessage
  | ClientLeaveMessage;

export interface ServerInitMessage {
  type: 'init';
  users: UserInfo[];
  document: string;
  studentMetrics: StudentMetrics[];
}

export interface ServerOpMessage {
  type: 'op';
  userId: string;
  operation: TextOperation;
}

export interface ServerCursorMessage {
  type: 'cursor';
  userId: string;
  cursorPosition: CursorPosition;
}

export interface ServerUserJoinMessage {
  type: 'userJoin';
  user: UserInfo;
}

export interface ServerUserLeaveMessage {
  type: 'userLeave';
  userId: string;
}

export interface ServerStudentMetricsMessage {
  type: 'studentMetrics';
  metrics: StudentMetrics[];
}

export interface ServerUsersListMessage {
  type: 'usersList';
  users: UserInfo[];
}

export type ServerMessage =
  | ServerInitMessage
  | ServerOpMessage
  | ServerCursorMessage
  | ServerUserJoinMessage
  | ServerUserLeaveMessage
  | ServerStudentMetricsMessage
  | ServerUsersListMessage;

export interface RunCodeRequest {
  language: 'javascript' | 'python';
  code: string;
  userId: string;
}

export interface RunCodeResponse {
  success: boolean;
  output: string;
  error?: string;
  executionTime?: number;
}
