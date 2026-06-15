export interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  text: string;
  paragraphIndex: number;
  tag: TagType;
  color: string;
  createdAt: number;
}

export type TagType = 'viewpoint' | 'question' | 'quote' | 'todo' | 'none';

export interface TagConfig {
  type: TagType;
  label: string;
  color: string;
}

export const TAGS: TagConfig[] = [
  { type: 'viewpoint', label: '观点', color: '#eab308' },
  { type: 'question', label: '疑问', color: '#3b82f6' },
  { type: 'quote', label: '金句', color: '#a855f7' },
  { type: 'todo', label: '待办', color: '#22c55e' },
  { type: 'none', label: '无', color: '#94a3b8' },
];

export const HIGHLIGHT_UPDATED_EVENT = 'highlight-updated';
export const HIGHLIGHT_ADDED_EVENT = 'highlight-added';
export const HIGHLIGHT_REMOVED_EVENT = 'highlight-removed';

class HighlightEngine {
  private highlights: Map<string, Highlight> = new Map();
  private articleText: string = '';
  private paragraphs: string[] = [];

  setArticle(text: string): void {
    this.articleText = text;
    this.paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    this.highlights.clear();
    this.notifyUpdate();
  }

  getArticle(): string {
    return this.articleText;
  }

  getParagraphs(): string[] {
    return this.paragraphs;
  }

  getTagColor(tag: TagType): string {
    const found = TAGS.find(t => t.type === tag);
    return found ? found.color : '#fef08a';
  }

  addHighlight(
    startOffset: number,
    endOffset: number,
    tag: TagType = 'none',
    paragraphIndex: number = 0
  ): Highlight | null {
    if (startOffset >= endOffset || startOffset < 0 || endOffset > this.articleText.length) {
      return null;
    }

    const text = this.articleText.slice(startOffset, endOffset).trim();
    if (!text) return null;

    const id = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const highlight: Highlight = {
      id,
      startOffset,
      endOffset,
      text,
      paragraphIndex,
      tag,
      color: this.getTagColor(tag),
      createdAt: Date.now(),
    };

    this.highlights.set(id, highlight);
    this.dispatchEvent(HIGHLIGHT_ADDED_EVENT, highlight);
    this.notifyUpdate();

    return highlight;
  }

  removeHighlight(id: string): boolean {
    const removed = this.highlights.delete(id);
    if (removed) {
      this.dispatchEvent(HIGHLIGHT_REMOVED_EVENT, id);
      this.notifyUpdate();
    }
    return removed;
  }

  getHighlights(): Highlight[] {
    return Array.from(this.highlights.values()).sort((a, b) => a.startOffset - b.startOffset);
  }

  getHighlightsByParagraph(paragraphIndex: number): Highlight[] {
    return this.getHighlights().filter(h => h.paragraphIndex === paragraphIndex);
  }

  getHighlightsByTag(tag: TagType): Highlight[] {
    return this.getHighlights().filter(h => h.tag === tag);
  }

  getHighlightById(id: string): Highlight | undefined {
    return this.highlights.get(id);
  }

  updateHighlightTag(id: string, tag: TagType): boolean {
    const highlight = this.highlights.get(id);
    if (!highlight) return false;

    highlight.tag = tag;
    highlight.color = this.getTagColor(tag);
    this.notifyUpdate();
    return true;
  }

  isOverlapping(start: number, end: number): boolean {
    for (const h of this.highlights.values()) {
      if (!(end <= h.startOffset || start >= h.endOffset)) {
        return true;
      }
    }
    return false;
  }

  getParagraphIndexFromOffset(offset: number): number {
    let paragraphStart = 0;
    for (let i = 0; i < this.paragraphs.length; i++) {
      const paragraphEnd = paragraphStart + this.paragraphs[i].length;
      if (offset >= paragraphStart && offset <= paragraphEnd) {
        return i;
      }
      paragraphStart = paragraphEnd + 2;
    }
    return Math.max(0, this.paragraphs.length - 1);
  }

  private notifyUpdate(): void {
    this.dispatchEvent(HIGHLIGHT_UPDATED_EVENT, this.getHighlights());
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

export const highlightEngine = new HighlightEngine();

export function addHighlight(
  startOffset: number,
  endOffset: number,
  tag?: TagType,
  paragraphIndex?: number
): Highlight | null {
  return highlightEngine.addHighlight(startOffset, endOffset, tag, paragraphIndex);
}

export function removeHighlight(id: string): boolean {
  return highlightEngine.removeHighlight(id);
}

export function getHighlights(): Highlight[] {
  return highlightEngine.getHighlights();
}

export default highlightEngine;
