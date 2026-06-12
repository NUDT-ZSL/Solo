import { NoteCard } from './types';

const API_BASE = '/api/notes';

export const noteApi = {
  getAll: async (): Promise<NoteCard[]> => {
    const res = await fetch(API_BASE);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  add: async (note: Omit<NoteCard, '_id'>): Promise<NoteCard> => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to add note');
    return res.json();
  },

  update: async (id: string, note: Partial<NoteCard>): Promise<NoteCard> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to update note');
    return res.json();
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
  },
};
