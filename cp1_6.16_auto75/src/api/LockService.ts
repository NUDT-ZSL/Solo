import axios from 'axios';

const API_BASE = '/api';

export interface LockInfo {
  chapterId: string;
  paragraphIndex: number;
  userId: string;
  userName: string;
  acquiredAt: number;
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  content: string;
  paragraphs: string[];
  timestamp: number;
  authorId: string;
  authorName: string;
}

export interface Chapter {
  id: string;
  title: string;
  paragraphs: string[];
  versions: ChapterVersion[];
  collaborators: { userId: string; userName: string; permission: 'read' | 'edit' }[];
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'editor' | 'viewer';
}

export async function acquireLock(
  chapterId: string,
  paragraphIndex: number,
  userId: string,
  userName: string
): Promise<{ success: boolean; lock?: LockInfo; error?: string }> {
  try {
    const res = await axios.post(`${API_BASE}/locks/acquire`, {
      chapterId,
      paragraphIndex,
      userId,
      userName,
    });
    return res.data;
  } catch (err: any) {
    return { success: false, error: err.response?.data?.error || '获取锁失败' };
  }
}

export async function releaseLock(
  chapterId: string,
  paragraphIndex: number,
  userId: string
): Promise<{ success: boolean }> {
  try {
    const res = await axios.post(`${API_BASE}/locks/release`, {
      chapterId,
      paragraphIndex,
      userId,
    });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function submitChange(
  chapterId: string,
  paragraphIndex: number,
  content: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; version?: ChapterVersion; conflict?: any }> {
  try {
    const res = await axios.post(`${API_BASE}/chapters/${chapterId}/paragraphs`, {
      paragraphIndex,
      content,
      userId,
      userName,
    });
    return res.data;
  } catch (err: any) {
    return { success: false, conflict: err.response?.data?.conflict };
  }
}

export async function fetchChapter(chapterId: string): Promise<Chapter | null> {
  try {
    const res = await axios.get(`${API_BASE}/chapters/${chapterId}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchAllChapters(): Promise<Chapter[]> {
  try {
    const res = await axios.get(`${API_BASE}/chapters`);
    return res.data;
  } catch {
    return [];
  }
}

export async function fetchVersions(chapterId: string): Promise<ChapterVersion[]> {
  try {
    const res = await axios.get(`${API_BASE}/chapters/${chapterId}/versions`);
    return res.data;
  } catch {
    return [];
  }
}

export async function rollbackVersion(
  chapterId: string,
  versionId: string,
  userId: string
): Promise<{ success: boolean; chapter?: Chapter }> {
  try {
    const res = await axios.post(`${API_BASE}/chapters/${chapterId}/rollback`, {
      versionId,
      userId,
    });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function login(
  name: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string }> {
  try {
    const res = await axios.post(`${API_BASE}/users/login`, { name, password });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function register(
  name: string,
  password: string
): Promise<{ success: boolean; user?: User }> {
  try {
    const res = await axios.post(`${API_BASE}/users/register`, { name, password });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function updatePermission(
  chapterId: string,
  userId: string,
  permission: 'read' | 'edit',
  adminId: string
): Promise<{ success: boolean }> {
  try {
    const res = await axios.post(`${API_BASE}/chapters/${chapterId}/permissions`, {
      userId,
      permission,
      adminId,
    });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function kickCollaborator(
  chapterId: string,
  userId: string,
  adminId: string
): Promise<{ success: boolean }> {
  try {
    const res = await axios.post(`${API_BASE}/chapters/${chapterId}/kick`, {
      userId,
      adminId,
    });
    return res.data;
  } catch {
    return { success: false };
  }
}

export async function fetchOnlineUsers(): Promise<User[]> {
  try {
    const res = await axios.get(`${API_BASE}/users/online`);
    return res.data;
  } catch {
    return [];
  }
}
