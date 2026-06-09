export interface Illustration {
  data: string;
  type: 'upload' | 'canvas';
}

export interface Paragraph {
  id: string;
  content: string;
  illustration: Illustration | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface UserInfo {
  id: string;
  nickname: string;
  avatar: string;
  isCreator?: boolean;
}

export interface RoomState {
  code: string;
  creatorId: string;
  paragraphs: Paragraph[];
  version: number;
  createdAt: number;
  shareToken: string | null;
}

export interface LockState {
  paragraphId: string;
  userId: string;
  nickname: string;
}

export interface ChatMessage {
  userId: string;
  nickname: string;
  content: string;
  timestamp: number;
  isSystem: boolean;
}

export type ClientMessageType =
  | 'join'
  | 'leave'
  | 'edit_paragraph'
  | 'add_paragraph'
  | 'delete_paragraph'
  | 'reorder_paragraph'
  | 'set_illustration'
  | 'lock_paragraph'
  | 'unlock_paragraph'
  | 'chat';

export type ServerMessageType =
  | 'user_joined'
  | 'user_left'
  | 'join_success'
  | 'room_full'
  | 'operation_ack'
  | 'paragraph_updated'
  | 'paragraph_locked'
  | 'paragraph_unlocked'
  | 'chat_broadcast'
  | 'full_state';

export interface ClientMessage {
  type: ClientMessageType;
  roomCode: string;
  userId: string;
}

export interface ServerMessage {
  type: ServerMessageType;
}

export interface JoinMessage extends ClientMessage {
  type: 'join';
  nickname: string;
  avatar: string;
}

export interface EditParagraphMessage extends ClientMessage {
  type: 'edit_paragraph';
  operationId: string;
  paragraphId: string;
  content: string;
  version: number;
}

export interface AddParagraphMessage extends ClientMessage {
  type: 'add_paragraph';
  operationId: string;
  afterId: string | null;
  version: number;
}

export interface DeleteParagraphMessage extends ClientMessage {
  type: 'delete_paragraph';
  operationId: string;
  paragraphId: string;
  version: number;
}

export interface ReorderParagraphMessage extends ClientMessage {
  type: 'reorder_paragraph';
  operationId: string;
  paragraphId: string;
  newIndex: number;
  version: number;
}

export interface SetIllustrationMessage extends ClientMessage {
  type: 'set_illustration';
  operationId: string;
  paragraphId: string;
  illustration: Illustration | null;
  version: number;
}

export interface LockParagraphMessage extends ClientMessage {
  type: 'lock_paragraph';
  paragraphId: string;
}

export interface UnlockParagraphMessage extends ClientMessage {
  type: 'unlock_paragraph';
  paragraphId: string;
}

export interface ChatMessageSend extends ClientMessage {
  type: 'chat';
  nickname: string;
  content: string;
  timestamp: number;
}

export interface JoinSuccessMessage extends ServerMessage {
  type: 'join_success';
  roomCode: string;
  userId: string;
  state: RoomState;
  users: UserInfo[];
}

export interface UserJoinedBroadcast extends ServerMessage {
  type: 'user_joined';
  userId: string;
  nickname: string;
  avatar: string;
  users: UserInfo[];
  timestamp: number;
}

export interface UserLeftBroadcast extends ServerMessage {
  type: 'user_left';
  userId: string;
  nickname: string;
  users: UserInfo[];
  timestamp: number;
}

export interface RoomFullMessage extends ServerMessage {
  type: 'room_full';
  message: string;
}

export interface OperationAckMessage extends ServerMessage {
  type: 'operation_ack';
  operationId: string;
  success: boolean;
  conflict: boolean;
  overridden: boolean;
  latestVersion: number;
}

export interface ParagraphUpdatedBroadcast extends ServerMessage {
  type: 'paragraph_updated';
  operationId: string;
  editType: 'edit' | 'add' | 'delete' | 'reorder' | 'illustration';
  paragraphId: string;
  data: any;
  userId: string;
  version: number;
  timestamp: number;
}

export interface ParagraphLockedBroadcast extends ServerMessage {
  type: 'paragraph_locked';
  paragraphId: string;
  userId: string;
  nickname: string;
}

export interface ParagraphUnlockedBroadcast extends ServerMessage {
  type: 'paragraph_unlocked';
  paragraphId: string;
  userId: string;
}

export interface ChatBroadcast extends ServerMessage {
  type: 'chat_broadcast';
  userId: string;
  nickname: string;
  content: string;
  timestamp: number;
  isSystem: boolean;
}
