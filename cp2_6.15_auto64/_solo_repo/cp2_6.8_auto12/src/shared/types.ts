export interface Document {
  id: string;
  title: string;
  paragraphs: string[];
}

export interface ParagraphProgress {
  paragraphIndex: number;
  totalReadingTime: number;
  readCount: number;
  lastReadAt: number;
}

export interface UserProgress {
  userId: string;
  documentId: string;
  currentParagraph: number;
  paragraphs: ParagraphProgress[];
}

export interface ProgressUpload {
  userId: string;
  documentId: string;
  paragraphIndex: number;
  readingTime: number;
}
