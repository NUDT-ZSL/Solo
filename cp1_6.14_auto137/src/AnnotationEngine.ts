import type { Annotation, AnnotationType, AnnotationRect, ExportData } from './types';

type AnnotationStore = Map<number, Annotation[]>;

const STORAGE_KEY_PREFIX = 'pdf-reader-annotations-';
const EXPORT_VERSION = '1.0.0';

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `ann-${Date.now()}-${idCounter}`;
}

export class AnnotationEngine {
  private store: AnnotationStore = new Map();
  private fileName: string = '';
  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  setFileName(name: string): void {
    this.fileName = name;
  }

  addAnnotation(
    pageNumber: number,
    type: AnnotationType,
    text: string,
    rect: AnnotationRect,
    noteContent?: string
  ): Annotation {
    const annotation: Annotation = {
      id: generateId(),
      pageNumber,
      type,
      text,
      rect,
      noteContent,
      createdAt: Date.now(),
    };

    if (!this.store.has(pageNumber)) {
      this.store.set(pageNumber, []);
    }
    this.store.get(pageNumber)!.push(annotation);

    this.saveToLocalStorage();
    this.notify();
    return annotation;
  }

  deleteAnnotation(annotationId: string): boolean {
    for (const [pageNumber, annotations] of this.store.entries()) {
      const index = annotations.findIndex((a) => a.id === annotationId);
      if (index !== -1) {
        annotations.splice(index, 1);
        if (annotations.length === 0) {
          this.store.delete(pageNumber);
        }
        this.saveToLocalStorage();
        this.notify();
        return true;
      }
    }
    return false;
  }

  updateAnnotationNote(annotationId: string, noteContent: string): boolean {
    for (const annotations of this.store.values()) {
      const ann = annotations.find((a) => a.id === annotationId);
      if (ann) {
        ann.noteContent = noteContent;
        this.saveToLocalStorage();
        this.notify();
        return true;
      }
    }
    return false;
  }

  getAnnotationsByPage(pageNumber: number): Annotation[] {
    return this.store.get(pageNumber) ?? [];
  }

  getAllAnnotations(): Annotation[] {
    const result: Annotation[] = [];
    const sortedPages = Array.from(this.store.keys()).sort((a, b) => a - b);
    for (const page of sortedPages) {
      const annotations = this.store.get(page)!;
      result.push(...annotations.sort((a, b) => a.createdAt - b.createdAt));
    }
    return result;
  }

  getAnnotationsGroupedByPage(): Map<number, Annotation[]> {
    const result = new Map<number, Annotation[]>();
    const sortedPages = Array.from(this.store.keys()).sort((a, b) => a - b);
    for (const page of sortedPages) {
      result.set(page, [...this.store.get(page)!].sort((a, b) => a.createdAt - b.createdAt));
    }
    return result;
  }

  exportToJson(): string {
    const data: ExportData = {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      fileName: this.fileName,
      annotations: this.getAllAnnotations(),
    };
    return JSON.stringify(data, null, 2);
  }

  downloadExport(): void {
    const json = this.exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.fileName || 'pdf'}-annotations.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  saveToLocalStorage(): void {
    if (!this.fileName) return;
    const key = STORAGE_KEY_PREFIX + this.fileName;
    const data = this.getAllAnnotations();
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // storage full, silently fail
    }
  }

  loadFromLocalStorage(): Annotation[] {
    if (!this.fileName) return [];
    const key = STORAGE_KEY_PREFIX + this.fileName;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const data: Annotation[] = JSON.parse(raw);
      this.store.clear();
      for (const ann of data) {
        if (!this.store.has(ann.pageNumber)) {
          this.store.set(ann.pageNumber, []);
        }
        this.store.get(ann.pageNumber)!.push(ann);
      }
      this.notify();
      return data;
    } catch {
      return [];
    }
  }

  clearAll(): void {
    this.store.clear();
    if (this.fileName) {
      const key = STORAGE_KEY_PREFIX + this.fileName;
      localStorage.removeItem(key);
    }
    this.notify();
  }

  getAnnotationById(id: string): Annotation | undefined {
    for (const annotations of this.store.values()) {
      const found = annotations.find((a) => a.id === id);
      if (found) return found;
    }
    return undefined;
  }
}
