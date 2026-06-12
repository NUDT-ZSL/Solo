import { useCallback } from 'react';
import { Version, Comment } from '@/types';

interface UseVersionsReturn {
  getVersions: (roomId: string) => Promise<Version[]>;
  saveVersion: (roomId: string, content: string, savedBy: string) => Promise<{ versionNumber: number; savedAt: number; savedBy: string }>;
  getVersionContent: (roomId: string, version: number) => Promise<Version>;
  addComment: (roomId: string, version: number, author: string, authorColor: string, content: string) => Promise<Comment>;
  getComments: (roomId: string, version: number) => Promise<Comment[]>;
  createRoom: () => Promise<string>;
}

const API_BASE = 'http://localhost:3001/api';

export function useVersions(): UseVersionsReturn {
  const createRoom = useCallback(async (): Promise<string> => {
    const response = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    return data.roomId;
  }, []);

  const getVersions = useCallback(async (roomId: string): Promise<Version[]> => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/versions`);
    const data = await response.json();
    return data.versions;
  }, []);

  const saveVersion = useCallback(async (
    roomId: string,
    content: string,
    savedBy: string
  ): Promise<{ versionNumber: number; savedAt: number; savedBy: string }> => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, savedBy })
    });
    return response.json();
  }, []);

  const getVersionContent = useCallback(async (roomId: string, version: number): Promise<Version> => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/versions/${version}`);
    return response.json();
  }, []);

  const addComment = useCallback(async (
    roomId: string,
    version: number,
    author: string,
    authorColor: string,
    content: string
  ): Promise<Comment> => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/versions/${version}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, authorColor, content })
    });
    return response.json();
  }, []);

  const getComments = useCallback(async (roomId: string, version: number): Promise<Comment[]> => {
    const response = await fetch(`${API_BASE}/rooms/${roomId}/versions/${version}/comments`);
    const data = await response.json();
    return data.comments;
  }, []);

  return {
    getVersions,
    saveVersion,
    getVersionContent,
    addComment,
    getComments,
    createRoom
  };
}
