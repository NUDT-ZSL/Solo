import { highlightEngine, HIGHLIGHT_REMOVED_EVENT, Highlight } from './highlight-engine';

export interface Note {
  id: string;
  highlightId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const NOTE_ADDED_EVENT = 'note-added';
export const NOTE_UPDATED_EVENT = 'note-updated';
export const NOTE_REMOVED_EVENT = 'note-removed';

class NoteEngine {
  private notes: Map<string, Note> = new Map();

  constructor() {
    this.setupHighlightListener();
  }

  private setupHighlightListener(): void {
    document.addEventListener(HIGHLIGHT_REMOVED_EVENT, (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const highlightId = customEvent.detail;
      this.removeNotesByHighlightId(highlightId);
    });
  }

  addNote(highlightId: string, content: string): Note | null {
    if (!highlightEngine.getHighlightById(highlightId)) {
      return null;
    }

    const id = `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const note: Note = {
      id,
      highlightId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    this.notes.set(id, note);
    this.dispatchEvent(NOTE_ADDED_EVENT, note);
    return note;
  }

  updateNote(id: string, content: string): boolean {
    const note = this.notes.get(id);
    if (!note) return false;

    note.content = content;
    note.updatedAt = Date.now();
    this.dispatchEvent(NOTE_UPDATED_EVENT, note);
    return true;
  }

  removeNote(id: string): boolean {
    const removed = this.notes.delete(id);
    if (removed) {
      this.dispatchEvent(NOTE_REMOVED_EVENT, id);
    }
    return removed;
  }

  removeNotesByHighlightId(highlightId: string): void {
    const notesToRemove = Array.from(this.notes.values())
      .filter(n => n.highlightId === highlightId)
      .map(n => n.id);
    
    notesToRemove.forEach(id => this.removeNote(id));
  }

  getNotes(): Note[] {
    return Array.from(this.notes.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  getNoteById(id: string): Note | undefined {
    return this.notes.get(id);
  }

  getNotesByHighlightId(highlightId: string): Note[] {
    return this.getNotes().filter(n => n.highlightId === highlightId);
  }

  getNotesWithHighlights(): Array<{ note: Note; highlight: Highlight }> {
    return this.getNotes()
      .map(note => {
        const highlight = highlightEngine.getHighlightById(note.highlightId);
        return highlight ? { note, highlight } : null;
      })
      .filter((item): item is { note: Note; highlight: Highlight } => item !== null);
  }

  private dispatchEvent(type: string, detail: unknown): void {
    const event = new CustomEvent(type, { detail });
    document.dispatchEvent(event);
  }

  subscribe(eventType: string, handler: (e: Event) => void): () => void {
    document.addEventListener(eventType, handler);
    return () => document.removeEventListener(eventType, handler);
  }
}

export const noteEngine = new NoteEngine();

export function addNote(highlightId: string, content: string): Note | null {
  return noteEngine.addNote(highlightId, content);
}

export function updateNote(id: string, content: string): boolean {
  return noteEngine.updateNote(id, content);
}

export function removeNote(id: string): boolean {
  return noteEngine.removeNote(id);
}

export function getNotes(): Note[] {
  return noteEngine.getNotes();
}

export default noteEngine;
