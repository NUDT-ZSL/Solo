export type AnnotationType = 'highlight' | 'underline' | 'note';

export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Annotation {
  id: string;
  pageNumber: number;
  type: AnnotationType;
  text: string;
  rect: AnnotationRect;
  noteContent?: string;
  createdAt: number;
}

export interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

export interface PageData {
  pageNumber: number;
  width: number;
  height: number;
  textContent: string;
  textItems: TextItem[];
}

export interface PdfDocument {
  numPages: number;
  fileName: string;
}

export interface ExportData {
  version: string;
  exportedAt: number;
  fileName: string;
  annotations: Annotation[];
}
