export type Role = 'teacher' | 'student';

export interface StudentInfo {
  id: string;
  nickname: string;
  roomCode: string;
  connected: boolean;
}

export interface EditEvent {
  studentId: string;
  nickname: string;
  timestamp: number;
  frequency: number;
  cursorPosition: number;
  codeLength: number;
}

export interface CodeCheckResult {
  studentId: string;
  nickname: string;
  timestamp: number;
  hasError: boolean;
  errorType?: string;
  errorLine?: number;
  errorMessage?: string;
  codeSnippet: string;
}

export interface CodeSnapshot {
  studentId: string;
  nickname: string;
  timestamp: number;
  code: string;
}

export interface BroadcastCode {
  fromStudentId: string;
  fromNickname: string;
  timestamp: number;
  code: string;
}

export interface RoomState {
  roomCode: string;
  roomName: string;
  students: StudentInfo[];
  teacherConnected: boolean;
}

export type WSMessageType =
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'ROOM_STATE'
  | 'STUDENT_LEFT'
  | 'EDIT_EVENT'
  | 'CODE_CHECK_RESULT'
  | 'CODE_SNAPSHOT'
  | 'REQUEST_STUDENT_DETAIL'
  | 'STUDENT_DETAIL'
  | 'BROADCAST_CODE'
  | 'ERROR';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
}

export interface CreateRoomPayload {
  roomName: string;
  teacherName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  nickname: string;
  role: Role;
}

export interface StudentDetailPayload {
  studentId: string;
  recentSnippets: CodeSnapshot[];
  errorHistory: CodeCheckResult[];
}

export interface HeatmapCell {
  studentId: string;
  nickname: string;
  windowStart: number;
  frequency: number;
}

export interface ErrorTrendPoint {
  time: string;
  timestamp: number;
  errors: number;
}
