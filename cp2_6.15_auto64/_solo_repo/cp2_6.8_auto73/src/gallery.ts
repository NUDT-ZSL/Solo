export type WallId = 'north' | 'south' | 'east' | 'west';

export interface FrameData {
  id: string;
  wallId: WallId;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  imageData: string;
  ownerId: string;
}

export interface UserData {
  id: string;
  nickname: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  timestamp: number;
}

export type FrameUpdate = Partial<Pick<FrameData, 'positionX' | 'positionY' | 'width' | 'height' | 'rotation' | 'imageData'>>;

export interface GalleryCallbacks {
  onFrameAdded: (frame: FrameData) => void;
  onFrameUpdated: (id: string, update: FrameUpdate) => void;
  onFrameRemoved: (id: string) => void;
  onUserJoined: (user: UserData) => void;
  onUserLeft: (userId: string) => void;
  onUserStatusChanged: (userId: string, online: boolean) => void;
  onMessageReceived: (message: ChatMessage) => void;
  onStateSynced: () => void;
}

export class Gallery {
  frames: Map<string, FrameData> = new Map();
  users: Map<string, UserData> = new Map();
  messages: ChatMessage[] = [];
  roomCode: string = '';
  currentUserId: string = '';
  currentUserNickname: string = '';
  private callbacks: Partial<GalleryCallbacks> = {};

  setCallbacks(callbacks: Partial<GalleryCallbacks>) {
    this.callbacks = callbacks;
  }

  setCurrentUser(id: string, nickname: string) {
    this.currentUserId = id;
    this.currentUserNickname = nickname;
  }

  setRoomCode(code: string) {
    this.roomCode = code;
  }

  getFrame(id: string): FrameData | undefined {
    return this.frames.get(id);
  }

  getAllFrames(): FrameData[] {
    return Array.from(this.frames.values());
  }

  getAllUsers(): UserData[] {
    return Array.from(this.users.values());
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  addFrame(frame: FrameData) {
    this.frames.set(frame.id, frame);
    this.callbacks.onFrameAdded?.(frame);
  }

  updateFrame(id: string, update: FrameUpdate) {
    const frame = this.frames.get(id);
    if (frame) {
      Object.assign(frame, update);
      this.callbacks.onFrameUpdated?.(id, update);
    }
  }

  removeFrame(id: string) {
    if (this.frames.has(id)) {
      this.frames.delete(id);
      this.callbacks.onFrameRemoved?.(id);
    }
  }

  addUser(user: UserData) {
    this.users.set(user.id, user);
    this.callbacks.onUserJoined?.(user);
  }

  removeUser(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      user.online = false;
      this.callbacks.onUserLeft?.(userId);
    }
  }

  setUserStatus(userId: string, online: boolean) {
    const user = this.users.get(userId);
    if (user) {
      user.online = online;
      this.callbacks.onUserStatusChanged?.(userId, online);
    }
  }

  addMessage(message: ChatMessage) {
    this.messages.push(message);
    if (this.messages.length > 100) {
      this.messages.shift();
    }
    this.callbacks.onMessageReceived?.(message);
  }

  syncState(frames: FrameData[], users: UserData[], messages: ChatMessage[]) {
    this.frames.clear();
    this.users.clear();
    this.messages = [];

    frames.forEach(f => this.frames.set(f.id, f));
    users.forEach(u => this.users.set(u.id, u));
    this.messages = messages.slice(-100);

    this.callbacks.onStateSynced?.();
  }

  clear() {
    this.frames.clear();
    this.users.clear();
    this.messages = [];
  }
}
